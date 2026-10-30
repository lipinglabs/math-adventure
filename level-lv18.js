/* ============================================================
   level-lv18.js · Split It（数字拆分填空 · 进位加法）
   ------------------------------------------------------------
   第三阶段第三关：把「拆数凑十」这件事单独拎出来练。
     教学 3 幕：① 8 + 5 = ? + 两个十格阵（一个 8、一个空）
                ② 5 被劈成 2 和 3 → 8 + 2 = 10 → 10 + 3 = 13
                ③ 竖式 8 + 5，5 拆成 2 和 3，2 飞向 8 凑成 10
     答题 10 题（整份打乱，三种题型）：
       splitfill 分步填空：先填「凑十要几个」，再填「还剩几个」（4 题）
       pick      听算式，点出对应的拆解图（3 题）
       calc      直接点选结果（3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         分步填空按 §6.15（左空先、右空后，第一空错了不进第二空）；
         七选三按 §6.5 / §6.14（干扰图的拆解和不得等于目标）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;             // 答对到下一题
  var SPLIT_HOLD = 900;          // 两空填完后定格

  /* ---------------- 图标 ---------------- */

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

  /* ---------------- 状态 ---------------- */

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

  /* ---------------- 语音链（§6.7 独占） ---------------- */

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
        ctx.audio.play('lv18/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 数字块 ---------------- */

  function tile(text, cls) {
    return el('span', 'l18-tile' + (cls ? ' ' + cls : ''), text);
  }

  function op(text) {
    return el('span', 'l18-op', text);
  }

  function blank(cls) {
    return el('span', 'l18-tile l18-blank' + (cls ? ' ' + cls : ''), '?');
  }

  /* ---------------- 教学第一幕：两个十格阵 ---------------- */

  function miniFrame(filled, cls) {
    var box = el('div', 'tenframe l18-frame' + (cls ? ' ' + cls : ''));
    for (var i = 0; i < 10; i += 1) {
      var c = el('div', 'tf-cell');
      if (i < filled) {
        c.classList.add('is-on');
        var dot = el('span', 'l18-dot');
        c.appendChild(dot);
      }
      box.appendChild(c);
    }
    return box;
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l18-teach');

    var eq = el('div', 'l18-eq');
    eq.appendChild(tile('8'));
    eq.appendChild(op('+'));
    eq.appendChild(tile('5'));
    eq.appendChild(op('='));
    eq.appendChild(blank());
    wrap.appendChild(eq);

    var frames = el('div', 'l18-frames');
    var f1 = miniFrame(8);
    var f2 = miniFrame(0, 'is-ghost');
    frames.appendChild(f1);
    frames.appendChild(f2);
    wrap.appendChild(frames);

    host.appendChild(wrap);
    popIn(eq);
    popIn(frames, 120);

    // Remember how to make a ten?
    await saySeq(['t1_q']);
    if (!alive) return;
    await sleep(1000);                      // 问句后停 1 秒再自答（§6.1）
    if (!alive) return;

    // Eight needs two more to fill the box.
    f1.classList.add('is-need');
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);
  }

  /* ---------------- 教学第二幕：把 5 劈成 2 和 3 ---------------- */

  function splitBoard() {
    var box = el('div', 'l18-split');

    var five = el('span', 'l18-big', '5');
    box.appendChild(five);

    var left = el('span', 'l18-chip l18-chip--l', '2');
    var right = el('span', 'l18-chip l18-chip--r', '3');
    box.appendChild(left);
    box.appendChild(right);

    var l1 = el('i', 'l18-leg l18-leg--l');
    var l2 = el('i', 'l18-leg l18-leg--r');
    box.appendChild(l1);
    box.appendChild(l2);

    return { node: box, five: five, left: left, right: right, legs: [l1, l2] };
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l18-teach');

    var eq = el('div', 'l18-eq');
    var q = blank();
    eq.appendChild(tile('8'));
    eq.appendChild(op('+'));
    eq.appendChild(tile('5'));
    eq.appendChild(op('='));
    eq.appendChild(q);
    wrap.appendChild(eq);

    var sp = splitBoard();
    wrap.appendChild(sp.node);

    var steps = el('div', 'l18-steps');
    var s1 = el('div', 'l18-step');
    s1.appendChild(tile('8'));
    s1.appendChild(op('+'));
    s1.appendChild(tile('2'));
    s1.appendChild(op('='));
    s1.appendChild(tile('10', 'l18-ten'));
    var s2 = el('div', 'l18-step');
    s2.appendChild(tile('10'));
    s2.appendChild(op('+'));
    s2.appendChild(tile('3'));
    s2.appendChild(op('='));
    s2.appendChild(tile('13', 'l18-ten'));
    s1.classList.add('is-hidden');
    s2.classList.add('is-hidden');
    steps.appendChild(s1);
    steps.appendChild(s2);
    wrap.appendChild(steps);

    host.appendChild(wrap);
    popIn(eq);
    popIn(sp.node, 100);

    // So, we split five into two and three.
    var voice = saySeq(['t2_a']);
    await sleep(950);
    if (!alive) return;

    sp.five.classList.add('is-crack');      // 先裂一道缝
    await sleep(260);
    if (!alive) return;

    sp.five.classList.add('is-out');
    sp.legs.forEach(function (l, i) { l.classList.add('is-on'); popIn(l, i * 90); });
    popIn(sp.left);
    popIn(sp.right, 110);
    Engine.sfx.tap();

    await voice;
    if (!alive) return;
    await sleep(1000);                      // 停顿 1 秒

    // Eight plus two equals ten. And ten plus three equals thirteen.
    var v2 = saySeq(['t2_b']);
    await sleep(900);
    if (!alive) return;
    s1.classList.remove('is-hidden');
    popIn(s1);
    Engine.sfx.tap();
    await sleep(1900);
    if (!alive) return;
    s2.classList.remove('is-hidden');
    popIn(s2);
    Engine.sfx.tap();

    await v2;
    if (!alive) return;
    await sleep(260);

    // Eight plus five equals thirteen!
    var v3 = saySeq(['t2_c']);
    q.textContent = '13';
    q.classList.remove('l18-blank');
    q.classList.add('l18-filled');
    popIn(q);
    await v3;
    if (!alive) return;
    await sleep(320);
  }

  /* ---------------- 教学第三幕：竖式里拆 5 ---------------- */

  function vsum() {
    var box = el('div', 'l18-vsum');
    var nums = el('div', 'l18-vnums');

    function row(items) {
      var r = el('div', 'l18-vrow');
      items.forEach(function (it) { r.appendChild(it); });
      nums.appendChild(r);
      return r;
    }

    var a = tile('8', 'l18-vnum');
    var b = tile('5', 'l18-vnum');
    var plus = tile('+', 'l18-vnum l18-vplus');
    var res = tile('?', 'l18-vnum l18-vq');

    row([tile('', 'l18-vnum'), a]);
    row([plus, b]);
    nums.appendChild(el('div', 'l18-vline'));
    row([tile('', 'l18-vnum'), res]);

    var chips = el('div', 'l18-vchips');
    var c2 = el('span', 'l18-chip l18-chip--mini', '2');
    var c3 = el('span', 'l18-chip l18-chip--mini', '3');
    chips.appendChild(c2);
    chips.appendChild(c3);

    box.appendChild(nums);
    box.appendChild(chips);

    return { node: box, a: a, b: b, res: res, chips: chips, c2: c2, c3: c3 };
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var v = vsum();
    host.appendChild(v.node);
    popIn(v.node);

    // When we add, we split the number to make a ten first.
    var v1 = saySeq(['t3_a']);
    await sleep(900);
    if (!alive) return;

    v.chips.classList.add('is-on');
    popIn(v.c2);
    popIn(v.c3, 110);
    Engine.sfx.tap();

    await sleep(600);
    if (!alive) return;

    // 2 飞向 8，凑成 10
    var cb = v.c2.getBoundingClientRect();
    var ab = v.a.getBoundingClientRect();
    var dx = Math.round((ab.left + ab.width / 2) - (cb.left + cb.width / 2));
    var dy = Math.round((ab.top + ab.height / 2) - (cb.top + cb.height / 2));
    await animate(v.c2, [
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(' + Math.round(dx * 0.5) + 'px,' + (Math.round(dy * 0.5) - 16) + 'px) scale(1.1)', offset: 0.5 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.72)', opacity: 0.15 }
    ], { duration: 700, easing: 'cubic-bezier(.34,.8,.4,1)' });
    if (!alive) return;
    v.c2.classList.add('is-gone');

    var badge = el('span', 'l18-tenbadge', '10');
    v.node.appendChild(badge);
    var nodeBox = v.node.getBoundingClientRect();
    badge.style.left = Math.round(ab.left - nodeBox.left + ab.width / 2) + 'px';
    badge.style.top = Math.round(ab.top - nodeBox.top) + 'px';
    popIn(badge);
    v.a.classList.add('is-ten');
    bounce(v.a);
    Engine.sfx.tap();

    await v1;
    if (!alive) return;
    await sleep(200);

    // Then we add the rest.
    var v2 = saySeq(['t3_b']);
    await sleep(420);
    if (!alive) return;

    var cb3 = v.c3.getBoundingClientRect();
    var rb = v.res.getBoundingClientRect();
    var dx3 = Math.round((rb.left + rb.width / 2) - (cb3.left + cb3.width / 2));
    var dy3 = Math.round((rb.top + rb.height / 2) - (cb3.top + cb3.height / 2));
    await animate(v.c3, [
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(' + Math.round(dx3 * 0.5) + 'px,' + (Math.round(dy3 * 0.5) + 14) + 'px) scale(1.1)', offset: 0.5 },
      { transform: 'translate(' + dx3 + 'px,' + dy3 + 'px) scale(.72)', opacity: 0.15 }
    ], { duration: 700, easing: 'cubic-bezier(.34,.8,.4,1)' });
    if (!alive) return;
    v.c3.classList.add('is-gone');
    later(function () { v.chips.classList.add('is-empty'); }, 260);

    v.res.textContent = '13';
    v.res.classList.remove('l18-vq');
    v.res.classList.add('l18-vres');
    popIn(v.res);
    snapPop(v.res);
    Engine.sfx.tap();

    await v2;
    if (!alive) return;
    await sleep(320);
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
      var key = el('button', 'l18-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l18-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：分步填空 ---------------- */

  function buildSplitFill(q, story, tray, state, correct, wrong) {
    var need = 10 - q.a;              // 凑十要几个
    var rest = q.b - need;            // 还剩几个
    var total = q.a + q.b;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var wrap = el('div', 'l18-teach l18-teach--quiz');

    var eq = el('div', 'l18-eq');
    var res = blank('l18-q');
    eq.appendChild(tile(String(q.a)));
    eq.appendChild(op('+'));
    eq.appendChild(tile(String(q.b)));
    eq.appendChild(op('='));
    eq.appendChild(res);
    wrap.appendChild(eq);

    var split = el('div', 'l18-eq l18-eq--split');
    var leftBlank = blank('l18-q l18-q--left');
    var rightBlank = blank('l18-q l18-q--right');
    split.appendChild(tile(String(q.b)));
    split.appendChild(op('='));
    split.appendChild(leftBlank);
    split.appendChild(op('+'));
    split.appendChild(rightBlank);
    wrap.appendChild(split);

    story.appendChild(wrap);
    popIn(eq);
    popIn(split, 90);

    state.step = 'left';
    leftBlank.classList.add('is-active');

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (key.classList.contains('is-used')) return;

        if (state.step === 'left') {
          if (value === need) {
            leftBlank.textContent = String(value);
            leftBlank.classList.remove('l18-blank', 'is-active');
            leftBlank.classList.add('l18-filled');
            snapPop(leftBlank);
            key.classList.add('is-used');
            Engine.sfx.tap();
            state.step = 'right';                 // 焦点移到右空（§6.15）
            rightBlank.classList.add('is-active');
            bounce(rightBlank);
            later(function () { saySeq(['a_more_q']); }, 220);
            return;
          }
          wrong(key);
          later(function () {
            Engine.quiz.reshuffle(options, need, function (v) { return String(v); });
            state.busy = false;
            renderKeys();
          }, 320);
          return;
        }

        if (value === rest) {
          rightBlank.textContent = String(value);
          rightBlank.classList.remove('l18-blank', 'is-active');
          rightBlank.classList.add('l18-filled');
          snapPop(rightBlank);
          key.classList.add('is-used');
          res.textContent = String(total);
          res.classList.remove('l18-blank');
          res.classList.add('l18-filled');
          later(function () {
            popIn(res);
            Engine.sfx.correct();
            later(function () { Engine.sfx.star(); }, 90);
            burst(story);
          }, 220);
          correct(null, SPLIT_HOLD);
          return;
        }

        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, rest, function (v) { return String(v); });
          state.busy = false;
          renderKeys();
        }, 320);
      });

      // 重排后要把第一步已经用掉的那个键重新压暗，否则它能被再点一次
      if (state.step === 'right') {
        Array.prototype.slice.call(tray.querySelectorAll('.l18-key')).forEach(function (k) {
          if (Number(k.dataset.value) === need) k.classList.add('is-used');
        });
      }
    }

    function paint() {
      if (shown || !alive) return;
      shown = true;
      renderKeys();
    }

    makeReplay(story, function () {
      return state.step === 'left' ? q.voice.concat(['a_ask_q']) : ['a_more_q'];
    });

    paint();
    saySeq(q.voice.concat(['a_ask_q']));
  }

  /* ---------------- 题型 B：听算式点拆解图 ---------------- */

  function splitCard(g) {
    var card = el('button', 'l18-pick');
    card.type = 'button';
    card.dataset.key = g.join('+');
    card.setAttribute('aria-label', g.join(' plus '));

    g.forEach(function (n, i) {
      if (i > 0) card.appendChild(op('+'));
      card.appendChild(tile(String(n)));
    });
    return card;
  }

  function buildPick(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.cards.map(function (c) { return c.slice(); }));
    var keyOf = function (c) { return c.join('+'); };
    var targetKey = keyOf(q.cards[q.answer]);
    var targetItem = list.filter(function (c) { return keyOf(c) === targetKey; })[0];

    var board = el('div', 'l18-picks');
    story.appendChild(board);
    makeReplay(story, q.voice);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (g, i) {
        var card = splitCard(g);
        card.addEventListener('click', function () { pick(g, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(g, card) {
      if (state.locked || state.busy) return;
      if (keyOf(g) === targetKey) {
        card.classList.add('is-right');
        var badge = el('span', 'l18-check');
        badge.innerHTML = ICONS.check;
        card.appendChild(badge);
        popIn(badge, 40);
        snapPop(card);
        later(function () {
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(card);
        }, 100);
        correct(null);
        return;
      }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, targetItem, keyOf);
        state.busy = false;
        paint();
      }, 320);
    }

    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：直接点选结果 ---------------- */

  function buildCalc(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var eq = el('div', 'l18-eq l18-eq--big');
    var res = blank('l18-q');
    eq.appendChild(tile(String(q.a), 'l18-tile--big'));
    eq.appendChild(op('+'));
    eq.appendChild(tile(String(q.b), 'l18-tile--big'));
    eq.appendChild(op('='));
    eq.appendChild(res);
    story.appendChild(eq);
    popIn(eq);

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          res.textContent = String(answer);
          res.classList.remove('l18-blank', 'l18-q');
          res.classList.add('l18-filled');
          popIn(res);
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          state.busy = false;
          renderKeys();
        }, 320);
      });
    }

    function paint() {
      if (shown || !alive) return;
      shown = true;
      renderKeys();
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
    var tray = el('div', 'lv-tray l18-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    if (q.type === 'pick') tray.classList.remove('l18-tray');

    var state = { locked: false, busy: false, errors: 0, step: 'left' };

    if (q.type !== 'pick' && q.type !== 'splitfill') makeReplay(story, q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type === 'calc') {
        Engine.sfx.correct();
        later(function () { Engine.sfx.star(); }, 90);
        burst(story);
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

    if (q.type === 'splitfill') buildSplitFill(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else buildCalc(q, story, tray, state, correct, wrong);
  }

  /* ---------------- 结算 ---------------- */

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

  /* ---------------- 生命周期 ---------------- */

  async function run(root) {
    var body = el('div', 'lv');
    var host = el('div', 'lv-story');
    body.appendChild(host);
    root.appendChild(body);

    if (ctx.quick) {
      askQuestion(root);
      return;
    }

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
    if (tapFinish) {
      tapFinish();
      tapFinish = null;
    }
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[18] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
