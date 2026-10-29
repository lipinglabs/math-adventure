/* ============================================================
   engine.js · 通用引擎
   ------------------------------------------------------------
   职责（只做通用能力，不认识任何具体关卡）：
     1. 按关加载素材 + 进度条 UI
     2. 音频池（手势解锁 / 预加载 / 串播 / 释放）
     3. 果冻动画工具（同屏运动元素上限 10，动画结束即销毁 DOM）
     4. 10 题全对判定状态机
     5. 弹层 / 轻提示 / 音效等基础 UI
     6. Three.js 扩展位（当前为 DOM 渲染，接口已预留）

   铁律：本文件不得出现任何具体题面、关卡文案或语音文件名。
   ============================================================ */

(function (global) {
  'use strict';

  var LIMITS = {
    maxMotion: 10,        // 同屏运动元素上限，超过则丢弃新的装饰动画
    loaderMinMs: 460,     // 加载遮罩最短停留，避免闪一下就消失
    assetTimeout: 15000,  // 单个素材超时
    maxAudioNodes: 40     // 音频元素上限（iOS 媒体元素超限会静默失声）
  };

  /* ---------------- 微工具 ---------------- */

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { reject(new Error('超时 ' + ms + 'ms')); }, ms);
      Promise.resolve(promise).then(function (v) {
        clearTimeout(timer); resolve(v);
      }, function (e) {
        clearTimeout(timer); reject(e);
      });
    });
  }

  function resolveUrl(src, base) {
    if (!src) return '';
    if (/^(https?:|data:|blob:)/.test(src)) return src;
    return (base || '') + src;
  }

  /* ---------------- 运动预算 ----------------
     每个一次性动画节点在开始时占 1 个名额，animationend（或兜底超时）
     立即释放，并从 DOM 移除。这样可以保证「同屏运动元素 ≤ 10」。 */

  var motionCount = 0;

  function track(node, ms) {
    motionCount += 1;
    var released = false;
    function release() {
      if (released) return;
      released = true;
      motionCount = Math.max(0, motionCount - 1);
      node.removeEventListener('animationend', release);
    }
    node.addEventListener('animationend', release);
    setTimeout(release, (ms || 800) + 320);
  }

  function budgetLeft() {
    return LIMITS.maxMotion - motionCount;
  }

  /* ---------------- 加载遮罩 ---------------- */

  var loader = (function () {
    var ui = null;
    var token = 0;

    function ensure() {
      if (ui) return ui;
      var root = $('#loader');
      if (!root) return null;
      ui = {
        root: root,
        jar: $('#loader-fill'),
        bar: $('#loader-bar-fill'),
        pct: $('#loader-percent'),
        detail: $('#loader-detail'),
        title: $('#loader-title'),
        hint: $('#loader-hint'),
        retry: $('#loader-retry')
      };
      return ui;
    }

    function open(title) {
      var u = ensure();
      if (!u) return;
      token += 1;
      u.root.hidden = false;
      u.retry.hidden = true;
      u.title.textContent = title || '素材加载中';
      u.hint.textContent = '正在准备这一关的声音和画面…';
      u.pct.textContent = '0%';
      u.detail.textContent = '0 / 0';
      u.jar.style.height = '0%';
      u.bar.style.width = '0%';
      requestAnimationFrame(function () { u.root.classList.add('is-open'); });
    }

    function set(ratio, detail) {
      var u = ensure();
      if (!u) return;
      var r = clamp(ratio, 0, 1);
      var pct = Math.round(r * 100);
      u.bar.style.width = pct + '%';
      u.jar.style.height = pct + '%';
      u.pct.textContent = pct + '%';
      if (detail != null) u.detail.textContent = detail;
    }

    function fail(text, onRetry) {
      var u = ensure();
      if (!u) return;
      u.hint.textContent = text || '素材没加载成功，请检查网络后再试';
      u.retry.hidden = false;
      u.retry.onclick = function () {
        if (typeof onRetry === 'function') onRetry();
      };
    }

    function close() {
      var u = ensure();
      if (!u) return;
      var my = token;
      u.root.classList.remove('is-open');
      setTimeout(function () {
        if (my !== token) return;       // 期间又被 open 了，不要藏
        u.root.hidden = true;
      }, 240);
    }

    return { open: open, set: set, fail: fail, close: close };
  })();

  /* ---------------- 音频池 ---------------- */

  var audioPool = {};        // url -> HTMLAudioElement
  var levelAudio = {};       // 本关加载的 url，退关时释放
  var chainToken = 0;
  var unlocked = false;

  function audioCtx() {
    var C = global.AudioContext || global.webkitAudioContext;
    if (!C) return null;
    if (!audioCtx._ctx) audioCtx._ctx = new C();
    return audioCtx._ctx;
  }

  function unlock() {
    unlocked = true;
    var ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      var buf = ctx.createBuffer(1, 1, 22050);
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    } catch (e) { /* 老浏览器忽略 */ }
  }

  function armUnlock() {
    var events = ['pointerdown', 'touchstart', 'keydown'];
    function handler() {
      if (unlocked) return;
      unlock();
      events.forEach(function (type) {
        document.removeEventListener(type, handler, true);
      });
    }
    events.forEach(function (type) {
      document.addEventListener(type, handler, true);
    });
  }

  function loadAudio(src, base) {
    var url = resolveUrl(src, base);
    return new Promise(function (resolve, reject) {
      if (audioPool[url]) return resolve(url);
      if (Object.keys(audioPool).length >= LIMITS.maxAudioNodes) {
        return reject(new Error('音频元素已达上限'));
      }
      var a = new Audio();
      var settled = false;

      function cleanup() {
        a.removeEventListener('canplaythrough', ok);
        a.removeEventListener('loadeddata', ok);
        a.removeEventListener('error', bad);
      }
      function ok() {
        if (settled) return;
        settled = true; cleanup();
        audioPool[url] = a;
        levelAudio[url] = true;
        resolve(url);
      }
      function bad() {
        if (settled) return;
        settled = true; cleanup();
        try { a.src = ''; } catch (e) { /* noop */ }
        reject(new Error('音频无法解码'));
      }

      a.preload = 'auto';
      a.addEventListener('canplaythrough', ok);
      a.addEventListener('loadeddata', ok);
      a.addEventListener('error', bad);
      a.src = url;
      a.load();
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var settled = false;
      img.onload = function () {
        if (settled) return;
        settled = true;
        resolve(src);
      };
      img.onerror = function () {
        if (settled) return;
        settled = true;
        reject(new Error('图片无法加载'));
      };
      img.src = src;
    });
  }

  function play(src, opts) {
    opts = opts || {};
    var url = resolveUrl(src, opts.base || '');
    var a = audioPool[url];
    if (!a) {
      a = new Audio(url);
      audioPool[url] = a;
    }
    if (!unlocked) unlock();

    return new Promise(function (resolve) {
      var done = false;
      function finish(v) {
        if (done) return;
        done = true;
        a.removeEventListener('ended', finishTrue);
        resolve(v);
      }
      function finishTrue() { finish(true); }

      a.addEventListener('ended', finishTrue);
      try { a.currentTime = 0; } catch (e) { /* 未就绪 */ }
      a.volume = opts.volume == null ? 1 : clamp(opts.volume, 0, 1);
      a.muted = !!opts.muted;

      var p = a.play();
      if (p && p.catch) {
        p.catch(function () { finish(false); });
      }
      // 兜底：音频事件丢失时也不能卡住流程
      var guess = (isFinite(a.duration) && a.duration > 0) ? a.duration * 1000 : 8000;
      setTimeout(function () { finish(true); }, guess + 900);
    });
  }

  function say(list, onDone) {
    var items = (list || []).filter(Boolean);
    var my = ++chainToken;
    var i = 0;

    function next() {
      if (my !== chainToken) return;
      if (i >= items.length) {
        if (typeof onDone === 'function') onDone();
        return;
      }
      play(items[i++], {}).then(next);
    }
    next();
  }

  function stopAudio() {
    chainToken += 1;
    Object.keys(audioPool).forEach(function (url) {
      try { audioPool[url].pause(); } catch (e) { /* noop */ }
    });
  }

  function releaseLevel() {
    stopAudio();
    Object.keys(levelAudio).forEach(function (url) {
      var a = audioPool[url];
      if (a) {
        try { a.pause(); a.src = ''; } catch (e) { /* noop */ }
        delete audioPool[url];
      }
      delete levelAudio[url];
    });
  }

  /* ---------------- 合成音效（不占素材、不走网络） ---------------- */

  function tone(freq, dur, opts) {
    var ctx = audioCtx();
    if (!ctx) return;
    opts = opts || {};
    if (ctx.state === 'suspended') ctx.resume();

    var t0 = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    }
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(opts.gain == null ? 0.16 : opts.gain, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var sfx = {
    tap: function () { tone(660, 0.09, { gain: 0.1, type: 'triangle' }); },
    correct: function () {
      tone(987.77, 0.12, { gain: 0.14 });
      tone(1318.51, 0.22, { gain: 0.13, delay: 0.1 });
    },
    wrong: function () { tone(300, 0.22, { gain: 0.1, type: 'sine', to: 196 }); },
    star: function () {
      tone(1567.98, 0.18, { gain: 0.12, type: 'triangle' });
      tone(2093, 0.3, { gain: 0.1, delay: 0.08 });
    },
    deny: function () { tone(220, 0.16, { gain: 0.08, type: 'square' }); }
  };

  /* ---------------- 动画工具 ---------------- */

  var anim = {
    /** 播放一次性动效；返回是否真的播放（预算不足时静默跳过） */
    play: function (node, name, ms) {
      if (!node) return false;
      var cls = 'anim--' + name;
      var seq = (node.__animSeq = (node.__animSeq || 0) + 1);
      node.classList.remove(cls);
      void node.offsetWidth;          // 强制重排，允许同名动画重复触发
      node.classList.add(cls);
      track(node, ms || 620);
      setTimeout(function () {
        // 期间若又触发了新动画，旧定时器不能把新类名摘掉
        if (node.__animSeq === seq) node.classList.remove(cls);
      }, (ms || 620) + 40);
      return true;
    },

    /** 在容器内生成一个短暂特效节点，动画结束立即移除 */
    burst: function (parent, kind, text) {
      if (!parent || budgetLeft() <= 0) return false;
      var node = el('span', 'fx fx--' + (kind || 'spark'), text || '');
      parent.appendChild(node);
      track(node, 900);
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 940);
      return true;
    },

    /** 清掉容器内所有临时特效（切题 / 退关时调用） */
    clear: function (root) {
      var host = root || document;
      Array.prototype.slice.call(host.querySelectorAll('.fx')).forEach(function (n) {
        if (n.parentNode) n.parentNode.removeChild(n);
      });
    },

    budgetLeft: budgetLeft
  };

  /* ---------------- 10 题会话状态机 ----------------
     规则（PROJECT_MATH_RULES §6）：
       · 共 total 题
       · 答错 → 原地重做，firstPass 变 false，但题号不前进
       · 全部答完 → 第一遍全对给 gold，否则 silver
       · gold 才解锁下一关（由 Progress 负责落盘） */

  function createSession(opts) {
    opts = opts || {};
    var total = opts.total || 10;
    var index = 0;
    var firstPass = true;
    var wrong = [];

    return {
      total: total,
      get index() { return index; },
      get firstPass() { return firstPass; },
      get wrongCount() { return wrong.length; },
      get finished() { return index >= total; },

      answer: function (correct) {
        if (correct) {
          index += 1;
          if (index >= total) {
            return {
              done: true,
              star: firstPass ? 'gold' : 'silver',
              wrongCount: wrong.length
            };
          }
          return { done: false, advance: true };
        }
        firstPass = false;
        if (wrong.indexOf(index) < 0) wrong.push(index);
        return { done: false, advance: false, retry: true };
      },

      reset: function () {
        index = 0;
        firstPass = true;
        wrong = [];
      }
    };
  }

  /* ---------------- Three.js 扩展位 ----------------
     当前所有关卡都用 DOM / SVG 渲染。将来需要 3D 时：
       1. 在 index.html 里加 <script type="module"> 动态 import three
       2. 把 mount 改成：创建 WebGLRenderer → 挂到 container → 返回句柄
       3. 退关时调用 dispose()，避免 WebGL 上下文泄漏
     现在返回 null，调用方必须判空，保证「不接 3D 也能跑」。 */

  var three = {
    reserved: true,
    isReady: false,
    mount: function (container, opts) {
      if (!container) return null;
      container.setAttribute('data-renderer', 'dom');
      container.setAttribute('data-three', 'reserved');
      if (opts && opts.log) {
        console.info('[engine] Three.js 扩展位已预留，当前使用 DOM 渲染');
      }
      return null;
    },
    dispose: function () { /* 预留给未来的渲染器释放 */ }
  };

  /* ---------------- 弹层 / 轻提示 ---------------- */

  function openModal(opts) {
    opts = opts || {};
    var root = $('#modal-root');
    if (!root) return null;

    // 上一个弹层若还开着，先正常关闭，避免键盘监听残留
    if (typeof root.__close === 'function') root.__close();

    root.innerHTML = '';
    var card = el('div', 'modal-card');
    if (opts.title) card.appendChild(el('h2', 'modal-title', opts.title));
    if (opts.text) card.appendChild(el('p', 'modal-text', opts.text));

    if (opts.bodyHTML) {
      var body = el('div', 'modal-body');
      body.innerHTML = opts.bodyHTML;
      card.appendChild(body);
    }

    var actions = el('div', 'modal-actions');
    (opts.actions || []).forEach(function (item) {
      var btn = el('button', 'btn' + (item.kind === 'ghost' ? ' btn--ghost' : ''), item.label);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        // onClick 返回 false 表示「不要自动关闭」，用于异步校验 / 失败提示
        var keep = typeof item.onClick === 'function' ? item.onClick(api) : undefined;
        if (keep !== false && item.keepOpen !== true) api.close();
      });
      actions.appendChild(btn);
    });
    if (actions.children.length) card.appendChild(actions);

    root.appendChild(card);
    root.hidden = false;
    requestAnimationFrame(function () { root.classList.add('is-open'); });

    function onKey(e) {
      if (e.key === 'Escape') api.close();
    }

    function onBackdrop(e) {
      if (e.target === root && opts.dismissible !== false) api.close();
    }

    var api = {
      root: root,
      card: card,
      close: function () {
        root.classList.remove('is-open');
        document.removeEventListener('keydown', onKey);
        root.removeEventListener('pointerdown', onBackdrop);
        var mine = card;
        setTimeout(function () {
          // 220ms 内可能已经开了新弹层，别把新内容清掉
          if (root.firstChild !== mine) return;
          root.hidden = true;
          root.innerHTML = '';
          if (root.__close === api.close) root.__close = null;
        }, 220);
        if (typeof opts.onClose === 'function') opts.onClose();
      }
    };

    root.__close = api.close;

    document.addEventListener('keydown', onKey);
    if (opts.dismissible !== false) root.addEventListener('pointerdown', onBackdrop);
    return api;
  }

  var toastTimer = null;

  function toast(text, ms) {
    var node = $('#toast');
    if (!node) return;
    node.textContent = text;
    node.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      node.classList.remove('is-on');
    }, ms || 1800);
  }

  /* ---------------- 按关加载 ---------------- */

  function buildTasks(level, options) {
    var tasks = [];
    var assets = level.assets || {};
    var base = (window.MATH_DATA && window.MATH_DATA.meta.audioBase) || '';

    (assets.audio || []).forEach(function (src) {
      tasks.push({
        src: src,
        run: function () { return loadAudio(src, base); }
      });
    });

    (assets.images || []).forEach(function (src) {
      tasks.push({
        src: src,
        run: function () { return loadImage(src); }
      });
    });

    // 仅用于演示进度条：?demo=loader 时伪造 N 个素材
    var fake = options.simulate || 0;
    for (var i = 0; i < fake; i += 1) {
      (function (n) {
        tasks.push({
          src: 'demo/asset-' + n,
          run: function () {
            return sleep(rand(120, 380)).then(function () {
              if (options.simulateFail && n === 5) {
                throw new Error('模拟失败');
              }
              return true;
            });
          }
        });
      })(i);
    }
    return tasks;
  }

  /**
   * 加载当前关全部素材。
   * @returns {Promise<{ok:boolean, failed:Array, total:number, ms:number}>}
   */
  function loadLevel(level, options) {
    options = options || {};
    var started = Date.now();
    var tasks = buildTasks(level, options);
    var done = 0;
    var failed = [];

    loader.open(level && level.name ? '准备「' + level.name + '」' : '素材加载中');
    loader.set(0, '0 / ' + tasks.length);

    function tick() {
      loader.set(tasks.length ? done / tasks.length : 1, done + ' / ' + tasks.length);
    }

    var work = Promise.all(tasks.map(function (task) {
      return withTimeout(task.run(), LIMITS.assetTimeout).then(function () {
        done += 1; tick();
      }, function (err) {
        done += 1; tick();
        failed.push({ src: task.src, error: String((err && err.message) || err) });
      });
    }));

    return Promise.all([work, sleep(LIMITS.loaderMinMs)]).then(function () {
      var ms = Date.now() - started;
      if (failed.length) {
        loader.fail('有 ' + failed.length + ' 个素材没加载成功', function () {
          loader.close();
          if (typeof options.onRetry === 'function') options.onRetry();
        });
        return { ok: false, failed: failed, total: tasks.length, ms: ms };
      }
      loader.set(1, done + ' / ' + tasks.length);
      return sleep(180).then(function () {
        loader.close();
        return { ok: true, failed: [], total: tasks.length, ms: ms };
      });
    });
  }

  /* ---------------- 对外接口 ---------------- */

  global.Engine = {
    version: '0.1.0',
    limits: LIMITS,
    loadLevel: loadLevel,
    loader: loader,
    audio: {
      armUnlock: armUnlock,
      unlock: unlock,
      preload: loadAudio,
      play: play,
      say: say,
      stop: stopAudio,
      releaseLevel: releaseLevel,
      poolSize: function () { return Object.keys(audioPool).length; }
    },
    sfx: sfx,
    anim: anim,
    session: createSession,
    three: three,
    modal: openModal,
    toast: toast,
    util: {
      $: $,
      el: el,
      sleep: sleep,
      clamp: clamp,
      rand: rand,
      withTimeout: withTimeout
    }
  };
})(window);
