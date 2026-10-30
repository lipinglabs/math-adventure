/* ============================================================
   level-lv42.js · Take Away Again and Again（连减与除法）
   ------------------------------------------------------------
   第五阶段第三关：十二颗糖，每次拿走四颗，拿三次就没了——
   连减三次，就是除以四。
     教学 4 幕：① 拿一次（12 → 8，记一行）
                ② 拿完（8 → 4 → 0，三行齐 + taken away 3 times）
                ③ 除法（12 ÷ 4 = 3 升起）
                ④ 对照（左连减串 ≡ 右除法，语音点题）
     答题 10 题：听连减选除法 4 / 连减↔除法连线 3 / 三组等式找错 3
   铁律：糖果飞走只隐藏本体，格位与其余糖果坐标全程不动（§5.7）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var NS = 'http://www.w3.org/2000/svg';

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

  function svgEl(tag, attrs) {
    var node = document.createElementNS(NS, tag);
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
        ctx.audio.play('lv42/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 物件 ---------------- */

  function candySvg(i) {
    var colors = ['#F2705B', '#F5A24B', '#7FC7A6', '#8FB4E8', '#E88FB0', '#C7A6E8'];
    var c = colors[i % colors.length];
    var s = svgEl('svg', { viewBox: '0 0 44 44' });
    s.classList.add('l42-candy');
    s.innerHTML =
      '<path d="M11 22l-8-4.6v9.2zM33 22l8-4.6v9.2z" fill="' + c + '" opacity=".55"/>' +
      '<circle cx="22" cy="22" r="12.4" fill="' + c + '"/>' +
      '<circle cx="17.6" cy="17.6" r="3.6" fill="#FFFFFF" opacity=".62"/>';
    return s;
  }

  function basketNode() {
    var box = el('div', 'l42-basket');
    box.innerHTML =
      '<svg viewBox="0 0 90 74" aria-hidden="true">' +
      '<path d="M10 26h70l-8 40a6 6 0 0 1-6 5H24a6 6 0 0 1-6-5z" fill="#D9A263"/>' +
      '<path d="M10 26h70" stroke="#B57F49" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M22 34v30M34 34v30M46 34v30M58 34v30M70 34v30" stroke="#C08E55" stroke-width="3" opacity=".75"/>' +
      '<path d="M18 24c0-12 10-20 27-20s27 8 27 20" fill="none" stroke="#B57F49" stroke-width="5" stroke-linecap="round"/>' +
      '</svg>' +
      '<span class="l42-basket-n">0</span>';
    return box;
  }

  /* ---------------- 教学 ---------------- */

  function candyStage(count, cols) {
    var wrap = el('div', 'l42-teach');
    var field = el('div', 'l42-field');
    var grid = el('div', 'l42-grid');
    grid.style.setProperty('--cols', String(cols || 4));
    var items = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('div', 'l42-slot');
      var c = candySvg(i);
      slot.appendChild(c);
      grid.appendChild(slot);
      items.push({ slot: slot, node: c });
    }
    field.appendChild(grid);
    var basket = basketNode();
    field.appendChild(basket);
    wrap.appendChild(field);
    var log = el('div', 'l42-log');
    wrap.appendChild(log);
    return { wrap: wrap, field: field, grid: grid, items: items, basket: basket, log: log };
  }

  function takeAway(st, from, count, msg) {
    var br = st.basket.getBoundingClientRect();
    var done = 0;
    for (var i = 0; i < count; i += 1) {
      var it = st.items[from + i];
      if (!it) continue;
      var r = it.slot.getBoundingClientRect();
      var dx = (br.left + br.width / 2) - (r.left + r.width / 2);
      var dy = (br.top + br.height * 0.45) - (r.top + r.height / 2);
      it.node.animate([
        { transform: 'translate(0px,0px) scale(1)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.45).toFixed(1) + 'px,' + (dy * 0.45 - 44).toFixed(1) + 'px) scale(.92)', opacity: 1, offset: 0.5 },
        { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(.45)', opacity: 0 }
      ], { duration: 560, delay: i * 80, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
      done += 1;
    }
    later(function () {
      if (!alive) return;
      var n = Number(st.basket.dataset.n || 0) + done;
      st.basket.dataset.n = String(n);
      st.basket.querySelector('.l42-basket-n').textContent = String(n);
      snapPop(st.basket);
      Engine.sfx.tap();
    }, 620);
    if (msg) {
      var row = el('div', 'l42-log-row');
      row.innerHTML = msg;
      st.log.appendChild(row);
      popIn(row);
    }
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var st = candyStage(12, 4);
    st.basket.dataset.n = '0';
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(900);
    if (!alive) return;
    takeAway(st, 0, 4, '<b>12</b> − <b>4</b> = <b>8</b>');
    await v;
    if (!alive) return;
    await sleep(420);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var st = candyStage(12, 4);
    st.basket.dataset.n = '4';
    st.basket.querySelector('.l42-basket-n').textContent = '4';
    for (var k = 0; k < 4; k += 1) st.items[k].node.style.opacity = '0';
    st.log.innerHTML = '';
    var r1 = el('div', 'l42-log-row');
    r1.innerHTML = '<b>12</b> − <b>4</b> = <b>8</b>';
    st.log.appendChild(r1);
    host.appendChild(st.wrap);
    await popIn(st.wrap);
    if (!alive) return;

    await sleep(420);
    if (!alive) return;
    takeAway(st, 4, 4, '<b>8</b> − <b>4</b> = <b>4</b>');
    await sleep(880);
    if (!alive) return;
    var v = saySeq(['t1_b']);
    takeAway(st, 8, 4, '<b>4</b> − <b>4</b> = <b>0</b>');
    await v;
    if (!alive) return;

    var chip = el('div', 'l42-chip', 'taken away 3 times');
    st.wrap.appendChild(chip);
    popIn(chip);
    Engine.sfx.star();
    await sleep(420);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l42-teach');
    var card = el('div', 'l42-eq');
    card.appendChild(el('span', 'l42-eq-n', '12'));
    card.appendChild(el('span', 'l42-eq-op', '÷'));
    card.appendChild(el('span', 'l42-eq-n', '4'));
    card.appendChild(el('span', 'l42-eq-op', '='));
    card.appendChild(el('span', 'l42-eq-n l42-eq-n--res', '3'));
    wrap.appendChild(card);
    wrap.appendChild(el('div', 'l42-eq-cap', '3 times'));
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(320);
    card.classList.add('is-on');
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(240);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l42-teach');
    var pair = el('div', 'l42-pair');

    var left = el('div', 'l42-side l42-side--take');
    left.appendChild(el('span', 'l42-side-cap', 'take away'));
    var lrow = el('div', 'l42-side-eq');
    ['12', '−', '4', '−', '4', '−', '4', '=', '0'].forEach(function (t) {
      if (t === '−' || t === '=') lrow.appendChild(el('span', 'l42-side-op', t));
      else lrow.appendChild(el('span', 'l42-side-num', t));
    });
    left.appendChild(lrow);
    pair.appendChild(left);

    var bridge = el('span', 'l42-bridge', '≡');
    pair.appendChild(bridge);

    var right = el('div', 'l42-side l42-side--div');
    right.appendChild(el('span', 'l42-side-cap', 'divide'));
    var rrow = el('div', 'l42-side-eq');
    ['12', '÷', '4', '=', '3'].forEach(function (t) {
      if (t === '÷' || t === '=') rrow.appendChild(el('span', 'l42-side-op', t));
      else rrow.appendChild(el('span', 'l42-side-num', t));
    });
    right.appendChild(rrow);
    pair.appendChild(right);

    wrap.appendChild(pair);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(400);
    bridge.classList.add('is-on');
    Engine.sfx.tap();
    await v;
    if (!alive) return;

    var v2 = saySeq(['t1_e']);
    pair.classList.add('is-hot');
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

  function chainText(a, b, n) {
    var parts = [String(a)];
    for (var i = 0; i < n; i += 1) {
      parts.push('−');
      parts.push(String(b));
    }
    parts.push('=');
    parts.push('0');
    return parts;
  }

  /* ---------------- 题型 A：听连减选除法 ---------------- */

  function buildChoice(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l42-board');
    var head = el('div', 'l42-chain');
    head.appendChild(el('span', 'l42-chain-cap', 'take away'));
    var line = el('div', 'l42-chain-line');
    chainText(q.a, q.b, q.n).forEach(function (t) {
      line.appendChild(el('span', t === '−' || t === '=' ? 'l42-chain-op' : 'l42-chain-num', t));
    });
    head.appendChild(line);
    board.appendChild(head);
    story.appendChild(board);
    popIn(board);

    var list = Engine.quiz.shuffle(q.options.map(function (o) { return o.slice(); }));

    function paint() {
      tray.innerHTML = '';
      list.forEach(function (opt, i) {
        var btn = el('button', 'l42-opt');
        btn.type = 'button';
        btn.dataset.key = opt[0] + 'd' + opt[1];
        btn.setAttribute('aria-label', opt[0] + ' divided by ' + opt[1] + ' equals ' + opt[2]);
        btn.appendChild(el('span', 'l42-opt-n', String(opt[0])));
        btn.appendChild(el('span', 'l42-opt-op', '÷'));
        btn.appendChild(el('span', 'l42-opt-n', String(opt[1])));
        btn.appendChild(el('span', 'l42-opt-op', '='));
        btn.appendChild(el('span', 'l42-opt-n', String(opt[2])));
        btn.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          var good = opt[0] === q.a && opt[1] === q.b && opt[2] === q.n;
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

    tray.classList.add('l42-tray', 'l42-tray--col');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：连减 ↔ 除法 连线 ---------------- */

  function buildLink(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l42-link');
    var svg = svgEl('svg', { class: 'l42-lines' });
    svg.setAttribute('aria-hidden', 'true');
    board.appendChild(svg);

    var colL = el('div', 'l42-col l42-col--take');
    var colR = el('div', 'l42-col l42-col--div');

    var pairs = q.pairs.map(function (p) { return { a: p[0], b: p[1], n: p[2] }; });
    var lefts = Engine.quiz.shuffle(pairs.slice());
    var rights = Engine.quiz.shuffle(pairs.slice());

    var leftCards = [];
    var rightCards = [];

    lefts.forEach(function (p) {
      var card = el('button', 'l42-lcard l42-lcard--take');
      card.type = 'button';
      card.dataset.key = p.a + '/' + p.b;
      var row = el('div', 'l42-lrow');
      chainText(p.a, p.b, p.n).forEach(function (t) {
        row.appendChild(el('span', t === '−' || t === '=' ? 'l42-lop' : 'l42-lnum', t));
      });
      card.appendChild(row);
      colL.appendChild(card);
      leftCards.push({ node: card, p: p, done: false });
    });

    rights.forEach(function (p) {
      var card = el('button', 'l42-lcard l42-lcard--div');
      card.type = 'button';
      card.dataset.key = p.a + '/' + p.b;
      var row = el('div', 'l42-lrow');
      row.appendChild(el('span', 'l42-lnum', String(p.a)));
      row.appendChild(el('span', 'l42-lop', '÷'));
      row.appendChild(el('span', 'l42-lnum', String(p.b)));
      row.appendChild(el('span', 'l42-lop', '='));
      row.appendChild(el('span', 'l42-lnum l42-lnum--res', String(p.n)));
      card.appendChild(row);
      colR.appendChild(card);
      rightCards.push({ node: card, p: p, done: false });
    });

    board.appendChild(colL);
    board.appendChild(colR);
    story.appendChild(board);
    popIn(board);

    var linked = 0;
    var active = null;
    var liveLine = null;

    function boardRect() { return board.getBoundingClientRect(); }
    function anchor(node, side) {
      var r = node.getBoundingClientRect();
      var br = boardRect();
      return {
        x: r.left - br.left + (side === 'right' ? r.width : 0),
        y: r.top - br.top + r.height / 2
      };
    }
    function drawLine(a, b, cls) {
      var line = svgEl('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: 'l42-line' + (cls ? ' ' + cls : '')
      });
      svg.appendChild(line);
      return line;
    }
    function same(l, r) { return l.a === r.a && l.b === r.b && l.n === r.n; }

    function resolve(sc, tc) {
      if (!sc || !tc || sc.done || tc.done) return;
      var a = anchor(sc.node, 'right');
      var b = anchor(tc.node, 'left');
      if (!same(sc.p, tc.p)) {
        var bad = drawLine(a, b, 'is-bad');
        shake(sc.node);
        shake(tc.node);
        wrong(null);
        later(function () { remove(bad); }, 560);
        return;
      }
      sc.done = true;
      tc.done = true;
      sc.node.classList.add('is-matched');
      tc.node.classList.add('is-matched');
      sc.node.disabled = true;
      tc.node.disabled = true;
      var good = drawLine(a, b, 'is-on');
      good.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }],
        { duration: 520, fill: 'forwards' });
      sc.node.appendChild(tickNode());
      tc.node.appendChild(tickNode());
      Engine.sfx.tap();
      linked += 1;
      if (linked >= pairs.length) {
        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, NEXT_MS);
        }, 320);
      }
    }

    function tickNode() {
      var t = el('span', 'l42-tick');
      t.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M4 12.5l5 5L20 6.5" ' +
        'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      return t;
    }

    leftCards.forEach(function (sc) {
      sc.node.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || sc.done) return;
        e.preventDefault();
        sc.node.dataset.drag = '1';
        setTimeout(function () { if (sc.node) delete sc.node.dataset.drag; }, 80);
        active = sc;
        var a = anchor(sc.node, 'right');
        liveLine = drawLine(a, { x: a.x, y: a.y }, 'is-live');
        sc.node.classList.add('is-lifted');

        function move(ev) {
          var br = boardRect();
          liveLine.setAttribute('x2', ev.clientX - br.left);
          liveLine.setAttribute('y2', ev.clientY - br.top);
        }
        function detach() {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
        }
        function up(ev) {
          detach();
          sc.node.classList.remove('is-lifted');
          remove(liveLine);
          liveLine = null;
          var hit = null;
          rightCards.forEach(function (tc) {
            if (hit || tc.done) return;
            var r = tc.node.getBoundingClientRect();
            if (ev.clientX >= r.left - HIT_PAD && ev.clientX <= r.right + HIT_PAD &&
                ev.clientY >= r.top - HIT_PAD && ev.clientY <= r.bottom + HIT_PAD) hit = tc;
          });
          if (hit) resolve(sc, hit);
          active = null;
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      });

      /* 两下轻点兜底 */
      sc.node.addEventListener('click', function () {
        if (state.locked || state.busy || sc.done) return;
        if (sc.node.dataset.drag) return;
        leftCards.forEach(function (o) { if (o !== sc) o.node.classList.remove('is-pick'); });
        if (active === sc) { active = null; sc.node.classList.remove('is-pick'); return; }
        active = sc;
        sc.node.classList.add('is-pick');
        Engine.sfx.tap();
      });
    });

    rightCards.forEach(function (tc) {
      tc.node.addEventListener('click', function () {
        if (state.locked || state.busy || tc.done) return;
        if (!active) { shake(tc.node); return; }
        var sc = active;
        active = null;
        sc.node.classList.remove('is-pick');
        resolve(sc, tc);
      });
    });

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三组等式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sets.map(function (s) {
      return { s: s, bad: s.shown !== s.n };
    }));

    var board = el('div', 'l42-fairs');
    story.appendChild(board);

    list.forEach(function (item, idx) {
      var s = item.s;
      var card = el('button', 'l42-fair');
      card.type = 'button';
      card.dataset.key = s.a + '/' + s.b;
      card.setAttribute('aria-label', s.a + ' take away ' + s.b + ' ' + s.n + ' times');

      var top = el('div', 'l42-frow');
      chainText(s.a, s.b, s.n).forEach(function (t) {
        top.appendChild(el('span', t === '−' || t === '=' ? 'l42-fop' : 'l42-fnum', t));
      });
      card.appendChild(top);

      var bot = el('div', 'l42-frow l42-frow--div');
      bot.appendChild(el('span', 'l42-fnum', String(s.a)));
      bot.appendChild(el('span', 'l42-fop', '÷'));
      bot.appendChild(el('span', 'l42-fnum', String(s.b)));
      bot.appendChild(el('span', 'l42-fop', '='));
      var res = el('span', 'l42-fnum l42-fnum--res', String(s.shown));
      bot.appendChild(res);
      card.appendChild(bot);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l42-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);

        res.classList.add('is-flip');
        later(function () {
          if (!alive) return;
          res.textContent = String(s.n);
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

    if (q.type === 'choice') buildChoice(q, story, tray, state, correct, wrong);
    else if (q.type === 'link') buildLink(q, story, tray, state, correct, wrong);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[42] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
