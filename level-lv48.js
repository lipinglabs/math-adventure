/* ============================================================
   level-lv48.js · Ultimate Math Challenge（全项目大结局）
   ------------------------------------------------------------
   第五阶段结业关：四则运算回顾 → 终极奖杯升起 → 十题混合大考。
     教学 4 幕：① 回顾（+ − × ÷ 四张卡依次亮）
                ② 奖杯（终极奖杯升起 + 一次性光环）
                ③ 定格（MATH MASTER 绶带落下、桂冠展开、火花）
                ④ 邀请（十枚题型小片亮起，等点击）
     答题 10 题：加减 3 / 表内乘 3 / 除法 2 / 混合找错 2
     结业：金星后 40 条四形状彩带 + 3 组金色烟花 + MATH MASTER 绶带，
           结算页留 Math Master 徽章（§6.13 / §6.16）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 720;
  var WRONG_HOLD = 1500;
  var CONFETTI = 40;
  var FIREWORK_SPARKS = 14;

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
  var ceremonyLayer = null;
  var cleanups = [];
  var gid = 0;

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
    ], { duration: 340, delay: delay || 0 });
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
        ctx.audio.play('lv48/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 终极奖杯 ---------------- */

  function trophyNode() {
    gid += 1;
    var id = 'l48g' + gid;
    var s = svgEl('svg', { viewBox: '0 0 200 260', 'aria-hidden': 'true' });
    s.classList.add('l48-cup-svg');

    var defs = svgEl('defs');
    defs.innerHTML =
      '<linearGradient id="' + id + 'a" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#F6FAFD"/><stop offset=".28" stop-color="#FFFFFF"/>' +
      '<stop offset=".52" stop-color="#D8E2EC"/><stop offset=".74" stop-color="#F2F7FC"/>' +
      '<stop offset="1" stop-color="#B6C4D2"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#FFDE8A"/><stop offset=".45" stop-color="#F2C14E"/>' +
      '<stop offset="1" stop-color="#B8860B"/></linearGradient>' +
      '<linearGradient id="' + id + 'c" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#5B8BC9"/><stop offset="1" stop-color="#20457C"/></linearGradient>' +
      '<linearGradient id="' + id + 'd" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="#2E5FA3"/><stop offset="1" stop-color="#163257"/></linearGradient>';
    s.appendChild(defs);

    /* 顶饰星 + 立柱 */
    s.appendChild(svgEl('path', {
      d: 'M100 4l7.4 15.6 17 2.4-12.6 11.8 3.4 16.8L100 42.6l-15.2 8-3.4-16.8L68.6 22l17-2.4z',
      fill: 'url(#' + id + 'b)',
      stroke: '#8A6512',
      'stroke-width': 1.6,
      'stroke-linejoin': 'round'
    }));
    s.appendChild(svgEl('rect', { x: 96, y: 44, width: 8, height: 12, rx: 3, fill: 'url(#' + id + 'b)' }));

    /* 双耳把手 */
    s.appendChild(svgEl('path', {
      d: 'M58 58C26 60 20 92 54 100',
      fill: 'none',
      stroke: 'url(#' + id + 'b)',
      'stroke-width': 7,
      'stroke-linecap': 'round'
    }));
    s.appendChild(svgEl('path', {
      d: 'M142 58C174 60 180 92 146 100',
      fill: 'none',
      stroke: 'url(#' + id + 'b)',
      'stroke-width': 7,
      'stroke-linecap': 'round'
    }));

    /* 杯身 */
    s.appendChild(svgEl('path', {
      d: 'M56 52h88c0 0-2 60-44 72-42-12-44-72-44-72z',
      fill: 'url(#' + id + 'a)',
      stroke: '#9DAEBE',
      'stroke-width': 2
    }));

    /* 蓝宝石腰带 */
    s.appendChild(svgEl('path', {
      d: 'M58 86h84c-2 12-8 22-18 28H76c-10-6-16-16-18-28z',
      fill: 'url(#' + id + 'c)',
      opacity: '.95'
    }));
    [[74, 100], [100, 104], [126, 100]].forEach(function (p, i) {
      s.appendChild(svgEl('circle', { cx: p[0], cy: p[1], r: i === 1 ? 5.4 : 4.2, fill: 'url(#' + id + 'd)', stroke: '#9FC2EA', 'stroke-width': 1.2 }));
      s.appendChild(svgEl('circle', { cx: p[0] - 1.2, cy: p[1] - 1.6, r: 1.5, fill: '#FFFFFF', opacity: '.8' }));
    });

    /* 杯颈与把手环 */
    s.appendChild(svgEl('path', { d: 'M92 124h16l-3 30h-10z', fill: 'url(#' + id + 'a)', stroke: '#9DAEBE', 'stroke-width': 1.6 }));
    s.appendChild(svgEl('ellipse', { cx: 100, cy: 156, rx: 20, ry: 6.5, fill: 'url(#' + id + 'b)' }));

    /* 两侧桂冠 */
    ['left', 'right'].forEach(function (side) {
      var dir = side === 'left' ? -1 : 1;
      for (var i = 0; i < 5; i += 1) {
        var cx = 100 + dir * (26 + i * 3.2);
        var cy = 134 + i * 8;
        s.appendChild(svgEl('ellipse', {
          cx: cx, cy: cy, rx: 9 - i * 0.8, ry: 4.6 - i * 0.4,
          fill: 'url(#' + id + 'b)', opacity: String(0.95 - i * 0.1),
          transform: 'rotate(' + (dir * (28 + i * 8)) + ' ' + cx + ' ' + cy + ')'
        }));
      }
    });

    /* 五层底座 */
    var steps = [
      [70, 140, 170, 182],
      [64, 146, 182, 194],
      [58, 152, 194, 206],
      [52, 158, 206, 218],
      [46, 164, 218, 232]
    ];
    steps.forEach(function (st, i) {
      s.appendChild(svgEl('path', {
        d: 'M' + st[0] + ' ' + st[2] + 'h' + (st[1] - st[0]) + 'l6 12H' + (st[0] - 6) + 'z',
        fill: i % 2 ? 'url(#' + id + 'a)' : 'url(#' + id + 'b)',
        stroke: '#8A6512',
        'stroke-width': 1.1,
        opacity: i % 2 ? '1' : '.96'
      }));
    });
    s.appendChild(svgEl('ellipse', { cx: 100, cy: 232, rx: 64, ry: 8, fill: '#7E6636', opacity: '.22' }));

    /* 高光 */
    s.appendChild(svgEl('path', {
      d: 'M70 60c-2 26 4 44 14 54',
      fill: 'none',
      stroke: '#FFFFFF',
      'stroke-width': 6,
      'stroke-linecap': 'round',
      opacity: '.65'
    }));

    var wrap = el('div', 'l48-cup');
    wrap.appendChild(s);
    return wrap;
  }

  /* ---------------- 教学 ---------------- */

  function opCard(sign, label) {
    var card = el('div', 'l48-op');
    card.appendChild(el('span', 'l48-op-sign', sign));
    card.appendChild(el('span', 'l48-op-label', label));
    return card;
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l48-teach');
    var row = el('div', 'l48-ops');
    var cards = [
      opCard('+', 'add'),
      opCard('−', 'subtract'),
      opCard('×', 'multiply'),
      opCard('÷', 'divide')
    ];
    cards.forEach(function (c) { row.appendChild(c); });
    wrap.appendChild(row);
    wrap.appendChild(el('div', 'l48-cap', 'four big ideas, one math master'));
    host.appendChild(wrap);

    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    cards.forEach(function (c, i) {
      later(function () {
        if (!alive) return;
        c.classList.add('is-on');
        popIn(c);
        if (i === 0) Engine.sfx.tap();
      }, 260 + i * 420);
    });
    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l48-teach');
    var stageEl = el('div', 'l48-stage');
    var halo = el('span', 'l48-halo');
    var cup = trophyNode();
    cup.classList.add('l48-cup--teach');
    stageEl.appendChild(halo);
    stageEl.appendChild(cup);
    wrap.appendChild(stageEl);
    host.appendChild(wrap);

    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    later(function () {
      if (!alive) return;
      cup.classList.add('is-up');
      Engine.sfx.star();
    }, 260);
    later(function () {
      if (!alive) return;
      halo.classList.add('is-burst');
    }, 700);
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.dataset.scene = 'three';

    var cup = host.querySelector('.l48-cup');
    if (cup) cup.classList.add('is-glow');
    var stageEl = host.querySelector('.l48-stage');

    var sash = el('div', 'l48-sash', 'MATH MASTER');
    if (stageEl) stageEl.appendChild(sash);
    later(function () {
      if (!alive) return;
      sash.classList.add('is-on');
      popIn(sash);
      Engine.sfx.tap();
    }, 180);

    await sleep(900);
    if (!alive) return;
    for (var i = 0; i < 4; i += 1) {
      (function (idx) {
        later(function () {
          if (!alive || !stageEl) return;
          var spark = el('span', 'l48-spark');
          spark.style.left = (28 + idx * 22) + '%';
          spark.style.top = (24 + (idx % 2) * 26) + '%';
          stageEl.appendChild(spark);
          later(function () { remove(spark); }, 900);
        }, idx * 210);
      }(i));
    }
    await sleep(900);
  }

  async function sceneFour(host) {
    host.dataset.scene = 'four';

    var wrap = host.querySelector('.l48-teach') || el('div', 'l48-teach');
    var deck = el('div', 'l48-deck');
    var labels = ['+', '−', '×', '÷', '?', '+', '×', '÷', '−', '?'];
    labels.forEach(function (t, i) {
      var chip = el('span', 'l48-deck-chip', t);
      deck.appendChild(chip);
      later(function () {
        if (!alive) return;
        chip.classList.add('is-on');
        popIn(chip, 0);
      }, 120 + i * 90);
    });
    wrap.appendChild(deck);
    wrap.appendChild(el('div', 'l48-cap', 'ten challenges'));
    if (!wrap.parentNode) host.appendChild(wrap);

    await sleep(1200);
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

  /* ---------------- 结业仪式（§6.13 / §6.16） ---------------- */

  function buildCeremony() {
    var layer = el('div', 'l48-ceremony');

    /* 三组金色烟花 */
    var fw = el('div', 'l48-fw');
    var spots = [[22, 30], [76, 24], [50, 42]];
    spots.forEach(function (pos, gi) {
      var group = el('div', 'l48-fw-group');
      group.style.left = pos[0] + '%';
      group.style.top = pos[1] + '%';
      group.style.animationDelay = (gi * 0.26).toFixed(2) + 's';
      for (var i = 0; i < FIREWORK_SPARKS; i += 1) {
        var spark = el('i', 'l48-fw-spark');
        spark.style.setProperty('--a', (i * (360 / FIREWORK_SPARKS)) + 'deg');
        spark.style.animationDelay = (gi * 0.26).toFixed(2) + 's';
        group.appendChild(spark);
      }
      var ring = el('i', 'l48-fw-ring');
      ring.style.animationDelay = (gi * 0.26).toFixed(2) + 's';
      group.appendChild(ring);
      fw.appendChild(group);
    });
    layer.appendChild(fw);

    /* 40 条彩带，四种形状 */
    var confetti = el('div', 'l48-confetti');
    var colors = ['#F2C14E', '#5B8BC9', '#F58FA0', '#8FD8C0', '#C7A6E8', '#FFE7A8'];
    for (var i = 0; i < CONFETTI; i += 1) {
      var bit = el('i', 'l48-bit l48-bit--' + (i % 4));
      bit.style.left = (2 + (i * 2.45) % 96) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.width = (6 + (i % 4) * 2) + 'px';
      bit.style.height = (i % 4 === 2 ? 6 : 11 + (i % 5) * 3) + 'px';
      bit.style.animationDelay = ((i % 9) * 0.11).toFixed(2) + 's';
      bit.style.animationDuration = (2.1 + (i % 6) * 0.22).toFixed(2) + 's';
      bit.style.setProperty('--spin', ((i % 2 ? 1 : -1) * (200 + i * 11)) + 'deg');
      confetti.appendChild(bit);
    }
    layer.appendChild(confetti);

    var cup = trophyNode();
    cup.classList.add('l48-cup--big', 'is-up', 'is-glow');
    layer.appendChild(cup);

    layer.appendChild(el('div', 'l48-sash l48-sash--big is-on', 'MATH MASTER'));
    return { node: layer, confetti: confetti };
  }

  function ceremony() {
    if (!alive || !currentRoot) return;
    if (document.querySelector('.l48-ceremony')) return;

    var c = buildCeremony();
    ceremonyLayer = c.node;
    currentRoot.appendChild(c.node);
    popIn(c.node);
    Engine.sfx.star();

    var waited = 0;
    var poll = setInterval(function () {
      if (!alive) { clearInterval(poll); return; }
      waited += 200;
      var playing = 0;
      var nodes = document.querySelectorAll('audio');
      for (var i = 0; i < nodes.length; i += 1) if (!nodes[i].paused) playing += 1;
      if (playing === 0 || waited > 4200) {
        clearInterval(poll);
        ctx.audio.play('lv48/t_gold');
      }
    }, 200);

    var done = false;
    function close() {
      if (done) return;
      done = true;
      clearInterval(poll);
      c.node.classList.add('is-out');
      later(function () {
        remove(c.node);
        if (ceremonyLayer === c.node) ceremonyLayer = null;
        var result = document.querySelector('.result');
        if (result && !result.querySelector('.l48-badge--sticky')) {
          var chip = el('span', 'l48-badge l48-badge--sticky', 'Math Master');
          result.appendChild(chip);
          popIn(chip);
        }
      }, 320);
    }

    later(function () {
      if (!alive || done) return;
      c.node.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        close();
      });
    }, 1200);
    later(close, 4000);
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
      var key = el('button', 'l48-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l48-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型：点选 ---------------- */

  function opText(op) {
    if (op === '+') return '+';
    if (op === '-') return '−';
    if (op === 'x') return '×';
    return '÷';
  }

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.op === '+' ? q.a + q.b
      : q.op === '-' ? q.a - q.b
        : q.op === 'x' ? q.a * q.b : q.a / q.b;

    var board = el('div', 'l48-board');
    var eq = el('div', 'l48-eq');
    eq.appendChild(el('span', 'l48-eq-n', String(q.a)));
    eq.appendChild(el('span', 'l48-eq-op', opText(q.op)));
    eq.appendChild(el('span', 'l48-eq-n', String(q.b)));
    eq.appendChild(el('span', 'l48-eq-op', '='));
    var res = el('span', 'l48-eq-n l48-eq-n--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l48-eq-n--q');
          res.classList.add('l48-eq-n--res');
          snapPop(res);
          burst(story);
          correct(key);
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

  /* ---------------- 题型：混合找错 ---------------- */

  function buildMixFault(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l48-faults');
    story.appendChild(board);

    q.sets.forEach(function (set, idx) {
      var truth = set.op === '+' ? set.a + set.b
        : set.op === '-' ? set.a - set.b
          : set.op === 'x' ? set.a * set.b : set.a / set.b;
      var bad = set.res !== truth;

      var card = el('button', 'l48-fault' + (bad ? ' l48-fault--bad' : ''));
      card.type = 'button';
      card.dataset.bad = bad ? '1' : '0';

      card.appendChild(el('span', 'l48-f-n', String(set.a)));
      card.appendChild(el('span', 'l48-f-op', opText(set.op)));
      card.appendChild(el('span', 'l48-f-n', String(set.b)));
      card.appendChild(el('span', 'l48-f-op', '='));
      var res = el('span', 'l48-f-n l48-f-n--res', String(set.res));
      card.appendChild(res);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l48-tick');
        tick.innerHTML = ICONS.check;
        card.appendChild(tick);
        popIn(tick);

        later(function () {
          if (!alive) return;
          res.classList.add('is-flip');
          later(function () {
            if (!alive) return;
            res.textContent = String(truth);
            res.classList.remove('is-flip');
            res.classList.add('is-fixed');
            snapPop(res);
            Engine.sfx.tap();
          }, 220);
        }, 240);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 760);
      });

      popIn(card, idx * 60);
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

    if (q.type === 'mixfault') buildMixFault(q, story, tray, state, correct, wrong);
    else buildTap(q, story, tray, state, correct, wrong);
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
    if (star === 'gold') later(ceremony, 520);
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
    if (ceremonyLayer) { remove(ceremonyLayer); ceremonyLayer = null; }
    Array.prototype.slice.call(document.querySelectorAll('.l48-ceremony')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[48] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
