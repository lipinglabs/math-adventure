/* ============================================================
   level-lv33.js · Spin the Wheel（3 与 4 的口诀速算）
   ------------------------------------------------------------
   第四阶段第六关：转盘指到几，就用几去乘。
     教学 4 幕：① 转盘 ×3，指针转三圈停在 4 → 4 × 3 = 12
                ② 中心翻成 ×4，指针停在 5 → 5 · 10 · 15 · 20
                ③ 两句结果并排（4 × 3 = 12 与 5 × 4 = 20）
                ④ 收尾邀请（转盘常驻）
     答题 10 题：纯数字点选 4 / 看转盘点选 3 / 五秒闪电 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var LIMIT_MS = 5000;
  var LOW_AT = 3000;
  var SPIN_MS = 1000;
  var SECTOR = 40;                   // 9 个扇区，每个 40°

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

  var SECTOR_FILLS = [
    '#FFE3C4', '#FFD6D0', '#E4F1D8', '#D8ECF7', '#FCE8C8',
    '#EFE0F6', '#D9F0EA', '#FFE9D8', '#E7E9F7'
  ];

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
        ctx.audio.play('lv33/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 转盘 ---------------- */

  function pointAt(deg, r) {
    var rad = (deg * Math.PI) / 180;
    return [160 + r * Math.cos(rad), 160 + r * Math.sin(rad)];
  }

  function wheelSvg() {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'l33-svg');
    svg.setAttribute('viewBox', '0 0 320 320');
    svg.setAttribute('aria-hidden', 'true');

    for (var i = 0; i < 9; i += 1) {
      var from = -90 - SECTOR / 2 + i * SECTOR;
      var to = from + SECTOR;
      var p1 = pointAt(from, 150);
      var p2 = pointAt(to, 150);
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M160 160 L' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) +
        ' A150 150 0 0 1 ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2) + ' Z');
      path.setAttribute('fill', SECTOR_FILLS[i]);
      path.setAttribute('stroke', 'rgba(255,255,255,0.9)');
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);

      var pos = pointAt(-90 + i * SECTOR, 112);
      var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', pos[0].toFixed(2));
      text.setAttribute('y', pos[1].toFixed(2));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'central');
      text.setAttribute('class', 'l33-num');
      text.textContent = String(i + 1);
      svg.appendChild(text);
    }

    var rim = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rim.setAttribute('cx', '160');
    rim.setAttribute('cy', '160');
    rim.setAttribute('r', '150');
    rim.setAttribute('fill', 'none');
    rim.setAttribute('stroke', '#EBD3B4');
    rim.setAttribute('stroke-width', '4');
    svg.appendChild(rim);

    return svg;
  }

  function wheelBox(mul) {
    var box = el('div', 'l33-wheel');
    var svg = wheelSvg();
    box.appendChild(svg);

    var pointer = el('span', 'l33-pointer');
    box.appendChild(pointer);

    var hub = el('div', 'l33-hub');
    var times = el('span', 'l33-times', '×' + mul);
    hub.appendChild(times);
    box.appendChild(hub);

    return { node: box, svg: svg, hub: hub, times: times, mul: mul };
  }

  function spinTo(w, n, turns) {
    var deg = -(n - 1) * SECTOR + 360 * (turns == null ? 3 : turns);
    Engine.anim.track(w.svg, SPIN_MS + 60);
    var anim = w.svg.animate([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(' + (deg * 0.82).toFixed(1) + 'deg)', offset: 0.86 },
      { transform: 'rotate(' + deg + 'deg)' }
    ], { duration: SPIN_MS, easing: 'cubic-bezier(.16,.84,.3,1)', fill: 'both' });
    return anim.finished.then(function () {
      w.svg.style.transform = 'rotate(' + deg + 'deg)';
      anim.cancel();
    }, function () { /* 已取消 */ });
  }

  function setMul(w, mul) {
    if (w.mul === mul) return Promise.resolve();
    w.mul = mul;
    Engine.anim.track(w.times, 360);
    var anim = w.times.animate([
      { transform: 'rotateX(0deg)', opacity: 1 },
      { transform: 'rotateX(90deg)', opacity: 0, offset: 0.5 },
      { transform: 'rotateX(0deg)', opacity: 1 }
    ], { duration: 340, easing: 'ease-in-out', fill: 'both' });
    return sleep(170).then(function () {
      w.times.textContent = '×' + mul;
      return anim.finished;
    }).then(function () { anim.cancel(); }, function () { /* 已取消 */ });
  }

  /* ---------------- 限时条（§6.9） ---------------- */

  function makeTimer(host, onEnd) {
    var bar = el('div', 'l33-bar is-idle');
    var fill = el('div', 'l33-bar-fill');
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

    var wrap = el('div', 'l33-teach');
    var w = wheelBox(3);
    wrap.appendChild(w.node);

    var result = el('div', 'l33-fact');
    result.appendChild(el('span', 'l33-tile l33-tile--sm', '4'));
    result.appendChild(el('span', 'l33-op', '×'));
    result.appendChild(el('span', 'l33-tile l33-tile--sm', '3'));
    result.appendChild(el('span', 'l33-op', '='));
    var res = el('span', 'l33-tile l33-tile--sm l33-tile--q', '?');
    result.appendChild(res);
    result.classList.add('is-hidden');
    wrap.appendChild(result);

    host.appendChild(wrap);
    await popIn(w.node);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(320);
    if (!alive) return;
    await spinTo(w, 4, 3);
    if (!alive) return;
    await sleep(180);
    result.classList.remove('is-hidden');
    popIn(result);
    res.textContent = '12';
    res.classList.remove('l33-tile--q');
    res.classList.add('l33-tile--res');
    snapPop(res);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l33-teach');
    var w = wheelBox(3);
    wrap.appendChild(w.node);

    var jumps = el('div', 'l33-jumps is-hidden');
    [5, 10, 15, 20].forEach(function (v, i) {
      if (i) jumps.appendChild(el('span', 'l33-jump-dot'));
      jumps.appendChild(el('span', 'l33-jump', String(v)));
    });
    wrap.appendChild(jumps);

    host.appendChild(wrap);
    await popIn(w.node);
    if (!alive) return;

    var v1 = saySeq(['t1_c']);
    await sleep(200);
    if (!alive) return;
    await setMul(w, 4);
    if (!alive) return;
    await v1;
    if (!alive) return;
    await sleep(200);

    var v2 = saySeq(['t1_b']);
    await sleep(260);
    if (!alive) return;
    await spinTo(w, 5, 2);
    if (!alive) return;
    jumps.classList.remove('is-hidden');
    popIn(jumps);
    var chips = [].slice.call(jumps.querySelectorAll('.l33-jump'));
    for (var i = 0; i < chips.length; i += 1) {
      chips[i].classList.add('is-on');
      bounce(chips[i]);
      Engine.sfx.tap();
      await sleep(260);
      if (!alive) return;
    }
    Engine.sfx.star();
    await v2;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l33-teach');
    var card = el('div', 'l33-duo');

    function line(a, b, r) {
      var row = el('div', 'l33-fact l33-fact--sm');
      row.appendChild(el('span', 'l33-tile l33-tile--sm', String(a)));
      row.appendChild(el('span', 'l33-op', '×'));
      row.appendChild(el('span', 'l33-tile l33-tile--sm', String(b)));
      row.appendChild(el('span', 'l33-op', '='));
      row.appendChild(el('span', 'l33-tile l33-tile--sm l33-tile--res', String(r)));
      card.appendChild(row);
      return row;
    }
    line(4, 3, 12);
    var l2 = line(5, 4, 20);
    l2.classList.add('is-hidden');

    var note = el('div', 'l33-note', 'same wheel, new number');
    card.appendChild(note);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;
    await sleep(600);
    if (!alive) return;
    l2.classList.remove('is-hidden');
    popIn(l2);
    Engine.sfx.tap();
    await sleep(600);
    if (!alive) return;
    snapPop(card);
    Engine.sfx.star();
    await sleep(600);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l33-teach');
    var w = wheelBox(4);
    w.svg.style.transform = 'rotate(-160deg)';
    wrap.appendChild(w.node);

    var note = el('div', 'l33-note', 'spin and say it fast');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(w.node);
    if (!alive) return;
    await sleep(300);
    var v = saySeq(['t1_d']);
    await sleep(500);
    if (!alive) return;
    await spinTo(w, 2, 2);
    if (!alive) return;
    snapPop(note);
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(300);
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
      var key = el('button', 'l33-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l33-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：纯数字点选 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;
    var board = el('div', 'l33-board');
    var eq = el('div', 'l33-eq l33-eq--big');
    eq.appendChild(el('span', 'l33-tile', String(q.a)));
    eq.appendChild(el('span', 'l33-op', '×'));
    eq.appendChild(el('span', 'l33-tile', String(q.b)));
    eq.appendChild(el('span', 'l33-op', '='));
    var res = el('span', 'l33-tile l33-tile--q', '?');
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
          res.classList.remove('l33-tile--q');
          res.classList.add('l33-tile--res');
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

    tray.classList.add('l33-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：看转盘点选 ---------------- */

  function buildWheel(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l33-board');
    var w = wheelBox(q.a);
    w.svg.style.transform = 'rotate(' + (-(q.b - 1) * SECTOR) + 'deg)';
    board.appendChild(w.node);

    var read = el('div', 'l33-read');
    read.appendChild(el('span', 'l33-read-num', String(q.b)));
    read.appendChild(el('span', 'l33-read-x', '×'));
    read.appendChild(el('span', 'l33-read-num', String(q.a)));
    read.appendChild(el('span', 'l33-read-x', '='));
    var res = el('span', 'l33-read-res', '?');
    read.appendChild(res);
    board.appendChild(read);

    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.add('is-on');
          snapPop(read);
          burst(board);
          Engine.sfx.correct();
          correct(null);
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

    tray.classList.add('l33-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：五秒闪电 ---------------- */

  function buildFlash(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var top = el('div', 'l33-timed');
    var timer = makeTimer(top, function () {
      if (state.locked) return;
      timeout();
    });
    story.appendChild(top);

    var board = el('div', 'l33-board');
    var eq = el('div', 'l33-eq l33-eq--big');
    eq.appendChild(el('span', 'l33-tile', String(q.a)));
    eq.appendChild(el('span', 'l33-op', '×'));
    eq.appendChild(el('span', 'l33-tile', String(q.b)));
    eq.appendChild(el('span', 'l33-op', '='));
    var res = el('span', 'l33-tile l33-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var chip = el('div', 'l33-combo');
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
          res.classList.remove('l33-tile--q');
          res.classList.add('l33-tile--res');
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

    tray.classList.add('l33-tray');
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
      if (q.type === 'wheel') {
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
    else if (q.type === 'wheel') buildWheel(q, story, tray, state, correct, wrong);
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
  global.LEVELS[33] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
