/* ============================================================
   level-lv43.js · Split It Up（两位数乘一位数 · 分配律启蒙）
   ------------------------------------------------------------
   第五阶段第四关：三组「一捆 + 两根」拆成三个十和六个一，
   再把 12 × 3 拆成 10 × 3 加 2 × 3。
     教学 4 幕：① 入场（3 组积木）
                ② 分堆（3 捆飞左、6 根飞右，标 30 / 6）
                ③ 拆数（12 裂成 10 与 2，两行算式浮现）
                ④ 合（=30、=6 飞入，30+6=36，定稿 12×3=36）
     答题 10 题：听拆解点结果 4 / 拖拽三段填空 3 / 找错误拆解 3
   铁律：9 个积木一次渲染、绝对定位，只改 transform（§5.7、§5.28）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;

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
  var cleanups = [];

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
    var id = setTimeout(function () { if (alive) fn(); }, ms);
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
    return anim.finished.then(function () { anim.cancel(); }, function () { });
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
        ctx.audio.play('lv43/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 积木 ---------------- */

  function bundleNode() {
    var b = el('div', 'l43-bundle');
    b.appendChild(el('span', 'l43-band l43-band--a'));
    b.appendChild(el('span', 'l43-band l43-band--b'));
    return b;
  }

  function rodNode() {
    return el('div', 'l43-rod');
  }

  /* ---------------- 教学 ---------------- */

  function blockStage() {
    var wrap = el('div', 'l43-teach');
    var field = el('div', 'l43-field');
    var blocks = [];

    for (var g = 0; g < 3; g += 1) {
      var bx = 30 + g * 108;
      var bundle = el('div', 'l43-block');
      bundle.dataset.kind = 'bundle';
      bundle.appendChild(bundleNode());
      bundle.style.transform = 'translate(' + bx + 'px,38px)';
      field.appendChild(bundle);
      blocks.push({ node: bundle, kind: 'bundle', g: g, x: bx, y: 38 });

      for (var r = 0; r < 2; r += 1) {
        var rod = el('div', 'l43-block');
        rod.dataset.kind = 'rod';
        rod.appendChild(rodNode());
        var rx = bx + 46;
        var ry = 72 + r * 30;
        rod.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
        field.appendChild(rod);
        blocks.push({ node: rod, kind: 'rod', g: g, r: r, x: rx, y: ry });
      }
    }

    wrap.appendChild(field);
    var markL = el('div', 'l43-mark l43-mark--left');
    var markR = el('div', 'l43-mark l43-mark--right');
    field.appendChild(markL);
    field.appendChild(markR);

    return { wrap: wrap, field: field, blocks: blocks, markL: markL, markR: markR };
  }

  function slideTo(item, x, y, delay) {
    var x0 = item.x;
    var y0 = item.y;
    var lift = Math.min(y0, y) - 22;
    item.node.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px)' },
      { transform: 'translate(' + ((x0 + x) / 2).toFixed(1) + 'px,' + lift.toFixed(1) + 'px)', offset: 0.5 },
      { transform: 'translate(' + x + 'px,' + y + 'px)' }
    ], { duration: 520, delay: delay, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
    item.x = x;
    item.y = y;
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var st = blockStage();
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(280);
    st.blocks.forEach(function (b, i) {
      var inner = b.node.firstElementChild;
      animate(inner, [
        { opacity: 0, transform: 'translateY(16px) scale(.7)' },
        { opacity: 1, transform: 'translateY(-3px) scale(1.06)', offset: 0.66 },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 420, delay: i * 70 });
      Engine.sfx.tap();
    });
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var st = blockStage();
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(320);

    var bi = 0;
    var ri = 0;
    st.blocks.forEach(function (b, i) {
      if (b.kind === 'bundle') {
        slideTo(b, 42 + bi * 50, 34, bi * 60);
        bi += 1;
      } else {
        var col = ri % 3;
        var row = Math.floor(ri / 3);
        slideTo(b, 216 + col * 34, 62 + row * 34, 300 + ri * 60);
        ri += 1;
      }
      later(function () { Engine.sfx.tap(); }, 520 + i * 60);
    });

    await sleep(560);
    if (!alive) return;
    st.markL.textContent = '30';
    st.markR.textContent = '6';
    st.markL.style.left = '96px';
    st.markL.style.top = '186px';
    st.markR.style.left = '250px';
    st.markR.style.top = '186px';
    st.markL.classList.add('is-on');
    st.markR.classList.add('is-on');
    bounce(st.markL);
    later(function () { if (alive) bounce(st.markR); }, 120);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(380);
  }

  function flyChip(text, from, to, delay) {
    var chip = el('span', 'l43-fly', text);
    chip.style.left = from.left + 'px';
    chip.style.top = from.top + 'px';
    chip.style.width = from.width + 'px';
    chip.style.height = from.height + 'px';
    document.body.appendChild(chip);
    var anim = chip.animate([
      { transform: 'translate(0px,0px)' },
      {
        transform: 'translate(' + ((to.left - from.left) * 0.5).toFixed(1) + 'px,' +
          ((to.top - from.top) * 0.5 - 26).toFixed(1) + 'px)',
        offset: 0.5
      },
      { transform: 'translate(' + (to.left - from.left).toFixed(1) + 'px,' + (to.top - from.top).toFixed(1) + 'px)' }
    ], { duration: 460, delay: delay, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
    anim.finished.then(function () { remove(chip); }, function () { remove(chip); });
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l43-teach');
    var head = el('div', 'l43-head');
    var n12 = el('span', 'l43-big l43-big--a', '12');
    head.appendChild(n12);
    head.appendChild(el('span', 'l43-bigop', '×'));
    head.appendChild(el('span', 'l43-big', '3'));
    head.appendChild(el('span', 'l43-bigop', '='));
    head.appendChild(el('span', 'l43-big l43-big--q', '?'));
    wrap.appendChild(head);

    var lines = el('div', 'l43-lines l43-lines--split');
    var row1 = el('div', 'l43-row l43-row--ghost');
    var lead1 = el('span', 'l43-n l43-n--lead', '10');
    row1.appendChild(lead1);
    row1.appendChild(el('span', 'l43-op', '×'));
    row1.appendChild(el('span', 'l43-n', '3'));
    row1.appendChild(el('span', 'l43-res-slot'));
    lines.appendChild(row1);

    var row2 = el('div', 'l43-row l43-row--ghost');
    var lead2 = el('span', 'l43-n l43-n--lead', '2');
    row2.appendChild(lead2);
    row2.appendChild(el('span', 'l43-op', '×'));
    row2.appendChild(el('span', 'l43-n', '3'));
    row2.appendChild(el('span', 'l43-res-slot'));
    lines.appendChild(row2);

    wrap.appendChild(lines);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(460);
    if (!alive) return;

    /* 两块从 12 的位置飞向两行行首，落定后两行显形 */
    var src = n12.getBoundingClientRect();
    n12.classList.add('is-split');
    later(function () {
      if (!alive) return;
      var t1 = lead1.getBoundingClientRect();
      var t2 = lead2.getBoundingClientRect();
      flyChip('10', src, t1, 0);
      flyChip('2', src, t2, 140);
      Engine.sfx.tap();
    }, 40);

    later(function () {
      if (!alive) return;
      row1.classList.add('is-in');
      popIn(lead1);
    }, 500);

    later(function () {
      if (!alive) return;
      row2.classList.add('is-in');
      popIn(lead2);
      Engine.sfx.tap();
    }, 640);

    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l43-teach');
    var head = el('div', 'l43-head');
    head.appendChild(el('span', 'l43-big', '12'));
    head.appendChild(el('span', 'l43-bigop', '×'));
    head.appendChild(el('span', 'l43-big', '3'));
    head.appendChild(el('span', 'l43-bigop', '='));
    var q = el('span', 'l43-big l43-big--q', '?');
    head.appendChild(q);
    wrap.appendChild(head);

    var lines = el('div', 'l43-lines');
    var row1 = el('div', 'l43-row');
    row1.appendChild(el('span', 'l43-n', '10'));
    row1.appendChild(el('span', 'l43-op', '×'));
    row1.appendChild(el('span', 'l43-n', '3'));
    row1.appendChild(el('span', 'l43-op', '='));
    row1.appendChild(el('span', 'l43-n l43-n--res', '30'));
    lines.appendChild(row1);

    var row2 = el('div', 'l43-row');
    row2.appendChild(el('span', 'l43-n', '2'));
    row2.appendChild(el('span', 'l43-op', '×'));
    row2.appendChild(el('span', 'l43-n', '3'));
    row2.appendChild(el('span', 'l43-op', '='));
    row2.appendChild(el('span', 'l43-n l43-n--res', '6'));
    lines.appendChild(row2);

    var row3 = el('div', 'l43-row l43-row--sum');
    row3.appendChild(el('span', 'l43-n', '30'));
    row3.appendChild(el('span', 'l43-op', '+'));
    row3.appendChild(el('span', 'l43-n', '6'));
    row3.appendChild(el('span', 'l43-op', '='));
    row3.appendChild(el('span', 'l43-n l43-n--res', '36'));
    lines.appendChild(row3);

    wrap.appendChild(lines);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(260);
    popIn(row1);
    later(function () { if (alive) popIn(row2); }, 220);
    later(function () { if (alive) popIn(row3); }, 520);
    later(function () { if (alive) Engine.sfx.tap(); }, 560);

    await v;
    if (!alive) return;
    await sleep(400);
    if (!alive) return;

    var v2 = saySeq(['t1_e']);
    q.textContent = '36';
    q.classList.remove('l43-big--q');
    q.classList.add('l43-big--res');
    snapPop(q);
    Engine.sfx.star();
    await v2;
    if (!alive) return;
    await sleep(260);
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
      var key = el('button', 'l43-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l43-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：听拆解点结果 ---------------- */

  function buildSplit(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l43-board');
    var eq = el('div', 'l43-eq l43-eq--big');
    eq.appendChild(el('span', 'l43-n l43-n--lg', String(q.a)));
    eq.appendChild(el('span', 'l43-op', '×'));
    eq.appendChild(el('span', 'l43-n l43-n--lg', String(q.b)));
    eq.appendChild(el('span', 'l43-op', '='));
    var res = el('span', 'l43-n l43-n--lg l43-n--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value !== answer) {
          wrong(key);
          later(function () {
            if (state.locked || !alive) return;
            state.busy = false;
            Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
            paint();
          }, 400);
          return;
        }
        state.busy = true;
        key.classList.add('is-right');
        res.textContent = String(answer);
        res.classList.remove('l43-n--q');
        res.classList.add('l43-n--res');
        snapPop(res);

        var hint = el('div', 'l43-hint');
        hint.appendChild(el('span', 'l43-n l43-n--sm', '10'));
        hint.appendChild(el('span', 'l43-op', '×'));
        hint.appendChild(el('span', 'l43-n l43-n--sm', String(q.b)));
        hint.appendChild(el('span', 'l43-op', '+'));
        hint.appendChild(el('span', 'l43-n l43-n--sm', String(q.a - 10)));
        hint.appendChild(el('span', 'l43-op', '×'));
        hint.appendChild(el('span', 'l43-n l43-n--sm', String(q.b)));
        board.appendChild(hint);
        popIn(hint, 120);
        burst(board);
        correct(null, NEXT_MS);
      });
    }

    tray.classList.add('l43-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖拽三段填空 ---------------- */

  function buildFill(q, story, tray, state, correct, wrong) {
    var u = q.a - 10;
    var answers = [10 * q.b, u * q.b, q.a * q.b];
    var labels = [
      { left: '10', right: String(q.b) },
      { left: String(u), right: String(q.b) },
      { left: String(answers[0]), right: String(answers[1]) }
    ];

    var board = el('div', 'l43-board l43-board--fill');
    var head = el('div', 'l43-head l43-head--q');
    head.appendChild(el('span', 'l43-big', String(q.a)));
    head.appendChild(el('span', 'l43-bigop', '×'));
    head.appendChild(el('span', 'l43-big', String(q.b)));
    head.appendChild(el('span', 'l43-bigop', '='));
    head.appendChild(el('span', 'l43-big l43-big--q', '?'));
    board.appendChild(head);

    var rows = el('div', 'l43-rows');
    var slots = [];
    labels.forEach(function (lab, i) {
      var row = el('div', 'l43-row l43-row--fill');
      row.appendChild(el('span', 'l43-n l43-n--sm', lab.left));
      row.appendChild(el('span', 'l43-op', i === 2 ? '+' : '×'));
      row.appendChild(el('span', 'l43-n l43-n--sm', lab.right));
      row.appendChild(el('span', 'l43-op', '='));
      var slot = el('span', 'l43-slot');
      slot.dataset.i = String(i);
      row.appendChild(slot);
      rows.appendChild(row);
      slots.push(slot);
    });
    board.appendChild(rows);

    var pool = el('div', 'l43-pool');
    var poolItems = Engine.quiz.shuffle(q.pool.slice());
    var nodes = [];
    poolItems.forEach(function (v, i) {
      var chip = el('button', 'l43-chip');
      chip.type = 'button';
      chip.dataset.value = String(v);
      chip.setAttribute('aria-label', String(v));
      chip.appendChild(el('span', 'l43-chip-n', String(v)));
      pool.appendChild(chip);
      nodes.push({ node: chip, v: v, used: false });
    });
    board.appendChild(pool);
    story.appendChild(board);
    popIn(board);

    var at = 0;
    var ghost = null;
    var drag = null;

    function focus() {
      slots.forEach(function (s, i) { s.classList.toggle('is-active', i === at); });
    }

    function fill(i, value) {
      slots[i].textContent = String(value);
      slots[i].classList.add('is-filled');
      snapPop(slots[i]);
      Engine.sfx.tap();
      at += 1;
      if (at >= slots.length) {
        slots.forEach(function (s) { s.classList.remove('is-active'); });
        var cap = el('div', 'l43-cap', q.a + ' × ' + q.b + ' = ' + (q.a * q.b));
        board.appendChild(cap);
        popIn(cap);
        burst(board);
        correct(null, NEXT_MS + 200);
        return;
      }
      focus();
      later(function () { if (alive) Engine.sfx.tap(); }, 60);
    }

    function tryPlace(item, slotIndex) {
      if (state.locked || state.busy || item.used) return;
      if (slotIndex !== at) {
        Engine.sfx.deny();
        shake(slots[slotIndex]);
        return;
      }
      if (item.v !== answers[at]) {
        /* 放错只弹回、不记错（§5.9.3：放不进不算答错） */
        item.node.classList.add('is-wrong');
        later(function () { item.node.classList.remove('is-wrong'); }, 520);
        shake(slots[slotIndex]);
        bounce(item.node);
        Engine.sfx.deny();
        return;
      }
      item.used = true;
      item.node.classList.add('is-used');
      item.node.setAttribute('aria-disabled', 'true');
      fill(at, item.v);
    }

    function slotAt(x, y) {
      for (var i = 0; i < slots.length; i += 1) {
        var b = slots[i].getBoundingClientRect();
        if (x >= b.left - HIT_PAD && x <= b.right + HIT_PAD &&
            y >= b.top - HIT_PAD && y <= b.bottom + HIT_PAD) return i;
      }
      return -1;
    }

    function placeGhost(x, y) {
      if (!ghost) return;
      ghost.style.transform = 'translate(' + (x - 24) + 'px,' + (y - 24) + 'px)';
    }

    nodes.forEach(function (item) {
      item.node.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || item.used) return;
        e.preventDefault();
        var r = item.node.getBoundingClientRect();
        drag = { item: item, x0: e.clientX, y0: e.clientY, moved: false, r: r };
        ghost = el('div', 'l43-ghost');
        ghost.style.width = r.width + 'px';
        ghost.style.height = r.height + 'px';
        ghost.textContent = String(item.v);
        document.body.appendChild(ghost);
        placeGhost(e.clientX, e.clientY);
      });
    });

    function onMove(e) {
      if (!drag) return;
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;
      if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 8) drag.moved = true;
      placeGhost(e.clientX, e.clientY);
      var si = slotAt(e.clientX, e.clientY);
      slots.forEach(function (s, i) { s.classList.toggle('is-hot', i === si); });
    }

    function onUp(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      slots.forEach(function (s) { s.classList.remove('is-hot'); });
      if (ghost) { remove(ghost); ghost = null; }
      var si = slotAt(e.clientX, e.clientY);
      if (si >= 0) { tryPlace(d.item, si); return; }
      if (!d.moved) {
        /* 轻点兜底：直接填当前空 */
        tryPlace(d.item, at);
      }
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    cleanups.push(function () {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (ghost) { remove(ghost); ghost = null; }
      drag = null;
    });

    tray.classList.add('l43-tray');
    tray.innerHTML = '';
    focus();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：找错误拆解 ---------------- */

  function buildWrongSplit(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sets.map(function (s) {
      return { s: s, bad: s.shown !== s.a - 10 };
    }));

    var board = el('div', 'l43-faults');
    story.appendChild(board);

    list.forEach(function (item, idx) {
      var s = item.s;
      var card = el('button', 'l43-fault');
      card.type = 'button';
      card.dataset.key = s.a + '/' + s.b;
      card.setAttribute('aria-label', s.a + ' times ' + s.b + ' as ten times plus ' + s.shown + ' times');

      var row = el('div', 'l43-frow');
      row.appendChild(el('span', 'l43-fn', String(s.a)));
      row.appendChild(el('span', 'l43-fop', '×'));
      row.appendChild(el('span', 'l43-fn', String(s.b)));
      row.appendChild(el('span', 'l43-fop', '='));
      row.appendChild(el('span', 'l43-fn', '10'));
      row.appendChild(el('span', 'l43-fop', '×'));
      row.appendChild(el('span', 'l43-fn', String(s.b)));
      row.appendChild(el('span', 'l43-fop', '+'));
      var u = el('span', 'l43-fn l43-fn--u', String(s.shown));
      row.appendChild(u);
      row.appendChild(el('span', 'l43-fop', '×'));
      row.appendChild(el('span', 'l43-fn', String(s.b)));
      card.appendChild(row);

      var tail = el('div', 'l43-ftail');
      card.appendChild(tail);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l43-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);

        u.classList.add('is-flip');
        later(function () {
          if (!alive) return;
          u.textContent = String(s.a - 10);
          u.classList.remove('is-flip');
          u.classList.add('is-fixed');
          snapPop(u);
        }, 220);

        later(function () {
          if (!alive) return;
          tail.textContent = '= ' + (s.a * s.b);
          popIn(tail);
          Engine.sfx.tap();
        }, 480);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 720);
      });
      popIn(card, idx * 55);
      board.appendChild(card);
    });

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];

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
      later(function () { if (!state.locked) state.busy = false; }, 460);
    }

    if (q.type === 'split') buildSplit(q, story, tray, state, correct, wrong);
    else if (q.type === 'fill') buildFill(q, story, tray, state, correct, wrong);
    else buildWrongSplit(q, story, tray, state, correct, wrong);
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
    cleanups = [];
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
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];
    clearTimers();
    if (tapFinish) { tapFinish(); tapFinish = null; }
    Array.prototype.slice.call(document.querySelectorAll('.l43-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[43] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
