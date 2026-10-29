/* ============================================================
   level-lv10.js · Bird Branch（小鸟飞走 · 不退位减法 11–19）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     fly     树枝上 a 只鸟，飞走 b 只 → 三个数字键
     branch  三根树枝（10 + n 只），听总数点出对应的那根
     take    点掉指定数量的鸟，再点剩下的只数
   铁律：全英文、点按推进、教学自问自答、物件飞走后其余鸟不得位移（§5.7）、
         拖/点消除不判分（§6.8 两段式），答对只播音效（§6.4）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var FLIGHT_MS = 640;            // 单只鸟飞走的时长
  var FLIGHT_GAP = 130;           // 相邻两只的起飞间隔

  /* ---------------- 图标 ---------------- */

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">' +
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
    // 一只小鸟：尾羽 + 身体 + 翅膀 + 头 + 嘴 + 眼睛。fill 走 currentColor，颜色由 class 决定。
    bird:
      '<svg viewBox="0 0 26 26" aria-hidden="true">' +
      '<path d="M4.6 16.6c-2.7-.5-4.1-2-4.3-3.9 2.1.2 3.8.8 5 1.8z" fill="currentColor" opacity=".62"/>' +
      '<ellipse cx="12.2" cy="15.8" rx="7.5" ry="6" fill="currentColor"/>' +
      '<path class="l10-wing" d="M8.6 14.6c2.1-1.6 4.9-1.3 6.2.4-1.7 2-4.6 2.5-6.5 1z" ' +
      'fill="#FFFFFF" opacity=".45"/>' +
      '<circle cx="17.2" cy="10.4" r="4.6" fill="currentColor"/>' +
      '<path d="M21.2 10.2l3.8 1.5-3.8 1.6z" fill="#EFA23F"/>' +
      '<circle cx="18.4" cy="9.6" r="1" fill="#41301F"/></svg>'
  };

  var TONES = ['mint', 'sky', 'butter', 'lilac', 'rose'];

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
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 380, delay: delay || 0 });
  }

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-6px) scale(1.07)', offset: 0.42 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 320, delay: delay || 0 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px) rotate(-1.2deg)', offset: 0.22 },
      { transform: 'translateX(7px) rotate(1.2deg)', offset: 0.5 },
      { transform: 'translateX(-3px)', offset: 0.78 },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' });
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
        ctx.audio.play('lv10/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小鸟与树枝 ---------------- */

  function birdEl(tone, size) {
    var b = el('span', 'l10-bird l10-bird--' + tone);
    if (size) { b.style.width = size + 'px'; b.style.height = size + 'px'; }
    b.innerHTML = ICONS.bird;
    return b;
  }

  /**
   * 一排鸟：从下往上堆（列数固定），最上面那排不满就居中。
   * 每一只都有自己的固定格位 slot —— 飞走时只隐藏鸟本身，slot 留在原位（§5.7）。
   */
  function birdGroup(n, opts) {
    opts = opts || {};
    var cols = opts.cols || 3;
    var cell = opts.cell || 24;
    var wrap = el('div', 'l10-group');
    wrap.style.setProperty('--cell', cell + 'px');

    var rows = Math.max(1, Math.ceil(n / cols));
    var items = [];
    var left = n;
    for (var r = 0; r < rows; r += 1) {
      var take = Math.min(cols, left);
      var row = el('div', 'l10-row');
      for (var i = 0; i < take; i += 1) {
        var slot = el('span', 'l10-slot');
        var bird = birdEl(TONES[items.length % TONES.length], opts.bird);
        slot.appendChild(bird);
        row.appendChild(slot);
        items.push({ slot: slot, bird: bird });
      }
      left -= take;
      wrap.appendChild(row);      // 配合 column-reverse：第一排在最下面
    }
    return { node: wrap, items: items };
  }

  function branchOf(n, opts) {
    var box = el('div', 'l10-branch');
    var g = birdGroup(n, opts);
    box.appendChild(g.node);
    return { node: box, items: g.items, group: g.node };
  }

  function boardOf(ones, opts) {
    opts = opts || {};
    var wrap = el('div', 'l10-tree');
    // 十位树枝固定 5 列 × 2 排（一捆十只必须是标准阵型），个位树枝 3 列
    var ten = branchOf(10, { cols: 5, cell: opts.cell, bird: opts.bird });
    var one = branchOf(ones, opts);
    if (opts.mini) {
      wrap.classList.add('l10-tree--mini');
      wrap.appendChild(ten.node);
      wrap.appendChild(el('span', 'l10-plus', '+'));
      wrap.appendChild(one.node);
    } else {
      wrap.appendChild(ten.node);
      wrap.appendChild(one.node);
    }
    return { node: wrap, ten: ten, ones: one };
  }

  /* 剩余小鸟的包围盒（相对 host）。飞走只隐藏本体，格位还在，所以这个量是稳定的。 */
  function unionOf(host, slots) {
    var hb = host.getBoundingClientRect();
    var box = null;
    slots.forEach(function (slot) {
      var r = slot.getBoundingClientRect();
      if (!r.width && !r.height) return;
      if (!box) box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
      else {
        box.l = Math.min(box.l, r.left);
        box.t = Math.min(box.t, r.top);
        box.r = Math.max(box.r, r.right);
        box.b = Math.max(box.b, r.bottom);
      }
    });
    if (!box) return null;
    return { l: box.l - hb.left, t: box.t - hb.top, w: box.r - box.l, h: box.b - box.t };
  }

  /* 只圈住「还在场」的那几只，不圈已经空掉的上半根树枝 */
  function ringRound(host, slots) {
    var m = unionOf(host, slots);
    if (!m) return null;
    var ring = el('div', 'l10-ring');
    // 上、左、右各留 9px；底边只留 2px，正好压在树枝上，不圈进空处
    ring.style.left = (m.l - 9) + 'px';
    ring.style.top = (m.t - 9) + 'px';
    ring.style.width = (m.w + 18) + 'px';
    ring.style.height = (m.h + 11) + 'px';
    host.appendChild(ring);
    return ring;
  }

  /* 徽标同样贴着剩余小鸟的正上方 */
  function placeBadge(badge, host, slots) {
    var m = unionOf(host, slots);
    if (!m) return;
    badge.style.left = (m.l + m.w / 2) + 'px';
    badge.style.top = (m.t - 52) + 'px';
    badge.style.marginLeft = '0';
    badge.style.transform = 'translateX(-50%)';
  }

  function liveSlots(items) {
    return items.filter(function (it) { return it.bird.dataset.gone !== '1'; })
      .map(function (it) { return it.slot; });
  }

  /* 飞走：只动自己，其余鸟与格位一格都不挪（§5.7） */
  function flyAway(bird, delay) {
    if (!bird || bird.dataset.gone === '1') return Promise.resolve();
    bird.dataset.gone = '1';
    bird.classList.add('is-flying');

    if (Engine.anim.budgetLeft() <= 0) {
      bird.classList.add('is-gone');
      return Promise.resolve();
    }

    Engine.anim.track(bird, FLIGHT_MS + (delay || 0));
    var anim = bird.animate([
      { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(9px,-15px) rotate(-9deg) scale(1.1)', opacity: 1, offset: 0.3 },
      { transform: 'translate(40px,-58px) rotate(-20deg) scale(.6)', opacity: 0 }
    ], {
      duration: FLIGHT_MS,
      delay: delay || 0,
      easing: 'cubic-bezier(.42,.05,.62,1)',
      fill: 'both'
    });

    return anim.finished.then(function () {
      bird.classList.add('is-gone');
      try { anim.cancel(); } catch (e) { /* 已取消 */ }
    }, function () { bird.classList.add('is-gone'); });
  }

  /* ---------------- 教学第一幕：认识 18 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l10-scene');
    var b = boardOf(8, { cell: 36 });
    wrap.appendChild(b.node);
    host.appendChild(wrap);

    // 两段树枝整组入场（同屏运动预算只有 10，不能十几只鸟逐个弹，§5.3）
    popIn(b.ten.node, 0);
    popIn(b.ones.node, 150);

    await saySeq(['t1_a']);             // Look at the birds. One ten and eight ones make eighteen.
    if (!alive) return;

    await sleep(1000);                  // 停顿一拍，等孩子看够
    if (!alive) return;

    await sleep(300);
  }

  /* ---------------- 教学第二幕：飞走 5 只 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l10-scene');
    var b = boardOf(8, { cell: 36 });
    wrap.appendChild(b.node);

    var badge = el('div', 'l10-badge');
    var chip = el('span', 'l10-badge-chip', '3');
    badge.appendChild(chip);
    b.ones.node.appendChild(badge);
    badge.style.visibility = 'hidden';

    host.appendChild(wrap);
    popIn(b.ten.node, 0);
    popIn(b.ones.node, 140);

    await sleep(360);
    if (!alive) return;

    // Five birds fly away from the ones branch.
    var saying = saySeq(['t2_a']);

    // 从最上面一只开始飞：个位树枝只剩最下面一排三只
    var victims = b.ones.items.slice(b.ones.items.length - 5);
    var flights = victims.map(function (it, i) { return flyAway(it.bird, 420 + i * FLIGHT_GAP); });

    await Promise.all([saying, Promise.all(flights)]);
    if (!alive) return;

    await sleep(1000);                  // 停顿 1 秒再自答
    if (!alive) return;

    // We take away the ones. Eight minus five equals three.
    var s2 = saySeq(['t2_b']);
    var leftSlots = liveSlots(b.ones.items);
    ringRound(b.ones.node, leftSlots);
    placeBadge(badge, b.ones.node, leftSlots);
    badge.style.visibility = 'visible';
    popIn(chip);
    b.ones.items.slice(0, 3).forEach(function (it, i) { bounce(it.bird, i * 90); });
    await s2;
    if (!alive) return;

    await sleep(320);
    if (!alive) return;

    // So, eighteen minus five equals thirteen!
    await saySeq(['t2_c']);
    if (!alive) return;

    [b.ones.items[0], b.ones.items[1], b.ones.items[2]].forEach(function (it, i) {
      bounce(it.bird, i * 70);
    });
    await sleep(420);
  }

  /* ---------------- 教学第三幕：竖式规律 ---------------- */

  function verticalSum(a, b, res) {
    var col = el('div', 'l10-vert');

    function row(cls, sign, cells) {
      var r = el('div', 'l10-vrow' + (cls ? ' ' + cls : ''));
      r.appendChild(el('span', 'l10-vsign', sign || ''));
      cells.forEach(function (c) {
        var cell = el('span', 'l10-vcell' + (c.cls ? ' ' + c.cls : ''), c.text);
        r.appendChild(cell);
      });
      return r;
    }

    var aStr = String(a);
    var rStr = String(res);
    var top = row('', '', [
      { text: aStr[0], cls: 'is-top-tens' },
      { text: aStr[1], cls: 'is-top-ones' }
    ]);
    var mid = row('', '\u2212', [
      { text: '', cls: 'l10-vcell--blank' },
      { text: String(b), cls: 'is-sub-ones' }
    ]);
    var line = el('div', 'l10-vline');
    var sum = row('l10-vrow--sum is-hidden', '', [
      { text: rStr[0], cls: 'is-res-tens' },
      { text: rStr[1], cls: 'is-res-ones' }
    ]);

    col.appendChild(top);
    col.appendChild(mid);
    col.appendChild(line);
    col.appendChild(sum);

    return {
      node: col,
      markTens: function () {
        [top.children[1], sum.children[1]].forEach(function (c) { c.classList.add('is-ten'); });
      },
      markOnes: function () {
        [top.children[2], mid.children[2], sum.children[2]].forEach(function (c) {
          c.classList.add('is-ones');
        });
      },
      reveal: function () {
        sum.classList.remove('is-hidden');
        [sum.children[1], sum.children[2]].forEach(function (c, i) { popIn(c, i * 120); });
        // 先把终态写进内联样式，再播「从 0 拉出」的动画；
        // 否则动画结束 cancel() 会回落到 scaleX(0)，横线就永远看不见。
        line.style.transform = 'scaleX(1)';
        animate(line, [
          { transform: 'scaleX(0)' },
          { transform: 'scaleX(1)' }
        ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
      }
    };
  }

  async function sceneThree(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l10-sum');
    var t = branchOf(10, { cell: 20, bird: 20 });
    var v = verticalSum(18, 5, 13);
    wrap.appendChild(t.node);
    wrap.appendChild(v.node);
    host.appendChild(wrap);

    popIn(t.node, 0);
    popIn(v.node, 200);
    v.reveal();

    await sleep(420);
    if (!alive) return;

    // When we take away, the ten stays the same.
    var s1 = saySeq(['t3_a']);
    t.node.classList.add('is-ten-on');
    v.markTens();
    await s1;
    if (!alive) return;

    await sleep(360);
    if (!alive) return;

    // We only subtract the ones.
    await saySeq(['t3_b']);
    if (!alive) return;

    v.markOnes();
    [v.node.querySelector('.is-top-ones'), v.node.querySelector('.is-sub-ones')].forEach(function (c, i) {
      bounce(c, i * 110);
    });
    await sleep(420);
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
      saySeq(keys);
    });
    story.appendChild(replay);
  }

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'numkey');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'numkey-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

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

    makeReplay(story, q.type === 'branch' ? q.voice : q.voice.concat(['how_many']));

    var state = { locked: false, errors: 0 };

    function correct(node) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);

      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));

      if (solved.done) later(function () { finish(solved.star); }, 620);
      else later(function () { askQuestion(root); }, 700);
    }

    function wrong(node) {
      if (state.locked) return;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 240);
      }
      Engine.sfx.wrong();
      if (node) shake(node);
    }

    if (q.type === 'fly') buildFlyQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'branch') buildBranchQuestion(q, story, tray, state, correct, wrong);
    else buildTakeQuestion(q, story, tray, state, correct, wrong);

    // fly / take 自己排语音（动作完成后才问），branch 直接读题
    if (q.type === 'branch') saySeq(q.voice);
  }

  /* ---- 题型 A：看鸟飞走，点剩下的只数 ---- */

  function buildFlyQuestion(q, story, tray, state, correct, wrong) {
    // 选项迟一步出现，托盘先占好位（§6.8）
    tray.classList.add('lv-tray--reserved');

    var b = boardOf(q.a - 10, { cell: 38 });
    var wrap = el('div', 'l10-scene');
    wrap.appendChild(b.node);
    story.appendChild(wrap);

    popIn(b.node);

    var answer = q.a - q.b;
    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) { correct(key); return; }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paint();
        }, 320);
      });
    }

    // 台词里就说了「Four fly away.」，飞走与语音同步发生
    var said = saySeq(q.voice);
    var victims = b.ones.items.slice(b.ones.items.length - q.b);
    var flights = victims.map(function (it, i) {
      return flyAway(it.bird, 520 + i * FLIGHT_GAP);
    });

    Promise.all([said, Promise.all(flights)]).then(function () {
      if (state.locked || !alive) return;
      later(function () {
        if (state.locked || !alive) return;
        saySeq(['how_many']).then(function () {
          if (state.locked || !alive) return;
          paint();
        });
      }, 320);
    });
  }

  /* ---- 题型 B：听总数，点出对应的树枝 ---- */

  function miniBranch(ones, cell) {
    var wrap = el('div', 'l10-mini');
    var ten = branchOf(10, { cols: 5, cell: cell, bird: cell });
    var one = branchOf(ones, { cols: 3, cell: cell, bird: cell });
    wrap.appendChild(ten.node);
    wrap.appendChild(el('span', 'l10-plus l10-plus--mini', '+'));
    wrap.appendChild(one.node);
    return wrap;
  }

  function buildBranchQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l10-opts');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.combos.slice());

    function paint() {
      board.innerHTML = '';
      list.forEach(function (ones, i) {
        var card = el('button', 'l10-opt');
        card.type = 'button';
        card.dataset.ones = String(ones);
        card.setAttribute('aria-label', 'One ten and ' + ones + ' birds');
        card.appendChild(miniBranch(ones, 22));
        card.addEventListener('click', function () { pick(ones, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    function pick(ones, card) {
      if (state.locked) return;
      if (10 + ones === q.target) { correct(card); return; }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, q.target - 10);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：点掉指定数量的鸟，再点剩下的只数 ---- */

  function buildTakeQuestion(q, story, tray, state, correct, wrong) {
    tray.classList.add('lv-tray--reserved');

    var b = boardOf(q.a - 10, { cell: 38 });
    var wrap = el('div', 'l10-scene');
    wrap.appendChild(b.node);

    // 还要赶走几只：一排小圆点，每赶走一只就灭一颗
    var tally = el('div', 'l10-tally');
    var dots = [];
    for (var i = 0; i < q.b; i += 1) {
      var dot = el('span', 'l10-dot');
      tally.appendChild(dot);
      dots.push(dot);
    }
    wrap.insertBefore(tally, b.node);

    story.appendChild(wrap);

    popIn(wrap);

    var answer = q.a - q.b;
    var options = Engine.quiz.shuffle(q.options.slice());
    var left = q.b;
    var cleared = 0;            // 已经真正飞走的只数（不能只看 left：先落地的那只会提前触发）
    var actionDone = false;

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) { correct(key); return; }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paint();
        }, 320);
      });
    }

    function finishAction() {
      if (actionDone) return;
      actionDone = true;
      b.ones.node.classList.remove('is-ready');
      ringRound(b.ones.node, liveSlots(b.ones.items));
      remove(wrap.querySelector('.tap-hint'));
      tally.classList.add('is-done');
      later(function () {
        if (state.locked || !alive) return;
        saySeq(['how_many']).then(function () {
          if (state.locked || !alive) return;
          paint();
        });
      }, 420);
    }

    function shoo(bird) {
      if (actionDone || state.locked || bird.dataset.gone === '1') return;
      left -= 1;
      var dot = dots[left];
      if (dot) dot.classList.add('is-used');
      Engine.sfx.tap();
      flyAway(bird, 0).then(function () {
        cleared += 1;
        if (cleared >= q.b) finishAction();
      });
    }

    // 只允许点个位树枝上的鸟（减法只减个位）
    b.ones.items.forEach(function (it) {
      it.bird.classList.add('is-touchable');
      it.slot.addEventListener('pointerdown', function (e) {
        if (actionDone || state.locked) return;
        e.preventDefault();
        shoo(it.bird);
      });
    });

    // 台词读完再提示「点鸟」，避免孩子提前乱点
    saySeq(q.voice).then(function () {
      if (actionDone || !alive || state.locked) return;
      b.ones.node.classList.add('is-ready');
      var hint = el('div', 'tap-hint tap-hint--bird');
      hint.innerHTML = ICONS.hand;
      b.ones.node.appendChild(hint);     // 挂在个位树枝上，手势正好指着要点的鸟
    });
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
  global.LEVELS[10] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
