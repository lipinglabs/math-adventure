/* ============================================================
   level-lv44.js · Bigger Arrays（两位数乘法的视觉验证）
   ------------------------------------------------------------
   第五阶段第五关：3 行 10 列 + 3 行 2 列合成 3 行 12 列，
   再把整个阵列转 90°，读成 12 行 3 列。
     教学 4 幕：① 两块阵列（中间留段缝）
                ② 合并（段缝收拢，3×12 = 36）
                ③ 交换（转 90°，3×12 → 12×3）
                ④ 点题（逐行高亮，both have thirty-six）
     答题 10 题：看点阵选算式 4 / 拖条拼阵列 3 / 找错误结果 3
   铁律：36 个点是同一批节点，合并只改 transform 与段缝（§5.24、§5.29）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var STEP = 22;
  var DOT = 15;
  var SEAM = 18;

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
        ctx.audio.play('lv44/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 阵列 ---------------- */

  /**
   * rows × cols 的点阵；cols > 10 时第 10 列之后留 seam。
   * 所有点用 transform 定位，合并只改 transform（节点引用不变）。
   */
  function arrayNode(rows, cols, opts) {
    opts = opts || {};
    var step = opts.step || STEP;
    var dot = opts.dot || DOT;
    var seam = opts.seam == null ? SEAM : opts.seam;
    var box = el('div', 'l44-array');
    var dots = [];
    box.style.width = ((cols - 1) * step + dot + (cols > 10 ? seam : 0)) + 'px';
    box.style.height = ((rows - 1) * step + dot) + 'px';

    for (var r = 0; r < rows; r += 1) {
      for (var c = 0; c < cols; c += 1) {
        var d = el('span', 'l44-dot');
        d.style.width = dot + 'px';
        d.style.height = dot + 'px';
        d.style.transform = 'translate(' + (c * step + (c >= 10 ? seam : 0)) + 'px,' + (r * step) + 'px)';
        if (c >= 10) d.classList.add('l44-dot--loose');
        box.appendChild(d);
        dots.push({ node: d, r: r, c: c });
      }
    }
    box.dataset.seam = String(seam);
    return { node: box, dots: dots, rows: rows, cols: cols, step: step, dot: dot, seam: seam };
  }

  function collapseSeam(arr, seamTo) {
    arr.dots.forEach(function (it) {
      var x = it.c * arr.step + (it.c >= 10 ? seamTo : 0);
      it.node.animate([
        { transform: it.node.style.transform },
        { transform: 'translate(' + x + 'px,' + (it.r * arr.step) + 'px)' }
      ], { duration: 460, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
    });
    arr.node.style.width = (((arr.cols - 1) * arr.step) + arr.dot + (arr.cols > 10 ? seamTo : 0)) + 'px';
    arr.seam = seamTo;
  }

  /* 旋转 90° 之后，视觉上的「一行」其实是原来的一列（§5.22 的读法） */
  function highlightCol(arr, c) {
    arr.dots.forEach(function (it) {
      if (it.c === c) {
        it.node.classList.add('is-hot');
        later(function () { it.node.classList.remove('is-hot'); }, 220);
      }
    });
  }

  /* ---------------- 教学 ---------------- */

  function teachStage(rows, cols, seam) {
    var wrap = el('div', 'l44-teach');
    var stageEl = el('div', 'l44-stage');
    var arr = arrayNode(rows, cols, { seam: seam });
    stageEl.appendChild(arr.node);
    wrap.appendChild(stageEl);
    return { wrap: wrap, stage: stageEl, arr: arr };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var st = teachStage(3, 12, SEAM);
    var tags = el('div', 'l44-tags');
    var tagA = el('span', 'l44-tag', '3 rows of 10');
    var tagB = el('span', 'l44-tag l44-tag--loose', '3 rows of 2');
    tags.appendChild(tagA);
    tags.appendChild(tagB);
    st.wrap.appendChild(tags);
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(360);
    if (!alive) return;
    tagA.animate([
      { opacity: 0, transform: 'translateY(8px) scale(.9)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 360, fill: 'forwards' });
    Engine.sfx.tap();
    await sleep(340);
    if (!alive) return;
    tagB.animate([
      { opacity: 0, transform: 'translateY(8px) scale(.9)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 360, fill: 'forwards' });
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var st = teachStage(3, 12, SEAM);
    var sum = el('div', 'l44-sum');
    sum.appendChild(el('span', 'l44-sum-n', '30'));
    sum.appendChild(el('span', 'l44-sum-op', '+'));
    sum.appendChild(el('span', 'l44-sum-n', '6'));
    sum.appendChild(el('span', 'l44-sum-op', '='));
    sum.appendChild(el('span', 'l44-sum-n l44-sum-n--res', '36'));
    st.wrap.appendChild(sum);
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(420);
    if (!alive) return;
    collapseSeam(st.arr, 4);
    await sleep(560);
    if (!alive) return;
    popIn(sum);
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(260);

    var v2 = saySeq(['t1_c']);
    st.arr.dots.forEach(function (it) { it.node.classList.add('is-glow'); });
    snapPop(st.arr.node);
    Engine.sfx.star();
    await v2;
    if (!alive) return;
    await sleep(240);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l44-teach');
    var stageEl = el('div', 'l44-stage l44-stage--turn');
    var arr = arrayNode(3, 12, { seam: 4 });
    /* 旋转前先把「十位 / 个位」的配色统一掉，交换律只看总数（§5.22） */
    arr.dots.forEach(function (it) { it.node.classList.remove('l44-dot--loose'); });
    stageEl.appendChild(arr.node);
    wrap.appendChild(stageEl);

    var eq = el('div', 'l44-turn-eq');
    eq.appendChild(el('span', 'l44-turn-n', '3'));
    eq.appendChild(el('span', 'l44-turn-op', '×'));
    eq.appendChild(el('span', 'l44-turn-n', '12'));
    eq.appendChild(el('span', 'l44-turn-op', '='));
    eq.appendChild(el('span', 'l44-turn-n l44-turn-n--res', '36'));
    wrap.appendChild(eq);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(400);
    if (!alive) return;
    stageEl.classList.add('is-turned');
    Engine.sfx.tap();
    await sleep(620);
    if (!alive) return;
    eq.classList.add('is-flip');
    await sleep(320);
    if (!alive) return;
    eq.innerHTML = '';
    eq.appendChild(el('span', 'l44-turn-n', '12'));
    eq.appendChild(el('span', 'l44-turn-op', '×'));
    eq.appendChild(el('span', 'l44-turn-n', '3'));
    eq.appendChild(el('span', 'l44-turn-op', '='));
    eq.appendChild(el('span', 'l44-turn-n l44-turn-n--res', '36'));
    popIn(eq);

    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l44-teach');
    var stageEl = el('div', 'l44-stage l44-stage--turn');
    var arr = arrayNode(3, 12, { seam: 4 });
    arr.dots.forEach(function (it) { it.node.classList.remove('l44-dot--loose'); });
    stageEl.appendChild(arr.node);
    stageEl.classList.add('is-turned');
    wrap.appendChild(stageEl);
    var chip = el('div', 'l44-chip', '12 rows of 3');
    wrap.appendChild(chip);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_e']);
    await sleep(280);
    for (var c = 0; c < 12; c += 1) {
      if (!alive) return;
      highlightCol(arr, c);
      await sleep(110);
    }
    popIn(chip);
    Engine.sfx.star();
    await v;
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

  /* ---------------- 题型 A：看点阵选算式 ---------------- */

  function buildPick(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l44-board');
    var stageEl = el('div', 'l44-stage l44-stage--q');
    var arr = arrayNode(q.r, q.c, { seam: 6, step: 20, dot: 14 });
    stageEl.appendChild(arr.node);
    board.appendChild(stageEl);
    story.appendChild(board);
    popIn(board);

    var list = Engine.quiz.shuffle(q.options.map(function (o) { return o.slice(); }));

    function paint() {
      tray.innerHTML = '';
      list.forEach(function (opt, i) {
        var btn = el('button', 'l44-opt');
        btn.type = 'button';
        btn.dataset.key = opt[0] + 'x' + opt[1];
        btn.setAttribute('aria-label', opt[0] + ' times ' + opt[1] + ' equals ' + opt[2]);
        btn.appendChild(el('span', 'l44-opt-n', String(opt[0])));
        btn.appendChild(el('span', 'l44-opt-x', '×'));
        btn.appendChild(el('span', 'l44-opt-n', String(opt[1])));
        btn.appendChild(el('span', 'l44-opt-x', '='));
        btn.appendChild(el('span', 'l44-opt-n l44-opt-n--res', String(opt[2])));
        btn.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          var good = opt[0] === q.r && opt[1] === q.c && opt[2] === q.r * q.c;
          if (!good) { wrong(btn); return; }
          state.busy = true;
          btn.classList.add('is-right');
          snapPop(btn);
          burst(board);
          correct(null, NEXT_MS);
        });
        popIn(btn, i * 50);
        tray.appendChild(btn);
      });
    }

    tray.classList.add('l44-tray', 'l44-tray--col');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖条拼阵列 ---------------- */

  function buildFillArray(q, story, tray, state, correct, wrong) {
    var u = q.c - 10;
    var rows = q.r;
    var step = 20;
    var dot = 14;

    var board = el('div', 'l44-board l44-board--fill');
    var head = el('div', 'l44-head');
    head.appendChild(el('span', 'l44-head-n', String(q.r)));
    head.appendChild(el('span', 'l44-head-op', '×'));
    head.appendChild(el('span', 'l44-head-n', String(q.c)));
    head.appendChild(el('span', 'l44-head-op', '='));
    head.appendChild(el('span', 'l44-head-n l44-head-n--q', '?'));
    board.appendChild(head);

    var wrap = el('div', 'l44-fill');
    var tens = el('div', 'l44-tens');
    tens.style.width = (10 * step - (step - dot)) + 'px';
    for (var r = 0; r < rows; r += 1) {
      var rowT = el('div', 'l44-trow');
      for (var c = 0; c < 10; c += 1) {
        var d = el('span', 'l44-tdot');
        d.style.width = dot + 'px';
        d.style.height = dot + 'px';
        rowT.appendChild(d);
      }
      tens.appendChild(rowT);
    }
    wrap.appendChild(tens);

    var loose = el('div', 'l44-loose');
    var slots = [];
    for (var rr = 0; rr < rows; rr += 1) {
      var slot = el('div', 'l44-lslot');
      slot.dataset.r = String(rr);
      for (var k = 0; k < u; k += 1) {
        var g = el('span', 'l44-ldot');
        g.style.width = dot + 'px';
        g.style.height = dot + 'px';
        slot.appendChild(g);
      }
      loose.appendChild(slot);
      slots.push({ node: slot, filled: false });
    }
    wrap.appendChild(loose);
    board.appendChild(wrap);

    var pool = el('div', 'l44-pool');
    var strips = [];
    for (var s = 0; s < rows + 1; s += 1) {
      var strip = el('button', 'l44-strip');
      strip.type = 'button';
      strip.dataset.k = String(s);
      strip.setAttribute('aria-label', u + ' dots strip');
      for (var m = 0; m < u; m += 1) {
        var dd = el('span', 'l44-sdot');
        dd.style.width = (dot - 2) + 'px';
        dd.style.height = (dot - 2) + 'px';
        strip.appendChild(dd);
      }
      pool.appendChild(strip);
      strips.push({ node: strip, used: false });
    }
    board.appendChild(pool);
    story.appendChild(board);
    popIn(board);

    var filled = 0;
    var ghost = null;
    var drag = null;

    function slotAt(x, y) {
      for (var i = 0; i < slots.length; i += 1) {
        if (slots[i].filled) continue;
        var b = slots[i].node.getBoundingClientRect();
        if (x >= b.left - HIT_PAD && x <= b.right + HIT_PAD &&
            y >= b.top - HIT_PAD && y <= b.bottom + HIT_PAD) return i;
      }
      return -1;
    }

    function place(item, si) {
      if (state.locked || item.used) return;
      item.used = true;
      item.node.classList.add('is-used');
      slots[si].filled = true;
      slots[si].node.classList.add('is-filled');
      slots[si].node.querySelectorAll('.l44-ldot').forEach(function (d) { d.classList.add('is-on'); });
      snapPop(slots[si].node);
      Engine.sfx.tap();
      filled += 1;
      if (filled >= slots.length) {
        slots.forEach(function (s2) { s2.node.classList.add('is-done'); });
        var res = document.querySelector('.l44-head-n--q');
        if (res) {
          res.textContent = String(q.r * q.c);
          res.classList.remove('l44-head-n--q');
          res.classList.add('l44-head-n--res');
          snapPop(res);
        }
        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, NEXT_MS + 220);
        }, 260);
      }
    }

    function ghostAt(x, y) {
      if (!ghost) return;
      ghost.style.transform = 'translate(' + (x - 30) + 'px,' + (y - 18) + 'px)';
    }

    strips.forEach(function (item) {
      item.node.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || item.used) return;
        e.preventDefault();
        var r = item.node.getBoundingClientRect();
        drag = { item: item, x0: e.clientX, y0: e.clientY, moved: false };
        ghost = el('div', 'l44-ghost');
        ghost.style.width = r.width + 'px';
        ghost.style.height = r.height + 'px';
        for (var m = 0; m < u; m += 1) {
          var dd = el('span', 'l44-sdot');
          dd.style.width = (dot - 2) + 'px';
          dd.style.height = (dot - 2) + 'px';
          ghost.appendChild(dd);
        }
        document.body.appendChild(ghost);
        ghostAt(e.clientX, e.clientY);
      });
    });

    function onMove(e) {
      if (!drag) return;
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;
      if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 8) drag.moved = true;
      ghostAt(e.clientX, e.clientY);
      var si = slotAt(e.clientX, e.clientY);
      slots.forEach(function (s2, i) { s2.node.classList.toggle('is-hot', i === si); });
    }

    function onUp(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      slots.forEach(function (s2) { s2.node.classList.remove('is-hot'); });
      if (ghost) { remove(ghost); ghost = null; }
      var si = slotAt(e.clientX, e.clientY);
      if (si >= 0) { place(d.item, si); return; }
      if (!d.moved) {
        var free = slots.findIndex(function (s2) { return !s2.filled; });
        if (free >= 0) place(d.item, free);
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

    tray.innerHTML = '';
    tray.classList.add('l44-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：找错误结果 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sets.map(function (s) {
      return { s: s, bad: s.shown !== s.r * s.c };
    }));

    var board = el('div', 'l44-faults');
    story.appendChild(board);

    list.forEach(function (item, idx) {
      var s = item.s;
      var card = el('button', 'l44-fault');
      card.type = 'button';
      card.dataset.key = s.r + 'x' + s.c;
      card.setAttribute('aria-label', s.r + ' rows of ' + s.c + ' equals ' + s.shown);

      var mini = el('span', 'l44-mini');
      mini.style.width = ((s.c - 1) * 9 + 7 + (s.c > 10 ? 5 : 0)) + 'px';
      mini.style.height = ((s.r - 1) * 9 + 7) + 'px';
      for (var r = 0; r < s.r; r += 1) {
        for (var c = 0; c < s.c; c += 1) {
          var d = el('i', 'l44-mdot');
          d.style.transform = 'translate(' + (c * 9 + (c >= 10 ? 5 : 0)) + 'px,' + (r * 9) + 'px)';
          mini.appendChild(d);
        }
      }
      card.appendChild(mini);

      var eq = el('span', 'l44-feq');
      eq.appendChild(el('b', null, String(s.r)));
      eq.appendChild(el('i', null, '×'));
      eq.appendChild(el('b', null, String(s.c)));
      eq.appendChild(el('i', null, '='));
      var res = el('b', 'l44-fres', String(s.shown));
      eq.appendChild(res);
      card.appendChild(eq);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l44-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);

        res.classList.add('is-flip');
        later(function () {
          if (!alive) return;
          res.textContent = String(s.r * s.c);
          res.classList.remove('is-flip');
          res.classList.add('is-fixed');
          snapPop(res);
        }, 220);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 700);
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

    if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else if (q.type === 'fillArray') buildFillArray(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l44-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[44] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
