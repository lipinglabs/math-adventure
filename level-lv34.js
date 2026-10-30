/* ============================================================
   level-lv34.js · Nine Magic Fingers（9 的乘法手指操）
   ------------------------------------------------------------
   第四阶段第七关：九的乘法用手指读出来。
     教学 4 幕：① 双手摊开，10 根手指
                ② 弯下第 4 根 → 左 3 右 6
                ③ 3 与 6 拼成 36（左 = 十位，右 = 个位）
                ④ 规律表 9 · 18 · 27 · 36：十位升、个位降
     答题 10 题：看弯曲的手指图点结果 4 / 拖十位个位两个空 3 / 三算式找错 3
   ============================================================ */

(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var STEP_MS = 140;

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

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgEl(tag, attrs) {
    var node = document.createElementNS(NS, tag);
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
        ctx.audio.play('lv34/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 双手 ---------------- */

  /* 每只手 5 根等距长指（拇指收在掌下，不计入可数指）：
     十根手指从左到右一字排开，弯第 n 根 = 左边 n-1 根、右边 10-n 根（§5.21）。 */
  var FINGERS = [
    { x: 8, y: 64, h: 86 },
    { x: 32, y: 46, h: 104 },
    { x: 56, y: 32, h: 118 },
    { x: 80, y: 46, h: 104 },
    { x: 104, y: 64, h: 86 }
  ];

  /** 一只手：掌心 + 5 根手指 + 腕口，尺寸对称，左右手同形 */
  function handSvg() {
    var svg = svgEl('svg', { class: 'l34-hand', viewBox: '0 0 132 180' });
    svg.setAttribute('aria-hidden', 'true');

    var digits = [];
    FINGERS.forEach(function (f, i) {
      var rect = svgEl('rect', {
        class: 'l34-digit',
        x: f.x,
        y: f.y,
        width: 20,
        height: f.h,
        rx: 10
      });
      rect.dataset.finger = String(i + 1);
      svg.appendChild(rect);
      digits.push(rect);
    });

    /* 掌心盖在手指下半段之上：手指像从掌心长出来，弯下去的那根也被掌沿挡住 */
    svg.appendChild(svgEl('rect', { class: 'l34-palm', x: 12, y: 112, width: 108, height: 48, rx: 22 }));
    svg.appendChild(svgEl('rect', { class: 'l34-wrist', x: 44, y: 150, width: 44, height: 22, rx: 11 }));

    return { node: svg, digits: digits };
  }

  /** 两只手：返回 10 根手指（严格按画面从左到右的顺序） */
  function handsBox() {
    var box = el('div', 'l34-hands');
    var l = handSvg();
    var r = handSvg();
    box.appendChild(l.node);
    box.appendChild(r.node);
    return { node: box, digits: l.digits.concat(r.digits), left: l.node, right: r.node };
  }

  /** 弯第 n 根：缩成一小截躺在掌心，并挪到最前面（否则会被掌心盖住看不出来） */
  function bendDigit(digits, n) {
    var d = digits[n - 1];
    if (!d) return;
    d.classList.add('is-bent');
    if (d.parentNode) d.parentNode.appendChild(d);
  }

  /** 逐根点亮，返回点亮的根数 */
  async function countRange(box, from, to, tone) {
    var cls = tone === 'right' ? 'is-lit2' : 'is-lit';
    for (var i = from; i <= to; i += 1) {
      box.digits[i].classList.add(cls);
      Engine.sfx.tap();
      await sleep(STEP_MS);
      if (!alive) return 0;
    }
    return to - from + 1;
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l34-teach');
    var box = handsBox();
    wrap.appendChild(box.node);
    var note = el('div', 'l34-note', 'ten fingers');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(box.node);
    if (!alive) return;

    box.digits.forEach(function (d, i) {
      d.style.setProperty('--d', (i * 70) + 'ms');
      d.classList.add('is-wave');
    });
    later(function () {
      if (!alive) return;
      box.digits.forEach(function (d) { d.classList.remove('is-wave'); });
    }, 1500);

    var v = saySeq(['t1_a']);
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l34-teach');
    var box = handsBox();
    wrap.appendChild(box.node);

    var pair = el('div', 'l34-merge');
    var tens = el('div', 'l34-cellwrap');
    tens.appendChild(el('span', 'l34-cap', 'tens'));
    var tensTile = el('span', 'l34-tile l34-tile--a', '3');
    tens.appendChild(tensTile);
    tensTile.classList.add('is-hidden');
    pair.appendChild(tens);

    var ones = el('div', 'l34-cellwrap');
    ones.appendChild(el('span', 'l34-cap', 'ones'));
    var onesTile = el('span', 'l34-tile l34-tile--b', '6');
    ones.appendChild(onesTile);
    onesTile.classList.add('is-hidden');
    pair.appendChild(ones);

    wrap.appendChild(pair);
    host.appendChild(wrap);
    await popIn(box.node);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(560);
    if (!alive) return;
    bendDigit(box.digits, 4);
    Engine.sfx.tap();
    await sleep(520);
    if (!alive) return;

    await countRange(box, 0, 2, 'left');
    if (!alive) return;
    tensTile.classList.remove('is-hidden');
    popIn(tensTile);
    Engine.sfx.tap();
    await sleep(420);
    if (!alive) return;

    await countRange(box, 4, 9, 'right');
    if (!alive) return;
    onesTile.classList.remove('is-hidden');
    popIn(onesTile);
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l34-teach');
    var card = el('div', 'l34-card');

    var pair = el('div', 'l34-merge');
    var t1 = el('div', 'l34-cellwrap');
    t1.appendChild(el('span', 'l34-cap', 'tens'));
    t1.appendChild(el('span', 'l34-tile l34-tile--a', '3'));
    pair.appendChild(t1);

    var t2 = el('div', 'l34-cellwrap');
    t2.appendChild(el('span', 'l34-cap', 'ones'));
    t2.appendChild(el('span', 'l34-tile l34-tile--b', '6'));
    pair.appendChild(t2);

    card.appendChild(pair);

    var arrow = el('div', 'l34-arrow', '↓');
    card.appendChild(arrow);

    var res = el('span', 'l34-tile l34-tile--res l34-tile--big', '36');
    res.classList.add('is-hidden');
    card.appendChild(res);

    var fact = el('div', 'l34-fact');
    fact.appendChild(el('span', 'l34-tile l34-tile--sm', '4'));
    fact.appendChild(el('span', 'l34-op', '×'));
    fact.appendChild(el('span', 'l34-tile l34-tile--sm', '9'));
    fact.appendChild(el('span', 'l34-op', '='));
    fact.appendChild(el('span', 'l34-tile l34-tile--sm l34-tile--res', '36'));
    fact.classList.add('is-hidden');
    card.appendChild(fact);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(600);
    if (!alive) return;

    /* 两块数字并到一起，中间那道缝合拢 */
    Engine.anim.track(pair, 420);
    var anim = pair.animate([
      { transform: 'scale(1)', gap: '18px' },
      { transform: 'scale(1.06)', gap: '2px', offset: 0.7 },
      { transform: 'scale(1)', gap: '0px' }
    ], { duration: 420, easing: 'cubic-bezier(.34,1.2,.5,1)', fill: 'both' });
    anim.finished.then(function () { anim.cancel(); }, function () { /* 已取消 */ });

    await sleep(380);
    if (!alive) return;
    res.classList.remove('is-hidden');
    popIn(res);
    Engine.sfx.star();
    await sleep(360);
    if (!alive) return;
    fact.classList.remove('is-hidden');
    popIn(fact);

    await v;
    if (!alive) return;
    await sleep(400);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l34-teach');
    var table = el('div', 'l34-table');
    var rows = [];

    for (var n = 1; n <= 4; n += 1) {
      var row = el('div', 'l34-row');
      row.appendChild(el('span', 'l34-row-n', String(n)));
      row.appendChild(el('span', 'l34-op', '×'));
      row.appendChild(el('span', 'l34-row-n', '9'));
      row.appendChild(el('span', 'l34-op', '='));
      var t = el('span', 'l34-tcell', String(Math.floor((n * 9) / 10)));
      var o = el('span', 'l34-tcell', String((n * 9) % 10));
      if (n === 1) t.classList.add('is-zero');
      row.appendChild(t);
      row.appendChild(o);
      table.appendChild(row);
      rows.push({ node: row, tens: t, ones: o });
    }

    var note = el('div', 'l34-note', 'tens go up · ones go down');
    wrap.appendChild(table);
    wrap.appendChild(note);
    host.appendChild(wrap);
    await popIn(table);
    if (!alive) return;

    var v1 = saySeq(['t1_d']);
    await sleep(200);
    for (var i = 0; i < rows.length; i += 1) {
      rows[i].node.classList.add('is-on');
      bounce(rows[i].tens);
      bounce(rows[i].ones);
      Engine.sfx.tap();
      await sleep(420);
      if (!alive) return;
    }
    await v1;
    if (!alive) return;
    await sleep(240);

    var v2 = saySeq(['t1_e']);
    for (var k = 0; k < rows.length; k += 1) {
      rows[k].node.classList.add('is-said');
      await sleep(300);
      if (!alive) return;
    }
    snapPop(note);
    Engine.sfx.star();
    await v2;
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
      var key = el('button', 'l34-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l34-key-digit', String(value)));
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

  /* ---------------- 题型 A：看弯曲的手指图点结果 ---------------- */

  function buildRead(q, story, tray, state, correct, wrong) {
    var answer = q.n * 9;

    var board = el('div', 'l34-board');
    var box = handsBox();
    bendDigit(box.digits, q.n);
    board.appendChild(box.node);

    var fact = el('div', 'l34-fact l34-fact--sm');
    fact.appendChild(el('span', 'l34-tile l34-tile--sm', String(q.n)));
    fact.appendChild(el('span', 'l34-op', '×'));
    fact.appendChild(el('span', 'l34-tile l34-tile--sm', '9'));
    board.appendChild(fact);

    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          var res = el('span', 'l34-tile l34-tile--sm l34-tile--res', String(answer));
          fact.appendChild(el('span', 'l34-op', '='));
          fact.appendChild(res);
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

    tray.classList.add('l34-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖十位与个位 ---------------- */

  function buildSplit(q, story, tray, state, correct, wrong) {
    var product = q.a * 9;
    var tens = Math.floor(product / 10);
    var ones = product % 10;

    var board = el('div', 'l34-board');
    var eq = el('div', 'l34-fact');
    eq.appendChild(el('span', 'l34-tile l34-tile--sm', String(q.a)));
    eq.appendChild(el('span', 'l34-op', '×'));
    eq.appendChild(el('span', 'l34-tile l34-tile--sm', '9'));
    eq.appendChild(el('span', 'l34-op', '='));

    var cells = {};
    ['tens', 'ones'].forEach(function (part) {
      var wrap = el('div', 'l34-cellwrap');
      wrap.appendChild(el('span', 'l34-cap', part));
      var cell = el('span', 'l34-drop');
      cell.dataset.part = part;
      cell.setAttribute('aria-label', part === 'tens' ? 'tens place' : 'ones place');
      wrap.appendChild(cell);
      eq.appendChild(wrap);
      cells[part] = { node: cell, filled: false };
    });
    board.appendChild(eq);
    story.appendChild(board);
    popIn(board);

    var want = { tens: tens, ones: ones };
    var filled = 0;
    var pool = Engine.quiz.shuffle(q.pool.slice());

    function check() {
      if (filled < 2) return;
      later(function () {
        if (state.locked || !alive) return;
        snapPop(eq);
        burst(board);
        correct(null);
      }, 220);
    }

    tray.innerHTML = '';
    pool.forEach(function (value, i) {
      var chip = el('button', 'l34-chip');
      chip.type = 'button';
      chip.dataset.value = String(value);
      chip.setAttribute('aria-label', String(value));
      chip.appendChild(el('span', 'l34-chip-digit', String(value)));
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l34-ghost');
            g.appendChild(el('span', 'l34-chip-digit', String(value)));
            return g;
          },
          find: function (x, y) {
            var hit = null;
            ['tens', 'ones'].forEach(function (part) {
              var ref = cells[part];
              if (hit || ref.filled) return;
              if (!insidePad(ref.node.getBoundingClientRect(), x, y)) return;
              if (want[part] !== value) return;       // 位置不对：按 §5.9 只回弹，不判错
              hit = part;
            });
            return hit;
          },
          onDrop: function (part) {
            var ref = cells[part];
            ref.filled = true;
            ref.node.textContent = String(value);
            ref.node.classList.add('is-filled');
            snapPop(ref.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            filled += 1;
            check();
          }
        });
      });
      popIn(chip, i * 40);
      tray.appendChild(chip);
    });

    tray.classList.add('l34-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三算式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown, bad: s.a * s.b !== s.shown };
    }));

    var board = el('div', 'l34-cards');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var card = el('button', 'l34-card');
        card.type = 'button';
        card.dataset.key = s.a + 'x' + s.b + '=' + s.shown;
        card.setAttribute('aria-label', s.a + ' times ' + s.b + ' equals ' + s.shown);
        var row = el('div', 'l34-fact l34-fact--sm');
        row.appendChild(el('span', 'l34-tile l34-tile--sm', String(s.a)));
        row.appendChild(el('span', 'l34-op', '×'));
        row.appendChild(el('span', 'l34-tile l34-tile--sm', String(s.b)));
        row.appendChild(el('span', 'l34-op', '='));
        var res = el('span', 'l34-tile l34-tile--sm l34-tile--ans', String(s.shown));
        row.appendChild(res);
        card.appendChild(row);

        card.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          if (!s.bad) { wrong(card); return; }
          state.busy = true;
          card.classList.add('is-right');
          var tick = el('span', 'l34-tick');
          tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
            'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          card.appendChild(tick);
          popIn(tick);
          res.classList.add('is-flip');
          later(function () {
            res.textContent = String(s.a * s.b);
            res.classList.remove('is-flip', 'l34-tile--ans');
            res.classList.add('is-fixed');
            snapPop(res);
          }, 220);
          later(function () {
            if (state.locked || !alive) return;
            burst(board);
            correct(null, WRONG_HOLD);
          }, 620);
        });
        popIn(card, i * 55);
        board.appendChild(card);
      });
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

    if (q.type === 'read') buildRead(q, story, tray, state, correct, wrong);
    else if (q.type === 'split') buildSplit(q, story, tray, state, correct, wrong);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[34] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
