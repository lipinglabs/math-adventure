/* ============================================================
   level-lv09.js · Quick Tap（快速点选 · 不进位加法，纯数字）
   ------------------------------------------------------------
   2 幕教学 + 10 题（顺序每局打乱），三种题型：
     tap    纯数字算式 14 + 3 = ? → 三个数字键
     wrong  三个算式里找出错的那个
     flash  算式 + 5 秒倒计时条 → 三个数字键（超时原地重做）
   铁律：全英文、点按推进、教学无问句、按键按下反馈必须干脆（90ms）、
         超时与答错都原地重做、进度条必须归零重置。
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
    bolt:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" fill="currentColor"/></svg>'
  };

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
      { transform: 'translateY(-7px) scale(1.08)', offset: 0.42 },
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
        ctx.audio.play('lv09/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 数字块与算式 ---------------- */

  function digit(text, cls) {
    return el('span', 'l9-digit' + (cls ? ' ' + cls : ''), text);
  }

  /**
   * 一条算式：a + b = ?
   * 返回的 refs 里留着每个数字块，方便后续做高亮 / 合并 / 填结果。
   */
  function equation(cfg) {
    cfg = cfg || {};
    var row = el('div', 'l9-eq' + (cfg.size === 'sm' ? ' l9-eq--sm' : ''));

    var numA = el('div', 'l9-num');
    var digitsA = [];
    var aStr = String(cfg.a);
    if (cfg.single) {
      // 题目里「14」就是一整块，不再拆成 1 和 4
      var whole = digit(aStr, aStr.length > 1 ? 'l9-digit--tens' : 'l9-digit--ones');
      numA.appendChild(whole);
      digitsA.push(whole);
    } else {
      for (var i = 0; i < aStr.length; i += 1) {
        var cls = aStr.length > 1 ? (i === 0 ? 'l9-digit--tens' : 'l9-digit--ones') : 'l9-digit--ones';
        var d = digit(aStr[i], cls);
        numA.appendChild(d);
        digitsA.push(d);
      }
    }
    row.appendChild(numA);

    row.appendChild(el('span', 'l9-op', '+'));

    var numB = el('div', 'l9-num');
    var bDigit = digit(String(cfg.b), 'l9-digit--add');
    numB.appendChild(bDigit);
    row.appendChild(numB);

    row.appendChild(el('span', 'l9-op', '='));

    var res = el('div', 'l9-res');
    var q = digit('?', 'l9-digit--q');
    res.appendChild(q);
    row.appendChild(res);

    var refs = {
      node: row, numA: numA, aDigits: digitsA, bDigit: bDigit,
      res: res, q: q, size: cfg.size || 'lg', single: !!cfg.single
    };

    if (cfg.reveal != null) fillResult(refs, cfg.reveal);
    return refs;
  }

  function fillResult(refs, value) {
    var s = String(value);
    refs.res.innerHTML = '';
    if (refs.single) {
      refs.res.appendChild(digit(s, s.length > 1 ? 'l9-digit--tens' : 'l9-digit--ones'));
    } else {
      for (var i = 0; i < s.length; i += 1) {
        var cls = s.length > 1 ? (i === 0 ? 'l9-digit--tens' : 'l9-digit--ones') : 'l9-digit--ones';
        refs.res.appendChild(digit(s[i], cls));
      }
    }
    refs.res.classList.add('is-filled');
  }

  /* ---------------- 教学 ---------------- */

  function blockGroup(n, cols) {
    var box = el('div', 'l9-group');
    box.style.setProperty('--cols', String(cols));
    for (var i = 0; i < n; i += 1) box.appendChild(el('span', 'l9-block'));
    return box;
  }

  async function sceneOne(host) {
    host.innerHTML = '';

    var stageBox = el('div', 'l9-stage');
    var pile = el('div', 'l9-pile');
    var ten = blockGroup(10, 5);
    var ones = blockGroup(3, 3);
    pile.appendChild(ten);
    pile.appendChild(el('span', 'l9-plus', '+'));
    pile.appendChild(ones);
    stageBox.appendChild(pile);

    var refs = equation({ a: 10, b: 3, reveal: 13 });
    refs.node.classList.add('is-hidden');
    stageBox.appendChild(refs.node);
    host.appendChild(stageBox);

    // 积木一块块落座
    Array.prototype.forEach.call(ten.children, function (b, i) { popIn(b, 20 + i * 22); });
    Array.prototype.forEach.call(ones.children, function (b, i) { popIn(b, 280 + i * 60); });

    await saySeq(['t1_a']);                 // Look at the blocks. One ten and three ones. That's thirteen.
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    // 积木 → 数字：原地化开，算式在同一个格位里浮出来
    var out = animate(pile, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.9)' }
    ], { duration: 320, easing: 'cubic-bezier(.4,.1,.4,1)' });
    var saying = saySeq(['t1_b']);          // Now, we see the numbers. Ten plus three equals thirteen.
    await out;
    if (!alive) return;
    pile.style.visibility = 'hidden';
    refs.node.classList.remove('is-hidden');
    popIn(refs.node);
    popIn(refs.node.querySelector('.l9-op'), 120);
    await saying;
    if (!alive) return;

    await sleep(360);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';

    var stageBox = el('div', 'l9-stage l9-stage--tall');
    var refs = equation({ a: 12, b: 5 });
    stageBox.appendChild(refs.node);

    // 「2 + 5 = 7」的工作小条，算式上方
    var bubble = el('div', 'l9-bubble');
    var bubbleIn = el('div', 'l9-bubble-in');
    bubble.appendChild(bubbleIn);
    var b2 = digit('2', 'l9-digit--mini');
    var plus = el('span', 'l9-op l9-op--mini', '+');
    var b5 = digit('5', 'l9-digit--mini');
    var eqs = el('span', 'l9-op l9-op--mini', '=');
    var b7 = digit('7', 'l9-digit--mini l9-digit--mini-sum');
    bubbleIn.appendChild(b2);
    bubbleIn.appendChild(plus);
    bubbleIn.appendChild(b5);
    bubbleIn.appendChild(eqs);
    bubbleIn.appendChild(b7);
    bubble.classList.add('is-hidden');
    stageBox.appendChild(bubble);

    host.appendChild(stageBox);

    popIn(refs.node);
    popIn(refs.aDigits[0], 80);
    popIn(refs.aDigits[1], 140);
    popIn(refs.bDigit, 200);

    await sleep(280);
    if (!alive) return;

    // 「Let's add the ones. Two plus five equals seven.」
    saySeq(['t2_a']);
    refs.aDigits[1].classList.add('is-flash');
    refs.bDigit.classList.add('is-flash');
    bounce(refs.aDigits[1], 260);
    bounce(refs.bDigit, 420);

    later(function () {
      bubble.classList.remove('is-hidden');
      popIn(bubbleIn, 0);
      [b2, plus, b5, eqs, b7].forEach(function (n, i) { popIn(n, i * 90); });
      bounce(b7, 520);
    }, 900);

    await sleep(2400);
    if (!alive) return;

    // 停顿一拍，再把结果填成 17：十位 1 是「不动的那颗」，个位是刚算出的 7
    await sleep(1000);
    if (!alive) return;

    refs.aDigits[1].classList.remove('is-flash');
    refs.bDigit.classList.remove('is-flash');
    fillResult(refs, 17);
    refs.res.classList.add('is-answer');
    var tens = refs.res.querySelector('.l9-digit--tens');
    var onesD = refs.res.querySelector('.l9-digit--ones');
    if (tens) { tens.classList.add('is-ten'); popIn(tens, 0); }
    if (onesD) { onesD.classList.add('is-ones'); popIn(onesD, 120); bounce(onesD, 460); }

    await saySeq(['t2_b']);                 // One ten and seven ones make seventeen.
    if (!alive) return;

    await sleep(340);
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

  /* ---------------- 计时条（闪电题） ---------------- */

  function stopTimer() {
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

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();
    stopTimer();

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
      stopTimer();
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);

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

    if (q.type === 'tap') buildTapQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'wrong') buildWrongQuestion(q, story, tray, state, correct, wrong);
    else buildFlashQuestion(q, story, tray, state, correct, wrong, root);

    saySeq(q.voice);
  }

  /* ---- 题型 A：纯数字点选 ---- */

  function keysRow(tray, options, cls, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l9-key' + (cls ? ' ' + cls : ''));
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l9-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  function buildTapQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;
    var refs = equation({ a: q.a, b: q.b, single: true });
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, '', function (value, key) {
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

  /* ---- 题型 B：找出错的算式 ---- */

  function sentence(entry) {
    // 每个数占一整块（「13」不是「1」「3」两块），孩子一眼读成十三
    var row = el('div', 'l9-sent');
    row.appendChild(digit(String(entry.a), 'l9-digit--sm'));
    row.appendChild(el('span', 'l9-op l9-op--sm', '+'));
    row.appendChild(digit(String(entry.b), 'l9-digit--sm'));
    row.appendChild(el('span', 'l9-op l9-op--sm', '='));
    row.appendChild(digit(String(entry.shown), 'l9-digit--sm'));
    return row;
  }

  function buildWrongQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l9-sents');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown };
    }));
    var keyOf = function (s) { return s.a + '+' + s.b + '=' + s.shown; };
    var bad = null;
    list.forEach(function (s) { if (s.a + s.b !== s.shown) bad = s; });

    function paint() {
      board.innerHTML = '';
      list.forEach(function (entry, i) {
        var card = el('button', 'l9-card');
        card.type = 'button';
        card.dataset.key = keyOf(entry);
        card.setAttribute('aria-label', entry.a + ' plus ' + entry.b + ' equals ' + entry.shown);
        card.appendChild(sentence(entry));
        card.addEventListener('click', function () { pick(entry, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    function pick(entry, card) {
      if (state.locked) return;
      if (entry === bad) { correct(card); return; }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, bad, keyOf);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：限时闪电点选 ---- */

  function buildFlashQuestion(q, story, tray, state, correct, wrong, root) {
    var answer = q.a + q.b;

    var bar = el('div', 'l9-timer');
    var fill = el('span', 'l9-timer-fill');
    bar.appendChild(fill);
    story.appendChild(bar);

    var refs = equation({ a: q.a, b: q.b, single: true });
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());
    var locked = false;

    function arm() {
      stopTimer();
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
      keysRow(tray, options, '', function (value, key) {
        if (locked || state.locked) return;
        if (value === answer) {
          locked = true;
          stopTimer();
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
    stopTimer();
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
    stopTimer();
    clearTimers();
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
  global.LEVELS[9] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
