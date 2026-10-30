/* ============================================================
   level-lv37.js · Multiplication Master（表内乘法大考 · 纯复习）
   ------------------------------------------------------------
   第四阶段第十关：把学过的口诀过一遍，然后直接考。
     教学 4 幕：① 三张闪卡位，翻出 2 × 5 = 10
                ② 翻出 3 × 4 = 12
                ③ 翻出 4 × 6 = 24
                ④ 三张并排 + 闪电徽标（挑战预热）
     答题 10 题：纯数字点选 4 / 气球选结果 3 / 三算式找错 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;

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
    bolt:
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M13.4 2 5 13.4h5.2L9.8 22 19 10.6h-5.4z" fill="currentColor"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>'
  };

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
      { opacity: 0, transform: 'scale(.66)' },
      { opacity: 1, transform: 'scale(1.08)', offset: 0.66 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 360, delay: delay || 0 });
  }

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.06)', offset: 0.42 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 320, delay: delay || 0 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px) rotate(-1.3deg)', offset: 0.22 },
      { transform: 'translateX(6px) rotate(1.3deg)', offset: 0.5 },
      { transform: 'translateX(-3px)', offset: 0.78 },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' });
  }

  function snapPop(node) {
    return animate(node, [
      { transform: 'scale(1.2,.76)' },
      { transform: 'scale(.94,1.08)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }

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
        ctx.audio.play('lv37/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 闪卡 ---------------- */

  function flashCard(a, b, r) {
    var card = el('div', 'l37-card');
    var top = el('div', 'l37-card-top');
    top.appendChild(el('span', 'l37-tile l37-tile--sm', String(a)));
    top.appendChild(el('span', 'l37-op', '×'));
    top.appendChild(el('span', 'l37-tile l37-tile--sm', String(b)));
    card.appendChild(top);

    var bottom = el('div', 'l37-card-bottom');
    bottom.appendChild(el('span', 'l37-op', '='));
    var res = el('span', 'l37-tile l37-tile--sm l37-tile--q', '?');
    bottom.appendChild(res);
    card.appendChild(bottom);

    card.dataset.key = a + 'x' + b;
    return { node: card, res: res, card: card };
  }

  function fillCard(ref, value) {
    ref.res.textContent = String(value);
    ref.res.classList.remove('l37-tile--q');
    ref.res.classList.add('l37-tile--res');
    snapPop(ref.res);
    ref.card.classList.add('is-done');
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l37-teach');
    var row = el('div', 'l37-deck');
    var refs = [flashCard(2, 5, 10), flashCard(3, 4, 12), flashCard(4, 6, 24)];
    refs.forEach(function (r) { row.appendChild(r.node); });
    wrap.appendChild(row);

    var note = el('div', 'l37-note', 'times tables review');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(row);
    if (!alive) return;

    var v1 = saySeq(['t1_a']);
    await sleep(420);
    if (!alive) return;

    var v2 = saySeq(['t1_b']);
    await sleep(360);
    if (!alive) return;
    fillCard(refs[0], 10);
    Engine.sfx.tap();
    await v2;
    if (!alive) return;
    await sleep(260);

    var v3 = saySeq(['t1_c']);
    await sleep(360);
    if (!alive) return;
    fillCard(refs[1], 12);
    Engine.sfx.tap();
    await v3;
    if (!alive) return;
    await sleep(260);

    var v4 = saySeq(['t1_d']);
    await sleep(360);
    if (!alive) return;
    fillCard(refs[2], 24);
    Engine.sfx.tap();
    await v4;
    if (!alive) return;
    await sleep(300);

    var v5 = saySeq(['t1_e']);
    var badge = el('div', 'l37-badge');
    badge.innerHTML = ICONS.bolt + '<span>ready?</span>';
    wrap.appendChild(badge);
    popIn(badge);
    note.classList.add('is-hidden');
    refs.forEach(function (r, i) { bounce(r.card, i * 120); });
    Engine.sfx.star();
    await v5;
    if (!alive) return;
    await sleep(320);
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
      }, 3000);

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
      saySeq(typeof keys === 'function' ? keys() : keys);
    });
    story.appendChild(replay);
  }

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l37-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l37-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：纯数字点选 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l37-board');
    var eq = el('div', 'l37-eq l37-eq--big');
    eq.appendChild(el('span', 'l37-tile', String(q.a)));
    eq.appendChild(el('span', 'l37-op', '×'));
    eq.appendChild(el('span', 'l37-tile', String(q.b)));
    eq.appendChild(el('span', 'l37-op', '='));
    var res = el('span', 'l37-tile l37-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l37-tile--q');
          res.classList.add('l37-tile--res');
          snapPop(res);
          burst(story);
          correct(key);
          return;
        }
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
        }, 380);
      });
    }

    tray.classList.add('l37-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：气球选结果 ---------------- */

  function buildBalloon(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;
    var palette = ['', 'is-blue', 'is-green'];

    var board = el('div', 'l37-board');
    var eq = el('div', 'l37-eq l37-eq--big');
    eq.appendChild(el('span', 'l37-tile', String(q.a)));
    eq.appendChild(el('span', 'l37-op', '×'));
    eq.appendChild(el('span', 'l37-tile', String(q.b)));
    eq.appendChild(el('span', 'l37-op', '='));
    var res = el('span', 'l37-tile l37-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var sky = el('div', 'l37-balloons');
    var order = Engine.quiz.shuffle([0, 1, 2]);
    q.options.forEach(function (value, i) {
      var balloon = el('button', 'l37-balloon ' + palette[order[i] % 3]);
      balloon.type = 'button';
      balloon.dataset.value = String(value);
      balloon.setAttribute('aria-label', String(value));
      var body = el('span', 'l37-balloon-body');
      body.appendChild(el('span', 'l37-balloon-num', String(value)));
      balloon.appendChild(body);
      balloon.appendChild(el('span', 'l37-balloon-string'));
      balloon.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l37-tile--q');
          res.classList.add('l37-tile--res');
          snapPop(res);
          balloon.classList.add('is-right');
          bounce(balloon);
          burst(board);
          correct(null);
          return;
        }
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(balloon);
        later(function () { state.busy = false; }, 420);
      });
      popIn(balloon, i * 70);
      sky.appendChild(balloon);
    });
    board.appendChild(sky);
    story.appendChild(board);
    popIn(board);

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三算式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown, bad: s.a * s.b !== s.shown };
    }));

    var board = el('div', 'l37-cards');
    story.appendChild(board);

    list.forEach(function (s, i) {
      var card = el('button', 'l37-wcard');
      card.type = 'button';
      card.dataset.key = s.a + 'x' + s.b + '=' + s.shown;
      card.setAttribute('aria-label', s.a + ' times ' + s.b + ' equals ' + s.shown);
      var row = el('div', 'l37-eq l37-eq--small');
      row.appendChild(el('span', 'l37-tile l37-tile--sm', String(s.a)));
      row.appendChild(el('span', 'l37-op', '×'));
      row.appendChild(el('span', 'l37-tile l37-tile--sm', String(s.b)));
      row.appendChild(el('span', 'l37-op', '='));
      var res = el('span', 'l37-tile l37-tile--sm l37-tile--ans', String(s.shown));
      row.appendChild(res);
      card.appendChild(row);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!s.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l37-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.a * s.b);
          res.classList.remove('is-flip', 'l37-tile--ans');
          res.classList.add('is-fixed');
          snapPop(res);
        }, 220);
        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 620);
      });
      popIn(card, i * 55);
      board.appendChild(card);
    });

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
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

    var state = { locked: false, busy: false, errors: 0 };
    makeReplay(story, q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));
      var wait = holdMs || NEXT_MS;
      if (solved.done) later(function () { finish(solved.star); }, Math.max(620, wait));
      else later(function () { askQuestion(root); }, wait);
    }

    function wrong(node) {
      if (state.locked || state.busy) return;
      state.busy = true;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 240);
      }
      Engine.sfx.wrong();
      if (node) shake(node);
      later(function () { state.busy = false; }, 420);
    }

    if (q.type === 'tap') buildTap(q, story, tray, state, correct, wrong);
    else if (q.type === 'balloon') buildBalloon(q, story, tray, state, correct, wrong);
    else buildWrong(q, story, tray, state, correct, wrong);
  }

  function finish(star) {
    Engine.audio.stop();
    ctx.complete(star);
    if (!currentRoot) return;
    LevelKit.showResult(currentRoot, star, {
      onReplay: function () { ctx.restart(); },
      onHome: function () { ctx.exit(); },
      play: function (key) { ctx.audio.play(key); }
    });
  }

  async function run(root) {
    var body = el('div', 'lv');
    var host = el('div', 'lv-story');
    body.appendChild(host);
    root.appendChild(body);

    if (ctx.quick) { askQuestion(root); return; }

    await sceneOne(host);
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
    clearTimers();
    if (tapFinish) { tapFinish(); tapFinish = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[37] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
