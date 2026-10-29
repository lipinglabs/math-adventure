/* ============================================================
   level-lv12.js · Lightning Math（闪电心算 · 不退位减法 11–19）
   ------------------------------------------------------------
   2 幕教学 + 10 题（顺序每局打乱），三种题型：
     calc     纯算式 + 三个数字键
     balloon  一张算式卡 + 三个写着答案的气球
     flash    5 秒进度条闪电题（超时 / 点错都原地重来）
   铁律：全英文、点按推进、教学自问自答、按键反馈 ≤120ms（§5.12）、
         限时题按 §6.9（超时与答错同权、瞬间停表、剩余 40% 变红）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var FLASH_MS = 5000;            // 闪电题倒计时（毫秒）

  /* ---------------- 图标 ---------------- */

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">' +
      '<path d="M18 26V11a3 3 0 0 1 6 0v10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M24 21V9a3 3 0 0 1 6 0v12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M30 22v-8a3 3 0 0 1 6 0v14c0 8-5 14-13 14s-12-5-12-12v-6a3 3 0 0 1 6 0v3" ' +
      'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speaker:
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" fill="currentColor"/>' +
      '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>',
    balloon:
      '<svg viewBox="0 0 100 118" aria-hidden="true">' +
      '<ellipse cx="50" cy="40" rx="30" ry="35" fill="currentColor"/>' +
      '<ellipse cx="38" cy="26" rx="7.5" ry="11" fill="rgba(255,255,255,.55)" transform="rotate(-20 38 26)"/>' +
      '<path d="M50 74l-8 10h16z" fill="currentColor"/>' +
      '<path d="M50 84c9 7-9 9 0 18" stroke="#C0AFA0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
  };

  var COLORS = ['#F58FA0', '#7FC7E8', '#F7C063'];

  /* ---------------- 状态 ---------------- */

  var stage = null;
  var ctx = null;
  var alive = false;
  var timers = [];
  var session = null;
  var queue = [];
  var tapFinish = null;
  var currentRoot = null;
  var renderId = 0;
  var sayToken = 0;

  var timerAnim = null;
  var timeoutId = null;
  var lowTimerId = null;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function remove(node) {
    if (node && node.parentNode) node.parentNode.removeChild(node);
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      var id = setTimeout(resolve, ms);
      timers.push(id);
    });
  }

  function later(fn, ms) {
    var id = setTimeout(function () {
      if (alive) fn();
    }, ms);
    timers.push(id);
    return id;
  }

  function clearTimers() {
    timers.forEach(function (id) { clearTimeout(id); });
    timers = [];
  }

  function animate(node, frames, opts) {
    opts = opts || {};
    if (!node || Engine.anim.budgetLeft() <= 0) return Promise.resolve();
    var duration = opts.duration || 420;
    Engine.anim.track(node, duration + (opts.delay || 0));
    var anim = node.animate(frames, {
      duration: duration,
      delay: opts.delay || 0,
      easing: opts.easing || 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'both'
    });
    return anim.finished.then(function () { anim.cancel(); }, function () { /* 已取消 */ });
  }

  function popIn(node, delay) {
    return animate(node, [
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 380, delay: delay || 0 });
  }

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.07)', offset: 0.42 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 320, delay: delay || 0 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px) rotate(-1.2deg)', offset: 0.22 },
      { transform: 'translateX(7px) rotate(1.2deg)', offset: 0.5 },
      { transform: 'translateX(-3px)', offset: 0.78 },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' });
  }

  /* ---------------- 语音链（§6.7 独占） ---------------- */

  function saySeq(keys) {
    var list = Array.isArray(keys) ? keys : [keys];
    var my = ++sayToken;
    var i = 0;
    return new Promise(function (resolve) {
      function step() {
        if (my !== sayToken || !alive) { resolve(false); return; }
        if (i >= list.length) { resolve(true); return; }
        var key = list[i];
        i += 1;
        ctx.audio.play('lv12/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 数字砖 / 算式 ---------------- */

  function tile(text, cls) {
    return el('span', 'l12-tile' + (cls ? ' ' + cls : ''), text);
  }

  function op(sign) {
    return el('span', 'l12-op', sign);
  }

  /**
   * 一道横式：a − b = ?
   * · 答题：每个数占一整块（「16」不是「1」「6」两块），孩子一眼读成十六；
   * · 教学：opts.split = true，十位与个位各占一块，才能只让个位转红（§5.8 的位值表征）。
   */
  function equation(a, b, opts) {
    opts = opts || {};
    var row = el('div', 'l12-eq' + (opts.split ? ' l12-eq--split' : ''));
    var aTiles = [];

    function pushNumber(host, str) {
      var out = [];
      if (opts.split && str.length > 1) {
        for (var i = 0; i < str.length; i += 1) {
          var cls = i === 0 ? 'l12-tile--tens' : 'l12-tile--ones';
          var t = tile(str[i], cls);
          host.appendChild(t);
          out.push(t);
        }
      } else {
        var whole = tile(str, null);
        host.appendChild(whole);
        out.push(whole);
      }
      return out;
    }

    aTiles = pushNumber(row, String(a));
    row.appendChild(op('\u2212'));
    var bTiles = pushNumber(row, String(b));
    row.appendChild(op('='));

    var res = el('span', 'l12-res');
    var q = tile(opts.blank ? '' : '?', opts.blank ? 'l12-tile--blank' : 'l12-tile--q');
    res.appendChild(q);
    row.appendChild(res);

    return { node: row, res: res, q: q, split: !!opts.split, aTiles: aTiles, bTiles: bTiles };
  }

  function fillResult(refs, value) {
    var str = String(value);
    refs.res.innerHTML = '';
    if (refs.split) {
      // 十位保持金（这一位没动），个位填绿（刚算出来）
      for (var i = 0; i < str.length; i += 1) {
        refs.res.appendChild(tile(str[i], i === 0 ? 'l12-tile--tens is-ten' : 'is-filled'));
      }
    } else {
      refs.res.appendChild(tile(str, 'is-filled'));
    }
  }

  /* ---------------- 教学第一幕：积木变成算式 ---------------- */

  function blockGroup(n, cols, size) {
    var wrap = el('div', 'l12-blocks');
    wrap.style.gridTemplateColumns = 'repeat(' + cols + ', ' + size + 'px)';
    for (var i = 0; i < n; i += 1) wrap.appendChild(el('span', 'l12-block'));
    return wrap;
  }

  async function sceneOne(host) {
    host.innerHTML = '';

    var stageBox = el('div', 'l12-stage');

    // 先出现积木：十位一整块 + 六个零散
    var pile = el('div', 'l12-pile');
    var ten = blockGroup(10, 5, 26);
    var ones = blockGroup(6, 3, 26);
    pile.appendChild(ten);
    pile.appendChild(op('+'));
    pile.appendChild(ones);
    stageBox.appendChild(pile);
    host.appendChild(stageBox);

    popIn(ten, 0);
    popIn(ones, 140);

    // Look at the blocks. One ten and six ones. That's sixteen.
    await saySeq(['t1_a']);
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    // 积木缩小消失（同一块场地），算式原地浮现
    var out = animate(pile, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.72)' }
    ], { duration: 300, easing: 'cubic-bezier(.4,0,.6,1)' });
    await out;
    if (!alive) return;
    remove(pile);

    var refs = equation(16, 4, { split: true });
    stageBox.appendChild(refs.node);
    popIn(refs.node);

    // Now, let's look at the numbers. We take away the ones.
    await saySeq(['t1_b']);
    if (!alive) return;

    await sleep(1000);                  // 停顿 1 秒再自答
    if (!alive) return;

    // Six minus four equals two. —— 只把个位的 6 和 4 转红
    var reds = [refs.aTiles[refs.aTiles.length - 1], refs.bTiles[0]];
    reds.forEach(function (t, i) {
      t.classList.add('is-red');
      bounce(t, i * 90);
    });
    await saySeq(['t1_b2']);
    if (!alive) return;

    await sleep(280);
    if (!alive) return;

    // So, sixteen minus four equals twelve!
    fillResult(refs, 12);
    popIn(refs.res);
    await saySeq(['t1_c']);
    if (!alive) return;

    // 十位始终没动：结果里的「1」是金色，只有「2」是新算出来的
    bounce(refs.res, 0);
    await sleep(360);
  }

  /* ---------------- 教学第二幕：竖式规律 ---------------- */

  function verticalSum(a, b, res) {
    var col = el('div', 'l12-vert');

    function row(cls, sign, cells) {
      var r = el('div', 'l12-vrow' + (cls ? ' ' + cls : ''));
      r.appendChild(el('span', 'l12-vsign', sign || ''));
      cells.forEach(function (c) {
        r.appendChild(el('span', 'l12-vcell' + (c.cls ? ' ' + c.cls : ''), c.text));
      });
      return r;
    }

    var aStr = String(a);
    var rStr = String(res);
    var top = row('', '', [
      { text: aStr[0], cls: 'is-top-tens' },
      { text: aStr[1], cls: 'is-top-ones' }
    ]);
    var mid = row('', '\u2212', [
      { text: '', cls: 'l12-vcell--blank' },
      { text: String(b), cls: 'is-sub-ones' }
    ]);
    var line = el('div', 'l12-vline');
    var sum = row('l12-vrow--sum is-hidden', '', [
      { text: rStr[0], cls: 'is-res-tens' },
      { text: rStr[1], cls: 'is-res-ones' }
    ]);

    col.appendChild(top);
    col.appendChild(mid);
    col.appendChild(line);
    col.appendChild(sum);

    return {
      node: col,
      reveal: function () {
        sum.classList.remove('is-hidden');
        [sum.children[1], sum.children[2]].forEach(function (c, i) { popIn(c, i * 120); });
        // 终态先写进内联样式，再播「从 0 拉出」，否则 cancel() 会回落到 0
        line.style.transform = 'scaleX(1)';
        animate(line, [
          { transform: 'scaleX(0)' },
          { transform: 'scaleX(1)' }
        ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
      },
      markTens: function () {
        [top.children[1], sum.children[1]].forEach(function (c) { c.classList.add('is-ten'); });
      },
      markOnes: function () {
        [top.children[2], mid.children[2], sum.children[2]].forEach(function (c) {
          c.classList.add('is-red');
        });
      },
      tops: {
        ones: top.children[2],
        sub: mid.children[2]
      }
    };
  }

  async function sceneTwo(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l12-sum');
    var v = verticalSum(16, 4, 12);
    wrap.appendChild(v.node);
    host.appendChild(wrap);

    popIn(v.node, 0);
    v.reveal();

    await sleep(520);
    if (!alive) return;

    // Remember, the ten stays the same. —— 十位转金并脉动
    var s1 = saySeq(['t2_a']);
    v.markTens();
    await s1;
    if (!alive) return;

    await sleep(260);
    if (!alive) return;

    // We only take away from the ones. —— 个位两个数转红
    var s2 = saySeq(['t2_b']);
    v.markOnes();
    bounce(v.tops.ones, 0);
    bounce(v.tops.sub, 110);
    await s2;
    if (!alive) return;

    await sleep(420);
  }

  /* ---------------- 点击推进 ---------------- */

  function waitTap(host) {
    return new Promise(function (resolve) {
      var done = false;
      var hintTimer = setTimeout(function () {
        if (done || !alive) return;
        var hint = el('div', 'tap-hint');
        hint.innerHTML = ICONS.hand;
        host.appendChild(hint);
      }, 2800);

      function finish() {
        if (done) return;
        done = true;
        clearTimeout(hintTimer);
        document.removeEventListener('pointerdown', finish, true);
        tapFinish = null;
        remove(host.querySelector('.tap-hint'));
        resolve();
      }

      tapFinish = finish;
      document.addEventListener('pointerdown', finish, true);
    });
  }

  /* ---------------- 答题公用 ---------------- */

  function burst(host) {
    if (Engine.anim.budgetLeft() <= 0) return;
    var node = el('div', 'burst-star');
    node.innerHTML = ICONS.star;
    host.appendChild(node);
    later(function () { remove(node); }, 900);
  }

  function makeReplay(story, keys) {
    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      saySeq(keys);
    });
    story.appendChild(replay);
  }

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'numkey');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'numkey-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 限时表（§6.9） ---------------- */

  function stopFlashTimer() {
    if (timerAnim) {
      try { timerAnim.cancel(); } catch (e) { /* 已取消 */ }
      timerAnim = null;
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (lowTimerId) {
      clearTimeout(lowTimerId);
      lowTimerId = null;
    }
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    stopFlashTimer();
    Engine.audio.stop();

    var q = queue[session.index];
    if (!q) return;

    root.innerHTML = '';
    renderId += 1;
    var wrap = el('div', 'lv');
    var story = el('div', 'lv-story');
    var tray = el('div', 'lv-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    makeReplay(story, q.voice);

    var state = { locked: false, errors: 0 };

    function correct(node) {
      if (state.locked) return;
      state.locked = true;
      stopFlashTimer();
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);
      burst(story);

      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));

      if (solved.done) later(function () { finish(solved.star); }, 620);
      else later(function () { askQuestion(root); }, 700);
    }

    function wrong(node) {
      if (state.locked) return;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 240);
      }
      Engine.sfx.wrong();
      if (node) shake(node);
    }

    if (q.type === 'flash') buildFlashQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'balloon') buildBalloonQuestion(q, story, tray, state, correct, wrong);
    else buildCalcQuestion(q, story, tray, state, correct, wrong);

    if (q.type !== 'flash') saySeq(q.voice);
  }

  /* ---- 题型 A：纯算式 + 三个数字键 ---- */

  function buildCalcQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var refs = equation(q.a, q.b);
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) {
          fillResult(refs, answer);
          refs.res.classList.add('is-answer');
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paint();
        }, 320);
      });
    }

    paint();
  }

  /* ---- 题型 B：算式卡 + 三个写着答案的气球 ---- */

  function buildBalloonQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;

    // 算式卡（只到「−」为止，不显示结果）
    var card = el('div', 'l12-card');
    var refs = equation(q.a, q.b, { blank: true });
    card.appendChild(refs.node);
    story.appendChild(card);
    popIn(card);

    var field = el('div', 'l12-balloons');
    story.appendChild(field);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      field.innerHTML = '';
      options.forEach(function (value, i) {
        var btn = el('button', 'l12-balloon');
        btn.type = 'button';
        btn.dataset.value = String(value);
        btn.setAttribute('aria-label', String(value));
        btn.style.color = COLORS[i % COLORS.length];
        btn.style.setProperty('--d', (i * 0.26).toFixed(2) + 's');
        var art = el('span', 'l12-balloon-art');
        art.innerHTML = ICONS.balloon;
        btn.appendChild(art);
        btn.appendChild(el('span', 'l12-balloon-num', String(value)));
        btn.addEventListener('click', function () { pick(value, btn); });
        popIn(btn, i * 80);
        field.appendChild(btn);
      });
    }

    function pick(value, btn) {
      if (state.locked) return;
      if (value === answer) {
        fillResult(refs, answer);
        refs.res.classList.add('is-answer');
        correct(btn);
        return;
      }
      wrong(btn);
      later(function () {
        Engine.quiz.reshuffle(options, answer);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：5 秒闪电（超时与点错同权，原地重来） ---- */

  function buildFlashQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;

    var bar = el('div', 'l12-timer');
    var fill = el('span', 'l12-timer-fill');
    bar.appendChild(fill);
    story.appendChild(bar);

    var refs = equation(q.a, q.b);
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());
    var locked = false;

    function arm() {
      stopFlashTimer();
      fill.style.transform = 'scaleX(1)';
      bar.classList.remove('is-out');
      bar.classList.remove('is-low');
      lowTimerId = setTimeout(function () { bar.classList.add('is-low'); }, Math.round(FLASH_MS * 0.62));
      timerAnim = fill.animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: FLASH_MS, easing: 'linear', fill: 'both' }
      );
      timeoutId = setTimeout(function () {
        timeoutId = null;
        if (locked || state.locked || !alive) return;
        bar.classList.add('is-out');
        try { timerAnim.cancel(); } catch (e) { /* 已取消 */ }
        timerAnim = null;
        fill.style.transform = 'scaleX(0)';
        wrong(refs.node);                 // 记一次错，题目原地不动
        later(function () {
          if (locked || state.locked || !alive) return;
          arm();                          // 进度条重置，同一题重来
        }, 1000);
      }, FLASH_MS);
    }

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (locked || state.locked) return;
        if (value === answer) {
          locked = true;
          stopFlashTimer();
          fill.style.transform = 'scaleX(0)';
          bar.classList.add('is-done');
          fillResult(refs, answer);
          refs.res.classList.add('is-answer');
          correct(key);
          return;
        }
        wrong(key);
        locked = true;                    // 挡住连点
        later(function () {
          locked = false;
          Engine.quiz.reshuffle(options, answer);
          paint();
          arm();                          // 点错也重置进度条
        }, 420);
      });
    }

    paint();
    arm();
  }

  /* ---------------- 结算 ---------------- */

  function finish(star) {
    stopFlashTimer();
    Engine.audio.stop();
    ctx.complete(star);
    if (!currentRoot) return;
    LevelKit.showResult(currentRoot, star, {
      onReplay: function () { ctx.restart(); },
      onHome: function () { ctx.exit(); },
      play: function (key) { ctx.audio.play(key); }
    });
  }

  /* ---------------- 生命周期 ---------------- */

  async function run(root) {
    var body = el('div', 'lv');
    var host = el('div', 'lv-story');
    body.appendChild(host);
    root.appendChild(body);

    if (ctx.quick) {
      askQuestion(root);
      return;
    }

    await sceneOne(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;

    await sceneTwo(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;

    await ctx.audio.play('common/ready');
    if (!alive) return;

    askQuestion(root);
  }

  function mount(host, context) {
    stage = host;
    ctx = context;
    alive = true;
    timers = [];
    sayToken = 0;
    stopFlashTimer();
    session = Engine.session({ total: TOTAL });
    queue = Engine.quiz.shuffle(ctx.level.questions.slice());

    var root = el('div', 'lv-root');
    host.appendChild(root);
    currentRoot = root;

    ctx.step(0);
    run(root);

    return { unmount: unmount };
  }

  function unmount() {
    alive = false;
    sayToken += 1;
    clearTimers();
    stopFlashTimer();
    if (tapFinish) {
      tapFinish();
      tapFinish = null;
    }
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[12] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
