/* ============================================================
   level-lv46.js · Share the Sticks（两位数除以一位数 · 无余数）
   ------------------------------------------------------------
   第五阶段第七关：48 根小棒平均分给 4 个小朋友，先分十位再分个位。
     教学 4 幕：① 入场（4 捆 + 8 根 + 4 个小朋友）
                ② 分十位（4 捆各飞一人）
                ③ 分个位（8 根两两飞入）
                ④ 合（每人 10 + 2 = 12，48 ÷ 4 = 12）
     答题 10 题：看分配点结果 4 / 拖拽分配 3（提交键）/ 找错误分配 3
   铁律：飞走只改 transform、落定 reparent 进收纳格（§5.31）；
         其余物件坐标零位移（§5.7）；放完不判对，按提交才判（§6.10）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 720;
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
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3.2" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var KID_COLORS = ['#F6A96B', '#7FC7E8', '#A8D89A', '#E8A6C8'];

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

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
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
      { transform: 'translateY(-6px) scale(1.05,.95)', offset: 0.4 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 300, delay: delay || 0 });
  }

  function snapPop(node) {
    return animate(node, [
      { transform: 'scale(1.2,.76)' },
      { transform: 'scale(.94,1.08)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' });
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
        ctx.audio.play('lv46/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小棒 ---------------- */

  function bundleNode(small) {
    var b = el('div', 'l46-bundle' + (small ? ' l46-bundle--sm' : ''));
    return b;
  }

  function stickNode(small) {
    return el('div', 'l46-stick' + (small ? ' l46-stick--sm' : ''));
  }

  function kidSvg(color, size) {
    var s = svgEl('svg', { viewBox: '0 0 60 60', width: size || 46, height: size || 46, 'aria-hidden': 'true' });
    s.classList.add('l46-kid-svg');
    s.appendChild(svgEl('circle', { cx: 30, cy: 32, r: 22, fill: color, opacity: '.28' }));
    s.appendChild(svgEl('circle', { cx: 30, cy: 30, r: 17, fill: color }));
    s.appendChild(svgEl('circle', { cx: 24, cy: 27, r: 2.6, fill: '#5B4A3A' }));
    s.appendChild(svgEl('circle', { cx: 36, cy: 27, r: 2.6, fill: '#5B4A3A' }));
    var smile = svgEl('path', {
      d: 'M24 36q6 5 12 0',
      fill: 'none',
      stroke: '#5B4A3A',
      'stroke-width': 2.4,
      'stroke-linecap': 'round'
    });
    s.appendChild(smile);
    s.appendChild(svgEl('circle', { cx: 19.5, cy: 33, r: 3, fill: '#F08C8C', opacity: '.45' }));
    s.appendChild(svgEl('circle', { cx: 40.5, cy: 33, r: 3, fill: '#F08C8C', opacity: '.45' }));
    return s;
  }

  /* ---------------- 教学 ---------------- */

  var T = null;

  function teachingStage(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l46-teach');
    var field = el('div', 'l46-field');

    var bundles = [];
    for (var i = 0; i < 4; i += 1) {
      var b = bundleNode(false);
      b.style.left = (46 + i * 72) + 'px';
      b.style.top = '18px';
      b.classList.add('l46-piece');
      field.appendChild(b);
      bundles.push(b);
    }

    var sticks = [];
    for (var j = 0; j < 8; j += 1) {
      var st = stickNode(false);
      st.style.left = (28 + j * 37) + 'px';
      st.style.top = '140px';
      st.classList.add('l46-piece');
      field.appendChild(st);
      sticks.push(st);
    }

    var kidRow = el('div', 'l46-kids');
    var trays = [];
    var sums = [];
    for (var k = 0; k < 4; k += 1) {
      var kid = el('div', 'l46-kid');
      kid.appendChild(kidSvg(KID_COLORS[k]));
      var tray = el('div', 'l46-tray');
      tray.dataset.kid = String(k);
      kid.appendChild(tray);
      var sum = el('div', 'l46-sum');
      sum.appendChild(el('span', 'l46-sum-ten', '10'));
      sum.appendChild(el('span', 'l46-sum-op', '+'));
      sum.appendChild(el('span', 'l46-sum-one', '2'));
      sum.appendChild(el('span', 'l46-sum-op', '='));
      sum.appendChild(el('span', 'l46-sum-res', '12'));
      kid.appendChild(sum);
      kidRow.appendChild(kid);
      trays.push(tray);
      sums.push(sum);
    }
    field.appendChild(kidRow);
    wrap.appendChild(field);

    var eq = el('div', 'l46-eq');
    eq.appendChild(el('span', 'l46-eq-n', '48'));
    eq.appendChild(el('span', 'l46-eq-op', '÷'));
    eq.appendChild(el('span', 'l46-eq-n', '4'));
    eq.appendChild(el('span', 'l46-eq-op', '='));
    var res = el('span', 'l46-eq-n l46-eq-n--res', '12');
    eq.appendChild(res);
    wrap.appendChild(eq);

    host.appendChild(wrap);
    return {
      wrap: wrap, field: field, bundles: bundles, sticks: sticks,
      trays: trays, sums: sums, eq: eq, res: res
    };
  }

  /* FLIP：算出位移后平移，落定 reparent 进收纳格并清空 transform（§5.31） */
  function flyTo(node, tray, delay, arc) {
    var from = node.getBoundingClientRect();
    var to = tray.getBoundingClientRect();
    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height - 10) - (from.top + from.height);
    node.style.zIndex = '6';
    return new Promise(function (resolve) {
      var anim = node.animate([
        { transform: 'translate(0px,0px)' },
        {
          transform: 'translate(' + (dx * 0.5).toFixed(1) + 'px,' +
            (dy * 0.5 - (arc || 18)).toFixed(1) + 'px)',
          offset: 0.5
        },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)' }
      ], { duration: 520, delay: delay || 0, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
      anim.finished.then(function () {
        anim.cancel();
        node.style.transform = '';
        node.style.zIndex = '';
        node.style.left = '';
        node.style.top = '';
        node.classList.remove('l46-piece');
        tray.appendChild(node);
        bounce(node);
        resolve(true);
      }, function () { resolve(false); });
    });
  }

  async function sceneOne(host) {
    host.dataset.scene = 'one';
    T = teachingStage(host);
    await popIn(T.wrap);
    if (!alive) return;
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(260);
  }

  async function sceneTwo(host) {
    host.dataset.scene = 'two';
    var v = saySeq(['t1_b']);
    for (var n = 0; n < 4; n += 1) {
      if (!alive) return;
      await flyTo(T.bundles[n], T.trays[n], n * 150, 20);
      Engine.sfx.tap();
      await sleep(110);
    }
    await v;
    if (!alive) return;
    await sleep(220);
  }

  async function sceneThree(host) {
    host.dataset.scene = 'three';
    var v = saySeq(['t1_c', 't1_d']);
    await sleep(420);
    for (var n = 0; n < 8; n += 1) {
      if (!alive) return;
      await flyTo(T.sticks[n], T.trays[Math.floor(n / 2)], 0, 16);
      Engine.sfx.tap();
      await sleep(120);
    }
    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneFour(host) {
    host.dataset.scene = 'four';
    var v = saySeq(['t1_e']);
    T.sums.forEach(function (node, i) {
      later(function () {
        if (!alive) return;
        node.classList.add('is-on');
        popIn(node);
        if (i === 0) Engine.sfx.tap();
      }, 240 + i * 180);
    });
    later(function () {
      if (!alive) return;
      T.eq.classList.add('is-on');
      snapPop(T.res);
      Engine.sfx.star();
    }, 1260);
    await v;
    if (!alive) return;
    await sleep(420);
  }

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
      var key = el('button', 'l46-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l46-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：看分配点结果 ---------------- */

  function buildShare(q, story, tray, state, correct, wrong) {
    var answer = q.total / q.parts;
    var tens = Math.floor(answer / 10);
    var ones = answer % 10;

    var board = el('div', 'l46-board');
    var scene = el('div', 'l46-qscene');
    scene.style.setProperty('--kids', String(q.parts));

    for (var k = 0; k < q.parts; k += 1) {
      var kid = el('div', 'l46-qkid');
      kid.appendChild(kidSvg(KID_COLORS[k % KID_COLORS.length], 38));
      var heap = el('div', 'l46-qheap');
      var tensRow = el('span', 'l46-heap-tens');
      for (var t = 0; t < tens; t += 1) tensRow.appendChild(bundleNode(true));
      var onesRow = el('span', 'l46-heap-ones');
      for (var o = 0; o < ones; o += 1) onesRow.appendChild(stickNode(true));
      heap.appendChild(tensRow);
      heap.appendChild(onesRow);
      kid.appendChild(heap);
      kid.appendChild(el('span', 'l46-qmark', '?'));
      scene.appendChild(kid);
    }
    board.appendChild(scene);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          var marks = scene.querySelectorAll('.l46-qmark');
          for (var i = 0; i < marks.length; i += 1) {
            (function (node, idx) {
              later(function () {
                if (!alive) return;
                node.textContent = String(answer);
                node.classList.add('is-on');
                snapPop(node);
                if (idx === 0) Engine.sfx.tap();
              }, 120 + idx * 110);
            }(marks[i], i));
          }
          burst(story);
          correct(key, NEXT_MS + 360);
          return;
        }
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          options = Engine.quiz.shuffle(options);
          paint();
        }, 520);
      });
    }

    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖拽分配（提交键） ---------------- */

  function buildGive(q, story, tray, state, correct, wrong) {
    var bundles = q.total / 10;
    var parts = q.parts;
    var per = bundles / parts;

    var board = el('div', 'l46-board');

    /* 题干算式：60 ÷ 2 = ?，把「分」的动作和除法式子挂上钩 */
    var head = el('div', 'l46-give-head');
    head.appendChild(el('span', 'l46-give-n', String(q.total)));
    head.appendChild(el('span', 'l46-give-op', '÷'));
    head.appendChild(el('span', 'l46-give-n', String(q.parts)));
    head.appendChild(el('span', 'l46-give-op', '='));
    head.appendChild(el('span', 'l46-give-n l46-give-n--q', '?'));
    board.appendChild(head);

    var kids = el('div', 'l46-give');
    kids.style.setProperty('--kids', String(parts));
    var trays = [];

    for (var k = 0; k < parts; k += 1) {
      var kid = el('div', 'l46-give-kid');
      kid.dataset.kid = String(k);
      kid.appendChild(kidSvg(KID_COLORS[k % KID_COLORS.length], 40));
      var box = el('div', 'l46-give-tray');
      kid.appendChild(box);
      kids.appendChild(kid);
      trays.push({ node: box, items: [] });
    }
    board.appendChild(kids);

    var pool = el('div', 'l46-give-pool');
    var nodes = [];
    for (var b = 0; b < bundles; b += 1) {
      var bn = bundleNode(true);
      bn.classList.add('l46-give-bundle');
      (function (node) {
        node.addEventListener('pointerdown', function (e) {
          if (state.locked || state.busy) return;
          /* 已经分出去的捆：按下即回收（点它拿回来，不再起拖） */
          if (node.parentNode !== pool) {
            var at = -1;
            trays.forEach(function (t, i) { if (t.node === node.parentNode) at = i; });
            if (at >= 0) {
              e.preventDefault();
              e.stopPropagation();
              takeBack(at);
            }
            return;
          }
          e.preventDefault();
          startDrag(e, node);
        });
      }(bn));
      pool.appendChild(bn);
      nodes.push(bn);
    }
    board.appendChild(pool);

    var submit = el('button', 'l46-submit is-dim');
    submit.type = 'button';
    submit.setAttribute('aria-label', 'Check my sharing');
    submit.innerHTML = ICONS.check;
    board.appendChild(submit);

    story.appendChild(board);
    popIn(board);

    var drag = null;
    var ghost = null;

    function poolCount() {
      return pool.querySelectorAll('.l46-give-bundle').length;
    }

    function refreshSubmit() {
      submit.classList.toggle('is-dim', poolCount() > 0 || placedAll() === 0);
    }

    function placedAll() {
      var n = 0;
      trays.forEach(function (t) { n += t.items.length; });
      return n;
    }

    function autoPlace(node) {
      /* 轻点兜底：放进当前最少的那一个人手里 */
      var best = 0;
      for (var i = 1; i < trays.length; i += 1) {
        if (trays[i].items.length < trays[best].items.length) best = i;
      }
      place(node, best);
    }

    function place(node, idx) {
      var target = trays[idx];
      if (!target || target.items.length >= bundles) return;
      node.remove();
      node.style.position = '';
      target.node.appendChild(node);
      target.items.push(node);
      bounce(node);
      Engine.sfx.tap();
      refreshSubmit();
    }

    function takeBack(idx) {
      var target = trays[idx];
      if (!target || !target.items.length) return;
      var node = target.items.pop();
      node.remove();
      pool.appendChild(node);
      refreshSubmit();
    }

    function pointOf(e) {
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      return { x: t.clientX || 0, y: t.clientY || 0 };
    }

    function startDrag(e, node) {
      var p = pointOf(e);
      /* 按下时不出 ghost：先记起点，位移 > 8px 才算拖动（§5.9.2） */
      drag = { node: node, x0: p.x, y0: p.y, moved: false };
    }

    /* 相邻收纳格的热区会重叠（HIT_PAD 14 > 间距 8），取「圆心最近」的一个 */
    function nearestTray(p) {
      var best = -1;
      var bestD = Infinity;
      trays.forEach(function (t, i) {
        var r = t.node.getBoundingClientRect();
        if (p.x < r.left - HIT_PAD || p.x > r.right + HIT_PAD) return;
        if (p.y < r.top - HIT_PAD || p.y > r.bottom + HIT_PAD) return;
        var cx = r.left + r.width / 2;
        var cy = r.top + r.height / 2;
        var d = (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function moveDrag(e) {
      if (!drag) return;
      var p = pointOf(e);
      if (!drag.moved) {
        if (Math.abs(p.x - drag.x0) < 8 && Math.abs(p.y - drag.y0) < 8) return;
        drag.moved = true;
        ghost = drag.node.cloneNode(true);
        ghost.classList.add('l46-ghost');
        ghost.style.width = drag.node.offsetWidth + 'px';
        ghost.style.height = drag.node.offsetHeight + 'px';
        document.body.appendChild(ghost);
        drag.node.style.opacity = '.35';
      }
      ghost.style.transform = 'translate(' + (p.x - ghost.offsetWidth / 2) + 'px,' + (p.y - ghost.offsetHeight / 2) + 'px)';
      var now = nearestTray(p);
      trays.forEach(function (t, i) { t.node.classList.toggle('is-hot', i === now); });
    }

    function endDrag(e) {
      if (!drag) return;
      var p = pointOf(e);
      var node = drag.node;
      var moved = drag.moved;
      drag = null;
      remove(ghost);
      ghost = null;
      node.style.opacity = '';
      var hit = nearestTray(p);
      trays.forEach(function (t) { t.node.classList.remove('is-hot'); });
      if (!moved) {
        /* 位移 < 8px 视为轻点：走同一条落子路径（§5.9.2） */
        autoPlace(node);
        return;
      }
      if (hit >= 0) place(node, hit);
      else bounce(node);
    }

    document.addEventListener('pointermove', moveDrag);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    cleanups.push(function () {
      document.removeEventListener('pointermove', moveDrag);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('pointercancel', endDrag);
      remove(ghost);
      ghost = null;
      drag = null;
    });

    submit.addEventListener('click', function () {
      if (state.locked || state.busy) return;
      if (submit.classList.contains('is-dim')) {
        shake(submit);
        Engine.sfx.deny();
        return;
      }
      var counts = trays.map(function (t) { return t.items.length; });
      var equal = counts.every(function (c) { return c === per; });
      if (equal) {
        submit.classList.remove('is-dim');
        submit.classList.add('is-right');
        Engine.sfx.tap();
        burst(story);
        correct(null, NEXT_MS + 260);
        return;
      }
      wrong(submit);
    });

    refreshSubmit();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：找错误分配 ---------------- */

  function buildFault(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l46-faults');
    story.appendChild(board);

    var cards = [];
    q.sets.forEach(function (set, idx) {
      var fair = new Set(set.deal).size === 1;
      var card = el('button', 'l46-fault' + (fair ? '' : ' l46-fault--bad'));
      card.type = 'button';
      card.dataset.fair = fair ? '1' : '0';

      var eq = el('div', 'l46-fault-eq');
      eq.appendChild(el('b', null, String(set.total)));
      eq.appendChild(el('i', null, '÷'));
      eq.appendChild(el('b', null, String(set.kids)));
      eq.appendChild(el('i', null, '='));
      var res = el('b', 'l46-fault-res', String(set.deal[0]));
      eq.appendChild(res);
      card.appendChild(eq);

      var row = el('div', 'l46-fault-row');
      set.deal.forEach(function (n) {
        var cell = el('span', 'l46-fault-cell');
        var tens = Math.floor(n / 10);
        var ones = n % 10;
        var tRow = el('span', 'l46-cell-tens');
        for (var t = 0; t < tens; t += 1) tRow.appendChild(bundleNode(true));
        var oRow = el('span', 'l46-cell-ones');
        for (var o = 0; o < ones; o += 1) oRow.appendChild(stickNode(true));
        cell.appendChild(tRow);
        cell.appendChild(oRow);
        cell.appendChild(el('span', 'l46-fault-n', String(n)));
        row.appendChild(cell);
      });
      card.appendChild(row);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (fair) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l46-tick');
        tick.innerHTML = ICONS.check;
        card.appendChild(tick);
        popIn(tick);

        later(function () {
          if (!alive) return;
          res.textContent = String(set.total / set.kids);
          res.classList.add('is-fixed');
          snapPop(res);
          var cells = card.querySelectorAll('.l46-fault-cell');
          cells.forEach(function (c) {
            c.innerHTML = '';
            var per = set.total / set.kids;
            var t2 = Math.floor(per / 10);
            var o2 = per % 10;
            var tr = el('span', 'l46-cell-tens');
            for (var a = 0; a < t2; a += 1) tr.appendChild(bundleNode(true));
            var or = el('span', 'l46-cell-ones');
            for (var b2 = 0; b2 < o2; b2 += 1) or.appendChild(stickNode(true));
            c.appendChild(tr);
            c.appendChild(or);
            c.appendChild(el('span', 'l46-fault-n', String(per)));
          });
          Engine.sfx.tap();
        }, 300);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 760);
      });

      popIn(card, idx * 60);
      board.appendChild(card);
      cards.push(card);
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

    if (q.type === 'share') buildShare(q, story, tray, state, correct, wrong);
    else if (q.type === 'give') buildGive(q, story, tray, state, correct, wrong);
    else buildFault(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l46-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[46] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
