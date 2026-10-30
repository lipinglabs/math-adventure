/* ============================================================
   level-lv35.js · Flip the Blocks（交换律：转个身，还是十二块）
   ------------------------------------------------------------
   第四阶段第八关：顺序不重要。用两种机制各证一遍（§5.22）：
     ① 阵列旋转：同一批积木顺时针转 90°，3 行 4 列 → 4 行 3 列
     ② 重新装盘：6 颗草莓原地不动，2 个盘子换成 3 个盘子，每盘 3 颗变 2 颗
     教学 4 幕；答题 10 题：选算式对 4 / 拖填空 3 / 听算式选等价 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var TURN_MS = 720;

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
    check:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" ' +
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
        ctx.audio.play('lv35/' + key).then(step, step);
      }
      step();
    });
  }

  /** FLIP：先量位置、再改 DOM、再从旧位置滑回来（草莓换盘用，节点不换） */
  function flipMove(nodes, mutate, ms) {
    var first = nodes.map(function (n) { return n.getBoundingClientRect(); });
    mutate();
    nodes.forEach(function (n, i) {
      var last = n.getBoundingClientRect();
      var dx = first[i].left - last.left;
      var dy = first[i].top - last.top;
      if (!dx && !dy) return;
      Engine.anim.track(n, (ms || 520) + 20);
      var anim = n.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.92)' },
        { transform: 'translate(0,0) scale(1)' }
      ], { duration: ms || 520, easing: 'cubic-bezier(.34,1.2,.5,1)', fill: 'both' });
      anim.finished.then(function () { anim.cancel(); }, function () { /* 已取消 */ });
    });
  }

  /* ---------------- 积木阵列 ---------------- */

  function blocksPlate(rows, cols) {
    var node = el('div', 'l35-plate');
    var cells = [];
    for (var r = 0; r < rows; r += 1) {
      var row = el('div', 'l35-row');
      var line = [];
      for (var c = 0; c < cols; c += 1) {
        var b = el('span', 'l35-block');
        row.appendChild(b);
        line.push(b);
      }
      node.appendChild(row);
      cells.push(line);
    }
    return { node: node, cells: cells, rows: rows, cols: cols };
  }

  function lightRow(plate, r) {
    return plate.cells[r].map(function (b) {
      b.classList.add('is-on');
      return b;
    });
  }

  function lightCol(plate, c) {
    var list = [];
    for (var r = 0; r < plate.rows; r += 1) {
      plate.cells[r][c].classList.add('is-on');
      list.push(plate.cells[r][c]);
    }
    return list;
  }

  /* ---------------- 草莓盘 ---------------- */

  function plateNode(n) {
    var p = el('div', 'l35-plate-dish');
    p.dataset.plate = String(n);
    return p;
  }

  function berryNode() {
    var b = el('span', 'l35-berry');
    b.appendChild(el('span', 'l35-leaf'));
    return b;
  }

  function strawberryRow(count, perPlate) {
    var row = el('div', 'l35-dishes');
    var berries = [];
    for (var i = 0; i < count; i += 1) {
      var dish = plateNode(i);
      for (var k = 0; k < perPlate; k += 1) {
        var b = berryNode();
        dish.appendChild(b);
        berries.push(b);
      }
      row.appendChild(dish);
    }
    return { node: row, berries: berries };
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l35-teach');
    var stageBox = el('div', 'l35-stage');
    var plate = blocksPlate(3, 4);
    stageBox.appendChild(plate.node);
    wrap.appendChild(stageBox);

    var note = el('div', 'l35-note', '3 rows · 4 columns');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(stageBox);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(420);
    for (var r = 0; r < plate.rows; r += 1) {
      lightRow(plate, r).forEach(function (b) { snapPop(b); });
      Engine.sfx.tap();
      await sleep(260);
      if (!alive) return;
    }
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l35-teach');
    var stageBox = el('div', 'l35-stage');
    var plate = blocksPlate(3, 4);
    plate.cells.forEach(function (line) {
      line.forEach(function (b) { b.classList.add('is-on'); });
    });
    stageBox.appendChild(plate.node);
    wrap.appendChild(stageBox);

    var note = el('div', 'l35-note', 'turn it a quarter');
    wrap.appendChild(note);
    host.appendChild(wrap);
    await popIn(stageBox);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(460);
    if (!alive) return;

    Engine.anim.track(plate.node, TURN_MS + 80);
    var anim = plate.node.animate([
      { transform: 'rotate(0deg) scale(1)' },
      { transform: 'rotate(45deg) scale(1.06)', offset: 0.55 },
      { transform: 'rotate(90deg) scale(1)' }
    ], { duration: TURN_MS, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
    await anim.finished;
    if (!alive) return;
    plate.node.style.transform = 'rotate(90deg)';
    anim.cancel();

    plate.cells.forEach(function (line) {
      line.forEach(function (b) { b.classList.remove('is-on'); });
    });
    note.textContent = '4 rows · 3 columns';
    await sleep(240);
    if (!alive) return;

    /* 转完再数一次：沿「旧列方向」逐行点亮，视觉上就是新的 4 行 */
    for (var c = 0; c < plate.cols; c += 1) {
      lightCol(plate, c).forEach(function (b) { snapPop(b); });
      Engine.sfx.tap();
      await sleep(300);
      if (!alive) return;
    }

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l35-teach');
    var card = el('div', 'l35-card');

    function line(a, b, r, hidden) {
      var row = el('div', 'l35-fact');
      row.appendChild(el('span', 'l35-tile', String(a)));
      row.appendChild(el('span', 'l35-op', '×'));
      row.appendChild(el('span', 'l35-tile', String(b)));
      row.appendChild(el('span', 'l35-op', '='));
      row.appendChild(el('span', 'l35-tile l35-tile--res', String(r)));
      if (hidden) row.classList.add('is-hidden');
      card.appendChild(row);
      return row;
    }

    var l1 = line(3, 4, 12, false);
    var l2 = line(4, 3, 12, true);
    var same = el('div', 'l35-same', 'same twelve');
    same.classList.add('is-hidden');
    card.appendChild(same);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(500);
    if (!alive) return;
    l2.classList.remove('is-hidden');
    popIn(l2);
    Engine.sfx.tap();
    await sleep(420);
    if (!alive) return;
    same.classList.remove('is-hidden');
    popIn(same);
    snapPop(card);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(360);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l35-teach');
    var first = strawberryRow(2, 3);
    wrap.appendChild(first.node);

    var cap = el('div', 'l35-cap', '2 × 3 = 6');
    wrap.appendChild(cap);

    var total = el('div', 'l35-total', '6 berries');
    wrap.appendChild(total);

    host.appendChild(wrap);
    await popIn(first.node);
    if (!alive) return;

    var v1 = saySeq(['t1_d']);
    await sleep(420);
    for (var i = 0; i < first.berries.length; i += 1) {
      first.berries[i].classList.add('is-on');
      Engine.sfx.tap();
      await sleep(110);
      if (!alive) return;
    }

    await v1;
    if (!alive) return;
    await sleep(420);
    if (!alive) return;

    /* 换盘：草莓节点不动，只换盘子并把它们挪进新盘子 */
    var row = first.node;
    var oldDishes = [].slice.call(row.querySelectorAll('.l35-plate-dish'));
    var v2 = saySeq(['t1_e']);

    oldDishes.forEach(function (d) { d.classList.add('is-out'); });
    await sleep(280);
    if (!alive) return;

    var dishes = [];
    for (var k = 0; k < 3; k += 1) {
      var dish = plateNode(k);
      row.appendChild(dish);
      dishes.push(dish);
    }
    flipMove(first.berries, function () {
      first.berries.forEach(function (b, idx) {
        dishes[Math.floor(idx / 2)].appendChild(b);
      });
      oldDishes.forEach(function (d) { if (d.parentNode) d.parentNode.removeChild(d); });
    }, 560);

    cap.textContent = '3 × 2 = 6';
    snapPop(cap);
    Engine.sfx.star();
    await sleep(420);
    if (!alive) return;
    snapPop(total);

    await v2;
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
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.04)';
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

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l35-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l35-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：选出两式都成立的一组 ---------------- */

  function buildPair(q, story, tray, state, correct, wrong) {
    var total = q.r * q.c;

    var board = el('div', 'l35-board');
    var plate = blocksPlate(q.r, q.c);
    plate.node.classList.add('l35-plate--quiz');
    board.appendChild(plate.node);

    var ask = el('div', 'l35-ask', 'which pair is the same?');
    board.appendChild(ask);
    story.appendChild(board);
    popIn(board);

    var list = Engine.quiz.shuffle(q.options.map(function (pair) {
      return { pair: pair, ok: pair[0][0] * pair[0][1] === total && pair[1][0] * pair[1][1] === total };
    }));

    function paint() {
      tray.innerHTML = '';
      list.forEach(function (item, i) {
        var card = el('button', 'l35-opt');
        card.type = 'button';
        card.dataset.key = item.pair[0].join('x') + '|' + item.pair[1].join('x');
        card.setAttribute('aria-label', item.pair[0].join(' times ') + ' and ' + item.pair[1].join(' times '));
        item.pair.forEach(function (p, k) {
          if (k) card.appendChild(el('span', 'l35-opt-and', 'and'));
          var line = el('span', 'l35-opt-line');
          line.appendChild(el('span', 'l35-opt-n', String(p[0])));
          line.appendChild(el('span', 'l35-opt-x', '×'));
          line.appendChild(el('span', 'l35-opt-n', String(p[1])));
          card.appendChild(line);
        });
        card.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          if (!item.ok) { wrong(card); return; }
          state.busy = true;
          card.classList.add('is-right');
          var tick = el('span', 'l35-tick');
          tick.innerHTML = ICONS.check;
          card.appendChild(tick);
          popIn(tick);
          burst(board);
          correct(null);
        });
        popIn(card, i * 50);
        tray.appendChild(card);
      });
    }

    tray.classList.add('l35-tray', 'l35-tray--wide');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖数字填空 ---------------- */

  function buildFill(q, story, tray, state, correct, wrong) {
    var answer = q.b;

    var board = el('div', 'l35-board');
    var eq = el('div', 'l35-fact');
    eq.appendChild(el('span', 'l35-tile', String(q.a)));
    eq.appendChild(el('span', 'l35-op', '×'));
    eq.appendChild(el('span', 'l35-tile', String(q.b)));
    eq.appendChild(el('span', 'l35-op', '='));

    var cell = el('span', 'l35-drop');
    cell.setAttribute('aria-label', 'the missing number');
    eq.appendChild(cell);
    eq.appendChild(el('span', 'l35-op', '×'));
    eq.appendChild(el('span', 'l35-tile', String(q.a)));
    board.appendChild(eq);
    story.appendChild(board);
    popIn(board);

    var pool = Engine.quiz.shuffle(q.pool.slice());

    tray.innerHTML = '';
    pool.forEach(function (value, i) {
      var chip = el('button', 'l35-chip');
      chip.type = 'button';
      chip.dataset.value = String(value);
      chip.setAttribute('aria-label', String(value));
      chip.appendChild(el('span', 'l35-chip-digit', String(value)));
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l35-ghost');
            g.appendChild(el('span', 'l35-chip-digit', String(value)));
            return g;
          },
          find: function (x, y) {
            if (value !== answer) return null;          // 数字不对：只回弹，不判错（§5.9）
            if (cell.classList.contains('is-filled')) return null;
            return insidePad(cell.getBoundingClientRect(), x, y) ? 'cell' : null;
          },
          onDrop: function () {
            cell.textContent = String(value);
            cell.classList.add('is-filled');
            snapPop(cell);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            later(function () {
              if (state.locked || !alive) return;
              snapPop(eq);
              burst(board);
              correct(null);
            }, 240);
          }
        });
      });
      popIn(chip, i * 40);
      tray.appendChild(chip);
    });

    tray.classList.add('l35-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：听算式选等价 ---------------- */

  function buildEquiv(q, story, tray, state, correct, wrong) {
    var total = q.a * q.b;

    var board = el('div', 'l35-cards');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.options.map(function (opt) {
      return { op: opt[0], a: opt[1], b: opt[2], ok: opt[0] === '×' && opt[1] * opt[2] === total };
    }));

    list.forEach(function (item, i) {
      var card = el('button', 'l35-card');
      card.type = 'button';
      card.dataset.key = item.a + item.op + item.b;
      card.setAttribute('aria-label', item.a + ' ' + (item.op === '×' ? 'times' : item.op === '+' ? 'plus' : 'minus') + ' ' + item.b);
      var row = el('div', 'l35-fact l35-fact--sm');
      row.appendChild(el('span', 'l35-tile l35-tile--sm', String(item.a)));
      row.appendChild(el('span', 'l35-op', item.op));
      row.appendChild(el('span', 'l35-tile l35-tile--sm', String(item.b)));
      card.appendChild(row);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.ok) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var res = el('span', 'l35-tile l35-tile--sm l35-tile--res', String(total));
        row.appendChild(el('span', 'l35-op', '='));
        row.appendChild(res);
        snapPop(res);
        var tick = el('span', 'l35-tick');
        tick.innerHTML = ICONS.check;
        card.appendChild(tick);
        popIn(tick);
        burst(board);
        correct(null, WRONG_HOLD);
      });
      popIn(card, i * 55);
      board.appendChild(card);
    });

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

    if (q.type === 'pair') buildPair(q, story, tray, state, correct, wrong);
    else if (q.type === 'fill') buildFill(q, story, tray, state, correct, wrong);
    else buildEquiv(q, story, tray, state, correct, wrong);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[35] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
