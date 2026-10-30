/* ============================================================
   level-lv40.js · Pizza Party（平均分 / 除法启蒙）
   ------------------------------------------------------------
   第五阶段第一关：把一个披萨分给三个朋友，每人一样多。
     教学 4 幕：① 切（刀光三刀，裂成三块）
                ② 发（发牌式：左 → 中 → 右，一块一块飞进盘子）
                ③ 数 + 乘（三盘各一，1+1+1=3 → 3×1=3）
                ④ 除（3 ÷ 3 = 1，定格）
     答题 10 题：看分配点每份数 4 / 拖拽平均分 3（提交键） / 找不公平的一组 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var DEAL_GAP = 300;
  var TAU = Math.PI * 2;

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
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    }
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
        ctx.audio.play('lv40/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 披萨几何 ---------------- */

  function polar(cx, cy, r, a) {
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }

  function arcD(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0);
    var p1 = polar(cx, cy, r, a1);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) +
      ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2);
  }

  function sliceD(cx, cy, r, a0, a1) {
    var p0 = polar(cx, cy, r, a0);
    var p1 = polar(cx, cy, r, a1);
    var large = (a1 - a0) > Math.PI ? 1 : 0;
    return 'M' + cx + ' ' + cy + ' L' + p0.x.toFixed(2) + ' ' + p0.y.toFixed(2) +
      ' A' + r + ' ' + r + ' 0 ' + large + ' 1 ' + p1.x.toFixed(2) + ' ' + p1.y.toFixed(2) + ' Z';
  }

  var MINI_COUNT = 0;

  function miniSlice() {
    MINI_COUNT += 1;
    var s = svgEl('svg', { viewBox: '0 0 38 38' });
    s.classList.add('l40-mini');
    var a0 = -Math.PI * 0.76;
    var a1 = -Math.PI * 0.2;
    s.appendChild(svgEl('path', {
      d: sliceD(19, 19, 17, a0, a1),
      fill: '#FBD26E',
      stroke: '#D89550',
      'stroke-width': 1.5,
      'stroke-linejoin': 'round'
    }));
    var mid = (a0 + a1) / 2;
    var dot = polar(19, 19, 9.5, mid);
    s.appendChild(svgEl('circle', { cx: dot.x, cy: dot.y, r: 2.6, fill: '#E2654F' }));
    return s;
  }

  /**
   * 返回 { node, slices: [g...] }；count 块等分。
   * 每块 g 用 CSS transform 外移，既保持同一批节点，又能显缝。
   */
  function pizzaNode(count, opts) {
    opts = opts || {};
    var size = 260;
    var c = size / 2;
    var r = opts.r || 114;
    var pan = el('span', 'l40-pan');
    var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, 'aria-hidden': 'true' });
    svg.classList.add('l40-pizza-svg');

    var step = TAU / count;
    var groups = [];
    for (var i = 0; i < count; i += 1) {
      var a0 = -Math.PI / 2 + i * step;
      var a1 = a0 + step;
      var g = svgEl('g', {});
      g.classList.add('l40-slice');
      g.dataset.i = String(i);
      g.appendChild(svgEl('path', {
        d: sliceD(c, c, r, a0, a1),
        fill: i % 2 ? '#F6C657' : '#FBD26E',
        stroke: '#E7A85C',
        'stroke-width': 2.4,
        'stroke-linejoin': 'round'
      }));
      g.appendChild(svgEl('path', {
        d: arcD(c, c, r, a0, a1),
        fill: 'none',
        stroke: '#EDB873',
        'stroke-width': 11,
        'stroke-linecap': 'round'
      }));
      var mid = (a0 + a1) / 2;
      var spread = Math.min(step * 0.24, 0.4);
      var dots = count > 6 ? [[0.72, 0]] : [[0.56, -spread], [0.8, spread]];
      dots.forEach(function (pair) {
        var p = polar(c, c, r * pair[0], mid + pair[1]);
        g.appendChild(svgEl('circle', {
          cx: p.x.toFixed(2), cy: p.y.toFixed(2), r: 4.6, fill: '#E2654F'
        }));
      });
      if (opts.seam) {
        var dir = polar(0, 0, 3.4, mid);
        g.style.transform = 'translate(' + dir.x.toFixed(2) + 'px,' + dir.y.toFixed(2) + 'px)';
      }
      svg.appendChild(g);
      groups.push(g);
    }
    return { node: svg, pan: pan, slices: groups };
  }

  function plateNode() {
    var p = el('div', 'l40-plate');
    p.appendChild(el('span', 'l40-plate-rim'));
    p.appendChild(el('span', 'l40-plate-face'));
    return p;
  }

  function friendSvg(kind) {
    var s = svgEl('svg', { viewBox: '0 0 64 64' });
    s.classList.add('l40-friend-svg', 'l40-friend-svg--' + kind);
    var ear = kind === 'rabbit'
      ? '<ellipse cx="21" cy="16" rx="6" ry="12" fill="#F4D6C2"/><ellipse cx="43" cy="16" rx="6" ry="12" fill="#F4D6C2"/>'
      : (kind === 'bear'
        ? '<circle cx="18" cy="20" r="8.5" fill="#D8A273"/><circle cx="46" cy="20" r="8.5" fill="#D8A273"/>'
        : '<path d="M14 24l6-12 7 10z" fill="#C9B3E0"/><path d="M50 24l-6-12-7 10z" fill="#C9B3E0"/>');
    var face = kind === 'rabbit' ? '#F7E3D4' : (kind === 'bear' ? '#E4B183' : '#D8C6EE');
    var inner = kind === 'rabbit' ? '#F4C6B4' : (kind === 'bear' ? '#C98F5E' : '#B79BD6');
    s.innerHTML =
      ear +
      '<circle cx="32" cy="36" r="21" fill="' + face + '"/>' +
      '<ellipse cx="24" cy="33" rx="3" ry="3.6" fill="#4A3B33"/>' +
      '<ellipse cx="40" cy="33" rx="3" ry="3.6" fill="#4A3B33"/>' +
      '<ellipse cx="32" cy="41" rx="9" ry="7" fill="' + inner + '" opacity=".55"/>' +
      '<ellipse cx="32" cy="39" rx="2.6" ry="2" fill="#8A5A46"/>' +
      '<path d="M32 41v3M32 44c-1.6 2.4-5 2.6-6 .2M32 44c1.6 2.4 5 2.6 6 .2" ' +
      'fill="none" stroke="#8A5A46" stroke-width="1.8" stroke-linecap="round"/>';
    return s;
  }

  function friendNode(kind, label) {
    var box = el('div', 'l40-friend');
    box.appendChild(friendSvg(kind));
    box.appendChild(el('span', 'l40-friend-tag', label));
    return box;
  }

  /* ---------------- 教学 ---------------- */

  function teachStage() {
    var wrap = el('div', 'l40-teach');
    var friends = el('div', 'l40-friends');
    var pizza = el('div', 'l40-pizza');
    var plates = el('div', 'l40-plates');
    wrap.appendChild(friends);
    wrap.appendChild(pizza);
    wrap.appendChild(plates);
    return { wrap: wrap, friends: friends, pizza: pizza, plates: plates };
  }

  async function sceneCut(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var st = teachStage();
    st.friends.appendChild(friendNode('rabbit', 'you'));
    st.friends.appendChild(friendNode('bear', 'you'));
    st.friends.appendChild(friendNode('cat', 'me'));

    var pz = pizzaNode(3, { seam: false });
    pz.node.classList.add('is-whole');
    st.pizza.appendChild(pz.pan);
    st.pizza.appendChild(pz.node);

    for (var i = 0; i < 3; i += 1) st.plates.appendChild(plateNode());

    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var knife = el('span', 'l40-knife');
    st.pizza.appendChild(knife);

    var v = saySeq(['t1_a']);
    await sleep(520);
    if (!alive) return;
    for (var k = 0; k < 3; k += 1) {
      knife.style.transform = 'rotate(' + (k * 120) + 'deg)';
      knife.classList.add('is-cut');
      Engine.sfx.tap();
      await sleep(300);
      if (!alive) return;
      knife.classList.remove('is-cut');
      await sleep(120);
      if (!alive) return;
    }
    remove(knife);
    pz.node.classList.remove('is-whole');
    for (var j = 0; j < 3; j += 1) {
      var mid = -Math.PI / 2 + (j + 0.5) * (TAU / 3);
      var d = polar(0, 0, 2.4, mid);
      pz.slices[j].style.transform = 'translate(' + d.x.toFixed(2) + 'px,' + d.y.toFixed(2) + 'px)';
    }
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneDeal(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var st = teachStage();
    ['rabbit', 'bear', 'cat'].forEach(function (kind, i) {
      var f = friendNode(kind, i === 2 ? 'me' : 'you');
      st.friends.appendChild(f);
    });

    var pz = pizzaNode(3, { seam: true });
    st.pizza.appendChild(pz.pan);
    st.pizza.appendChild(pz.node);

    var plates = [];
    for (var i = 0; i < 3; i += 1) {
      var p = plateNode();
      st.plates.appendChild(p);
      plates.push(p);
    }

    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    /* 以切片自身中心缩放：translate(dx,dy) · translate(c) · scale(s) · translate(-c) */
    function tf(slice, dx, dy, s) {
      var b = slice.getBBox();
      var cx = (b.x + b.width / 2).toFixed(2);
      var cy = (b.y + b.height / 2).toFixed(2);
      return 'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) ' +
        'translate(' + cx + 'px,' + cy + 'px) scale(' + s + ') translate(-' + cx + 'px,-' + cy + 'px)';
    }

    function fly(idx) {
      if (!alive) return;
      var slice = pz.slices[idx];
      var box = pz.node.getBoundingClientRect();
      var sr = slice.getBoundingClientRect();
      var tr = plates[idx].getBoundingClientRect();
      if (!box.width) return;
      var unit = 260 / box.width;
      var scx = sr.left + sr.width / 2;
      var scy = sr.top + sr.height / 2;
      var tcx = tr.left + tr.width / 2;
      var tcy = tr.top + tr.height / 2 - 4;
      var dx = (tcx - scx) * unit;
      var dy = (tcy - scy) * unit;

      slice.animate([
        { transform: tf(slice, 0, 0, 1), opacity: 1 },
        {
          transform: tf(slice, dx * 0.5, dy * 0.5 - 46, 0.8),
          opacity: 1,
          offset: 0.48
        },
        { transform: tf(slice, dx, dy, 0.34), opacity: 1 }
      ], { duration: 640, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'both' });

      later(function () {
        if (!alive) return;
        Engine.sfx.tap();
        var landed = el('span', 'l40-landed');
        landed.style.setProperty('--rot', String(idx * 16 - 16));
        landed.appendChild(miniSlice());
        plates[idx].appendChild(landed);
        popIn(landed);
        snapPop(plates[idx]);
        slice.style.opacity = '0';
      }, 620);
    }

    var v = saySeq(['t1_b']);
    [360, 1240, 2120].forEach(function (d, i) {
      later(function () { fly(i); }, d);
    });

    await v;
    if (!alive) return;
    await sleep(420);
  }

  async function sceneCount(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l40-teach');
    var plates = el('div', 'l40-plates l40-plates--tight');
    var snacks = [];
    for (var i = 0; i < 3; i += 1) {
      var p = plateNode();
      var landed = el('span', 'l40-landed');
      landed.appendChild(miniSlice());
      p.appendChild(landed);
      var one = el('span', 'l40-one', '1');
      p.appendChild(one);
      plates.appendChild(p);
      snacks.push({ plate: p, one: one });
    }
    wrap.appendChild(plates);

    var eq = el('div', 'l40-eq');
    eq.dataset.mode = 'add';
    host.appendChild(wrap);
    wrap.appendChild(eq);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(240);
    for (var k = 0; k < 3; k += 1) {
      if (!alive) return;
      snacks[k].plate.classList.add('is-on');
      snacks[k].one.classList.add('is-on');
      bounce(snacks[k].plate);
      Engine.sfx.tap();
      await sleep(520);
    }
    await v;
    if (!alive) return;
    await sleep(360);

    var v2 = saySeq(['t1_d']);
    eq.innerHTML = '';
    [['1', 'num'], ['+', 'op'], ['1', 'num'], ['+', 'op'], ['1', 'num'], ['=', 'op'], ['3', 'num']]
      .forEach(function (tok) {
        if (tok[0] === '=') eq.appendChild(el('span', 'l40-eq-op', '='));
        else if (tok[1] === 'op') eq.appendChild(el('span', 'l40-eq-op', tok[0]));
        else eq.appendChild(el('span', 'l40-eq-tile', tok[0]));
      });
    popIn(eq);
    await sleep(560);
    if (!alive) return;
    eq.classList.add('is-mul');
    later(function () {
      if (!alive) return;
      eq.innerHTML = '';
      eq.appendChild(el('span', 'l40-eq-tile', '3'));
      eq.appendChild(el('span', 'l40-eq-op', '×'));
      eq.appendChild(el('span', 'l40-eq-tile', '1'));
      eq.appendChild(el('span', 'l40-eq-op', '='));
      eq.appendChild(el('span', 'l40-eq-tile l40-eq-tile--res', '3'));
      popIn(eq);
      Engine.sfx.star();
    }, 420);
    await v2;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneDivide(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l40-teach');
    var plates = el('div', 'l40-plates l40-plates--tight');
    for (var i = 0; i < 3; i += 1) {
      var p = plateNode();
      var landed = el('span', 'l40-landed');
      landed.appendChild(miniSlice());
      p.appendChild(landed);
      plates.appendChild(p);
    }
    wrap.appendChild(plates);

    var card = el('div', 'l40-divide');
    card.appendChild(el('span', 'l40-divide-n', '3'));
    card.appendChild(el('span', 'l40-divide-op', '÷'));
    card.appendChild(el('span', 'l40-divide-n', '3'));
    card.appendChild(el('span', 'l40-divide-op', '='));
    card.appendChild(el('span', 'l40-divide-n l40-divide-n--res', '1'));
    wrap.appendChild(card);
    wrap.appendChild(el('div', 'l40-divide-cap', '1 slice each'));
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_e']);
    await sleep(300);
    if (!alive) return;
    card.classList.add('is-on');
    for (var k = 0; k < 3; k += 1) plates.children[k].classList.add('is-on');
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

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l40-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l40-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：看分配点每份数 ---------------- */

  function buildShare(q, story, tray, state, correct, wrong) {
    var answer = q.total / q.parts;

    var board = el('div', 'l40-board');
    var share = el('div', 'l40-share');
    var pizza = el('div', 'l40-pizza l40-pizza--small');
    var pz = pizzaNode(q.total);
    pizza.appendChild(pz.pan);
    pizza.appendChild(pz.node);
    share.appendChild(pizza);

    var row = el('div', 'l40-plates l40-plates--q');
    row.style.setProperty('--cols', String(q.parts));
    var plates = [];
    for (var i = 0; i < q.parts; i += 1) {
      var p = plateNode();
      var ask = el('span', 'l40-plate-ask', '?');
      p.appendChild(ask);
      row.appendChild(p);
      plates.push({ node: p, ask: ask, stack: null });
    }
    share.appendChild(row);
    board.appendChild(share);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value !== answer) {
          /* busy 由 wrong() 自己置位：先置会把它挡在门外（答错不记错） */
          wrong(key);
          later(function () {
            if (state.locked || !alive) return;
            state.busy = false;
            Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
            paint();
          }, 380);
          return;
        }
        state.busy = true;
        key.classList.add('is-right');
        plates.forEach(function (p, idx) {
          later(function () {
            if (!alive) return;
            p.ask.classList.add('is-out');
            var stack = el('span', 'l40-stack');
            for (var k = 0; k < answer; k += 1) {
              var sl = el('span', 'l40-stack-slice');
              sl.style.setProperty('--i', String(k));
              sl.appendChild(miniSlice());
              stack.appendChild(sl);
            }
            p.node.appendChild(stack);
            popIn(stack);
            snapPop(p.node);
            Engine.sfx.tap();
            if (idx === 0) Engine.sfx.correct();
          }, idx * 70);
        });
        var cap = el('div', 'l40-each', answer + ' each');
        board.appendChild(cap);
        popIn(cap, 180);
        burst(board);
        correct(null, NEXT_MS);
      });
    }

    tray.classList.add('l40-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖拽平均分（提交键） ---------------- */

  function itemSvg(kind) {
    var s = svgEl('svg', { viewBox: '0 0 40 40' });
    s.classList.add('l40-item-svg');
    if (kind === 'strawberry') {
      s.innerHTML =
        '<path d="M20 35c-7.6 0-12-5.4-12-11.6C8 17.4 13.6 13 20 13s12 4.4 12 10.4C32 29.6 27.6 35 20 35z" fill="#E4574C"/>' +
        '<path d="M20 13c-1-3-3-4.6-6-5 1 3 2.6 4.4 6 5zM20 13c1-3 3-4.6 6-5-1 3-2.6 4.4-6 5z" fill="#5FA463"/>' +
        '<circle cx="16" cy="22" r="1.1" fill="#FFE7C2"/><circle cx="23" cy="20" r="1.1" fill="#FFE7C2"/>' +
        '<circle cx="19" cy="27" r="1.1" fill="#FFE7C2"/>';
    } else if (kind === 'candy') {
      s.innerHTML =
        '<path d="M9 20l-7-4.4v8.8zM31 20l7-4.4v8.8z" fill="#F2A6C0"/>' +
        '<circle cx="20" cy="20" r="11.6" fill="#F58FB0"/>' +
        '<circle cx="16.2" cy="16.4" r="3.2" fill="#FFD6E4" opacity=".8"/>';
    } else {
      s.innerHTML =
        '<circle cx="20" cy="21" r="12.4" fill="#E2AE6E"/>' +
        '<circle cx="15" cy="17" r="2.3" fill="#8A5A36"/><circle cx="24" cy="16.4" r="2.1" fill="#8A5A36"/>' +
        '<circle cx="20" cy="25" r="2.2" fill="#8A5A36"/><circle cx="12.6" cy="24.6" r="1.7" fill="#8A5A36"/>' +
        '<circle cx="27" cy="23.6" r="1.7" fill="#8A5A36"/>';
    }
    return s;
  }

  function buildPlate(q, story, tray, state, correct, wrong) {
    var per = q.total / q.plates;
    var board = el('div', 'l40-board l40-board--plate');
    var pool = el('div', 'l40-pool');
    pool.style.setProperty('--cols', String(Math.min(q.total, 5)));
    board.appendChild(pool);

    var items = [];
    for (var i = 0; i < q.total; i += 1) {
      var slot = el('div', 'l40-slot');
      var cookie = el('button', 'l40-cookie');
      cookie.type = 'button';
      cookie.setAttribute('aria-label', q.item + ' ' + (i + 1));
      cookie.appendChild(itemSvg(q.item));
      slot.appendChild(cookie);
      pool.appendChild(slot);
      items.push({ slot: slot, node: cookie, at: -1 });
    }

    var row = el('div', 'l40-plates l40-plates--drop');
    row.style.setProperty('--cols', String(q.plates));
    var plates = [];
    for (var g = 0; g < q.plates; g += 1) {
      var p = plateNode();
      p.dataset.slot = String(g);
      row.appendChild(p);
      plates.push({ node: p, items: [] });
    }
    board.appendChild(row);

    var hint = el('div', 'l40-hintbar', 'same on every plate');
    board.appendChild(hint);
    story.appendChild(board);
    popIn(board);

    var placed = 0;
    var ghost = null;
    var drag = null;

    function allPlaced() { return placed >= q.total; }

    function makeSubmit() {
      tray.innerHTML = '';
      var btn = el('button', 'l40-submit is-dim');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Check my plates');
      btn.innerHTML = ICONS.check;
      btn.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!allPlaced()) {
          Engine.sfx.deny();
          shake(btn);
          return;
        }
        var ok = plates.every(function (p) { return p.items.length === per; });
        if (!ok) {
          plates.forEach(function (p) {
            if (p.items.length !== per) {
              p.node.classList.add('is-bad');
              shake(p.node);
            }
          });
          later(function () {
            if (!alive) return;
            plates.forEach(function (p) { p.node.classList.remove('is-bad'); });
          }, 900);
          wrong(btn);
          return;
        }
        state.busy = true;
        btn.classList.remove('is-dim');
        btn.classList.add('is-right');
        plates.forEach(function (p, idx) {
          later(function () {
            if (!alive) return;
            p.node.classList.add('is-done');
            snapPop(p.node);
            Engine.sfx.tap();
            if (idx === 0) Engine.sfx.correct();
          }, idx * 60);
        });
        var cap = el('div', 'l40-each', per + ' on each plate');
        board.appendChild(cap);
        popIn(cap, 200);
        burst(board);
        correct(null, NEXT_MS);
      });
      tray.appendChild(btn);
      return btn;
    }

    var submit = makeSubmit();

    function refreshSubmit() {
      if (!submit) return;
      if (allPlaced()) submit.classList.remove('is-dim');
      else submit.classList.add('is-dim');
    }

    function place(item, plateIndex) {
      if (item.at >= 0 || state.locked) return;
      var target = plates[plateIndex];
      item.at = plateIndex;
      item.node.classList.add('is-gone');
      item.node.setAttribute('aria-disabled', 'true');
      var bit = el('span', 'l40-on-plate');
      var art = itemSvg(q.item);
      bit.appendChild(art);
      bit.style.setProperty('--k', String(target.items.length));
      bit.style.setProperty('--n', String(per));
      target.node.appendChild(bit);
      /* 落位：外框只做淡入（保持 --k 的错位），本体做三段挤压（§5.11） */
      bit.getBoundingClientRect();
      bit.classList.add('is-in');
      snapPop(art);
      target.items.push({ item: item, bit: bit });
      snapPop(target.node);
      Engine.sfx.tap();
      placed += 1;
      refreshSubmit();
    }

    function takeBack(plateIndex) {
      if (state.locked || state.busy) return;
      var target = plates[plateIndex];
      var last = target.items.pop();
      if (!last) return;
      remove(last.bit);
      last.item.at = -1;
      last.item.node.classList.remove('is-gone');
      last.item.node.removeAttribute('aria-disabled');
      placed -= 1;
      refreshSubmit();
      Engine.sfx.tap();
    }

    function hitPlate(x, y) {
      for (var i = 0; i < plates.length; i += 1) {
        var b = plates[i].node.getBoundingClientRect();
        if (x >= b.left - HIT_PAD && x <= b.right + HIT_PAD &&
            y >= b.top - HIT_PAD && y <= b.bottom + HIT_PAD) return i;
      }
      return -1;
    }

    function onDown(e, item) {
      if (state.locked || state.busy || item.at >= 0) return;
      e.preventDefault();
      var r = item.node.getBoundingClientRect();
      drag = { item: item, x0: e.clientX, y0: e.clientY, moved: false, r: r };
      ghost = el('div', 'l40-ghost');
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      ghost.appendChild(itemSvg(q.item));
      document.body.appendChild(ghost);
      moveGhost(e.clientX, e.clientY);
    }

    function moveGhost(x, y) {
      if (!ghost) return;
      ghost.style.transform = 'translate(' + (x - 26) + 'px,' + (y - 26) + 'px)';
    }

    function onMove(e) {
      if (!drag) return;
      var dx = e.clientX - drag.x0;
      var dy = e.clientY - drag.y0;
      if (!drag.moved && Math.sqrt(dx * dx + dy * dy) > 8) drag.moved = true;
      moveGhost(e.clientX, e.clientY);
      var pi = hitPlate(e.clientX, e.clientY);
      plates.forEach(function (p, idx) { p.node.classList.toggle('is-hot', idx === pi); });
    }

    function bounceGhost(x, y, r, done) {
      if (!ghost) { if (done) done(); return; }
      var node = ghost;
      ghost = null;
      node.animate([
        { transform: 'translate(' + (x - 26) + 'px,' + (y - 26) + 'px) scale(1)', opacity: 1 },
        {
          transform: 'translate(' + (x - 26) + 'px,' + (y - 26 + (r.top - y) * 0.55) + 'px) scale(.84)',
          opacity: 0.8,
          offset: 0.62
        },
        {
          transform: 'translate(' + (r.left + r.width / 2 - 26) + 'px,' + (r.top + r.height / 2 - 26) + 'px) scale(.5)',
          opacity: 0,
          offset: 1
        }
      ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' }).finished.then(function () {
        remove(node);
        if (done) done();
      }, function () { remove(node); });
    }

    function onUp(e) {
      if (!drag) return;
      var d = drag;
      drag = null;
      plates.forEach(function (p) { p.node.classList.remove('is-hot'); });
      var pi = hitPlate(e.clientX, e.clientY);
      if (pi >= 0) {
        if (ghost) { remove(ghost); ghost = null; }
        place(d.item, pi);
        return;
      }
      if (!d.moved) {
        if (ghost) { remove(ghost); ghost = null; }
        return;
      }
      bounceGhost(e.clientX, e.clientY, d.r);
    }

    items.forEach(function (item) {
      item.node.addEventListener('pointerdown', function (e) { onDown(e, item); });
    });
    plates.forEach(function (p, idx) {
      p.node.addEventListener('click', function (e) {
        if (state.locked || state.busy) return;
        if (e.target === p.node || e.target.classList.contains('l40-plate-face') ||
            e.target.classList.contains('l40-plate-rim') || e.target.classList.contains('l40-on-plate') ||
            (e.target.closest && e.target.closest('.l40-on-plate'))) {
          takeBack(idx);
        }
      });
    });
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);

    var cleanup = function () {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (ghost) { remove(ghost); ghost = null; }
      drag = null;
    };
    cleanups.push(cleanup);

    tray.classList.add('l40-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：找不公平的一组 ---------------- */

  function buildFair(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sets.map(function (s) {
      var sum = s.deal.reduce(function (a, b) { return a + b; }, 0);
      var even = s.deal.every(function (n) { return n === s.deal[0]; });
      var right = s.t / s.g;
      return { s: s, bad: !even || sum !== s.t || s.m !== right, right: right };
    }));

    var board = el('div', 'l40-fairs');
    story.appendChild(board);

    list.forEach(function (item, idx) {
      var s = item.s;
      var card = el('button', 'l40-fair');
      card.type = 'button';
      card.dataset.key = s.t + '/' + s.g;
      card.setAttribute('aria-label', s.t + ' divided by ' + s.g + ' equals ' + s.m);

      var eq = el('span', 'l40-fair-eq');
      eq.appendChild(el('b', null, String(s.t)));
      eq.appendChild(el('i', null, '÷'));
      eq.appendChild(el('b', null, String(s.g)));
      eq.appendChild(el('i', null, '='));
      var res = el('b', 'l40-fair-res', String(s.m));
      eq.appendChild(res);
      card.appendChild(eq);

      var deal = el('span', 'l40-fair-deal');
      s.deal.forEach(function (n) {
        var pl = el('span', 'l40-fair-plate');
        for (var k = 0; k < n; k += 1) pl.appendChild(el('i', 'l40-dot'));
        deal.appendChild(pl);
      });
      card.appendChild(deal);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l40-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);

        res.classList.add('is-flip');
        later(function () {
          if (!alive) return;
          res.textContent = String(item.right);
          res.classList.remove('is-flip');
          res.classList.add('is-fixed');
          snapPop(res);
        }, 220);

        later(function () {
          if (!alive) return;
          deal.innerHTML = '';
          for (var k = 0; k < s.g; k += 1) {
            var pl = el('span', 'l40-fair-plate');
            for (var n = 0; n < item.right; n += 1) pl.appendChild(el('i', 'l40-dot'));
            deal.appendChild(pl);
          }
          popIn(deal);
          Engine.sfx.tap();
        }, 460);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 780);
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

    if (q.type === 'share') buildShare(q, story, tray, state, correct, wrong);
    else if (q.type === 'plate') buildPlate(q, story, tray, state, correct, wrong);
    else buildFair(q, story, tray, state, correct, wrong);
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

    await sceneCut(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;
    await sceneDeal(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;
    await sceneCount(host);
    if (!alive) return;
    await waitTap(host);
    if (!alive) return;
    await sceneDivide(host);
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
    Array.prototype.slice.call(document.querySelectorAll('.l40-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[40] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
