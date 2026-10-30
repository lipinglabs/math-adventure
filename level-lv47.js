/* ============================================================
   level-lv47.js · Long Division Magic（长除法竖式 · 分步落位）
   ------------------------------------------------------------
   第五阶段第八关：48 ÷ 4 的竖式，商与被除数按位对齐，两次减式各占一行。
     教学 4 幕：① 搭架（括号 + 48 在里 / 4 在外）
                ② 十位（商 1 落下、1×4=4、4−4=0）
                ③ 个位（落下 8、8÷4=2）
                ④ 收（2×4=8、8−8=0、48÷4=12）
     答题 10 题：看竖式点结果 4 / 拖拽补商 3 / 找错误竖式 3
   铁律：所有数字是独立格子里的节点，按 grid-row / grid-column 定位；
         落位只做 transform，不重排 DOM（§5.32）；「落下 8」用同一个节点。
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

  function dropIn(node, delay) {
    return animate(node, [
      { opacity: 0, transform: 'translateY(-26px) scale(.9)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 380, delay: delay || 0, easing: 'cubic-bezier(.34,1.4,.64,1)' });
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

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.05,.95)', offset: 0.4 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 300, delay: delay || 0 });
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
        ctx.audio.play('lv47/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 竖式 ---------------- */

  function parts(a, b) {
    var q = a / b;
    return {
      a: a,
      b: b,
      q: q,
      qT: Math.floor(q / 10),
      qO: q % 10,
      sub1: Math.floor(q / 10) * b,
      bring: a % 10,
      sub2: (q % 10) * b
    };
  }

  /* opt: { mini, hideQ, missingQO, err } */
  function verticalNode(d, opt) {
    opt = opt || {};
    var p = parts(d.a, d.b);
    var root = el('div', 'l47-v' + (opt.mini ? ' l47-v--mini' : ''));

    function cell(cls, text, row, col, span, name) {
      var c = el('span', cls, text);
      c.style.gridRow = String(row);
      c.style.gridColumn = span ? (col + ' / span ' + span) : String(col);
      if (name) c.dataset.cell = name;
      root.appendChild(c);
      return c;
    }

    var bracket = el('span', 'l47-bracket');
    bracket.style.gridRow = opt.mini ? '2 / span 5' : '2 / span 7';
    bracket.style.gridColumn = '2 / span 3';
    /* 只有教学幕需要「一笔画出」，其余场景直接呈现 */
    if (!opt.draw) bracket.classList.add('is-on');
    root.appendChild(bracket);

    cell('l47-d l47-d--div', String(d.b), 2, 1, 0, 'div');
    var dt = cell('l47-d', String(Math.floor(d.a / 10)), 2, 3, 0, 'd-t');
    var dones = cell('l47-d l47-d--move', String(p.bring), 2, 4, 0, 'd-o');

    var qT = cell('l47-q' + (opt.hideQ ? ' is-ask' : ''), opt.hideQ ? '?' : String(p.qT), 1, 3, 0, 'q-t');
    var qO = cell('l47-q' + (opt.missingQO ? ' is-slot' : opt.hideQ ? ' is-ask' : ''),
      opt.missingQO || opt.hideQ ? '?' : String(p.qO), 1, 4, 0, 'q-o');

    var sub1 = cell('l47-d l47-sub', String(p.sub1), 3, 3, 0, 'sub1');
    var rule1 = el('span', 'l47-rule');
    rule1.style.gridRow = '4';
    rule1.style.gridColumn = '3 / span 2';
    if (!opt.draw) rule1.classList.add('is-on');
    root.appendChild(rule1);

    var rem = cell('l47-d l47-rem', '0', 5, 3, 0, 'rem');

    var bringText = String(p.bring);
    if (opt.err === 'bring') bringText = String(Math.floor(d.a / 10));
    /* 教学幕里 bring 先叠在被除数个位（那一格），幕三再滑下来；其余场景直接放在落位行 */
    var bring = cell('l47-d l47-d--move', bringText, opt.bringAtTop ? 2 : 5, 4, 0, 'bring');

    var sub2Text = String(p.sub2);
    if (opt.err === 'sub') sub2Text = String(p.sub2 - 2);
    var sub2 = cell('l47-d l47-sub', sub2Text, 6, 4, 0, 'sub2');

    var rule2 = null;
    var final = null;
    if (!opt.mini) {
      rule2 = el('span', 'l47-rule');
      rule2.style.gridRow = '7';
      rule2.style.gridColumn = '4';
      if (!opt.draw) rule2.classList.add('is-on');
      root.appendChild(rule2);
      final = cell('l47-d l47-final', '0', 8, 4, 0, 'final');
      if (opt.draw) final.classList.add('is-hidden');
    }

    return {
      node: root, p: p, qT: qT, qO: qO, sub1: sub1, rem: rem,
      bring: bring, sub2: sub2, dones: dones, dt: dt, bracket: bracket,
      rule1: rule1, rule2: rule2, final: final
    };
  }

  /* 同一节点换格子：先量、改 grid-area、再 FLIP 补间（§5.32） */
  function moveCell(node, row, col) {
    var first = node.getBoundingClientRect();
    node.style.gridRow = String(row);
    node.style.gridColumn = String(col);
    var last = node.getBoundingClientRect();
    var dx = first.left - last.left;
    var dy = first.top - last.top;
    return animate(node, [
      { transform: 'translate(' + dx + 'px,' + dy + 'px)' },
      { transform: 'translate(0px,0px)' }
    ], { duration: 520, easing: 'cubic-bezier(.32,.06,.36,1)' });
  }

  /* ---------------- 教学 ---------------- */

  var V = null;

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l47-teach');
    V = verticalNode({ a: 48, b: 4 }, { hideQ: true, bringAtTop: true, draw: true });
    /* 幕一只露括号、除数、被除数；商与步骤先藏起来 */
    [V.sub1, V.rem, V.sub2, V.rule1].forEach(function (n) {
      n.classList.add('is-hidden');
    });
    wrap.appendChild(V.node);
    host.appendChild(wrap);

    await popIn(V.node);
    if (!alive) return;
    var v = saySeq(['t1_a']);
    later(function () {
      if (!alive) return;
      V.bracket.classList.add('is-on');
      Engine.sfx.tap();
    }, 260);
    await v;
    if (!alive) return;
    await sleep(260);
  }

  async function sceneTwo(host) {
    host.dataset.scene = 'two';
    V.qT.textContent = '1';
    V.qT.classList.remove('is-ask');
    dropIn(V.qT);
    var v = saySeq(['t1_b']);
    await sleep(320);
    if (!alive) return;

    later(function () {
      if (!alive) return;
      V.sub1.classList.remove('is-hidden');
      dropIn(V.sub1);
      Engine.sfx.tap();
    }, 900);

    later(function () {
      if (!alive) return;
      V.rule1.classList.remove('is-hidden');
      V.rule1.classList.add('is-on');
    }, 1400);

    later(function () {
      if (!alive) return;
      V.rem.classList.remove('is-hidden');
      popIn(V.rem);
      Engine.sfx.tap();
    }, 1650);

    await v;
    await saySeq(['t1_c']);
    if (!alive) return;
    await sleep(220);
  }

  async function sceneThree(host) {
    host.dataset.scene = 'three';
    var v = saySeq(['t1_d']);
    await sleep(300);
    if (!alive) return;

    /* 「落下 8」：被除数里那个 8 同一个节点滑到下一行，原格留一份（同一批节点，不复制） */
    await moveCell(V.bring, 5, 4);
    Engine.sfx.tap();
    if (!alive) return;

    await sleep(120);
    V.qO.textContent = '2';
    V.qO.classList.remove('is-ask');
    dropIn(V.qO);
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(240);
  }

  async function sceneFour(host) {
    host.dataset.scene = 'four';
    V.sub2.classList.remove('is-hidden');
    dropIn(V.sub2);
    Engine.sfx.tap();
    var v = saySeq(['t1_e1']);

    later(function () {
      if (!alive) return;
      if (V.rule2) V.rule2.classList.add('is-on');
    }, 900);

    later(function () {
      if (!alive || !V.final) return;
      V.final.classList.remove('is-hidden');
      V.final.classList.add('is-on');
      popIn(V.final);
    }, 1150);

    await v;
    if (!alive) return;

    var chip = el('div', 'l47-eq');
    chip.appendChild(el('span', 'l47-eq-n', '48'));
    chip.appendChild(el('span', 'l47-eq-op', '÷'));
    chip.appendChild(el('span', 'l47-eq-n', '4'));
    chip.appendChild(el('span', 'l47-eq-op', '='));
    var res = el('span', 'l47-eq-n l47-eq-n--res', '12');
    chip.appendChild(res);
    V.node.parentNode.appendChild(chip);
    chip.classList.add('is-on');
    popIn(chip);
    snapPop(res);
    Engine.sfx.star();

    await saySeq(['t1_e2']);
    if (!alive) return;
    await sleep(320);
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
      var key = el('button', 'l47-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l47-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：看竖式点结果 ---------------- */

  function buildTake(q, story, tray, state, correct, wrong) {
    var p = parts(q.a, q.b);

    var board = el('div', 'l47-board');
    var v = verticalNode(q, { hideQ: true });
    board.appendChild(v.node);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === p.q) {
          state.busy = true;
          v.qT.textContent = String(p.qT);
          v.qT.classList.remove('is-ask');
          v.qT.classList.add('is-on');
          dropIn(v.qT);
          later(function () {
            if (!alive) return;
            v.qO.textContent = String(p.qO);
            v.qO.classList.remove('is-ask');
            v.qO.classList.add('is-on');
            dropIn(v.qO);
            Engine.sfx.tap();
          }, 160);
          burst(story);
          correct(key, NEXT_MS + 260);
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

  /* ---------------- 题型 B：拖拽补商 ---------------- */

  function buildFillQ(q, story, tray, state, correct, wrong) {
    var p = parts(q.a, q.b);

    var board = el('div', 'l47-board');
    var v = verticalNode(q, { missingQO: true });
    board.appendChild(v.node);
    story.appendChild(board);
    popIn(board);

    var slot = v.qO;
    var answer = p.qO;
    var placed = false;

    var pool = el('div', 'l47-pool');
    var chips = Engine.quiz.shuffle(q.pool.slice());
    story.appendChild(pool);

    function finish(chip) {
      if (placed || state.locked) return;
      placed = true;
      chip.classList.add('is-used');
      slot.textContent = String(answer);
      slot.classList.remove('is-slot');
      slot.classList.add('is-on');
      snapPop(slot);
      Engine.sfx.tap();
      burst(story);
      correct(null, NEXT_MS + 160);
    }

    function reject(chip) {
      chip.classList.add('is-wrong');
      later(function () { chip.classList.remove('is-wrong'); }, 420);
    }

    function tryValue(value, chip) {
      if (placed || state.locked || state.busy) return;
      if (value === answer) { finish(chip); return; }
      /* 放错只弹回、不记错（§5.9.3） */
      reject(chip);
      bounce(chip);
      Engine.sfx.deny();
      shake(slot);
    }

    chips.forEach(function (value, i) {
      var chip = el('button', 'l47-chip');
      chip.type = 'button';
      chip.dataset.value = String(value);
      chip.setAttribute('aria-label', String(value));
      chip.appendChild(el('span', 'l47-chip-n', String(value)));
      chip.addEventListener('click', function () { tryValue(value, chip); });
      popIn(chip, i * 50);
      pool.appendChild(chip);
    });

    var drag = null;
    var ghost = null;

    function pointOf(e) {
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      return { x: t.clientX || 0, y: t.clientY || 0 };
    }

    function nearest(p) {
      var r = slot.getBoundingClientRect();
      var inside = p.x >= r.left - HIT_PAD && p.x <= r.right + HIT_PAD &&
        p.y >= r.top - HIT_PAD && p.y <= r.bottom + HIT_PAD;
      return inside;
    }

    function startDrag(e, chip) {
      var p = pointOf(e);
      drag = { chip: chip, x0: p.x, y0: p.y, moved: false };
    }

    function moveDrag(e) {
      if (!drag) return;
      var p = pointOf(e);
      if (!drag.moved) {
        if (Math.abs(p.x - drag.x0) < 8 && Math.abs(p.y - drag.y0) < 8) return;
        drag.moved = true;
        ghost = drag.chip.cloneNode(true);
        ghost.classList.add('l47-ghost');
        ghost.style.width = drag.chip.offsetWidth + 'px';
        ghost.style.height = drag.chip.offsetHeight + 'px';
        document.body.appendChild(ghost);
        drag.chip.style.opacity = '.35';
      }
      ghost.style.transform = 'translate(' + (p.x - ghost.offsetWidth / 2) + 'px,' +
        (p.y - ghost.offsetHeight / 2) + 'px)';
      slot.classList.toggle('is-hot', nearest(p));
    }

    function endDrag(e) {
      if (!drag) return;
      var p = pointOf(e);
      var chip = drag.chip;
      var moved = drag.moved;
      drag = null;
      remove(ghost);
      ghost = null;
      chip.style.opacity = '';
      slot.classList.remove('is-hot');
      if (!moved) { tryValue(Number(chip.dataset.value), chip); return; }
      if (nearest(p)) tryValue(Number(chip.dataset.value), chip);
      else bounce(chip);
    }

    pool.addEventListener('pointerdown', function (e) {
      var chip = e.target.closest ? e.target.closest('.l47-chip') : null;
      if (chip) startDrag(e, chip);
    });
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

    popIn(pool);
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：找错误竖式 ---------------- */

  function buildFault(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l47-faults');
    story.appendChild(board);

    q.sets.forEach(function (set, idx) {
      var bad = !!set.err;
      var card = el('button', 'l47-fault' + (bad ? ' l47-fault--bad' : ''));
      card.type = 'button';
      card.dataset.err = set.err || '';

      var v = verticalNode(set, { mini: true, err: set.err });
      card.appendChild(v.node);

      var tag = el('span', 'l47-fault-tag', String(set.a) + ' ÷ ' + String(set.b));
      card.appendChild(tag);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l47-tick');
        tick.innerHTML = ICONS.check;
        card.appendChild(tick);
        popIn(tick);

        var target = set.err === 'sub' ? v.sub2 : v.bring;
        var fixed = set.err === 'sub'
          ? String((set.a / set.b % 10) * set.b)
          : String(set.a % 10);
        later(function () {
          if (!alive) return;
          target.classList.add('is-flip');
          later(function () {
            if (!alive) return;
            target.textContent = fixed;
            target.classList.remove('is-flip');
            target.classList.add('is-fixed');
            snapPop(target);
            Engine.sfx.tap();
          }, 220);
        }, 240);

        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 900);
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

    if (q.type === 'take') buildTake(q, story, tray, state, correct, wrong);
    else if (q.type === 'fillq') buildFillQ(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l47-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[47] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
