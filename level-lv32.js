/* ============================================================
   level-lv32.js · Chocolate Grid（行列与交换律）
   ------------------------------------------------------------
   第四阶段第五关：3 行 4 列的巧克力，转个身还是十二块。
     教学 4 幕：① 3 行 4 列，横向逐行点数 4·8·12
                ② 纵向逐列扫描 3·6·9·12
                ③ 3 × 4 = 12 → 盘面转 90° → 4 × 3 = 12
                ④ 两句同屏定格（同一批巧克力，只是换了看的方向）
     答题 10 题：看图选算式 4 / 拖巧克力条拼阵列 3 / 听算式找阵列 3
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
    turn:
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M20 12a8 8 0 1 1-3-6.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M20 3v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
        ctx.audio.play('lv32/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 巧克力盘 ---------------- */

  function choc() {
    var c = el('span', 'l32-choc');
    c.appendChild(el('i', 'l32-dimple'));
    c.appendChild(el('i', 'l32-dimple'));
    c.appendChild(el('i', 'l32-dimple'));
    c.appendChild(el('i', 'l32-dimple'));
    return c;
  }

  function plate(rows, cols, cls) {
    var node = el('div', 'l32-plate' + (cls ? ' ' + cls : ''));
    node.style.setProperty('--cols', String(cols));
    node.style.setProperty('--rows', String(rows));
    var rowNodes = [];
    var colNodes = [];
    for (var c = 0; c < cols; c += 1) colNodes.push([]);
    for (var r = 0; r < rows; r += 1) {
      var row = el('div', 'l32-row');
      for (var k = 0; k < cols; k += 1) {
        var block = choc();
        block.dataset.r = String(r);
        block.dataset.c = String(k);
        row.appendChild(block);
        colNodes[k].push(block);
      }
      node.appendChild(row);
      rowNodes.push(row);
    }
    return { node: node, rows: rowNodes, cols: colNodes, blocks: [].slice.call(node.querySelectorAll('.l32-choc')) };
  }

  function clearScan(p) {
    p.blocks.forEach(function (b) { b.classList.remove('is-lit', 'is-scan'); });
    p.rows.forEach(function (r) { r.classList.remove('is-scan'); });
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l32-teach');
    var p = plate(3, 4);
    var stageBox = el('div', 'l32-stage');
    stageBox.appendChild(p.node);
    wrap.appendChild(stageBox);

    var counter = el('div', 'l32-counter', '0');
    wrap.appendChild(counter);
    host.appendChild(wrap);

    await popIn(p.node);
    if (!alive) return;
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                 // 问句后停 1 秒（§6.1）
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(360);
    if (!alive) return;

    var n = 0;
    for (var r = 0; r < p.rows.length; r += 1) {
      p.rows[r].classList.add('is-scan');
      for (var k = 0; k < p.rows[r].children.length; k += 1) {
        p.rows[r].children[k].classList.add('is-lit');
        n += 1;
        counter.textContent = String(n);
        bounce(counter);
        Engine.sfx.tap();
        await sleep(150);
        if (!alive) return;
      }
      p.rows[r].classList.remove('is-scan');
      await sleep(120);
      if (!alive) return;
    }
    counter.classList.add('is-final');
    snapPop(counter);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l32-teach');
    var p = plate(3, 4);
    var stageBox = el('div', 'l32-stage');
    stageBox.appendChild(p.node);
    wrap.appendChild(stageBox);

    var counter = el('div', 'l32-counter', '0');
    wrap.appendChild(counter);
    host.appendChild(wrap);

    await popIn(p.node);
    if (!alive) return;
    await sleep(260);

    var v = saySeq(['t1_c']);
    await sleep(360);
    if (!alive) return;

    var n = 0;
    for (var c = 0; c < p.cols.length; c += 1) {
      p.cols[c].forEach(function (b) { b.classList.add('is-scan'); });
      for (var r = 0; r < p.cols[c].length; r += 1) {
        p.cols[c][r].classList.add('is-lit');
        n += 1;
        counter.textContent = String(n);
        bounce(counter);
        Engine.sfx.tap();
        await sleep(150);
        if (!alive) return;
      }
      p.cols[c].forEach(function (b) { b.classList.remove('is-scan'); });
      await sleep(120);
      if (!alive) return;
    }
    counter.textContent = '12';
    counter.classList.add('is-final');
    snapPop(counter);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l32-teach');
    var p = plate(3, 4);
    p.blocks.forEach(function (b) { b.classList.add('is-lit'); });
    var stageBox = el('div', 'l32-stage');
    stageBox.appendChild(p.node);

    var eqTop = el('div', 'l32-eq');
    eqTop.appendChild(el('span', 'l32-tile', '3'));
    eqTop.appendChild(el('span', 'l32-op', '×'));
    eqTop.appendChild(el('span', 'l32-tile', '4'));
    eqTop.appendChild(el('span', 'l32-op', '='));
    var res1 = el('span', 'l32-tile l32-tile--res', '12');
    eqTop.appendChild(res1);

    var turnHint = el('div', 'l32-turn');
    turnHint.innerHTML = ICONS.turn + '<span>turn it</span>';
    turnHint.classList.add('is-hidden');

    var eqBottom = el('div', 'l32-eq');
    eqBottom.appendChild(el('span', 'l32-tile', '4'));
    eqBottom.appendChild(el('span', 'l32-op', '×'));
    eqBottom.appendChild(el('span', 'l32-tile', '3'));
    eqBottom.appendChild(el('span', 'l32-op', '='));
    var res2 = el('span', 'l32-tile l32-tile--q', '?');
    eqBottom.appendChild(res2);
    eqBottom.classList.add('is-hidden');

    wrap.appendChild(eqTop);
    wrap.appendChild(stageBox);
    wrap.appendChild(turnHint);
    wrap.appendChild(eqBottom);
    host.appendChild(wrap);

    await popIn(stageBox);
    await popIn(eqTop, 100);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(1100);
    if (!alive) return;

    /* 转的是同一块盘：不重建 DOM，只加一个 90°（§5.20） */
    turnHint.classList.remove('is-hidden');
    popIn(turnHint);
    Engine.sfx.tap();
    await sleep(360);
    if (!alive) return;

    var anim = p.node.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(38deg) scale(1.06)', offset: 0.55 },
      { transform: 'rotate(90deg) scale(1)' }
    ], { duration: 720, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
    Engine.anim.track(p.node, 780);
    await anim.finished;
    if (!alive) return;
    p.node.style.transform = 'rotate(90deg)';
    anim.cancel();

    eqBottom.classList.remove('is-hidden');
    popIn(eqBottom);
    res2.classList.remove('l32-tile--q');
    res2.classList.add('l32-tile--res');
    res2.textContent = '12';
    snapPop(res2);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l32-teach');
    var card = el('div', 'l32-duo');

    function line(a, b, r) {
      var row = el('div', 'l32-eq l32-eq--row');
      row.appendChild(el('span', 'l32-tile l32-tile--sm', String(a)));
      row.appendChild(el('span', 'l32-op', '×'));
      row.appendChild(el('span', 'l32-tile l32-tile--sm', String(b)));
      row.appendChild(el('span', 'l32-op', '='));
      row.appendChild(el('span', 'l32-tile l32-tile--sm l32-tile--res', String(r)));
      card.appendChild(row);
      return row;
    }
    line(3, 4, 12);
    var l2 = line(4, 3, 12);
    l2.classList.add('is-hidden');

    var badge = el('div', 'l32-same');
    badge.innerHTML = ICONS.check + '<span>same twelve</span>';
    badge.classList.add('is-hidden');
    card.appendChild(badge);

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
    badge.classList.remove('is-hidden');
    popIn(badge);
    bounce(badge);
    await sleep(700);
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
      saySeq(typeof keys === 'function' ? keys() : keys);
    });
    story.appendChild(replay);
  }

  function beginDrag(e, cfg) {
    var startX = e.clientX;
    var startY = e.clientY;
    var ghost = cfg.ghost();
    var r = cfg.source.getBoundingClientRect();
    ghost.style.left = (r.left + r.width / 2) + 'px';
    ghost.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(ghost);
    cfg.source.classList.add('is-lifted');

    function move(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.05)';
    }
    function detach() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    }
    function up(ev) {
      detach();
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      cfg.source.classList.remove('is-lifted');
      var target = cfg.find(ev.clientX, ev.clientY);
      if (target) {
        remove(ghost);
        cfg.onDrop(target);
        return;
      }
      var anim = ghost.animate([
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 },
        {
          transform: 'translate(-50%,-50%) translate(' + Math.round(dx * 0.45) + 'px,' + Math.round(dy * 0.45) + 'px) scale(.84)',
          opacity: .8, offset: .55
        },
        { transform: 'translate(-50%,-50%) translate(0,0) scale(.5)', opacity: 0 }
      ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
      anim.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
    }
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function insidePad(rect, x, y) {
    return x >= rect.left - HIT_PAD && x <= rect.right + HIT_PAD &&
           y >= rect.top - HIT_PAD && y <= rect.bottom + HIT_PAD;
  }

  function miniGrid(r, c) {
    var box = el('div', 'l32-mini');
    box.style.setProperty('--cols', String(c));
    for (var i = 0; i < r; i += 1) {
      var row = el('div', 'l32-mini-row');
      for (var k = 0; k < c; k += 1) row.appendChild(el('i', 'l32-mini-dot'));
      box.appendChild(row);
    }
    return box;
  }

  /* ---------------- 题型 A：看图选算式 ---------------- */

  function buildPick(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l32-board');
    var p = plate(q.r, q.c, 'l32-plate--quiz');
    p.blocks.forEach(function (b) { b.classList.add('is-lit'); });
    var stageBox = el('div', 'l32-stage l32-stage--quiz');
    stageBox.appendChild(p.node);
    board.appendChild(stageBox);
    board.appendChild(el('div', 'l32-ask', 'which number sentence?'));
    story.appendChild(board);
    popIn(board);

    var pool = q.options.map(function (pair) {
      return { a: pair[0], b: pair[1], key: pair[0] + 'x' + pair[1] };
    });
    var list = Engine.quiz.shuffle(pool);

    function isRight(opt) {
      return (opt.a === q.r && opt.b === q.c) || (opt.a === q.c && opt.b === q.r);
    }

    tray.innerHTML = '';
    tray.classList.add('l32-tray');

    function paint() {
      tray.innerHTML = '';
      list.forEach(function (opt, i) {
        var btn = el('button', 'l32-opt');
        btn.type = 'button';
        btn.dataset.key = opt.key;
        btn.setAttribute('aria-label', opt.a + ' times ' + opt.b);
        btn.appendChild(el('span', 'l32-opt-n', String(opt.a)));
        btn.appendChild(el('span', 'l32-opt-x', '×'));
        btn.appendChild(el('span', 'l32-opt-n', String(opt.b)));
        btn.addEventListener('click', function () { pick(opt, btn); });
        popIn(btn, i * 50);
        tray.appendChild(btn);
      });
    }

    function pick(opt, btn) {
      if (state.locked || state.busy) return;
      if (isRight(opt)) {
        state.busy = true;
        btn.classList.add('is-right');
        burst(btn);
        correct(null);
        return;
      }
      /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
      wrong(btn);
      later(function () {
        if (state.locked || !alive) return;
        state.busy = false;
        Engine.quiz.reshuffle(list, list.filter(isRight)[0], function (o) { return o.key; });
        paint();
      }, 400);
    }

    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖巧克力条拼阵列 ---------------- */

  function buildBuild(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l32-build');
    var eq = el('div', 'l32-eq');
    eq.appendChild(el('span', 'l32-tile l32-tile--sm', String(q.a)));
    eq.appendChild(el('span', 'l32-op', '×'));
    eq.appendChild(el('span', 'l32-tile l32-tile--sm', String(q.b)));
    eq.appendChild(el('span', 'l32-op', '='));
    var res = el('span', 'l32-tile l32-tile--sm l32-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var box = el('div', 'l32-box');
    var slots = [];
    for (var i = 0; i < q.a; i += 1) {
      var slot = el('div', 'l32-rowslot');
      slot.style.setProperty('--cols', String(q.b));
      box.appendChild(slot);
      slots.push({ node: slot, filled: false });
    }
    board.appendChild(box);

    var meter = el('div', 'l32-meter');
    meter.appendChild(el('span', 'l32-meter-label', '0'));
    board.appendChild(meter);

    story.appendChild(board);
    popIn(board);

    var count = 0;
    var pool = [];
    for (var k = 0; k <= q.a; k += 1) pool.push(k);

    tray.innerHTML = '';
    tray.classList.add('l32-tray', 'l32-tray--strips');

    pool.forEach(function (idx, i) {
      var chip = el('button', 'l32-strip');
      chip.type = 'button';
      chip.dataset.strip = String(idx);
      chip.setAttribute('aria-label', 'one row of chocolate');
      chip.style.setProperty('--cols', String(q.b));
      for (var k = 0; k < q.b; k += 1) chip.appendChild(el('i', 'l32-mini-dot'));
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l32-ghost');
            g.style.setProperty('--cols', String(q.b));
            for (var k = 0; k < q.b; k += 1) g.appendChild(el('i', 'l32-mini-dot'));
            return g;
          },
          find: function (x, y) {
            var best = null;
            var bestD = Infinity;
            slots.forEach(function (s) {
              if (s.filled) return;
              var r = s.node.getBoundingClientRect();
              if (!insidePad(r, x, y)) return;
              var d = Math.abs(x - (r.left + r.width / 2)) + Math.abs(y - (r.top + r.height / 2));
              if (d < bestD) { bestD = d; best = s; }
            });
            return best;
          },
          onDrop: function (slotRef) {
            slotRef.filled = true;
            slotRef.node.classList.add('is-filled');
            for (var k = 0; k < q.b; k += 1) slotRef.node.appendChild(el('i', 'l32-mini-dot'));
            snapPop(slotRef.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            chip.style.visibility = 'hidden';
            count += q.b;
            meter.firstChild.textContent = String(count);
            bounce(meter);
            if (count >= q.a * q.b) {
              res.textContent = String(q.a * q.b);
              res.classList.remove('l32-tile--q');
              res.classList.add('l32-tile--res');
              snapPop(res);
              later(function () {
                if (!alive) return;
                burst(board);
                correct(null);
              }, 260);
            }
          }
        });
      });
      popIn(chip, i * 40);
      tray.appendChild(chip);
    });

    saySeq(q.voice);
  }

  /* ---------------- 题型 C：听算式找阵列 ---------------- */

  function buildFind(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l32-find');
    var cards = [];

    q.arrays.forEach(function (pair, i) {
      var card = el('button', 'l32-grid-card');
      card.type = 'button';
      card.dataset.key = pair[0] + 'x' + pair[1];
      card.setAttribute('aria-label', pair[0] + ' rows of ' + pair[1]);
      var mini = miniGrid(pair[0], pair[1]);
      card.appendChild(mini);
      card.appendChild(el('span', 'l32-grid-cap', pair[0] + ' × ' + pair[1]));
      card.addEventListener('click', function () { pick(pair, card); });
      popIn(card, i * 70);
      board.appendChild(card);
      cards.push({ node: card, pair: pair });
    });

    story.appendChild(board);
    tray.innerHTML = '';
    tray.classList.add('l32-tray', 'l32-tray--empty');

    function isRight(pair) {
      return (pair[0] === q.a && pair[1] === q.b) || (pair[0] === q.b && pair[1] === q.a);
    }

    function pick(pair, card) {
      if (state.locked || state.busy) return;
      if (isRight(pair)) {
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l32-tick');
        tick.innerHTML = ICONS.check;
        card.appendChild(tick);
        popIn(tick, 40);
        burst(card);
        correct(null);
        return;
      }
      /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
      wrong(card);
      later(function () { if (!alive) return; state.busy = false; }, 420);
    }

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
      if (q.type === 'build') {
        Engine.sfx.correct();
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

    if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else if (q.type === 'build') buildBuild(q, story, tray, state, correct, wrong);
    else buildFind(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l32-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[32] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
