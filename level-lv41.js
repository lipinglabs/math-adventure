/* ============================================================
   level-lv41.js · Group Them Up（按组分配 / 包含除）
   ------------------------------------------------------------
   第五阶段第二关：十二只鸭子，每四只圈成一组，一共三组。
     教学 4 幕：① 入场（12 只鸭子按 4×3 落位）
                ② 圈组（三个虚线圈依次画出 + 组号）
                ③ 算式（12 ÷ 4 = 3 升起）
                ④ 自问自答（How many groups? → 停 1 秒 → Three groups!）
     答题 10 题：看分组点组数 4 / 拖拽画圈 3（套索 + 轻点兜底 + 提交键） / 听算式找场景 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var ITEM = 42;

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
      '<svg viewBox="0 0 24 24" width="34" height="34" aria-hidden="true">' +
      '<path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="2.8" ' +
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
  var cleanups = [];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
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
        ctx.audio.play('lv41/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小动物 / 物件 ---------------- */

  function duckSvg(tint) {
    var s = svgEl('svg', { viewBox: '0 0 48 48' });
    s.classList.add('l41-duck');
    var body = tint || '#FFD75E';
    s.innerHTML =
      '<ellipse cx="24" cy="30" rx="15" ry="12" fill="' + body + '"/>' +
      '<path d="M12 30c-4 1-6 4-5 6 2 2 5 0 6-2z" fill="' + body + '"/>' +
      '<circle cx="24" cy="17" r="10.5" fill="' + body + '"/>' +
      '<path d="M33 17l9 3-9 3z" fill="#F0913F"/>' +
      '<circle cx="28" cy="14.5" r="2.1" fill="#4A3B33"/>' +
      '<path d="M18 12c2-3 5-4 8-3" fill="none" stroke="#E9B93C" stroke-width="2" stroke-linecap="round"/>';
    return s;
  }

  function appleSvg() {
    var s = svgEl('svg', { viewBox: '0 0 44 44' });
    s.classList.add('l41-apple');
    s.innerHTML =
      '<path d="M22 41c-9 0-15-6-15-15 0-7 5-12 11-12 2 0 3 .6 4 1.4.9-.8 2-1.4 4-1.4 6 0 11 5 11 12 0 9-6 15-15 15z" fill="#E4574C"/>' +
      '<path d="M22 15c0-4 2-7 5-8-1 4-2 6-5 8z" fill="#5FA463"/>' +
      '<ellipse cx="15.5" cy="20" rx="3" ry="4" fill="#F58C82" opacity=".7"/>';
    return s;
  }

  function candySvg(i) {
    var colors = [['#F58FB0', '#F2A6C0'], ['#8FCDE0', '#A9DCEB'], ['#FFC46B', '#FFD79B']];
    var c = colors[i % colors.length];
    var s = svgEl('svg', { viewBox: '0 0 44 44' });
    s.classList.add('l41-candy');
    s.innerHTML =
      '<path d="M10 22l-8.5-5.6v11.2zM34 22l8.5-5.6v11.2z" fill="' + c[1] + '"/>' +
      '<circle cx="22" cy="22" r="14" fill="' + c[0] + '"/>' +
      '<circle cx="16.8" cy="17" r="4" fill="#FFFFFF" opacity=".68"/>';
    return s;
  }

  function itemSvg(kind, i) {
    if (kind === 'apple') return appleSvg();
    if (kind === 'candy') return candySvg(i || 0);
    return duckSvg();
  }

  /* ---------------- 圈（SVG 一笔画） ---------------- */

  function lassoLayer() {
    var svg = svgEl('svg', { class: 'l41-lasso' });
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    return svg;
  }

  /* 覆盖层用像素坐标（与 field 1:1），画之前按实际尺寸对齐一次 */
  function ensureFit(layer) {
    var host = layer.parentNode;
    if (!host) return;
    var r = host.getBoundingClientRect();
    if (!r.width) return;
    var vb = layer.viewBox.baseVal;
    if (!vb || Math.abs(vb.width - r.width) > 0.6 || Math.abs(vb.height - r.height) > 0.6) {
      layer.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
    }
  }

  function ringEllipse(layer, box, opt) {
    opt = opt || {};
    ensureFit(layer);
    var e = svgEl('ellipse', {
      cx: box.cx, cy: box.cy, rx: box.rx, ry: box.ry,
      fill: 'none',
      stroke: opt.stroke || '#5FB8A0',
      'stroke-width': opt.width || 3,
      'stroke-linecap': 'round',
      pathLength: '1',
      'stroke-dasharray': opt.dash ? '0.012 0.012' : '1',
      'stroke-dashoffset': opt.dash ? 0 : 1
    });
    e.classList.add('l41-ringline');
    if (opt.className) e.classList.add(opt.className);
    layer.appendChild(e);
    if (!opt.dash) {
      e.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: opt.duration || 620, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' });
    }
    return e;
  }

  function boxOf(nodes, local, pad) {
    var left = Infinity;
    var top = Infinity;
    var right = -Infinity;
    var bottom = -Infinity;
    nodes.forEach(function (n) {
      var r = n.getBoundingClientRect();
      left = Math.min(left, r.left - local.left);
      top = Math.min(top, r.top - local.top);
      right = Math.max(right, r.right - local.left);
      bottom = Math.max(bottom, r.bottom - local.top);
    });
    var p = pad == null ? 8 : pad;
    return {
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      rx: (right - left) / 2 + p,
      ry: (bottom - top) / 2 + p
    };
  }

  /* ---------------- 教学 ---------------- */

  function teachField(kind, count, per, visible) {
    var wrap = el('div', 'l41-teach');
    var field = el('div', 'l41-field l41-field--teach');
    var grid = el('div', 'l41-groups');
    for (var g = 0; g < count / per; g += 1) {
      var group = el('div', 'l41-group');
      group.dataset.g = String(g);
      for (var i = 0; i < per; i += 1) {
        var slot = el('div', 'l41-slot');
        if (visible) slot.classList.add('is-in');
        slot.appendChild(itemSvg(kind, g * per + i));
        group.appendChild(slot);
      }
      grid.appendChild(group);
    }
    field.appendChild(grid);
    var svg = lassoLayer();
    field.appendChild(svg);
    wrap.appendChild(field);
    return { wrap: wrap, field: field, grid: grid, svg: svg, groups: grid.children };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var t = teachField('duck', 12, 4);
    host.appendChild(t.wrap);
    await popIn(t.wrap);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(300);
    var slots = t.grid.querySelectorAll('.l41-slot');
    for (var i = 0; i < slots.length; i += 1) {
      if (!alive) return;
      slots[i].classList.add('is-in');
      snapPop(slots[i]);
      if (i % 4 === 3) Engine.sfx.tap();
      await sleep(120);
    }
    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var t = teachField('duck', 12, 4, true);
    host.appendChild(t.wrap);
    await popIn(t.wrap);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(260);
    for (var g = 0; g < 3; g += 1) {
      if (!alive) return;
      var nodes = Array.prototype.slice.call(t.groups[g].children);
      var box = boxOf(nodes, t.field.getBoundingClientRect(), 13);
      ringEllipse(t.svg, box, { duration: 620 });
      var tag = el('span', 'l41-tag', String(g + 1));
      tag.style.left = (box.cx - box.rx - 14) + 'px';
      tag.style.top = box.cy + 'px';
      t.field.appendChild(tag);
      popIn(tag);
      t.groups[g].classList.add('is-on');
      Engine.sfx.tap();
      await sleep(760);
    }
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l41-teach');
    var card = el('div', 'l41-eq');
    card.appendChild(el('span', 'l41-eq-n', '12'));
    card.appendChild(el('span', 'l41-eq-op', '÷'));
    card.appendChild(el('span', 'l41-eq-n', '4'));
    card.appendChild(el('span', 'l41-eq-op', '='));
    card.appendChild(el('span', 'l41-eq-n l41-eq-n--res', '3'));
    wrap.appendChild(card);
    wrap.appendChild(el('div', 'l41-eq-cap', '3 groups'));
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t2_a']);
    await sleep(420);
    card.classList.add('is-on');
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(240);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var t = teachField('duck', 12, 4, true);
    host.appendChild(t.wrap);
    await popIn(t.wrap);
    if (!alive) return;

    var rings = [];
    for (var g = 0; g < 3; g += 1) {
      var nodes = Array.prototype.slice.call(t.groups[g].children);
      var box = boxOf(nodes, t.field.getBoundingClientRect(), 13);
      rings.push(ringEllipse(t.svg, box, { duration: 420 }));
    }
    await sleep(420);

    var v = saySeq(['t2_q']);
    await v;
    if (!alive) return;
    await sleep(1000);
    if (!alive) return;

    var v2 = saySeq(['t2_b']);
    rings.forEach(function (r) { r.classList.add('is-hot'); });
    for (var k = 0; k < 3; k += 1) t.groups[k].classList.add('is-on');
    Engine.sfx.star();
    await v2;
    if (!alive) return;
    await sleep(280);
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
      var key = el('button', 'l41-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l41-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：看分组点组数 ---------------- */

  function buildGroups(q, story, tray, state, correct, wrong) {
    var answer = q.total / q.per;
    var board = el('div', 'l41-board');
    var field = el('div', 'l41-field');
    var grid = el('div', 'l41-groups l41-groups--q');
    for (var g = 0; g < answer; g += 1) {
      var group = el('div', 'l41-group');
      for (var i = 0; i < q.per; i += 1) {
        var slot = el('div', 'l41-slot');
        slot.appendChild(itemSvg(q.item || 'apple', g * q.per + i));
        group.appendChild(slot);
      }
      grid.appendChild(group);
    }
    field.appendChild(grid);
    var svg = lassoLayer();
    field.appendChild(svg);
    board.appendChild(field);
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
        var local = field.getBoundingClientRect();
        for (var k = 0; k < grid.children.length; k += 1) {
          var nodes = Array.prototype.slice.call(grid.children[k].children);
          var box = boxOf(nodes, local, 7);
          ringEllipse(svg, box, { duration: 380, className: 'is-ok' });
          grid.children[k].classList.add('is-on');
        }
        Engine.sfx.correct();
        later(function () {
          if (!alive) return;
          burst(board);
          correct(null, NEXT_MS);
        }, 420);
      });
    }

    tray.classList.add('l41-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖拽画圈（提交键） ---------------- */

  function buildRing(q, story, tray, state, correct, wrong) {
    var per = q.per;
    var groups = q.total / per;

    var board = el('div', 'l41-board l41-board--ring');
    var field = el('div', 'l41-field l41-field--q');
    var grid = el('div', 'l41-grid');
    grid.style.setProperty('--cols', String(Math.min(q.total, 5)));
    var items = [];
    for (var i = 0; i < q.total; i += 1) {
      var slot = el('div', 'l41-slot l41-slot--q');
      var node = el('div', 'l41-item');
      node.dataset.i = String(i);
      node.appendChild(itemSvg(q.item || 'candy', i));
      slot.appendChild(node);
      grid.appendChild(slot);
      items.push({ node: node, slot: slot, group: -1 });
    }
    field.appendChild(grid);
    var svg = lassoLayer();
    field.appendChild(svg);
    board.appendChild(field);
    board.appendChild(el('div', 'l41-hintbar', 'ring each group of ' + per));
    story.appendChild(board);
    popIn(board);

    var picked = [];
    var made = 0;
    var drag = null;

    var trayBtn = el('button', 'l41-submit is-dim');
    trayBtn.type = 'button';
    trayBtn.setAttribute('aria-label', 'Check my groups');
    trayBtn.innerHTML = ICONS.check;

    function localPoint(x, y) {
      var r = field.getBoundingClientRect();
      return { x: x - r.left, y: y - r.top };
    }
    function centerOf(node) {
      var r = node.getBoundingClientRect();
      var l = field.getBoundingClientRect();
      return { x: r.left + r.width / 2 - l.left, y: r.top + r.height / 2 - l.top };
    }

    function clearPicked() {
      picked.forEach(function (n) { n.classList.remove('is-pick'); });
      picked = [];
    }

    function commit(list) {
      var ok = list.length === per && list.every(function (n) { return n.dataset.done !== '1'; });
      if (!ok) {
        Engine.sfx.deny();
        return false;
      }
      list.forEach(function (n) { n.dataset.done = '1'; });
      var local = field.getBoundingClientRect();
      var box = boxOf(list, local, 7);
      ringEllipse(svg, box, { duration: 520, className: 'is-ok' });
      var tag = el('span', 'l41-tag l41-tag--sm', String(made + 1));
      tag.style.left = (box.cx - box.rx - 14) + 'px';
      tag.style.top = box.cy + 'px';
      field.appendChild(tag);
      popIn(tag);
      list.forEach(function (n) { n.classList.add('is-in-group'); });
      made += 1;
      clearPicked();
      Engine.sfx.tap();
      if (made >= groups) trayBtn.classList.remove('is-dim');
      return true;
    }

    function togglePick(node) {
      if (state.locked || node.dataset.done === '1') return;
      var k = picked.indexOf(node);
      if (k >= 0) {
        picked.splice(k, 1);
        node.classList.remove('is-pick');
        return;
      }
      picked.push(node);
      node.classList.add('is-pick');
      Engine.sfx.tap();
      if (picked.length === per) commit(picked.slice());
    }

    trayBtn.addEventListener('click', function () {
      if (state.locked || state.busy) return;
      if (made < groups) {
        Engine.sfx.deny();
        shake(trayBtn);
        return;
      }
      state.busy = true;
      trayBtn.classList.remove('is-dim');
      trayBtn.classList.add('is-right');
      var local = field.getBoundingClientRect();
      items.forEach(function (it) { it.node.classList.add('is-done'); });
      ringEllipse(svg, boxOf(items.map(function (it) { return it.node; }), local, 12),
        { duration: 500, stroke: '#4FB884', width: 4 });
      burst(board);
      correct(null, NEXT_MS);
    });
    tray.appendChild(trayBtn);

    function onDown(e) {
      if (state.locked || state.busy) return;
      if (e.target.closest && e.target.closest('.l41-submit')) return;
      var p = localPoint(e.clientX, e.clientY);
      drag = { x0: p.x, y0: p.y, x: p.x, y: p.y, moved: false, item: e.target.closest('.l41-item') };
    }

    function onMove(e) {
      if (!drag) return;
      var p = localPoint(e.clientX, e.clientY);
      drag.x = p.x;
      drag.y = p.y;
      var dist = Math.sqrt((p.x - drag.x0) * (p.x - drag.x0) + (p.y - drag.y0) * (p.y - drag.y0));
      if (!drag.moved && dist > 10) {
        drag.moved = true;
        /* 拉出一个椭圆：起点与终点是包围盒的对角 */
        drag.circle = svgEl('ellipse', {
          cx: drag.x0, cy: drag.y0, rx: 1, ry: 1,
          fill: 'rgba(147, 215, 195, 0.16)',
          stroke: '#5FB8A0',
          'stroke-width': 3,
          'stroke-dasharray': '7 6',
          'stroke-linecap': 'round'
        });
        drag.circle.classList.add('l41-loop');
        svg.appendChild(drag.circle);
        field.classList.add('is-drawing');
      }
      if (drag.moved && drag.circle) {
        drag.circle.setAttribute('cx', (drag.x0 + p.x) / 2);
        drag.circle.setAttribute('cy', (drag.y0 + p.y) / 2);
        drag.circle.setAttribute('rx', Math.max(1, Math.abs(p.x - drag.x0) / 2));
        drag.circle.setAttribute('ry', Math.max(1, Math.abs(p.y - drag.y0) / 2));
      }
    }

    function onUp(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      field.classList.remove('is-drawing');
      if (!d.moved) {
        if (d.item) togglePick(d.item);
        return;
      }
      if (d.circle) remove(d.circle);
      var rx = Math.abs(d.x - d.x0) / 2;
      var ry = Math.abs(d.y - d.y0) / 2;
      if (rx < 28 || ry < 16) return;
      var ccx = (d.x0 + d.x) / 2;
      var ccy = (d.y0 + d.y) / 2;
      var inLoop = items.filter(function (it) {
        if (it.node.dataset.done === '1') return false;
        var c = centerOf(it.node);
        var nx = (c.x - ccx) / (rx + 6);
        var ny = (c.y - ccy) / (ry + 6);
        return nx * nx + ny * ny <= 1.05;
      });
      commit(inLoop.map(function (it) { return it.node; }));
    }

    field.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    cleanups.push(function () {
      field.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      drag = null;
    });

    tray.classList.add('l41-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：听算式找场景 ---------------- */

  function pickCard(opt) {
    var card = el('button', 'l41-pick');
    var grid = el('span', 'l41-pick-grid');
    var groupsN = opt.t / opt.g;
    for (var i = 0; i < groupsN; i += 1) {
      var g = el('span', 'l41-pick-group');
      for (var k = 0; k < opt.g; k += 1) {
        var dot = el('i', 'l41-pick-dot');
        g.appendChild(dot);
      }
      grid.appendChild(g);
    }
    card.appendChild(grid);
    card.dataset.key = opt.t + '/' + opt.g;
    card.setAttribute('aria-label', groupsN + ' groups of ' + opt.g);
    return card;
  }

  function buildPick(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l41-picks');
    var list = Engine.quiz.shuffle(q.options.map(function (o) { return o.slice ? o : [o.t, o.g]; }));

    function paint() {
      board.innerHTML = '';
      list.forEach(function (pair, i) {
        var card = pickCard({ t: pair[0], g: pair[1] });
        card.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          if (pair[0] !== q.t || pair[1] !== q.g) { wrong(card); return; }
          state.busy = true;
          card.classList.add('is-right');
          burst(board);
          correct(null, NEXT_MS);
        });
        popIn(card, i * 60);
        board.appendChild(card);
      });
      story.appendChild(board);
    }
    paint();
    tray.innerHTML = '';
    tray.classList.add('l41-tray');
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

    if (q.type === 'groups') buildGroups(q, story, tray, state, correct, wrong);
    else if (q.type === 'ring') buildRing(q, story, tray, state, correct, wrong);
    else buildPick(q, story, tray, state, correct, wrong);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[41] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
