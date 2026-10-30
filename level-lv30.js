/* ============================================================
   level-lv30.js · Quick 2s & 5s（2 与 5 的口诀速算，半抽象）
   ------------------------------------------------------------
   第四阶段第三关：离开实物，只靠口诀。
     教学 4 幕：① 2 × 6 闪出，六步跳跃 2·4·6·8·10·12
                ② 十格阵 + 两格，每次亮两颗，一路亮到十二
                ③ 5 × 4 闪出，四步跳跃 5·10·15·20
                ④ 两句口诀同屏：2 × 6 = 12 / 5 × 4 = 20
     答题 10 题：纯数字点选 4 / 气球选结果 3 / 五秒闪电 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var LIMIT_MS = 5000;
  var LOW_AT = 3000;                  // 剩余 40% 时转红（5s 的 60% 处）

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
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path d="M13.4 2 5 13.4h5.2L9.8 22 19 10.6h-5.4z" fill="currentColor"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M4.7 12.6l5 4.9L19.4 6.9" fill="none" stroke="currentColor" stroke-width="3.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
  var liveTimer = null;

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
        ctx.audio.play('lv30/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 限时条（§6.9） ---------------- */

  function makeTimer(host, onEnd) {
    var bar = el('div', 'l30-bar is-idle');
    var fill = el('div', 'l30-bar-fill');
    bar.appendChild(fill);
    host.appendChild(bar);

    var anim = null;
    var lowT = 0;
    var endT = 0;
    var running = false;

    function clear() {
      if (lowT) { clearTimeout(lowT); lowT = 0; }
      if (endT) { clearTimeout(endT); endT = 0; }
      if (anim) { anim.cancel(); anim = null; }
      running = false;
    }

    function arm() {
      if (running) return;
      running = true;
      bar.classList.remove('is-idle', 'is-low', 'is-over', 'is-done');
      bar.classList.add('is-armed');
      anim = fill.animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: LIMIT_MS, easing: 'linear', fill: 'both' }
      );
      lowT = setTimeout(function () {
        if (running) bar.classList.add('is-low');
      }, LOW_AT);
      endT = setTimeout(function () {
        if (!running) return;
        clear();
        bar.classList.remove('is-low');
        bar.classList.add('is-over');
        if (onEnd) onEnd();
      }, LIMIT_MS);
    }

    function stop() {
      clear();
      bar.classList.remove('is-armed');
    }

    function reset() {
      stop();
      bar.classList.remove('is-low', 'is-over', 'is-done');
      bar.classList.add('is-idle');
    }

    function succeed() {
      stop();
      bar.classList.remove('is-low', 'is-over');
      bar.classList.add('is-done');
      fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: 180, easing: 'ease-out', fill: 'both' });
    }

    return { node: bar, arm: arm, stop: stop, reset: reset, succeed: succeed };
  }

  /* ---------------- 教学 ---------------- */

  function flashCard(a, b) {
    var card = el('div', 'l30-flash');
    card.appendChild(el('span', 'l30-flash-n', String(a)));
    card.appendChild(el('span', 'l30-flash-x', '×'));
    card.appendChild(el('span', 'l30-flash-n', String(b)));
    return card;
  }

  function jumpRow(values, cls) {
    var row = el('div', 'l30-jumps' + (cls ? ' ' + cls : ''));
    var chips = [];
    values.forEach(function (v, i) {
      if (i) row.appendChild(el('span', 'l30-jump-dot'));
      var chip = el('span', 'l30-jump', String(v));
      row.appendChild(chip);
      chips.push(chip);
    });
    return { node: row, chips: chips };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l30-teach');
    var card = flashCard(2, 6);
    wrap.appendChild(card);

    var jumps = jumpRow([2, 4, 6, 8, 10, 12]);
    jumps.node.classList.add('is-hidden');
    wrap.appendChild(jumps.node);

    host.appendChild(wrap);
    await popIn(card);
    await animate(card, [
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.25)', offset: 0.3 },
      { filter: 'brightness(1)' }
    ], { duration: 620, easing: 'ease-out' });
    if (!alive) return;

    var v = saySeq(['t1_a']);
    if (!alive) return;
    await v;
    if (!alive) return;
    await sleep(1000);                 // 问句后停 1 秒（§6.1）
    if (!alive) return;

    jumps.node.classList.remove('is-hidden');
    popIn(jumps.node);
    var v2 = saySeq(['t1_b']);
    await sleep(420);
    for (var i = 0; i < jumps.chips.length; i += 1) {
      jumps.chips[i].classList.add('is-on');
      bounce(jumps.chips[i]);
      Engine.sfx.tap();
      await sleep(260);
      if (!alive) return;
    }
    await v2;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l30-teach');
    var frame = el('div', 'l30-frame');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var c = el('span', 'l30-cell');
      frame.appendChild(c);
      cells.push(c);
    }
    var extra = el('div', 'l30-extra');
    var extraCells = [];
    for (var j = 0; j < 2; j += 1) {
      var e = el('span', 'l30-cell');
      extra.appendChild(e);
      extraCells.push(e);
    }
    var stageRow = el('div', 'l30-frame-row');
    stageRow.appendChild(frame);
    stageRow.appendChild(el('span', 'l30-frame-plus', '+'));
    stageRow.appendChild(extra);
    wrap.appendChild(stageRow);

    var note = el('div', 'l30-note', 'two at a time');
    wrap.appendChild(note);

    var total = el('div', 'l30-total', '0');
    wrap.appendChild(total);

    host.appendChild(wrap);
    await popIn(stageRow);
    if (!alive) return;
    await sleep(360);

    var all = cells.concat(extraCells);
    for (var k = 0; k < all.length; k += 1) {
      all[k].classList.add('is-on');
      if (k % 2 === 1) {
        Engine.sfx.tap();
        total.textContent = String(k + 1);
        bounce(total);
        await sleep(200);
        if (!alive) return;
      }
    }
    await sleep(300);
    total.classList.add('is-final');
    snapPop(total);
    Engine.sfx.star();
    await sleep(360);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l30-teach');
    var card = flashCard(5, 4);
    wrap.appendChild(card);
    var jumps = jumpRow([5, 10, 15, 20]);
    jumps.node.classList.add('is-hidden');
    wrap.appendChild(jumps.node);

    host.appendChild(wrap);
    await popIn(card);
    await animate(card, [
      { filter: 'brightness(1)' },
      { filter: 'brightness(1.25)', offset: 0.3 },
      { filter: 'brightness(1)' }
    ], { duration: 620, easing: 'ease-out' });
    if (!alive) return;

    var v = saySeq(['t1_c']);
    if (!alive) return;
    await v;
    if (!alive) return;
    await sleep(1000);
    if (!alive) return;

    jumps.node.classList.remove('is-hidden');
    popIn(jumps.node);
    var v2 = saySeq(['t1_d']);
    await sleep(360);
    for (var i = 0; i < jumps.chips.length; i += 1) {
      jumps.chips[i].classList.add('is-on');
      bounce(jumps.chips[i]);
      Engine.sfx.tap();
      await sleep(300);
      if (!alive) return;
    }
    await v2;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l30-teach');
    var card = el('div', 'l30-duo');

    function line(a, b, res) {
      var row = el('div', 'l30-eq');
      row.appendChild(el('span', 'l30-tile', String(a)));
      row.appendChild(el('span', 'l30-op', '×'));
      row.appendChild(el('span', 'l30-tile', String(b)));
      row.appendChild(el('span', 'l30-op', '='));
      row.appendChild(el('span', 'l30-tile l30-tile--res', String(res)));
      card.appendChild(row);
      return row;
    }
    var l1 = line(2, 6, 12);
    var l2 = line(5, 4, 20);
    l2.classList.add('is-hidden');

    var badge = el('div', 'l30-badge');
    badge.innerHTML = ICONS.bolt + '<span>quick math</span>';
    badge.classList.add('is-hidden');
    card.appendChild(badge);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(l1);
    if (!alive) return;
    await sleep(700);
    if (!alive) return;
    l2.classList.remove('is-hidden');
    popIn(l2);
    Engine.sfx.tap();
    await sleep(600);
    if (!alive) return;
    badge.classList.remove('is-hidden');
    popIn(badge);
    bounce(badge);
    await sleep(600);
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
      }, 3400);

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
      var key = el('button', 'l30-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l30-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：纯数字点选 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;
    var board = el('div', 'l30-board');
    var eq = el('div', 'l30-eq l30-eq--big');
    eq.appendChild(el('span', 'l30-tile', String(q.a)));
    eq.appendChild(el('span', 'l30-op', '×'));
    eq.appendChild(el('span', 'l30-tile', String(q.b)));
    eq.appendChild(el('span', 'l30-op', '='));
    var res = el('span', 'l30-tile l30-tile--q', '?');
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
          res.classList.remove('l30-tile--q');
          res.classList.add('l30-tile--res');
          snapPop(res);
          burst(story);
          correct(key);
          return;
        }
        state.busy = true;
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
        }, 380);
      });
    }

    tray.classList.add('l30-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：气球 ---------------- */

  function buildBalloon(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var wrap = el('div', 'l30-board');
    var eq = el('div', 'l30-eq l30-eq--big');
    eq.appendChild(el('span', 'l30-tile', String(q.a)));
    eq.appendChild(el('span', 'l30-op', '×'));
    eq.appendChild(el('span', 'l30-tile', String(q.b)));
    eq.appendChild(el('span', 'l30-op', '='));
    var res = el('span', 'l30-tile l30-tile--q', '?');
    eq.appendChild(res);
    wrap.appendChild(eq);
    var board = el('div', 'l30-balloons');
    wrap.appendChild(board);
    story.appendChild(wrap);
    popIn(eq);

    var colors = ['is-red', 'is-blue', 'is-green'];
    var options = Engine.quiz.shuffle(q.options.slice());
    var list = [];

    function paint() {
      board.innerHTML = '';
      list = options.map(function (value, i) {
        var b = el('button', 'l30-balloon ' + colors[i % colors.length]);
        b.type = 'button';
        b.dataset.value = String(value);
        b.setAttribute('aria-label', String(value));
        var body = el('span', 'l30-balloon-body');
        body.appendChild(el('span', 'l30-balloon-num', String(value)));
        b.appendChild(body);
        b.appendChild(el('span', 'l30-balloon-string'));
        b.addEventListener('click', function () { pick(value, b); });
        popIn(b, i * 70);
        board.appendChild(b);
        return b;
      });
      list.forEach(function (b, i) {
        animate(b, [
          { transform: 'translateY(0) rotate(-1.5deg)' },
          { transform: 'translateY(-7px) rotate(1.5deg)' },
          { transform: 'translateY(0) rotate(-1.5deg)' }
        ], { duration: 2600 + i * 220, easing: 'ease-in-out', delay: i * 180 });
      });
    }

    function pick(value, node) {
      if (state.locked || state.busy) return;
      if (value === answer) {
        state.busy = true;
        node.classList.add('is-right');
        res.textContent = String(answer);
        res.classList.remove('l30-tile--q');
        res.classList.add('l30-tile--res');
        snapPop(res);
        burst(node);
        Engine.sfx.correct();
        correct(null);
        return;
      }
      state.busy = true;
      wrong(node);
      later(function () {
        if (state.locked || !alive) return;
        state.busy = false;
        Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
        paint();
      }, 420);
    }

    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：五秒闪电 ---------------- */

  function buildFlash(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var top = el('div', 'l30-timed');
    var timer = makeTimer(top, function () {
      if (state.locked) return;
      timeout();
    });
    story.appendChild(top);

    var board = el('div', 'l30-board');
    var eq = el('div', 'l30-eq l30-eq--big');
    eq.appendChild(el('span', 'l30-tile', String(q.a)));
    eq.appendChild(el('span', 'l30-op', '×'));
    eq.appendChild(el('span', 'l30-tile', String(q.b)));
    eq.appendChild(el('span', 'l30-op', '='));
    var res = el('span', 'l30-tile l30-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var hint = el('div', 'l30-combo');
    hint.innerHTML = ICONS.bolt + '<span>5 seconds</span>';
    board.appendChild(hint);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());
    var timeouts = 0;

    function timeout() {
      if (state.locked) return;
      timeouts += 1;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 200);
      }
      Engine.sfx.wrong();
      shake(board);
      /* 先让空条（is-over）停半秒，孩子才看得见「时间到」，再回满重来（§6.9） */
      later(function () {
        if (state.locked || !alive) return;
        timer.reset();
      }, 560);
      later(function () {
        if (state.locked || !alive) return;
        timer.arm();
      }, 1000);
    }

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          timer.succeed();
          res.textContent = String(answer);
          res.classList.remove('l30-tile--q');
          res.classList.add('l30-tile--res');
          snapPop(res);
          burst(story);
          correct(key);
          return;
        }
        state.busy = true;
        timer.reset();
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
          timer.arm();
        }, 520);
      });
    }

    tray.classList.add('l30-tray');
    paint();
    /* 题干播完才开走（§6.9）：播报期间进度条为待命态 */
    saySeq(q.voice).then(function () {
      if (state.locked || !alive) return;
      timer.arm();
    });

    return { timer: timer, timeouts: function () { return timeouts; } };
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }

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
      if (q.type === 'balloon') {
        later(function () { Engine.sfx.star(); }, 90);
      }
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
    else liveTimer = buildFlash(q, story, tray, state, correct, wrong).timer;
  }

  function finish(star) {
    Engine.audio.stop();
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }
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
    await sceneTwo(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;
    await sceneThree(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;
    await sceneFour(host);
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
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }
    if (tapFinish) { tapFinish(); tapFinish = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[30] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
