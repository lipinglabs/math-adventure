/* ============================================================
   level-lv39.js · Stage 4 Finale（四阶结业）
   ------------------------------------------------------------
   第四阶段最后一关：把阵列、糖串、转盘过一遍，再打一场混排大考。
     教学 4 幕：① 三块回顾面板（阵列 / 糖串 / 转盘）依次扫过
                ② 玫瑰金奖杯从底部升起
                ③ 奖杯定格 + STAGE 4 绶带 + 一次性光环
                ④ 挑战邀请徽标
     答题 10 题：混合点选 4 / 看阵列选算式 3 / 混合挑错 3
     金星：常规结算 + 四阶结业仪式（§6.16，与三阶刻意可区分）
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var CONFETTI = 32;
  var gid = 0;

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
    bolt:
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path d="M13.4 2 5 13.4h5.2L9.8 22 19 10.6h-5.4z" fill="currentColor"/></svg>'
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
        ctx.audio.play('lv39/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 玫瑰金奖杯（三层阶梯底座 + 两侧星章，§6.16） ---------------- */

  function trophySvg() {
    gid += 1;
    var a = 'l39g' + gid;
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 120 148');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML =
      '<defs>' +
      '<linearGradient id="' + a + 'b" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#FFD9C6"/><stop offset="46%" stop-color="#F2A98B"/>' +
      '<stop offset="100%" stop-color="#C96A4A"/></linearGradient>' +
      '<linearGradient id="' + a + 'h" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#FFC2A8"/><stop offset="100%" stop-color="#B85C3E"/></linearGradient>' +
      '</defs>' +
      /* 双耳 */
      '<path d="M30 26c-12 2-16 12-12 22 3 8 10 12 18 13" fill="none" stroke="url(#' + a + 'h)" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M90 26c12 2 16 12 12 22-3 8-10 12-18 13" fill="none" stroke="url(#' + a + 'h)" stroke-width="6" stroke-linecap="round"/>' +
      /* 杯身 */
      '<path d="M28 16h64v20c0 24-14 38-32 38S28 60 28 36z" fill="url(#' + a + 'b)"/>' +
      /* 杯口 */
      '<ellipse cx="60" cy="16" rx="32" ry="6" fill="#FFE6D8" stroke="rgba(190,100,70,.4)" stroke-width="1.5"/>' +
      /* 高光带 */
      '<path d="M40 24c2 16 6 26 14 34" fill="none" stroke="rgba(255,255,255,.62)" stroke-width="5" stroke-linecap="round"/>' +
      /* 杯柄 */
      '<rect x="54" y="72" width="12" height="14" rx="4" fill="url(#' + a + 'h)"/>' +
      /* 三层阶梯底座 */
      '<rect x="40" y="86" width="40" height="9" rx="4" fill="#E9946F"/>' +
      '<rect x="32" y="95" width="56" height="10" rx="4" fill="#D97E59"/>' +
      '<rect x="24" y="105" width="72" height="12" rx="5" fill="#B85C3E"/>' +
      /* 两侧星章 */
      '<path d="M14 92l2.6 5.4 5.9.7-4.4 4.1 1.2 5.9L14 105.4l-5.3 2.7 1.2-5.9-4.4-4.1 5.9-.7z" fill="#FFC2A8"/>' +
      '<path d="M106 92l2.6 5.4 5.9.7-4.4 4.1 1.2 5.9L106 105.4l-5.3 2.7 1.2-5.9-4.4-4.1 5.9-.7z" fill="#FFC2A8"/>';
    return svg;
  }

  function trophyNode() {
    var box = el('div', 'l39-cup');
    box.appendChild(trophySvg());
    return box;
  }

  /* ---------------- 回顾面板（阵列 / 糖串 / 转盘） ---------------- */

  function miniArray() {
    var box = el('div', 'l39-mini l39-mini--array');
    for (var r = 0; r < 3; r += 1) {
      var row = el('div', 'l39-mini-row');
      for (var c = 0; c < 4; c += 1) row.appendChild(el('span', 'l39-mini-block'));
      box.appendChild(row);
    }
    return box;
  }

  function miniCandy() {
    var box = el('div', 'l39-mini l39-mini--candy');
    for (var i = 0; i < 3; i += 1) {
      var str = el('div', 'l39-mini-string');
      for (var k = 0; k < 5; k += 1) str.appendChild(el('span', 'l39-mini-dot'));
      box.appendChild(str);
    }
    return box;
  }

  function miniWheel() {
    var box = el('div', 'l39-mini l39-mini--wheel');
    for (var i = 0; i < 8; i += 1) {
      var seg = el('span', 'l39-mini-seg');
      seg.style.transform = 'rotate(' + (i * 45) + 'deg)';
      box.appendChild(seg);
    }
    var hub = el('span', 'l39-mini-hub', '×');
    box.appendChild(hub);
    return box;
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l39-teach');
    var row = el('div', 'l39-review');
    var panels = [
      { node: miniArray(), cap: 'arrays' },
      { node: miniCandy(), cap: 'patterns' },
      { node: miniWheel(), cap: 'tables' }
    ];
    panels.forEach(function (p) {
      var card = el('div', 'l39-review-card');
      card.appendChild(p.node);
      card.appendChild(el('span', 'l39-review-cap', p.cap));
      row.appendChild(card);
      p.card = card;
    });
    wrap.appendChild(row);
    host.appendChild(wrap);
    await popIn(row);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(400);
    for (var i = 0; i < panels.length; i += 1) {
      panels[i].card.classList.add('is-on');
      bounce(panels[i].card);
      Engine.sfx.tap();
      await sleep(420);
      if (!alive) return;
    }
    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l39-teach');
    var cup = trophyNode();
    wrap.appendChild(cup);
    host.appendChild(wrap);

    await saySeq(['t1_b']);
    if (!alive) return;
    cup.classList.add('is-up');
    Engine.sfx.star();
    await sleep(720);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l39-teach');
    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow');
    wrap.appendChild(cup);
    var ribbon = el('div', 'l39-ribbon', 'STAGE 4');
    wrap.appendChild(ribbon);
    var halo = el('span', 'l39-halo');
    wrap.appendChild(halo);
    host.appendChild(wrap);
    popIn(cup);

    await saySeq(['t1_c']);
    if (!alive) return;
    halo.classList.add('is-burst');
    await sleep(260);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l39-teach');
    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow');
    wrap.appendChild(cup);
    wrap.appendChild(el('div', 'l39-ribbon', 'STAGE 4'));
    var badge = el('div', 'l39-badge');
    badge.innerHTML = ICONS.bolt + '<span>final challenge</span>';
    wrap.appendChild(badge);
    host.appendChild(wrap);
    popIn(cup);
    popIn(badge);

    await saySeq(['t1_d']);
    if (!alive) return;
    snapPop(badge);
    Engine.sfx.star();
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
      var key = el('button', 'l39-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l39-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：混合表内点选 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l39-board');
    var eq = el('div', 'l39-eq l39-eq--big');
    eq.appendChild(el('span', 'l39-tile', String(q.a)));
    eq.appendChild(el('span', 'l39-op', '×'));
    eq.appendChild(el('span', 'l39-tile', String(q.b)));
    eq.appendChild(el('span', 'l39-op', '='));
    var res = el('span', 'l39-tile l39-tile--q', '?');
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
          res.classList.remove('l39-tile--q');
          res.classList.add('l39-tile--res');
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

    tray.classList.add('l39-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：看阵列选算式 ---------------- */

  function buildPick(q, story, tray, state, correct, wrong) {
    var total = q.r * q.c;

    var board = el('div', 'l39-board');
    var grid = el('div', 'l39-grid');
    for (var r = 0; r < q.r; r += 1) {
      var row = el('div', 'l39-grid-row');
      for (var c = 0; c < q.c; c += 1) row.appendChild(el('span', 'l39-block'));
      grid.appendChild(row);
    }
    board.appendChild(grid);
    story.appendChild(board);
    popIn(board);

    function paint() {
      tray.innerHTML = '';
      Engine.quiz.shuffle(q.options.slice()).forEach(function (opt, i) {
        var btn = el('button', 'l39-opt');
        btn.type = 'button';
        btn.dataset.key = opt[0] + 'x' + opt[1];
        btn.setAttribute('aria-label', opt[0] + ' times ' + opt[1]);
        btn.appendChild(el('span', 'l39-opt-n', String(opt[0])));
        btn.appendChild(el('span', 'l39-opt-x', '×'));
        btn.appendChild(el('span', 'l39-opt-n', String(opt[1])));
        btn.addEventListener('click', function () {
          if (state.locked || state.busy) return;
          var good = opt[2] === total &&
            ((opt[0] === q.r && opt[1] === q.c) || (opt[0] === q.c && opt[1] === q.r));
          if (!good) { wrong(btn); return; }
          state.busy = true;
          btn.classList.add('is-right');
          snapPop(btn);
          burst(board);
          correct(null);
        });
        popIn(btn, i * 50);
        tray.appendChild(btn);
      });
    }

    tray.classList.add('l39-tray', 'l39-tray--row');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：混合算式挑错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      var truth = s.sign === '×' ? s.a * s.b : s.a + s.b;
      return { s: s, bad: truth !== s.shown };
    }));

    var board = el('div', 'l39-cards');
    story.appendChild(board);

    list.forEach(function (item, i) {
      var s = item.s;
      var card = el('button', 'l39-card');
      card.type = 'button';
      card.dataset.key = s.a + s.sign + s.b + '=' + s.shown;
      card.setAttribute('aria-label', s.a + ' ' + (s.sign === '×' ? 'times' : 'plus') + ' ' + s.b + ' equals ' + s.shown);
      var row = el('div', 'l39-eq l39-eq--small');
      row.appendChild(el('span', 'l39-tile l39-tile--sm', String(s.a)));
      row.appendChild(el('span', 'l39-op', s.sign));
      row.appendChild(el('span', 'l39-tile l39-tile--sm', String(s.b)));
      row.appendChild(el('span', 'l39-op', '='));
      var res = el('span', 'l39-tile l39-tile--sm l39-tile--ans', String(s.shown));
      row.appendChild(res);
      card.appendChild(row);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l39-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.sign === '×' ? s.a * s.b : s.a + s.b);
          res.classList.remove('is-flip', 'l39-tile--ans');
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

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 结业仪式（§6.16） ---------------- */

  function buildCeremony() {
    var layer = el('div', 'l39-ceremony');

    var halo = el('span', 'l39-ceremony-halo');
    layer.appendChild(halo);
    later(function () { halo.classList.add('is-burst'); }, 520);

    var confetti = el('div', 'l39-confetti');
    var colors = ['#F58FA0', '#7FC7E8', '#F7C063', '#8FD8C0', '#C7A6E8', '#F2A93B'];
    for (var i = 0; i < CONFETTI; i += 1) {
      var bit = el('i', 'l39-bit l39-bit--' + (i % 3));
      bit.style.left = (3 + (i * 3.1) % 94) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.width = (5 + (i % 4) * 2) + 'px';
      bit.style.height = (i % 3 === 2 ? 8 : 10 + (i % 5) * 4) + 'px';
      bit.style.animationDelay = ((i % 8) * 0.12).toFixed(2) + 's';
      bit.style.animationDuration = (1.7 + (i % 5) * 0.26).toFixed(2) + 's';
      bit.style.setProperty('--spin', ((i % 2 ? 1 : -1) * (180 + i * 13)) + 'deg');
      confetti.appendChild(bit);
    }
    layer.appendChild(confetti);

    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow', 'l39-cup--big');
    layer.appendChild(cup);

    layer.appendChild(el('div', 'l39-ribbon l39-ribbon--big', 'STAGE 4'));

    return { node: layer, confetti: confetti };
  }

  function ceremony() {
    if (!alive || !currentRoot) return;
    if (document.querySelector('.l39-ceremony')) return;

    var c = buildCeremony();
    ceremonyLayer = c.node;
    currentRoot.appendChild(c.node);
    popIn(c.node);
    Engine.sfx.star();

    /* 常规金星语音播完再播结业语音（只允许一条在播） */
    var waited = 0;
    var poll = setInterval(function () {
      if (!alive) { clearInterval(poll); return; }
      waited += 200;
      var playing = 0;
      var nodes = document.querySelectorAll('audio');
      for (var i = 0; i < nodes.length; i += 1) if (!nodes[i].paused) playing += 1;
      if (playing === 0 || waited > 4200) {
        clearInterval(poll);
        ctx.audio.play('lv39/t_gold');
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
        if (result && !result.querySelector('.l39-badge--sticky')) {
          var chip = el('span', 'l39-badge l39-badge--sticky', 'STAGE 4');
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

    if (q.type === 'tap') buildTap(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
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
    if (ceremonyLayer) { remove(ceremonyLayer); ceremonyLayer = null; }
    if (tapFinish) { tapFinish(); tapFinish = null; }
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[39] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
