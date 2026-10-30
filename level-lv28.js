/* ============================================================
   level-lv28.js · Magic Gloves（2 的乘法）
   ------------------------------------------------------------
   第四阶段第一关：把「几个 2」看成一双双手套。
     教学 4 幕：① 三双手套，问「一共几只」→ 停 1 秒 → 逐只点数到六
                ② 三个 2 飞进三个圈：2 + 2 + 2 = 6
                ③ 三个圈收成 3 × 2 = 6（乘号点亮）
                ④ 两种读法并排：3 × 2 = 6 / 2 × 3 = 6
     答题 10 题：点选结果 4 / 拖手套拼阵列 3 / 三算式找错 3
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
        ctx.audio.play('lv28/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 手套 ---------------- */

  var MITTEN_SVG =
    '<svg class="l28-mitten-svg" viewBox="0 0 48 56" aria-hidden="true">' +
    '<path class="l28-mitten-body" d="M16.5 46V21a9.5 9.5 0 0 1 19 0v25z"/>' +
    '<circle class="l28-mitten-thumb" cx="14.4" cy="33.4" r="6.6"/>' +
    '<rect class="l28-mitten-cuff" x="14" y="43.4" width="22" height="9.4" rx="4.6"/>' +
    '<path class="l28-mitten-shine" d="M22.6 17.2a6.6 6.6 0 0 1 3.6-1.8"/>' +
    '</svg>';

  function mitten(extra) {
    var node = el('span', 'l28-mitten' + (extra ? ' ' + extra : ''));
    node.innerHTML = MITTEN_SVG;
    return node;
  }

  function pairNode(cls) {
    var pair = el('div', 'l28-pair' + (cls ? ' ' + cls : ''));
    var a = mitten('l28-mitten--l');
    var b = mitten('l28-mitten--r');
    pair.appendChild(a);
    pair.appendChild(b);
    return { node: pair, mittens: [a, b] };
  }

  function countGloves(pairs, onEach) {
    var order = [];
    pairs.forEach(function (p) {
      p.mittens.forEach(function (m) { order.push(m); });
    });
    return new Promise(function (resolve) {
      var n = 0;
      (function step() {
        if (!alive) { resolve(false); return; }
        if (n >= order.length) { resolve(true); return; }
        var m = order[n];
        m.classList.add('is-count');
        Engine.sfx.tap();
        if (onEach) onEach(n);
        n += 1;
        later(step, 260);
      })();
    });
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l28-teach');
    var table = el('div', 'l28-table');
    var pairs = [];
    for (var i = 0; i < 3; i += 1) {
      var p = pairNode();
      pairs.push(p);
      table.appendChild(p.node);
    }
    wrap.appendChild(table);
    host.appendChild(wrap);
    await popIn(table);
    if (!alive) return;

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                 // 问句后停 1 秒再自答（§6.1）
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(520);
    if (!alive) return;
    await countGloves(pairs);
    if (!alive) return;
    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l28-teach');
    var table = el('div', 'l28-table');
    var pairs = [];
    for (var i = 0; i < 3; i += 1) {
      var p = pairNode();
      var badge = el('b', 'l28-two', '2');
      p.node.appendChild(badge);
      p.badge = badge;
      pairs.push(p);
      table.appendChild(p.node);
    }
    wrap.appendChild(table);

    var rings = el('div', 'l28-rings');
    var ringRefs = [];
    for (var j = 0; j < 3; j += 1) {
      if (j) rings.appendChild(el('span', 'l28-plus', '+'));
      var ring = el('div', 'l28-ring');
      var num = el('b', 'l28-ring-num', '2');
      ring.appendChild(num);
      rings.appendChild(ring);
      ringRefs.push({ ring: ring, num: num });
    }
    var tail = el('div', 'l28-tail');
    tail.appendChild(el('span', 'l28-op', '='));
    var total = el('b', 'l28-tile l28-tile--res l28-tile--sm is-empty', '');
    tail.appendChild(total);
    rings.appendChild(tail);
    wrap.appendChild(rings);

    host.appendChild(wrap);
    await popIn(table);
    await popIn(rings, 120);
    if (!alive) return;
    await sleep(420);                  // 等 popIn 收完再量坐标（§6.8）

    var v = saySeq(['t2_a']);
    await sleep(700);
    if (!alive) return;

    function flyBadge(badge, ring) {
      var from = badge.getBoundingClientRect();
      var to = ring.getBoundingClientRect();
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      Engine.anim.track(badge, 520);
      var anim = badge.animate([
        { transform: 'translate(0,0) scale(1)' },
        { transform: 'translate(' + (dx * 0.5) + 'px,' + (dy * 0.5 - 22) + 'px) scale(1.14)', offset: 0.5 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.86)' }
      ], { duration: 480, easing: 'cubic-bezier(.34,.9,.5,1)', fill: 'both' });
      return anim.finished.then(function () { /* 落定 */ }, function () { /* 已取消 */ });
    }

    for (var k = 0; k < 3; k += 1) {
      await flyBadge(pairs[k].badge, ringRefs[k].ring);
      if (!alive) return;
      pairs[k].badge.classList.add('is-gone');
      ringRefs[k].num.classList.add('is-on');
      bounce(ringRefs[k].num);
      Engine.sfx.tap();
      await sleep(140);
      if (!alive) return;
    }

    await sleep(420);
    if (!alive) return;
    total.textContent = '6';
    total.classList.remove('is-empty');
    popIn(total);
    snapPop(total);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l28-teach');
    var eq = el('div', 'l28-eq l28-eq--big');
    var t3 = el('span', 'l28-tile', '3');
    var opTimes = el('span', 'l28-op l28-op--times', '×');
    var t2 = el('span', 'l28-tile', '2');
    var opEq = el('span', 'l28-op', '=');
    var res = el('span', 'l28-tile l28-tile--q', '?');
    eq.appendChild(t3);
    eq.appendChild(opTimes);
    eq.appendChild(t2);
    eq.appendChild(opEq);
    eq.appendChild(res);
    wrap.appendChild(eq);

    var note = el('div', 'l28-note', '3 groups of 2');
    note.classList.add('is-hidden');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(eq);
    if (!alive) return;
    await sleep(380);

    var v = saySeq(['t2_b']);
    await sleep(760);
    if (!alive) return;
    opTimes.classList.add('is-lit');
    snapPop(opTimes);
    Engine.sfx.tap();
    await sleep(760);
    if (!alive) return;
    res.classList.remove('l28-tile--q');
    res.classList.add('l28-tile--res');
    res.textContent = '6';
    popIn(res);
    snapPop(res);
    bounce(t3);
    Engine.sfx.correct();
    await sleep(200);
    note.classList.remove('is-hidden');
    popIn(note);

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l28-teach');
    var card = el('div', 'l28-duo');

    function row(a, b, res) {
      var line = el('div', 'l28-eq l28-eq--row');
      line.appendChild(el('span', 'l28-tile l28-tile--sm', String(a)));
      line.appendChild(el('span', 'l28-op', '×'));
      line.appendChild(el('span', 'l28-tile l28-tile--sm', String(b)));
      line.appendChild(el('span', 'l28-op', '='));
      line.appendChild(el('span', 'l28-tile l28-tile--sm l28-tile--res', String(res)));
      card.appendChild(line);
      return line;
    }
    var l1 = row(3, 2, 6);
    var l2 = row(2, 3, 6);
    l2.classList.add('is-hidden');

    var badge = el('div', 'l28-same');
    badge.innerHTML = ICONS.check + '<span>same answer</span>';
    badge.classList.add('is-hidden');
    card.appendChild(badge);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(l1);
    if (!alive) return;

    var v = saySeq(['t2_c']);
    await sleep(1500);
    if (!alive) return;
    l2.classList.remove('is-hidden');
    popIn(l2);
    Engine.sfx.tap();
    await sleep(700);
    if (!alive) return;
    badge.classList.remove('is-hidden');
    popIn(badge);
    bounce(badge);

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

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l28-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l28-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
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
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.06)';
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

  /* ---------------- 题型 A：看阵列点结果 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.n * 2;

    var board = el('div', 'l28-board');
    var eq = el('div', 'l28-eq l28-eq--ask');
    eq.appendChild(el('span', 'l28-tile l28-tile--sm', String(q.n)));
    eq.appendChild(el('span', 'l28-op', '×'));
    eq.appendChild(el('span', 'l28-tile l28-tile--sm', '2'));
    eq.appendChild(el('span', 'l28-op', '='));
    var res = el('span', 'l28-tile l28-tile--sm l28-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var array = el('div', 'l28-array');
    for (var i = 0; i < q.n; i += 1) {
      var p = pairNode('l28-pair--sm');
      popIn(p.node, i * 50);
      array.appendChild(p.node);
    }
    board.appendChild(array);

    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l28-tile--q');
          res.classList.add('l28-tile--res');
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

    tray.classList.add('l28-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖手套拼阵列 ---------------- */

  function buildBuild(q, story, tray, state, correct, wrong) {
    var target = q.n * 2;

    var board = el('div', 'l28-build');
    var eq = el('div', 'l28-eq l28-eq--ask');
    eq.appendChild(el('span', 'l28-tile l28-tile--sm', '2'));
    eq.appendChild(el('span', 'l28-op', '×'));
    eq.appendChild(el('span', 'l28-tile l28-tile--sm', String(q.n)));
    eq.appendChild(el('span', 'l28-op', '='));
    var res = el('span', 'l28-tile l28-tile--sm l28-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var box = el('div', 'l28-box');
    var slots = [];
    for (var i = 0; i < q.n; i += 1) {
      var slot = el('div', 'l28-slot');
      box.appendChild(slot);
      slots.push({ node: slot, filled: false });
    }
    board.appendChild(box);

    var meter = el('div', 'l28-meter');
    meter.appendChild(el('span', 'l28-meter-label', '0 gloves'));
    board.appendChild(meter);

    story.appendChild(board);
    popIn(board);

    var count = 0;
    var pool = [];
    for (var k = 0; k <= q.n; k += 1) pool.push(k);     // 多给一对，放不下就弹回

    tray.innerHTML = '';
    pool.forEach(function (idx, i) {
      var chip = el('button', 'l28-chip');
      chip.type = 'button';
      chip.dataset.pair = String(idx);
      chip.setAttribute('aria-label', 'a pair of gloves');
      var mini = pairNode('l28-pair--xs');
      chip.appendChild(mini.node);
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l28-ghost');
            g.appendChild(pairNode('l28-pair--xs').node);
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
            slotRef.node.appendChild(pairNode('l28-pair--xs').node);
            snapPop(slotRef.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            chip.style.visibility = 'hidden';
            count += 2;
            meter.firstChild.textContent = count + ' gloves';
            bounce(meter);
            if (count >= target) {
              res.textContent = String(target);
              res.classList.remove('l28-tile--q');
              res.classList.add('l28-tile--res');
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

    tray.classList.add('l28-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三算式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown, bad: s.a * s.b !== s.shown };
    }));

    var board = el('div', 'l28-cards');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var card = el('button', 'l28-card');
        card.type = 'button';
        card.dataset.key = s.a + 'x' + s.b + '=' + s.shown;
        card.setAttribute('aria-label', s.a + ' times ' + s.b + ' equals ' + s.shown);
        var row = el('div', 'l28-eq l28-eq--small');
        row.appendChild(el('span', 'l28-tile l28-tile--sm', String(s.a)));
        row.appendChild(el('span', 'l28-op', '×'));
        row.appendChild(el('span', 'l28-tile l28-tile--sm', String(s.b)));
        row.appendChild(el('span', 'l28-op', '='));
        var res = el('span', 'l28-tile l28-tile--sm l28-tile--ans', String(s.shown));
        row.appendChild(res);
        card.appendChild(row);
        card.addEventListener('click', function () { pick(s, res, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(s, res, card) {
      if (state.locked || state.busy) return;
      if (!s.bad) {
        state.busy = true;
        wrong(card);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) { return x.a * x.b !== x.shown; })[0],
            function (x) { return x.a + 'x' + x.b + '=' + x.shown; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      card.classList.add('is-right');
      var tick = el('span', 'l28-tick');
      tick.innerHTML = ICONS.check;
      card.appendChild(tick);
      popIn(tick, 40);
      snapPop(card);

      later(function () {
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.a * s.b);
          res.classList.remove('is-flip');
          res.classList.add('is-fixed');
          bounce(res);
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(card);
        }, 230);
      }, 240);

      correct(null, WRONG_HOLD);
    }

    paint();
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
      if (q.type !== 'tap' && q.type !== 'wrong') {
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

    if (q.type === 'tap') buildTap(q, story, tray, state, correct, wrong);
    else if (q.type === 'build') buildBuild(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l28-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[28] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
