/* ============================================================
   level-lv36.js · Pattern Pop（找规律：跳着数，跳到乘出来）
   ------------------------------------------------------------
   第四阶段第九关：把「每次加同一个数」看成乘法（§5.23）。
     教学 4 幕：① 3 · 6 · 9 · 12 · ?（问句停 1 秒后自答）
                ② ? 落成 15，收成 3 × 5 = 15
                ③ 按 4 跳：4 · 8 · 12 · 16 · 20
                ④ 两条规律同屏
     答题 10 题：数列填缺 4 / 听算式选数列 3 / 五秒闪电 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var LIMIT_MS = 5000;
  var LOW_AT = 3000;
  var HOP_MS = 460;

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
        ctx.audio.play('l36/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 跳石（数列） ---------------- */

  /**
   * @param values  数列（missing 位置传 null）
   * @param missing 缺失位的下标，没有则 -1
   */
  function stonesRow(values, missing) {
    var row = el('div', 'l36-row');
    var stones = [];
    values.forEach(function (v, i) {
      var s = el('span', 'l36-stone' + (i === missing ? ' is-missing' : ''), i === missing ? '?' : String(v));
      if (i === missing) s.dataset.slot = 'missing';
      row.appendChild(s);
      stones.push(s);
    });
    return { node: row, stones: stones };
  }

  function diffBadge(n) {
    return el('span', 'l36-diff', '+' + n);
  }

  /** 小圆点沿抛物弧从一块石跳到下一块石 */
  function hop(row, a, b) {
    var wrap = row.getBoundingClientRect();
    var ra = a.getBoundingClientRect();
    var rb = b.getBoundingClientRect();
    var x1 = ra.left - wrap.left + ra.width / 2;
    var y1 = ra.top - wrap.top + ra.height / 2;
    var x2 = rb.left - wrap.left + rb.width / 2;
    var y2 = rb.top - wrap.top + rb.height / 2;

    var dot = el('span', 'l36-hop');
    dot.style.left = x1 + 'px';
    dot.style.top = y1 + 'px';
    row.appendChild(dot);

    Engine.anim.track(dot, HOP_MS + 40);
    var anim = dot.animate([
      { transform: 'translate(-50%,-50%) translate(0,0) scale(.6)' },
      {
        transform: 'translate(-50%,-50%) translate(' + ((x2 - x1) / 2) + 'px,' + (-34) + 'px) scale(1)',
        offset: 0.5
      },
      { transform: 'translate(-50%,-50%) translate(' + (x2 - x1) + 'px,' + (y2 - y1) + 'px) scale(.6)' }
    ], { duration: HOP_MS, easing: 'cubic-bezier(.4,.1,.5,1)', fill: 'both' });
    return anim.finished.then(function () { remove(dot); }, function () { remove(dot); });
  }

  /* ---------------- 限时条（§6.9） ---------------- */

  function makeTimer(host, onEnd) {
    var bar = el('div', 'l36-bar is-idle');
    var fill = el('div', 'l36-bar-fill');
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
      lowT = setTimeout(function () { if (running) bar.classList.add('is-low'); }, LOW_AT);
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

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l36-teach');
    var board = el('div', 'l36-stones');
    var row = stonesRow([3, 6, 9, 12, null], 4);
    board.appendChild(row.node);
    wrap.appendChild(board);

    var note = el('div', 'l36-note', 'what comes next?');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    var v1 = saySeq(['t1_a']);
    await sleep(600);
    for (var i = 0; i < row.stones.length; i += 1) {
      bounce(row.stones[i], i * 90);
    }
    await v1;
    if (!alive) return;

    /* 问句必须停 1 秒后自答（§6.1） */
    await sleep(1000);
    if (!alive) return;

    var v2 = saySeq(['t1_b']);
    for (var k = 1; k < 4; k += 1) {
      var badge = diffBadge(3);
      badge.style.left = '';
      board.appendChild(badge);
      var ra = row.stones[k - 1].getBoundingClientRect();
      var rb = row.stones[k].getBoundingClientRect();
      var wrapRect = board.getBoundingClientRect();
      badge.style.left = ((ra.right + rb.left) / 2 - wrapRect.left) + 'px';
      badge.style.top = (ra.top - wrapRect.top - 12) + 'px';
      badge.classList.add('is-on');
      popIn(badge);
      await hop(row.node, row.stones[k - 1], row.stones[k]);
      Engine.sfx.tap();
      if (!alive) return;
    }
    await v2;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l36-teach');
    var board = el('div', 'l36-stones');
    var row = stonesRow([3, 6, 9, 12, null], 4);
    board.appendChild(row.node);
    wrap.appendChild(board);

    var card = el('div', 'l36-card');
    var fact = el('div', 'l36-fact');
    fact.appendChild(el('span', 'l36-tile', '3'));
    fact.appendChild(el('span', 'l36-op', '×'));
    fact.appendChild(el('span', 'l36-tile', '5'));
    fact.appendChild(el('span', 'l36-op', '='));
    var res = el('span', 'l36-tile l36-tile--q', '?');
    fact.appendChild(res);
    card.appendChild(fact);
    card.classList.add('is-hidden');
    wrap.appendChild(card);

    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;
    await sleep(360);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    var miss = row.stones[4];
    miss.classList.remove('is-missing');
    miss.textContent = '15';
    miss.classList.add('is-filled');
    snapPop(miss);
    Engine.sfx.star();
    await sleep(520);
    if (!alive) return;

    card.classList.remove('is-hidden');
    popIn(card);
    await sleep(200);
    if (!alive) return;
    res.textContent = '15';
    res.classList.remove('l36-tile--q');
    res.classList.add('l36-tile--res');
    snapPop(res);
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(400);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l36-teach');
    var board = el('div', 'l36-stones');
    var row = stonesRow([4, 8, 12, 16, 20], -1);
    board.appendChild(row.node);
    wrap.appendChild(board);

    var note = el('div', 'l36-note', 'skip count by four');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(360);
    if (!alive) return;
    for (var i = 0; i < row.stones.length; i += 1) {
      row.stones[i].classList.add('is-on');
      bounce(row.stones[i]);
      Engine.sfx.tap();
      await sleep(300);
      if (!alive) return;
    }
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l36-teach');
    var card = el('div', 'l36-card');

    [[3, '3 · 6 · 9 · 12 · 15'], [4, '4 · 8 · 12 · 16 · 20']].forEach(function (pair) {
      var line = el('div', 'l36-line');
      var tag = el('span', 'l36-tag', 'by ' + pair[0]);
      line.appendChild(tag);
      line.appendChild(el('span', 'l36-line-text', pair[1]));
      card.appendChild(line);
    });

    var note = el('div', 'l36-note', 'patterns help us multiply');
    card.appendChild(note);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;

    var v = saySeq(['t1_e']);
    var lines = [].slice.call(card.querySelectorAll('.l36-line'));
    for (var i = 0; i < lines.length; i += 1) {
      lines[i].classList.add('is-on');
      bounce(lines[i]);
      Engine.sfx.tap();
      await sleep(420);
      if (!alive) return;
    }
    snapPop(note);
    Engine.sfx.star();
    await v;
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
      var key = el('button', 'l36-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l36-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：数列填缺 ---------------- */

  function buildStep(q, story, tray, state, correct, wrong) {
    var values = [];
    for (var i = 0; i < 5; i += 1) values.push(i === q.miss ? null : q.start + q.d * i);
    var answer = q.start + q.d * q.miss;

    var board = el('div', 'l36-board');
    var rail = el('div', 'l36-stones');
    var row = stonesRow(values, q.miss);
    rail.appendChild(row.node);
    board.appendChild(rail);

    var hint = el('div', 'l36-note', 'goes up by ' + q.d);
    board.appendChild(hint);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());
    var target = row.stones[q.miss];

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          target.classList.remove('is-missing');
          target.textContent = String(answer);
          target.classList.add('is-filled');
          snapPop(target);
          burst(board);
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

    tray.classList.add('l36-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：听算式选数列 ---------------- */

  function buildRow(q, story, tray, state, correct, wrong) {
    var product = q.a * q.b;
    var list = Engine.quiz.shuffle(q.rows.map(function (row, i) {
      return { row: row, ok: i === q.answerIndex };
    }));

    var board = el('div', 'l36-rows');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (item, i) {
        var card = el('button', 'l36-rowcard');
        card.type = 'button';
        card.dataset.key = item.row.join(',');
        card.setAttribute('aria-label', item.row.join(' '));
        var mini = el('div', 'l36-mini');
        item.row.forEach(function (v) {
          mini.appendChild(el('span', 'l36-mini-stone', String(v)));
        });
        card.appendChild(mini);
        card.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          if (!item.ok) { wrong(card); return; }
          state.busy = true;
          card.classList.add('is-right');
          var tick = el('span', 'l36-tick');
          tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
            'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          card.appendChild(tick);
          popIn(tick);
          var mark = [].slice.call(card.querySelectorAll('.l36-mini-stone')).filter(function (n) {
            return Number(n.textContent) === product;
          })[0];
          if (mark) { mark.classList.add('is-hit'); snapPop(mark); }
          burst(board);
          correct(null, WRONG_HOLD);
        });
        popIn(card, i * 55);
        board.appendChild(card);
      });
    }

    paint();
    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：五秒闪电 ---------------- */

  function buildFlash(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var top = el('div', 'l36-timed');
    var timer = makeTimer(top, function () {
      if (state.locked) return;
      timeout();
    });
    story.appendChild(top);

    var board = el('div', 'l36-board');
    var eq = el('div', 'l36-fact l36-fact--big');
    eq.appendChild(el('span', 'l36-tile', String(q.a)));
    eq.appendChild(el('span', 'l36-op', '×'));
    eq.appendChild(el('span', 'l36-tile', String(q.b)));
    eq.appendChild(el('span', 'l36-op', '='));
    var res = el('span', 'l36-tile l36-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var chip = el('div', 'l36-combo');
    chip.innerHTML = ICONS.bolt + '<span>5 seconds</span>';
    board.appendChild(chip);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function timeout() {
      if (state.locked) return;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 200);
      }
      Engine.sfx.wrong();
      shake(board);
      later(function () { if (!alive || state.locked) return; timer.reset(); }, 560);
      later(function () { if (!alive || state.locked) return; timer.arm(); }, 1000);
    }

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          timer.succeed();
          res.textContent = String(answer);
          res.classList.remove('l36-tile--q');
          res.classList.add('l36-tile--res');
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

    tray.classList.add('l36-tray');
    paint();
    saySeq(q.voice).then(function () {
      if (state.locked || !alive) return;
      timer.arm();
    });

    return timer;
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

    if (q.type === 'step') buildStep(q, story, tray, state, correct, wrong);
    else if (q.type === 'row') buildRow(q, story, tray, state, correct, wrong);
    else liveTimer = buildFlash(q, story, tray, state, correct, wrong);
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
  global.LEVELS[36] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
