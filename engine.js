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
    maxMotion: 10,          // 同屏运动元素上限，超过则丢弃新的装饰动画
    loaderMinMs: 460,       // 加载遮罩最短停留，避免闪一下就消失
    /* 单个素材超时。GitHub Pages 只提供 HTTP/1.1，同源并发上限 6，
       首次进关每个请求都要付 TLS+TTFB（实测 0.8–1.2s），偶尔排队到十几秒。
       原来 15s 会把「只是慢」误判成「加载失败」，直接挡在关卡外面。 */
    assetTimeout: 45000,
    maxAudioNodes: 40,      // 音频元素上限（iOS 媒体元素超限会静默失声）
    /* 同源上限就是 6（HTTP/1.1），用满；再多只会排队不会更快 */
    assetConcurrency: 6
  };

  /* ---------------- 4 岁起步 · 集中接线的共享状态 ----------------
     全部 48 关都通过 Engine.session({total}) 与 Engine.quiz.shuffle(questions)
     两个统一入口驱动，因此把 B/C 组的机制集中在本文件接线，不改 48 个关卡文件。 */
  var activeLevelId = 0;     // loadLevel 时记录，供呈现规划识别当前关
  var lastSession = null;    // 最近一次 createSession，供呈现规划 setTotal 修正题量
  var sessionFlags = {
    groupComplete: false, lastGroupOnly: false, track: 'core', isChallenge: false,
    // 断点续做时，本局队列前面已经完成了多少题（进度点从这里继续点亮）
    resumeOffset: 0
  };

  // 事件名来自 wellbeing.js（先加载）；这里做兜底，保证单独加载 engine.js 也不报错
  var EVT = global.EVT || {
    TICK: 'wb:tick', LEVEL_ENTER: 'wb:levelEnter', QUESTION_ENTER: 'wb:questionEnter',
    LEVEL_COMPLETE: 'wb:levelComplete', SETTINGS_CHANGED: 'wb:settingsChanged',
    UNDO: 'wb:undo', TAP: 'wb:tap', CONFIRM: 'wb:confirm', ADVANCE: 'wb:advance',
    GROUP_DONE: 'wb:groupDone', WRONG: 'quiz:wrong'
  };

  function emit(name, detail) {
    if (typeof document === 'undefined' || !document.dispatchEvent) return;
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }
    catch (e) { try { document.dispatchEvent(new CustomEvent(name)); } catch (e2) { /* noop */ } }
  }

  /** C7 跨关「再玩一次」原题：voice 被写成 'lvNN/../lvMM/key' 相对路径，
      规范化回 'lvMM/key' —— 仍是既有语音 key，零新增、零改文案。 */
  function normSrc(src) {
    if (typeof src !== 'string') return src;
    return src.replace(/lv\d+\/\.\.\//g, '');
  }

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

  /** 限流并发：弱网下 20 个素材同时请求会互相抢带宽，反而更容易触发 15s 超时 */
  function runPool(items, limit, worker) {
    return new Promise(function (resolve) {
      var next = 0;
      var left = items.length;
      if (!left) return resolve();
      function launch() {
        if (next >= items.length) return;
        var item = items[next++];
        Promise.resolve().then(function () { return worker(item); }).then(function () {
          left -= 1;
          if (left === 0) resolve(); else launch();
        }, function () {
          left -= 1;
          if (left === 0) resolve(); else launch();
        });
      }
      for (var k = 0; k < Math.min(limit, items.length); k += 1) launch();
    });
  }

  /**
   * 给素材 URL 挂内容 hash。asset-manifest.js 由 tools/gen-asset-manifest.js 生成：
   * 内容不变 → URL 不变 → 老设备继续命中本地缓存；内容变了 → URL 变 → 自动取新副本。
   * 已带 v= 的 URL 原样返回，保证多次经过本函数时幂等。
   */
  function versionedUrl(url) {
    if (!url || /^(https?:|data:|blob:)/.test(url)) return url;
    if (/[?&]v=/.test(url)) return url;
    var mf = global.ASSET_MANIFEST;
    var clean = url.split('?')[0].replace(/^\.\//, '');
    var hash = mf && mf.files && mf.files[clean];
    if (!hash) return url;                    // 清单外的资源（例如开发期新加的）保持原样
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + hash;
  }

  function resolveUrl(src, base) {
    if (!src) return '';
    var s = normSrc(src);   // C7 跨关原题的相对路径规范化（既有 key，零新增）
    if (/^(https?:|data:|blob:)/.test(s)) return s;
    return versionedUrl((base || '') + s);
  }

  /* ---------------- 素材持久化（Cache Storage） ----------------
     首次下载后写入 Cache Storage，同设备再次进入直接命中本地，
     不再走网络；只有真的发生下载时才显示读条。 */

  var CACHE_NAME = 'math-adventure-assets-v1';
  var objectUrls = {};
  var cacheReady = null;

  function cacheSupported() {
    return typeof global.caches !== 'undefined' &&
      typeof global.fetch === 'function' &&
      location.protocol !== 'file:';
  }

  function openAssetCache() {
    if (cacheReady) return cacheReady;
    if (!cacheSupported()) {
      cacheReady = Promise.resolve(null);
      return cacheReady;
    }
    cacheReady = caches.open(CACHE_NAME).then(function (cache) {
      return cache;
    }).catch(function () { return null; });
    return cacheReady;
  }

  function cleanupOldAssetCaches() {
    if (!cacheSupported() || !caches.keys) return Promise.resolve();
    return caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (key) {
        return key.indexOf('math-adventure-assets-') === 0 && key !== CACHE_NAME;
      }).map(function (key) { return caches.delete(key); }));
    }).catch(function () { /* 忽略 */ });
  }

  /**
   * 增量清理：只删「hash 已过期」或「清单里已不存在」的条目。
   * 以前靠改 CACHE_NAME 让整库失效，改一张图就要重下全部 20MB 素材；
   * 现在每个 URL 自带内容 hash，过期条目可被精确识别。
   */
  function pruneAssetCache() {
    if (!cacheSupported()) return Promise.resolve();
    var mf = global.ASSET_MANIFEST;
    return cleanupOldAssetCaches().then(function () {
      return openAssetCache();
    }).then(function (cache) {
      if (!cache || !cache.keys || !mf || !mf.files) return;
      var basePath;
      try { basePath = new URL('.', location.href).pathname; } catch (e) { basePath = '/'; }
      return cache.keys().then(function (requests) {
        var doomed = [];
        requests.forEach(function (req) {
          var u;
          try { u = new URL(req.url); } catch (e) { return; }
          var rel = decodeURIComponent(u.pathname.indexOf(basePath) === 0
            ? u.pathname.slice(basePath.length) : u.pathname.replace(/^\//, ''));
          var want = mf.files[rel];
          var got = u.searchParams ? u.searchParams.get('v') : null;
          if (!want || got !== want) doomed.push(req);
        });
        return Promise.all(doomed.map(function (req) {
          return cache.delete(req).catch(function () { /* 配额/权限问题忽略 */ });
        }));
      });
    }).catch(function () { /* 清理失败不影响游玩 */ });
  }

  function absoluteUrl(url) {
    try { return new URL(url, location.href).href; } catch (e) { return url; }
  }

  function blobUrlFor(url, blob) {
    if (objectUrls[url]) URL.revokeObjectURL(objectUrls[url]);
    var obj = URL.createObjectURL(blob);
    objectUrls[url] = obj;
    return obj;
  }

  function readCachedAsset(cache, url) {
    if (!cache) return Promise.resolve(null);
    return cache.match(absoluteUrl(url)).then(function (hit) {
      return hit ? hit.blob() : null;
    }).catch(function () { return null; });
  }

  function downloadAsset(cache, url, isRetry) {
    return fetch(url, { credentials: 'same-origin' }).then(function (res) {
      if (!res.ok) {
        var httpErr = new Error('HTTP ' + res.status);
        httpErr.status = res.status;
        throw httpErr;
      }
      var copy = res.clone();
      return res.blob().then(function (blob) {
        if (cache) cache.put(absoluteUrl(url), copy).catch(function () { /* 配额满则跳过 */ });
        return blob;
      });
    }).catch(function (err) {
      // 4xx 是确定性错误（文件确实不在），重试没有意义；
      // 网络抖动 / 5xx / 超时值得隔 400ms 再试一次，弱网下这一次能把失败率压掉大半。
      var definite = err && err.status >= 400 && err.status < 500;
      if (isRetry || definite) throw err;
      return sleep(400).then(function () { return downloadAsset(cache, url, true); });
    });
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
      u.title.textContent = title || 'Loading';
      u.hint.textContent = 'Getting the sounds ready…';
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
      u.hint.textContent = text || 'Could not load the sounds. Please try again.';
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
  var levelImages = {};      // 本关加载的图片 url，退关时释放
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

  function loadAudio(src, base, cache, stats) {
    var url = resolveUrl(src, base);
    return new Promise(function (resolve, reject) {
      if (audioPool[url]) return resolve(url);
      if (Object.keys(audioPool).length >= LIMITS.maxAudioNodes) {
        return reject(new Error('音频元素已达上限'));
      }

      var prepare;
      if (objectUrls[url]) {
        prepare = Promise.resolve(objectUrls[url]);
      } else {
        prepare = readCachedAsset(cache, url).then(function (blob) {
          if (blob) return blobUrlFor(url, blob);
          if (stats) stats.downloaded += 1;
          return downloadAsset(cache, url).then(function (data) {
            return blobUrlFor(url, data);
          });
        });
      }

      prepare.then(function (playUrl) {
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
        a.src = playUrl;
        a.load();
      }, function (err) {
        reject(err instanceof Error ? err : new Error('音频下载失败'));
      });
    });
  }

  /**
   * 图片与音频共用一条缓存管道（§4.6）：
   * 命中 Cache Storage 直接用 blob URL；没命中才下载并写回缓存。
   * resolve 出来的是可以直接塞进 CSS 的 URL。
   */
  function loadImage(src, cache, stats) {
    var url = resolveUrl(src, '');
    var prepare;

    if (objectUrls[url]) {
      prepare = Promise.resolve(objectUrls[url]);
    } else {
      prepare = readCachedAsset(cache, url).then(function (blob) {
        if (blob) return blobUrlFor(url, blob);
        if (stats) stats.downloaded += 1;
        return downloadAsset(cache, url).then(function (data) {
          return blobUrlFor(url, data);
        });
      });
    }

    return prepare.then(function (playUrl) {
      return new Promise(function (resolve, reject) {
        var img = new Image();
        var settled = false;
        img.onload = function () {
          if (settled) return;
          settled = true;
          levelImages[url] = true;
          resolve(playUrl);
        };
        img.onerror = function () {
          if (settled) return;
          settled = true;
          reject(new Error('图片无法解码'));
        };
        img.src = playUrl;
      });
    }, function (err) {
      throw err instanceof Error ? err : new Error('图片下载失败');
    });
  }

  function play(src, opts) {
    opts = opts || {};
    // 语音互斥：默认先停掉正在播的，再播新的，避免两条题干叠在一起
    if (opts.exclusive !== false) stopAudio();
    var url = resolveUrl(src, opts.base || '');

    function doPlay(a) {
      if (!a) return Promise.resolve(false);
      if (!unlocked) unlock();
      return new Promise(function (resolve) {
        var done = false;
        var timer = null;
        function finish(v) {
          if (done) return;
          done = true;
          if (timer) clearTimeout(timer);
          a.removeEventListener('ended', finishTrue);
          a.removeEventListener('error', finishFalse);
          resolve(v);
        }
        function finishTrue() { finish(true); }
        function finishFalse() { finish(false); }

        a.addEventListener('ended', finishTrue);
        a.addEventListener('error', finishFalse);
        try { a.currentTime = 0; } catch (e) { /* 未就绪 */ }
        a.volume = opts.volume == null ? 1 : clamp(opts.volume, 0, 1);
        a.muted = !!opts.muted;

        try {
          var p = a.play();
          if (p && p.catch) p.catch(function () { finish(false); });
        } catch (e) {
          return finish(false);
        }

        // 兜底：音频事件丢失时也不能卡住流程；finish() 会清掉这个定时器
        var guess = (isFinite(a.duration) && a.duration > 0) ? a.duration * 1000 : 8000;
        timer = setTimeout(function () { finish(true); }, guess + 900);
      });
    }

    if (audioPool[url]) return doPlay(audioPool[url]);

    /* 未预载的语音改走和关卡素材同一条 Cache Storage 管道。
       旧实现直接 new Audio(网络 URL)：既绕过离线缓存，又不写进 levelAudio，
       40 个音频名额会被永久占满，最终表现为「读条失败 / 没声音」。

       只在「有预载池但缺这一条」时告警：池子空了说明刚退关（releaseLevel），
       这时候还在路上的语音被丢掉是正常的，不该报成问题。 */
    if (global.console && console.warn && Object.keys(audioPool).length) {
      console.warn('[engine] voice not preloaded, falling back: ' + url);
    }
    return openAssetCache().then(function (cache) {
      return loadAudio(src, opts.base || '', cache, null);
    }).then(function (loadedUrl) {
      return doPlay(audioPool[loadedUrl]);
    }).catch(function () {
      return false;
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
      if (objectUrls[url]) {
        try { URL.revokeObjectURL(objectUrls[url]); } catch (e) { /* noop */ }
        delete objectUrls[url];
      }
      delete levelAudio[url];
    });

    // 图片延后 900ms 再撤销：退关时关卡屏还在淡出，立刻 revoke 会闪一下空白
    Object.keys(levelImages).forEach(function (url) {
      var blobUrl = objectUrls[url];
      delete objectUrls[url];
      delete levelImages[url];
      if (!blobUrl) return;
      setTimeout(function () {
        try { URL.revokeObjectURL(blobUrl); } catch (e) { /* noop */ }
      }, 900);
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
    // B5/B11 禁用失败音效：保留函数名以兼容 48 关调用，改为极轻的中性「再听一次」
    // 提示（无下行、无负面暗示、<1s），不出现哭脸/失败音/强闪。
    wrong: function () { tone(523.25, 0.09, { gain: 0.045, type: 'sine' }); },
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

    /** 给 WAAPI 动画登记运动预算（关卡模块用） */
    track: track,

    budgetLeft: budgetLeft
  };

  /* ---------------- 局内会话状态机（B1–B6 / A3 / C5 集中接线） ----------------
     兼容 48 关既有调用约定：answer(correct) 仍返回 {done, advance, retry, star, wrongCount}。
     4 岁起步：完成即解锁、银星=完成即得、金星可选徽章默认关、防误触 0.4s、
     重听/提示/撤销豁免（不计 firstTryCleanCorrect 但答对仍前进不降星）、
     三级分级反馈、三态 correct/near/wrong/shown（禁用 fail）、near 不写 wrongCount。 */
  function createSession(opts) {
    opts = opts || {};
    var total = opts.total || 10;
    var levelId = opts.levelId || activeLevelId || 0;
    var W = global.Wellbeing;
    var CAP = (W && W.CAP) || { MAX_DWELL: 3, CONFIRM_MS: 400, GROUP_SPLIT: [10] };
    var groupSizes = opts.groupSizes || CAP.GROUP_SPLIT || [10];
    var maxDwell = opts.maxDwell || CAP.MAX_DWELL || 3;
    var confirmMs = CAP.CONFIRM_MS || 400;
    var isChallenge = !!(global.RouteMap && levelId && !global.RouteMap.isCore(levelId));
    sessionFlags.track = isChallenge ? 'challenge' : 'core';
    sessionFlags.isChallenge = isChallenge;

    var index = 0;
    var firstPass = true;
    var wrong = [];
    var attempts = {};          // 每题答错次数（maxDwell 到上限必放行）
    var outcomes = {};          // 每题 correct/near/wrong/shown（禁用 fail）
    var flags = {};             // 每题 replayUsed/hintUsed/undoUsed
    var cleanCount = 0;         // firstTryCleanCorrect（B4 可选徽章用）
    var correctCount = 0;
    var shownPendingAdvance = false;
    var confirm = null;         // S_CONFIRM 预选高亮
    var queue = null;
    var plannedRefs = [];       // 本组题的全局引用（不改题目对象）
    var answerHints = [];       // 每题数值答案（near 判定用）
    var solvedRefs = [];        // 本关已做对的题引用
    // 分组进度必须从游标继承：persist() 每答一题都会整份回写，
    // 若以空数组起手，会把上一局记录的分组结果抹掉（金星永远判不出来）。
    var cursor0 = (W && W.store && levelId) ? (W.store.getCursor(levelId) || {}) : {};
    var groupsDone = (cursor0.groupsDone || []).slice();
    var groupResults = cursor0.groupResults || {};
    var levelGroupIndex = null; // 由 planQueue 决定：本局对应第几个分组
    // 整关一轮的「干净」标记：本轮内出现过任何一次真答错 / 展示答案，就再也拿不到金星。
    // 必须随游标持久化，否则「做一半退出、回来做完」会把之前的错题洗白。
    var roundClean = cursor0.roundClean !== false;
    var roundTotal = 10;        // 本关总题数，由 planQueue 回填
    var lastValue = null;       // 最近一次选项点击 data-value（near 判定用）

    function flagsOf(i) { return flags[i] || (flags[i] = { replayUsed: false, hintUsed: false, undoUsed: false }); }
    function settings() { return W && W.settings ? W.settings() : {}; }

    /** 第 i 题（0 基、按本关整体计数）属于第几组 */
    function groupIndexOf(at) {
      var i = (at == null ? index : at);
      var acc = 0;
      for (var g = 0; g < groupSizes.length; g += 1) {
        acc += groupSizes[g];
        if (i < acc) return g;
      }
      return groupSizes.length - 1;
    }

    // persist 语义：下一题所在组（断点续做用）
    function currentGroupId() { return groupIndexOf(index); }

    // C5 逐题写盘：每次答题后把 levelCursor 写进独立本地分区（不进 Gist）
    function persist() {
      if (!W || !W.store || !levelId) return;
      W.store.setCursor(levelId, {
        nextQIndex: index,
        currentGroupId: currentGroupId(),
        groupsDone: groupsDone.slice(),
        groupResults: groupResults,
        solved: solvedRefs.slice(),
        total: total,
        roundClean: roundClean,
        roundTotal: roundTotal
      });
    }

    function wrongTagOf(detail) {
      var f = flagsOf(index);
      if (detail && detail.needListen) return 'needListen';
      if (f.replayUsed || (detail && detail.replayUsed)) return 'needListen';
      if (f.hintUsed || (detail && detail.hintUsed)) return 'needHint';
      return 'concept';
    }

    // B6 near：20 以内整数 |选中−正确|≤1 / 拖拽外接圈 / 同族相邻干扰项；不以耗时判定
    function isNear(value, answer, d) {
      d = d || {};
      if (d.dragInOuterRing) return true;
      if (d.adjacentDistractor) return true;
      var v = Number(value), a = Number(answer);
      if (!isFinite(v) || !isFinite(a)) return false;
      return Math.abs(a) <= 20 && Math.abs(v - a) <= 1;
    }

    function finishResult() {
      // 星级规则（一关一局 · 4 岁起步）：
      //   银星 = 完成即得、可解锁下一关；
      //   金星 = 本轮整关全部答对（首答、无「展示答案」、无因错降级）。
      // 一关 10 题在一次进入里连续做完（疲劳由 Wellbeing 按时间插休息画面），
      // 只在整关收尾结算一次——否则会出现「前 6 题全对却发银星」，与「全对必须给金」矛盾。
      var groupClean = (cleanCount >= total && firstPass);
      var roundEnd = (solvedRefs.length >= roundTotal);
      var star = (roundEnd && roundClean && groupClean) ? 'gold' : 'silver';
      sessionFlags.groupComplete = true;

      if (W && W.store && levelId) {
        // 分组字段保留写盘（兼容旧存档与复习池），但星级只按「本轮是否干净」判
        var g = (levelGroupIndex == null ? 0 : levelGroupIndex);
        var gd = groupsDone.slice();
        if (gd.indexOf(g) < 0) gd.push(g);
        var gr = groupResults || {};
        gr[g] = (roundClean && groupClean);
        groupsDone = gd.slice();
        groupResults = gr;

        if (roundEnd) {
          // 整关收尾：清空本轮记录，下次进来是全新一轮（重玩不复用上次的已做对）
          W.store.setCursor(levelId, {
            nextQIndex: 0, currentGroupId: 0,
            groupsDone: [], groupResults: {},
            solved: [], total: 0, roundClean: true, roundTotal: roundTotal, planned: []
          });
          groupsDone = [];
          groupResults = {};
        } else {
          W.store.setCursor(levelId, {
            nextQIndex: index, currentGroupId: g,
            groupsDone: gd, groupResults: gr,
            solved: solvedRefs.slice(), total: total,
            roundClean: roundClean, roundTotal: roundTotal
          });
        }
      }

      emit(EVT.LEVEL_COMPLETE, {
        levelId: levelId, track: sessionFlags.track, star: star,
        badge: star === 'gold', clean: groupClean,
        cleanCount: cleanCount, correctCount: correctCount, wrongCount: wrong.length,
        lastGroupOnly: roundEnd
      });
      return {
        done: true, advance: false, retry: false, star: star,
        badge: star === 'gold', clean: groupClean,
        wrongCount: wrong.length, cleanCount: cleanCount, correctCount: correctCount,
        track: sessionFlags.track, lastGroupOnly: roundEnd
      };
    }

    var api = {
      // 必须是 getter：setTotal 会在规划队列时改题量，写成普通属性会留下旧快照，
      // 关卡与验收脚本读到的 total 会与实际队列不一致。
      get total() { return total; },
      levelId: levelId,
      get index() { return index; },
      get firstPass() { return firstPass; },
      get wrongCount() { return wrong.length; },
      get finished() { return index >= total; },
      get cleanCorrectCount() { return cleanCount; },
      get correctCount() { return correctCount; },
      get track() { return sessionFlags.track; },

      setTotal: function (n) { total = Math.max(1, Math.floor(n) || 1); return total; },
      // 由 planQueue 回填：本局是第几个分组（结算判金星用，组内 index 无法反推）
      setGroupIndex: function (i) {
        levelGroupIndex = Math.max(0, Math.min(Number(i) || 0, groupSizes.length - 1));
        return levelGroupIndex;
      },
      // 由 planQueue 回填：本关总题数（10），结算时判断「整关是否做完」
      setRoundTotal: function (n) {
        roundTotal = Math.max(1, Math.floor(Number(n)) || 10);
        return roundTotal;
      },
      // 整关做完后重玩：清掉本关分组进度，开启新一轮
      resetGroupProgress: function () {
        groupsDone = [];
        groupResults = {};
        levelGroupIndex = 0;
        return true;
      },
      setQueue: function (q, hints, solved, refs) {
        queue = q || null;
        answerHints = hints || [];
        solvedRefs = (solved || []).slice();
        plannedRefs = (refs || []).slice();
        if (W && W.store && levelId) {
          var c = W.store.getCursor(levelId);
          if (c) { groupsDone = (c.groupsDone || []).slice(); groupResults = c.groupResults || {}; }
        }
      },
      setLastValue: function (v) { lastValue = v; },
      // 只读：供验收脚本取本题的期望答案（near 判定用的同一份 hints）
      hintAt: function (i) { return answerHints[i] == null ? null : answerHints[i]; },

      // B2 防误触：EVT_TAP → S_CONFIRM 0.4s 单点确认（预选高亮、大目标二次确认）
      tap: function (target) {
        confirm = { target: target || null, at: Date.now(), done: false };
        emit(EVT.TAP, { levelId: levelId, confirmMs: confirmMs });
        return { pending: true, confirmAfterMs: confirmMs };
      },
      confirmTap: function () {
        if (!confirm) return false;
        confirm.done = true; confirm = null;
        emit(EVT.CONFIRM, { levelId: levelId });
        return true;
      },
      // B2 EVT_UNDO 撤销不写任何数据
      undo: function () {
        confirm = null;
        flagsOf(index).undoUsed = true;
        emit(EVT.UNDO, { levelId: levelId, index: index });
        return true;
      },
      markReplay: function (i) { flagsOf(i == null ? index : i).replayUsed = true; },
      markHint: function (i) { flagsOf(i == null ? index : i).hintUsed = true; },
      isNear: isNear,

      // A3：本题 resolved 之后、下一题 enter 之前才收尾；deadlineReached 不影响本题判定
      resolve: function () { if (W && W.resolveQuestion) W.resolveQuestion(); },
      beginQuestion: function () {
        if (W && W.beginQuestion) W.beginQuestion();
        emit(EVT.QUESTION_ENTER, { levelId: levelId, index: index, track: sessionFlags.track });
      },
      beforeAdvance: function () {
        return W && W.beforeAdvance ? W.beforeAdvance() : false;  // onAdvance 唯一拦截点
      },

      answer: function (correct, detail) {
        detail = detail || {};
        // C1 超时守卫（兜底）：关卡超时回调登记 timerApi.onTimeout 后，紧随其后的
        // wrong()/answer(false) 一律判为 timeout，绝不写 wrongCount、不进复习池。
        // 正常路径已由 7 个限时关改走 timer.onTimeout（重听重给本题），此守卫是第二道保险。
        if (!correct && timerApi.isTimeoutPending()) detail.timeout = true;
        var i = index;
        var f = flagsOf(i);
        var hint = answerHints[i];

        // B6 near 判定：显式 detail 优先，否则用 data-value 与数值答案推断（能算才判，安全降级）
        var near = !!detail.near;
        if (!near && !correct && detail.value == null && lastValue != null && hint != null) {
          near = isNear(lastValue, hint, detail);
        }
        if (!near && !correct && detail.value != null) {
          near = isNear(detail.value, detail.answer != null ? detail.answer : hint, detail);
        }
        lastValue = null;

        if (correct) {
          // B6 用过「再听一次」后答对直接算 correct；判定瞬间清过程动效（三轨时序）
          if (global.Feedback) global.Feedback.bus.correct({});
          var exempt = f.replayUsed || f.hintUsed || f.undoUsed;
          // B3 豁免不影响前进与星，只是不计 firstTryCleanCorrect
          if (!exempt && !attempts[i] && !shownPendingAdvance) cleanCount += 1;
          correctCount += 1;
          outcomes[i] = 'correct';
          shownPendingAdvance = false;
          index += 1;
          solvedRefs.push(plannedRefs[i] || (String(levelId) + ':' + i));
          api.resolve();
          persist();     // C5 逐题写盘
          emit('quiz:correct', { levelId: levelId, index: i, track: sessionFlags.track });
          if (index >= total) return finishResult();
          return { done: false, advance: true, retry: false, outcome: 'correct',
                   wrongCount: wrong.length, correctCount: correctCount };
        }

        // 未答对：答错无表扬语音无星（三轨时序）
        if (global.Feedback) global.Feedback.bus.wrong();

        // C1 超时不判错：不写 wrongCount、不进复习池、不扣、不卡关，只自动重听重给本题。
        // challengeTimeout 与 quiz:timeout 统一由 timerApi.onTimeout 登记（避免重复计数）；
        // 本分支只更新状态机 outcome，主要服务「超时守卫」兜底路径。
        if (detail.timeout) {
          outcomes[i] = 'timeout';
          return { done: false, advance: false, retry: true, outcome: 'timeout',
                   replay: true, writeWrong: false, wrongCount: wrong.length };
        }
        // B2 撤销：不写任何数据
        if (detail.undo) {
          emit(EVT.UNDO, { levelId: levelId, index: i });
          return { done: false, advance: false, retry: true, outcome: 'undo', writeWrong: false };
        }
        // B6 near：差一点，不写 wrongCount、不进复习池、不判 fail
        if (near) {
          outcomes[i] = 'near';
          emit('quiz:near', { levelId: levelId, index: i, value: detail.value, answer: hint });
          return { done: false, advance: false, retry: true, outcome: 'near', near: true,
                   writeWrong: false, wrongCount: wrong.length };
        }

        // B7 真答错（非误触撤销、非超时）；challenge 轨答错不进复习池（C4）
        firstPass = false;
        roundClean = false;      // 本轮一旦有真答错，金星不再可得（随游标持久化）
        persist();
        attempts[i] = (attempts[i] || 0) + 1;
        var n = attempts[i];
        if (wrong.indexOf(i) < 0) wrong.push(i);
        outcomes[i] = 'wrong';
        var tag = wrongTagOf(detail);
        var toReview = !isChallenge;
        emit(EVT.WRONG, {
          levelId: levelId, index: i, attempt: n, wrongTag: tag,
          realWrong: true, timeout: false, undo: false,
          countsForReview: toReview, track: sessionFlags.track
        });
        if (global.Review && toReview && typeof global.Review.recordWrong === 'function') {
          global.Review.recordWrong(levelId, i, tag);
        }

        var result = { done: false, advance: false, retry: true, outcome: 'wrong',
                       attempt: n, wrongCount: wrong.length, writeWrong: true, wrongTag: tag };
        if (n === 1) {
          // B5 第 1 次：提示（高亮 + 自动重听 + 示范），保持 3 选 1
          result.level = 1; result.hint = true; result.autoReplay = true; result.demo = true;
        } else if (n === 2) {
          // B5 第 2 次：降级 3 选 1 → 2 选 1（运算题追加实物计数支架）
          result.level = 2; result.degrade = true; result.optionCount = 2; result.countingScaffold = true;
        } else if (n >= 3 || n >= maxDwell) {
          // B5 第 3 次：展示答案并前进（正确项放大停留 1.5s、outcome=shown、无条件前进）
          result.level = 3; result.outcome = 'shown'; result.forceAdvance = true;
          result.revealHoldMs = (global.FB_SPEC && global.FB_SPEC.revealHoldMs) || 1500;
          result.answer = hint;          // 数值题的正确答案，供关卡高亮；识别题为 null
          outcomes[i] = 'shown';
          shownPendingAdvance = true;
          emit('quiz:shown', { levelId: levelId, index: i, holdMs: result.revealHoldMs });
        }
        persist();
        return result;
      },

      /* B5 第 3 次「展示答案并前进」的推进动作。
         与 answer(true) 的区别：不计 cleanCount、不算首答正确，星级只能是银。
         由 Engine.flow.shown() 在 1.5s 停留结束后调用。 */
      advanceShown: function () {
        if (index >= total) return finishResult();
        var i = index;
        outcomes[i] = 'shown';
        var ref = plannedRefs[i] || (String(levelId) + ':' + i);
        if (solvedRefs.indexOf(ref) < 0) solvedRefs.push(ref);
        index += 1;
        shownPendingAdvance = false;
        api.resolve();
        persist();
        emit('quiz:advance', { levelId: levelId, index: i, track: sessionFlags.track, shown: true });
        if (index >= total) return finishResult();
        return { done: false, advance: true, retry: false, outcome: 'shown',
                 wrongCount: wrong.length, correctCount: correctCount };
      },

      reset: function () {
        index = 0; firstPass = true; wrong = []; attempts = {}; outcomes = {};
        flags = {}; cleanCount = 0; correctCount = 0;
        shownPendingAdvance = false; confirm = null;
      }
    };
    lastSession = api;
    return api;
  }

  /* ---------------- 选择题选项（各关共用） ----------------
     · 选项数默认 4，可在关卡配置里用 optionCount 覆盖
     · 干扰项优先取离正确答案最近的数值
     · 答错重排时，整体顺序与正确答案所在位置都必须变化 */

  function shuffleList(list) {
    for (var k = list.length - 1; k > 0; k -= 1) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = list[k]; list[k] = list[j]; list[j] = tmp;
    }
    return list;
  }

  /* ---------------- 题目队列呈现规划（C5/C6/C7 集中接线） ----------------
     48 关统一用 Engine.quiz.shuffle(ctx.level.questions.slice()) 生成队列。
     这里识别「题目对象数组」并接管呈现顺序；普通选项数组仍走原洗牌。
     只搬引用、不改题目对象、不删 480 题；跨关原题用相对路径复用既有语音 key。 */

  function looksLikeQuestionList(list) {
    if (!list || !list.length) return false;
    var f = list[0];
    if (!f || typeof f !== 'object') return false;
    return ('voice' in f) || ('type' in f) || ('object' in f) ||
           ('options' in f) || ('sentences' in f) || ('a' in f && 'b' in f);
  }

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /** 数值答案（near 判定用，不改题目对象；算不出就返回 null，安全降级不误判） */
  function numericAnswerOf(q) {
    if (!q) return null;
    if (q.answer != null && isFinite(Number(q.answer))) return Number(q.answer);
    if (q.a != null && q.b != null && isFinite(Number(q.a)) && isFinite(Number(q.b))) {
      var op = q.op || '+';
      if (op === '+') return Number(q.a) + Number(q.b);
      if (op === '-') return Number(q.a) - Number(q.b);
      if (op === 'x' || op === '*') return Number(q.a) * Number(q.b);
      if (op === '/') return Number(q.b) ? Number(q.a) / Number(q.b) : null;
    }
    return null;
  }

  function voiceKeyOf(q, lid, qi) {
    var key = (q && q.voice && q.voice[0]) || ('q' + (qi + 1));
    return 'lv' + pad2(lid) + '/' + key;
  }

  function planQuestionQueue(list) {
    var W = global.Wellbeing, R = global.RouteMap, Rev = global.Review, D = global.MATH_DATA;
    if (!W || !R || !D || !activeLevelId || !lastSession) return shuffleList(list);
    var levelId = activeLevelId;
    var n = list.length;

    // C6 同族聚成连续块、块首 isFirstOfType（只重排呈现顺序，不改题目对象、不删题）
    var plan6 = R.planPresentation(list, 2);
    var ordered = plan6.shown.concat(plan6.moved);
    var orderedRefs = ordered.map(function (q) { return String(levelId) + ':' + list.indexOf(q); });
    sessionFlags.firstOfTypeIndex = plan6.firstOfTypeIndex;
    sessionFlags.familyBudget = {
      families: plan6.families, moved: plan6.movedFamilies,
      movedRefs: plan6.moved.map(function (q) { return String(levelId) + ':' + list.indexOf(q); })
    };

    var cursor = W.store.getCursor(levelId) || {};
    /* 中途退出不接续（2026-11-22）：从地图再次进关一律从第 1 题重新开始。
       旧行为会按 cursor.solved 只出剩余题，孩子看到的是「10 个进度点却只做 4 题」，
       且上一局的对错会带进新一局。这里直接丢弃游标，保证每次进关都是完整一局；
       重玩按钮（ctx.restart）同样走这个入口，行为一致。 */
    if (cursor.solved && cursor.solved.length) {
      if (W.store.clearCursor) W.store.clearCursor(levelId);
      cursor = {};
    }
    var solved = [];
    // 一关一局：整关 10 题在一次进入里连续做完（疲劳由 Wellbeing 按时间插休息画面），
    // 只在整关收尾结算一次，才能保证「全对 = 金星」。
    var groupSizes = [Math.max(1, n)];
    var gIdx = 0;

    var globalPending = W.store.pendingAll();
    var localPending = globalPending.filter(function (r) {
      return String(r).indexOf(String(levelId) + ':') === 0;
    });
    var otherPending = globalPending.filter(function (r) {
      return String(r).indexOf(String(levelId) + ':') !== 0;
    });

    // C7 每 3 关「再玩一次」（仅 core 轨、收尾局不插、整组替换当次新题）
    var reviewRefs = null;
    var isCore = R.isCore(levelId);
    var coreLevelsDone = 0;
    var sigOf = (Rev && typeof Rev.signatureOf === 'function') ? Rev.signatureOf : null;
    /* 本关渲染器认得哪些「题目形状」：只有形状一致的原题才能进来。
       否则 L8 的 drag 题会落到 L9 的 flash 分支，屏幕上出现 undefined，
       答案算成 NaN，孩子怎么点都不对（卡死）。 */
    var shapes = null;
    if (sigOf) {
      shapes = {};
      list.forEach(function (q) { if (q) shapes[sigOf(q)] = 1; });
    }
    if (global.Progress && typeof global.Progress.read === 'function') {
      (global.Progress.read().cleared || []).forEach(function (id) { if (R.isCore(id)) coreLevelsDone += 1; });
    }
    if (isCore && Rev) {
      var grp = Rev.buildReviewGroup(coreLevelsDone, D, {
        groupSize: groupSizes[gIdx], isFinale: (levelId === 26), isCoreComplete: false,
        signatures: shapes, levelId: levelId
      });
      if (grp && grp.insert && grp.refs.length) reviewRefs = grp.refs.slice(0, groupSizes[gIdx]);
    }

    // C5/C7 呈现规划：6+4 分组 + 断点续做 + pending 优先出队 + 整组替换（守恒可校验）
    var res = R.planQueue(levelId, orderedRefs, {
      solved: solved, pending: localPending, groupIndex: gIdx,
      groupSizes: groupSizes, reviewRefs: reviewRefs,
      groupsDone: cursor.groupsDone || [], groupResults: cursor.groupResults || {},
      nextQIndex: cursor.nextQIndex || 0
    });

    // 整关 10 题全部做完后再进来：planQueue 会给出空队列（全被 solved 过滤掉）。
    // 此时清游标、开新一轮，避免出现「进关后一道题都没有」的死界面。
    var freshRound = false;
    if (!res.queue.length && solved.length) {
      freshRound = true;
      if (W.store.clearCursor) W.store.clearCursor(levelId);
      gIdx = 0;
      res = R.planQueue(levelId, orderedRefs, {
        solved: [], pending: [], groupIndex: 0,
        groupSizes: groupSizes, reviewRefs: reviewRefs,
        groupsDone: [], groupResults: {}, nextQIndex: 0
      });
      solved = [];
    }

    function srcQuestionOf(ref) {
      var p = String(ref).split(':');
      var lid = Number(p[0]), qi = Number(p[1]);
      if (lid === levelId) return list[qi];
      var srcLv = D.levels[lid];
      return srcLv && srcLv.questions && srcLv.questions[qi];
    }

    function renderableBy(ref) {
      var q = srcQuestionOf(ref);
      if (!q) return false;
      if (!shapes || !sigOf) return true;
      return !!shapes[sigOf(q)];
    }

    /* 队列里若还有本关画不出来的外来 ref（旧游标 / 旧池留下的），
       换成本关自己的题：长度不变、每题都画得出来，不会再出现 undefined。 */
    var queueRefs = res.queue.slice();
    if (shapes) {
      var usedRef = {};
      queueRefs.forEach(function (r) { usedRef[r] = 1; });
      var spare = [];
      list.forEach(function (q, i) {
        var r = String(levelId) + ':' + i;
        if (!usedRef[r] && solved.indexOf(r) < 0) spare.push(r);
      });
      queueRefs = queueRefs.map(function (ref) {
        if (renderableBy(ref)) return ref;
        return spare.length ? spare.shift() : ref;
      });
    }

    function refToQuestion(ref) {
      var p = String(ref).split(':');
      var lid = Number(p[0]), qi = Number(p[1]);
      if (lid === levelId) return list[qi];
      // 跨关「再玩一次」原题：浅拷贝、voice 指向源关既有 key 的相对路径（零新增 key）
      var srcQ = srcQuestionOf(ref);
      if (!srcQ) return list[0];
      var copy = {};
      Object.keys(srcQ).forEach(function (k) { copy[k] = srcQ[k]; });
      copy.voice = ['../' + voiceKeyOf(srcQ, lid, qi)];
      copy.__reviewRef = String(ref);
      return copy;
    }

    var queue = queueRefs.map(refToQuestion).filter(function (q) { return !!q; });
    var hints = queue.map(numericAnswerOf);

    // 写盘：全局 pending（含 C7 被替换的新题）+ 本关 levelCursor（逐题写盘基准）
    var finalPending = otherPending.concat(res.pending);
    W.store.patch(function (s) { s.pendingQuestions = finalPending; });
    W.store.setCursor(levelId, {
      nextQIndex: 0, currentGroupId: gIdx,
      groupsDone: freshRound ? [] : (cursor.groupsDone || []).slice(),
      groupResults: freshRound ? {} : (cursor.groupResults || {}),
      solved: solved.slice(), total: queue.length, planned: queueRefs.slice(),
      roundClean: freshRound ? true : (cursor.roundClean !== false),
      roundTotal: n
    });

    // 续做偏移：本轮开始前已经完成的题数。进度点据此从 2/10 接着点亮，
    // 而不是把剩下的 8 题当成「整关 8 题」——否则孩子会在 8/10 处被提前结算。
    sessionFlags.resumeOffset = freshRound ? 0 : solved.length;

    lastSession.setQueue(queue, hints, solved, queueRefs.slice());
    lastSession.setGroupIndex(gIdx);         // 本局分组号：结算判金星用
    lastSession.setRoundTotal(n);            // 整关总题数：判断是否整关收尾
    if (freshRound) lastSession.resetGroupProgress();
    lastSession.setTotal(queue.length);   // 关卡模块按本组题数结算，不越界

    if (global.Feedback) {
      sessionFlags.demoKind = global.Feedback.firstSeenKind(levelId, queue[0] && queue[0].type);
    }
    return queue;
  }

  /** 是否「本关自己的题目数组」——用引用身份判定，而不是靠字段猜。
      关卡里的句子 / 算式卡片数组（{a,b,shown}）也带 a、b 字段，
      若被 looksLikeQuestionList 误认成题目列表，会走呈现规划并把
      lastSession 的队列与总数覆盖掉，表现为「题面空白、只剩语音」。 */
  function isOwnQuestionList(list, levelId) {
    var D = global.MATH_DATA;
    var src = D && D.levels && levelId && D.levels[levelId] && D.levels[levelId].questions;
    if (!src || !src.length || !list || list.length !== src.length) return false;
    for (var i = 0; i < list.length; i += 1) {
      if (src.indexOf(list[i]) < 0) return false;
    }
    return true;
  }

  function quizShuffle(list) {
    // 只有「本关题目数组本身」才交给呈现规划；其余（选项、句子、卡片、数值）一律纯洗牌
    if (looksLikeQuestionList(list) && isOwnQuestionList(list, activeLevelId)) {
      return planQuestionQueue(list);
    }
    return shuffleList(list);
  }

  function optionsFor(answer, opts) {
    opts = opts || {};
    var min = opts.min == null ? 0 : opts.min;
    var max = opts.max == null ? 9 : opts.max;
    var count = Math.max(2, opts.count == null ? 4 : opts.count);

    var pool = [];
    for (var v = min; v <= max; v += 1) {
      if (v !== answer) pool.push(v);
    }
    pool.sort(function (a, b) {
      return Math.abs(a - answer) - Math.abs(b - answer) || a - b;
    });

    return shuffleList([answer].concat(pool.slice(0, count - 1)));
  }

  /**
   * 答错后重排：整体顺序与「正确答案所在位置」都必须变化。
   * @param key 可选，元素是对象时用来生成可比对的标识（默认 String(item)）
   */
  function reshuffleOptions(list, answer, key) {
    var keyOf = typeof key === 'function' ? key : function (item) { return String(item); };
    var signature = function () { return list.map(keyOf).join('|'); };
    var before = signature();
    var beforeIndex = list.indexOf(answer);

    for (var attempt = 0; attempt < 12; attempt += 1) {
      shuffleList(list);
      if (signature() !== before && list.indexOf(answer) !== beforeIndex) return list;
    }
    list.push(list.shift());     // 保底：轮转一位，答案位置必定改变
    return list;
  }

  /* ---------------- B5 第 3 次：展示答案并放行 ----------------
     48 关共用的收尾动作：亮出正确项 → 停留 revealHoldMs → 推进下一题。
     关卡只需要在 session.answer(false) 返回 forceAdvance 时调用一次。
     · 正确项来源：state.answerNode（识别题由关卡标记）优先，
       否则按 [data-value="答案"] 在关卡里找（数值题通用）。
     · 识别题没有数值答案时仍会亮出提示条，保证「给答案」而不是静默跳过。 */
  var shownLocks = {};      // "levelId:index" → 已放行，防止重复点击把同一题推进两次

  function flowShown(res, opts) {
    opts = opts || {};
    var state = opts.state || {};
    if (state.locked) return false;
    var alive = typeof opts.alive === 'function' ? opts.alive : function () { return true; };
    if (!alive()) return false;
    var lockKey = String(activeLevelId) + ':' + String(lastSession ? lastSession.index : -1);
    if (shownLocks[lockKey]) return false;
    shownLocks[lockKey] = true;
    state.locked = true;
    if (global.Engine && global.Engine.audio && global.Engine.audio.stop) global.Engine.audio.stop();

    var root = opts.root || document.getElementById('stage');
    var host = opts.story || root;
    // 答案来源优先级：关卡显式给出（最准）→ 引擎数值提示 → 只能靠高亮指认
    var answer = (opts.answerValue != null) ? opts.answerValue
      : ((state.answerValue != null) ? state.answerValue
        : ((res && res.answer != null) ? res.answer : null));
    var node = null;
    var banner = null;
    var wait = Math.max(900, Math.floor(Number(res && res.revealHoldMs) || 1500));

    /* 各关在 wrong() 返回后还会执行一次 320ms 左右的重绘（reshuffle + 重建选项）。
       若立刻高亮，节点会在重绘时被替换掉，看起来「没亮」。
       因此把定位与高亮延后到重绘之后，再开始 1.5s 停留。 */
    var SHOW_DELAY = 420;

    var blocker = null;

    function reveal() {
      if (!alive()) return;
      // 透明挡板：揭示与停留期间不接受任何点击（有些关卡只有局部 locked 变量）
      blocker = document.createElement('div');
      blocker.className = 'reveal-block';
      document.body.appendChild(blocker);
      node = (state.answerNode && state.answerNode.parentNode) ? state.answerNode : null;
      if (!node && answer != null && root && root.querySelector) {
        node = root.querySelector('[data-value="' + answer + '"]');
      }
      if (node && node.classList) node.classList.add('reveal-answer');

      banner = document.createElement('div');
      banner.className = 'reveal-banner';
      banner.textContent = answer != null ? ('The answer is ' + answer + '.')
        : (node ? 'Look at this one.' : 'Look at the answer.');
      if (host) host.appendChild(banner);
    }

    function advance() {
      if (node && node.classList) node.classList.remove('reveal-answer');
      if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
      if (blocker && blocker.parentNode) blocker.parentNode.removeChild(blocker);
      blocker = null;
      if (!alive()) return;
      var s = opts.session || lastSession;
      var next = (s && s.advanceShown) ? s.advanceShown() : null;
      if (next && next.done) {
        if (typeof opts.finish === 'function') opts.finish(next.star);
        return;
      }
      if (typeof opts.next === 'function') opts.next();
    }

    setTimeout(reveal, SHOW_DELAY);
    setTimeout(advance, SHOW_DELAY + wait);
    return true;
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
        base: base,
        run: function (cache, stats) { return loadAudio(src, base, cache, stats); }
      });
    });

    /* 背景图是纯装饰，语音是玩法必需。原先两者一视同仁，
       一张背景图超时就把整关判成失败，孩子看到的是「进不去 / 图没了」。
       这里给背景图单独打 optional 标记：失败只少一层背景，不拦人。 */
    var bgSrc = level.background || '';
    var imgSeen = {};
    var imgList = [];
    if (bgSrc) imgList.push(bgSrc);
    (assets.images || []).forEach(function (src) { imgList.push(src); });

    imgList.forEach(function (src) {
      if (!src || imgSeen[src]) return;        // background 与 images 常是同一张，去重
      imgSeen[src] = true;
      tasks.push({
        src: src,
        base: '',
        optional: src === bgSrc,
        run: function (cache, stats) { return loadImage(src, cache, stats); }
      });
    });

    // 仅用于演示进度条：?demo=loader 时伪造 N 个素材
    var fake = options.simulate || 0;
    for (var i = 0; i < fake; i += 1) {
      (function (n) {
        tasks.push({
          src: 'demo/asset-' + n,
          fake: true,
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

  /** 统计有多少条素材不在本地缓存里（不需要真的下载） */
  function countMissing(tasks, cache) {
    if (!cache) return Promise.resolve(tasks.length);
    return Promise.all(tasks.map(function (task) {
      if (task.fake) return Promise.resolve(true);
      var url = absoluteUrl(resolveUrl(task.src, task.base));
      return cache.match(url).then(function (hit) { return !hit; })
        .catch(function () { return true; });
    })).then(function (flags) {
      return flags.filter(Boolean).length;
    });
  }

  /**
   * 预取某一关的素材进 Cache Storage。
   *
   * 为什么需要它：GitHub Pages 只提供 HTTP/1.1（同源上限 6 连接），
   * 国内单次往返实测 0.3–10s 波动极大。一关 16–24 个素材同时要，首次进关
   * 就只能在读条上干等。趁孩子还在玩第 N 关，把第 N+1 关悄悄备好，
   * 点进去就是秒开——这比提高并发更有效，因为把等待挪到了看不见的地方。
   *
   * 只写 Cache Storage，不生成 blob URL：预取几十关也不会堆内存，
   * 而且真进关时仍走 loadImage/loadAudio 的正规流程。
   * 并发压到 2，把连接让给正在播放的语音。
   */
  function prefetchLevel(level) {
    if (!level || !cacheSupported()) return Promise.resolve(0);
    var base = (window.MATH_DATA && window.MATH_DATA.meta.audioBase) || '';

    return openAssetCache().then(function (cache) {
      if (!cache) return 0;

      /* 能走语音包就走包：1 次请求 > 23 次。传 null 作 ui，
         后台预取绝不能弹读条打断孩子看地图。 */
      return ensureVoicePack(level, cache, null).then(function (packedVoice) {
        var jobs = [];
        if (!packedVoice) {
          (level.assets && level.assets.audio || []).forEach(function (src) {
            jobs.push({ src: src, base: base });
          });
        }
        if (level.background) jobs.push({ src: level.background, base: '' });
        (level.assets && level.assets.images || []).forEach(function (src) {
          jobs.push({ src: src, base: '' });
        });

        var seen = {};
        jobs = jobs.filter(function (j) {
          var k = j.base + j.src;
          if (seen[k]) return false;
          seen[k] = true;
          return true;
        });
        if (!jobs.length) return packedVoice ? 1 : 0;

        var warmed = 0;
        return runPool(jobs, packedVoice ? 3 : 2, function (job) {
          var url = resolveUrl(job.src, job.base);
          var abs = absoluteUrl(url);
          return cache.match(abs).then(function (hit) {
            if (hit) return null;
            return fetch(url, { credentials: 'same-origin' }).then(function (res) {
              if (!res || res.status !== 200) return null;
              warmed += 1;
              return cache.put(abs, res);
            });
          }).catch(function () { /* 预取失败不打扰孩子，真进关时会带重试再取 */ });
        }).then(function () { return warmed; });
      });
    }).catch(function () { return 0; });
  }

  /**
   * 语音包：构建期把一关的 mp3 拼成单个 .bin（tools/pack-voice.js）。
   * 运行时一次取回 → 按索引切片 → 逐条写进 Cache Storage，
   * 之后 loadAudio 仍走原来的「缓存命中」路径，播放逻辑一行都不用改。
   *
   * 为什么值得：GitHub Pages 只有 HTTP/1.1，一关 23 个 mp3 逐个请求，
   * 实测首次进关 10–33 秒且随文件个数线性增长；拼包后请求数 24 → 2
   * （包 + 背景图），耗时只跟总字节数有关。
   *
   * 返回 true 表示本关语音已全部就位；任何一步失败都返回 false，
   * 调用方随即回退到逐条下载，所以「包没部署 / 下载失败 / 配额满」都不会卡住孩子。
   */
  function ensureVoicePack(level, cache, ui) {
    var packs = global.VOICE_PACKS;
    var pack = packs && level && packs[level.id];
    if (!pack || !cache || !pack.entries) return Promise.resolve(false);

    var base = (window.MATH_DATA && window.MATH_DATA.meta.audioBase) || '';
    var keys = Object.keys(pack.entries);
    if (!keys.length) return Promise.resolve(false);

    // 只探第一条：切片是全成功后才算完，不会出现半包被误判为就绪
    var probeUrl = absoluteUrl(resolveUrl(keys[0], base));

    return cache.match(probeUrl).then(function (hit) {
      if (hit) return true;

      if (ui && ui.open) ui.open();
      if (ui && ui.set) ui.set(0.03, '…');

      var packUrl = absoluteUrl(pack.file + '?v=' + pack.rev);
      return fetch(packUrl, { credentials: 'same-origin' }).then(function (res) {
        if (!res || res.status !== 200) throw new Error('HTTP ' + (res && res.status));
        return res.arrayBuffer();
      }).then(function (buf) {
        if (!buf || !buf.byteLength) throw new Error('空包');
        if (ui && ui.set) ui.set(0.72, '…');
        return Promise.all(keys.map(function (key) {
          var e = pack.entries[key];
          var blob = new Blob([buf.slice(e[0], e[0] + e[1])], { type: 'audio/mpeg' });
          return cache.put(absoluteUrl(resolveUrl(key, base)), new Response(blob))
            .catch(function () { /* 单条写失败留给逐条下载兜底 */ });
        })).then(function () {
          if (ui && ui.set) ui.set(1, '…');
          return true;
        });
      });
    }).catch(function () { return false; });
  }

  /**
   * 加载当前关全部素材。
   * · 全部命中本地缓存 → 不显示读条，静默进入
   * · 有任何一条需要下载 → 才弹进度条
   * @returns {Promise<{ok, failed, total, ms, downloaded}>}
   */
  function loadLevel(level, options) {
    options = options || {};
    var started = Date.now();
    // 记录当前关号，供 quiz.shuffle 的呈现规划与 timer.flashMs(levelId) 使用
    activeLevelId = (level && level.id) ? Number(level.id) : 0;
    sessionFlags.groupComplete = false;
    sessionFlags.lastGroupOnly = false;
    // 每关重置续做偏移：乘除段有 22 关不走 quiz.shuffle/planQueue，
    // 否则会继承上一关的偏移，进度点从一半开始亮。
    sessionFlags.resumeOffset = 0;
    shownLocks = {};
    var tasks = buildTasks(level, options);
    var done = 0;
    var failed = [];
    var stats = { downloaded: 0 };
    var needLoader = false;
    var shownRatio = 0;      // 读条已展示到的比例，用于防止进度倒退

    function title() {
      return level && level.name ? 'Loading ' + level.name : 'Loading';
    }

    function openLoader() {
      if (needLoader) return;
      needLoader = true;
      loader.open(title());
      loader.set(0, '0 / ' + tasks.length);
    }

    function tick() {
      if (needLoader) {
        var r = tasks.length ? done / tasks.length : 1;
        // 进度只增不减：语音包会先把读条推到 100%，随后逐条命中缓存时
        // done 从 0 重新计数，不锁住的话进度条会突然倒退回去。
        if (r < shownRatio) r = shownRatio;
        shownRatio = r;
        loader.set(r, done + ' / ' + tasks.length);
      }
    }

    return openAssetCache().then(function (cache) {
      /* 先走语音包：一次请求拿下整关语音，把 23 次往返压成 1 次。
         包不可用时返回 false，下面 countMissing 自然会看到缺失并逐条下载。 */
      return ensureVoicePack(level, cache, {
        open: openLoader,
        set: function (ratio, detail) {
          if (!needLoader) openLoader();
          if (ratio > shownRatio) shownRatio = ratio;
          loader.set(shownRatio, detail);
        }
      }).then(function (packed) {
        if (packed) stats.packed = true;
        return countMissing(tasks, cache);
      }).then(function (missing) {
        if (missing > 0 || (options.simulate || 0) > 0 || !cache) openLoader();

        function runTask(task) {
          var p;
          try {
            p = withTimeout(task.run(cache, stats), LIMITS.assetTimeout);
          } catch (e) {
            p = Promise.reject(e);
          }
          return p.then(function () {
            done += 1; tick();
          }, function (err) {
            done += 1; tick();
            // 可选素材（背景图）失败只记账，不进 failed，因此不会把孩子挡在关外
            if (task.optional) {
              stats.optionalMissed = (stats.optionalMissed || 0) + 1;
              return;
            }
            failed.push({ src: task.src, error: String((err && err.message) || err) });
          });
        }
        var work = runPool(tasks, LIMITS.assetConcurrency, runTask);

        var minDelay = needLoader ? sleep(LIMITS.loaderMinMs) : Promise.resolve();

        return Promise.all([work, minDelay]).then(function () {
          var ms = Date.now() - started;

          if (failed.length) {
            openLoader();
            loader.fail(failed.length + ' files could not load', function () {
              loader.close();
              if (typeof options.onRetry === 'function') options.onRetry();
            });
            return { ok: false, failed: failed, total: tasks.length, ms: ms, downloaded: stats.downloaded };
          }

          if (!needLoader) {
            return { ok: true, failed: [], total: tasks.length, ms: ms, downloaded: 0 };
          }

          loader.set(1, done + ' / ' + tasks.length);
          return sleep(180).then(function () {
            loader.close();
            return { ok: true, failed: [], total: tasks.length, ms: ms, downloaded: stats.downloaded };
          });
        });
      });
    });
  }

  /* ---------------- 家长设置（A6：独立分区，不进云存档） ----------------
     settings / usage 落在 wellbeing.js 的 'math-adventure.local.v1' 独立分区，
     Gist 白名单序列化仍只含 progress.*，绝不跨设备同步。 */

  var SETTINGS_KEY = 'math-adventure.settings.v1';   // 兼容上一轮旧分区（只读回退）

  function readSettings() {
    if (global.Wellbeing && global.Wellbeing.settings) return global.Wellbeing.settings();
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {}; }
    catch (e) { return {}; }
  }

  function writeSettings(patch) {
    var next;
    if (global.Wellbeing && global.Wellbeing.setSettings) {
      next = global.Wellbeing.setSettings(patch);   // 内部派发 EVT_SETTINGS_CHANGED
    } else {
      var s = readSettings();
      Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; });
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* 隐私模式 */ }
      next = s;
      emit(EVT.SETTINGS_CHANGED, { settings: next });
    }
    timerApi.rebaseLast();
    return next;
  }

  var timerCurrentReset = null;
  var lastWindowMs = 60000;
  var timeoutGuard = null;   // C1：关卡登记 onTimeout 后，随后的 wrong() 一律视为超时

  /** C1/C2：窗口在每题开始时求值（不缓存），4 岁起步默认 60 秒、绝不 5 秒；
      L21/30/33/36/L45 取消限时返回 0；L9/L12 可选挑战默认关、仅家长主动开。 */
  function flashMs(levelId) {
    var s = readSettings();
    // 家长关掉「计时压力」＝全程不装表（返回 0）。4 岁起步默认 60 秒已很宽松，
    // 这里保留该开关是为了让任何倒计时视觉都不出现，避免开关变成空壳。
    if (s.noTimer) return 0;
    var R = global.RouteMap;
    if (!R || !levelId || R.TIMER_LEVELS.indexOf(Number(levelId)) < 0) return 60000;
    var cfg = R.TIMER_CONFIG[Number(levelId)];
    if (!cfg) return 60000;
    if (cfg.cancelTimer || cfg.timed === false) return 0;         // 取消限时：不装表、不超时
    var timers = s.challengeTimers || {};
    if (timers[String(levelId)] && cfg.challengeMs) return cfg.challengeMs;  // 家长主动开
    return cfg.defaultWindowMs;                                    // 默认 60 秒
  }

  var timerApi = {
    /** C2：EVT_SETTINGS_CHANGED 触发 rebase。更宽松立即重置当前题剩余时间；
        更严格从下一题生效（flashMs 每题读取，下一题自然用新窗口）。 */
    rebase: function (levelId, prevMs, nextMs) {
      var prev = Number(prevMs == null ? lastWindowMs : prevMs);
      var next = Number(nextMs == null ? flashMs(levelId) : nextMs);
      var looser = next > prev || next === 0;   // 0 = 取消限时，视为更宽松
      if (looser && typeof timerCurrentReset === 'function') {
        try { timerCurrentReset(next); } catch (e) { /* noop */ }
      }
      lastWindowMs = next;
      emit(EVT.SETTINGS_CHANGED, {
        levelId: levelId, prevMs: prev, nextMs: next, looser: looser,
        effectiveFromNextQuestion: !looser
      });
      return { looser: looser, nextMs: next, effectiveFromNextQuestion: !looser };
    },
    rebaseLast: function () {
      return timerApi.rebase(activeLevelId, lastWindowMs, flashMs(activeLevelId));
    },
    /** 限时关 arm 时注册「重置当前题剩余时间」函数，供更宽松的 rebase 立即调用 */
    registerCurrent: function (resetFn) { timerCurrentReset = resetFn || null; },
    clearCurrent: function () { timerCurrentReset = null; },
    /** C1 超时不判错：写独立 challengeTimeout（仅家长可见、不计达成），
        不写 wrongCount、不进复习池、不扣、不卡关，只自动重听并重给本题。
        登记超时守卫：关卡超时回调随后触发的 wrong() 会被状态机识别为 timeout。 */
    onTimeout: function (levelId, replayFn) {
      timeoutGuard = { levelId: levelId, at: Date.now() };
      setTimeout(function () { timeoutGuard = null; }, 1200);   // 1.2s 后自动失效，避免误判
      if (global.Wellbeing && global.Wellbeing.store) global.Wellbeing.store.addChallengeTimeout(levelId);
      emit('quiz:timeout', { levelId: levelId, replay: true, writeWrong: false });
      if (typeof replayFn === 'function') replayFn();
      return true;
    },
    isTimeoutPending: function () {
      return !!(timeoutGuard && (Date.now() - timeoutGuard.at) < 1200);
    },
    isCancelled: function (levelId) {
      var R = global.RouteMap;
      return !!(R && R.CANCELLED_TIMER_LEVELS.indexOf(Number(levelId)) >= 0);
    },
    challengeEnabled: function (levelId) {
      var s = readSettings();
      return !!(s.challengeTimers && s.challengeTimers[String(levelId)]);
    },
    setChallenge: function (levelId, on) {
      var s = readSettings(), t = {};
      Object.keys(s.challengeTimers || {}).forEach(function (k) { t[k] = s.challengeTimers[k]; });
      t[String(levelId)] = !!on;
      return writeSettings({ challengeTimers: t });
    },
    windowMs: function (levelId) { return flashMs(levelId); }
  };

  var settingsApi = {
    get: readSettings,
    set: writeSettings,
    noTimer: function () { return !!readSettings().noTimer; },
    flashMs: flashMs,
    timer: timerApi,
    // C4「试一试」标注：家长开关已删除，恒为 false（挑战关不作为入口显示）
    showChallenge: function () { return !!readSettings().showChallenge; },
    // A6 ParentGate 图形验证：仅防孩子误改设置
    parentGate: function (host, onPass) {
      if (global.Wellbeing && global.Wellbeing.parentGate) global.Wellbeing.parentGate(host, onPass);
      else if (typeof onPass === 'function') onPass();
    }
  };

  /* ---------------- B9–B11 / C8–C10 全局过程反馈接线（不改 48 关） ----------------
     通过事件监听给当前关卡屏挂 F1–F10 视觉反馈，并用 data-value 推断 near。
     选项级精确高亮需关卡侧配合，故这里做通用挂载（报告标为部分实现）。 */
  function stageHost() {
    return typeof document !== 'undefined' ? document.getElementById('stage') : null;
  }

  function installFeedbackWiring() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    // B6 near + B2 EVT_TAP：从选项 data-value 推断选中值（能算数值答案时才判 near）
    document.addEventListener('click', function (e) {
      var t = e && e.target;
      var btn = t && t.closest ? t.closest('[data-value]') : null;
      if (btn && lastSession && lastSession.setLastValue) {
        lastSession.setLastValue(btn.getAttribute('data-value'));
      }
      if (lastSession && lastSession.tap) lastSession.tap(btn);  // 进入 S_CONFIRM 预选态
    }, true);

    document.addEventListener(EVT.WRONG, function (e) {
      var F = global.Feedback; if (!F) return;
      var d = (e && e.detail) || {};
      var host = stageHost();
      if (d.attempt === 1) {
        // F3 再试一次：暖黄描边高亮 + 自动重听（F2 柔蓝波纹）
        var story = host && host.querySelector ? host.querySelector('.lv-story') : null;
        if (story) F.highlight(story);
        var r = host && host.querySelector ? host.querySelector('.q-replay') : null;
        if (r) F.F.F2_replay(r.parentNode || host);
      } else if (d.attempt === 2) {
        // F6 我们一起做：非目标仅降饱和约 30%、轻轻退后（不消失不打叉不变灰）
        if (host) F.dimNonTargets(host.querySelectorAll('button'));
      }
      if (host) F.ensureTouchTargets(host);
    });
    document.addEventListener('quiz:near', function () {
      var F = global.Feedback; if (F) F.F.F4_near(stageHost());
    });
    /* quiz:shown 只作为事件广播：真正的「亮答案 + 停留 + 放行」由关卡调用
       Engine.flow.shown() 完成——旧版在这里对整个 #stage 加高亮，
       既没有指出正确项，又和关卡的推进互不知情。 */
    document.addEventListener('quiz:correct', function () {
      var F = global.Feedback; if (F) F.ensureTouchTargets(stageHost());
    });
  }

  /* ---------------- 对外接口 ---------------- */

  global.Engine = {
    version: '0.2.0',          // 4 岁起步机制升级（Gist payload 版本不变）
    limits: LIMITS,
    loadLevel: loadLevel,
    prefetchLevel: prefetchLevel,
    loader: loader,
    assets: {
      /** 关卡素材加载后拿到可用的图片地址（blob URL）；未加载则退回带 hash 的路径 */
      imageUrl: function (src) {
        var url = resolveUrl(src, '');
        return objectUrls[url] || url;
      },
      /** 给不经过 engine 管道的资源（地图阶段背景）挂同样的内容 hash */
      versionedUrl: versionedUrl
    },
    audio: {
      armUnlock: armUnlock,
      unlock: unlock,
      preload: loadAudio,
      play: play,
      say: say,
      stop: stopAudio,
      releaseLevel: releaseLevel,
      init: pruneAssetCache,
      cacheName: CACHE_NAME,
      poolSize: function () { return Object.keys(audioPool).length; }
    },
    settings: settingsApi,
    settingsTimer: timerApi,      // C2 兼容别名
    sfx: sfx,
    anim: anim,
    session: createSession,
    sessionLast: function () { return lastSession; },
    flags: sessionFlags,
    // B5 第 3 次「展示答案并放行」的统一实现（关卡在 wrong 分支调用）
    flow: { shown: flowShown },
    bus: {
      emit: emit,
      EVT: EVT,
      activeLevelId: function () { return activeLevelId; },
      // 只读调试口：验收脚本据此判断「本题是否已推进 / 期望答案是什么」，不改变任何状态
      sessionState: function () {
        if (!lastSession) return null;
        var i = lastSession.index;
        return {
          index: i,
          finished: lastSession.finished,
          wrongCount: lastSession.wrongCount,
          correctCount: lastSession.correctCount,
          hint: lastSession.hintAt ? lastSession.hintAt(i) : null
        };
      }
    },
    /* B8 C5 FlashReplayGuard：flash 期间不释放语音 key、「再听一次」常亮常驻；
       图标用「眼睛 + 小海螺」，禁用闪电/沙漏/秒表/倒计时红环。 */
    FlashReplayGuard: {
      keepAlive: true,
      iconSVG: function () { return global.Feedback ? global.Feedback.replayIconSVG() : ''; },
      isBannedIcon: function (name) {
        return /bolt|lightning|hourglass|stopwatch|timer|countdown/i.test(String(name));
      }
    },
    quiz: {
      optionsFor: optionsFor,
      reshuffle: reshuffleOptions,
      shuffle: quizShuffle,
      planQueue: function (list) { return planQuestionQueue(list); }
    },
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
  installFeedbackWiring();
})(window);
