/* ============================================================
   level-lv13.js · Mix It Up（二阶大复习 · 综合点选）
   ------------------------------------------------------------
   2 幕复习教学 + 10 题（顺序每局打乱），三种题型全是「点数字键」：
     add   不进位加法：13 + 4 = ?
     sub   不退位减法：17 − 5 = ?
     pic   十格阵满十 + 零散积木 → 这是哪个数？
   铁律：全英文、点按推进、教学不许问句悬空（本关教学无问句）、
         答题环节绝不自动补答案、按键反馈 ≤120ms（§5.12）、
         教学拆位（个位单独一块）/ 答题整块（§6.1）、
         加减动画不许挤压在场积木（§5.7）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var GAP_MS = 150;              // 积木依次落位的间隔

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
      'fill="currentColor"/></svg>'
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
        ctx.audio.play('lv13/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 积木 / 格位 / 十格阵 ---------------- */

  // 积木尺寸由 CSS 变量 --c 决定（窄屏可整体缩一档），这里不写死像素
  function cube() {
    return el('span', 'l13-cube');
  }

  /** 一捆 = 十块（5 列 × 2 行），整体算作「一个十」 */
  function packTen() {
    var node = el('div', 'l13-pack');
    for (var i = 0; i < 10; i += 1) node.appendChild(cube());
    return node;
  }

  /**
   * 固定格位阵列：格位一次性建满（总数 = 最终数量），
   * 这样物件飞走 / 飞入都只改自身，其余物件坐标不变（§5.7）。
   * 排布从底行往上填：零散积木像堆在桌面上，被拿走时从上面拿走，
   * 剩下的仍贴着底线，不会浮在半空。
   */
  function slotGrid(total, cols, filled) {
    var grid = el('div', 'l13-slots');
    grid.style.setProperty('--cols', String(cols));
    var rows = Math.ceil(total / cols);
    var slots = [];
    var cubes = [];
    for (var i = 0; i < total; i += 1) {
      var slot = el('span', 'l13-slot');
      slot.style.gridRow = String(rows - Math.floor(i / cols));
      slot.style.gridColumn = String((i % cols) + 1);
      if (i < filled) {
        var c = cube();
        slot.appendChild(c);
        cubes.push(c);
      }
      grid.appendChild(slot);
      slots.push(slot);
    }
    return { node: grid, slots: slots, cubes: cubes, rows: rows };
  }

  /** 十格阵：严格 2 行 × 5 列，左上先填（§5.8） */
  function tenFrame(cell, filled) {
    var box = el('div', 'tenframe');
    box.style.setProperty('--cell', cell + 'px');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var c = el('div', 'tf-cell');
      if (i < filled) {
        c.classList.add('is-on');
        c.appendChild(cube());
      }
      box.appendChild(c);
      cells.push(c);
    }
    return { box: box, cells: cells };
  }

  /* ---------------- 教学算式（拆位：个位单独一块） ---------------- */

  function digitChip(str) {
    var chip = el('span', 'l13-num');
    var digits = [];
    for (var i = 0; i < str.length; i += 1) {
      var d = el('i', null, str.charAt(i));
      chip.appendChild(d);
      digits.push(d);
    }
    return { node: chip, digits: digits };
  }

  function teachEq(a, sign, b) {
    var row = el('div', 'l13-teq');
    var A = digitChip(String(a));
    var B = digitChip(String(b));
    row.appendChild(A.node);
    row.appendChild(el('span', 'l13-sop', sign));
    row.appendChild(B.node);
    row.appendChild(el('span', 'l13-sop', '='));

    var res = el('span', 'l13-num l13-num--res', '?');
    row.appendChild(res);

    return {
      node: row,
      res: res,
      ones: [A.digits[A.digits.length - 1], B.digits[B.digits.length - 1]]
    };
  }

  /** 结果填进结果块，返回各数字块（个位用于稍后转红） */
  function fillRes(res, value) {
    res.innerHTML = '';
    res.classList.remove('l13-num--res');
    var str = String(value);
    var digits = [];
    for (var i = 0; i < str.length; i += 1) {
      var d = el('i', null, str.charAt(i));
      res.appendChild(d);
      digits.push(d);
    }
    return digits;
  }

  function markHot(digits) {
    digits.forEach(function (d, i) {
      d.classList.add('is-hot');
      bounce(d, i * 90);
    });
  }

  /* ---------------- 教学第一幕：加与减的视觉对比 ---------------- */

  /** 落地挤压回弹（§5.11）：支点在底边，三段形变 */
  function flyIn(node, delay) {
    return animate(node, [
      { transform: 'translate(62px,-56px) scale(.55) rotate(12deg)', opacity: 0 },
      { transform: 'translate(0,0) scale(1.16,.74)', opacity: 1, offset: 0.66 },
      { transform: 'translate(0,0) scale(.94,1.08)', opacity: 1, offset: 0.84 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 }
    ], { duration: 560, delay: delay || 0, easing: 'cubic-bezier(.3,.72,.36,1)' });
  }

  /** 被拿走：向上飘走并消散，不碰其它积木 */
  function flyOut(node, delay, seed) {
    var dx = [-20, 16, -10, 22, 9][seed % 5];
    return animate(node, [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: 'translate(' + dx + 'px,-26px) scale(1.1) rotate(5deg)', opacity: 1, offset: 0.38 },
      { transform: 'translate(' + (dx * 1.9) + 'px,-58px) scale(.55) rotate(13deg)', opacity: 0 }
    ], { duration: 520, delay: delay || 0, easing: 'cubic-bezier(.32,.06,.62,1)' })
      .then(function () { node.style.visibility = 'hidden'; });
  }

  function cardBadge(sign) {
    var kind = sign === '+' ? 'add' : 'sub';
    return el('div', 'l13-badge l13-badge--' + kind, sign);
  }

  /** 12 + 3：一捆十块 + 2 块，再飞进 3 块（个位 2 + 3 = 5，正好 15） */
  function buildAddCard(a, b) {
    var card = el('div', 'l13-card l13-card--add');
    card.appendChild(cardBadge('+'));

    var have = a - 10;                       // 已经在场的零散块
    var pile = el('div', 'l13-pile');
    pile.appendChild(packTen());
    var ones = slotGrid(have + b, 3, have);
    pile.appendChild(ones.node);
    card.appendChild(pile);

    var eq = teachEq(a, '+', b);
    card.appendChild(eq.node);

    return {
      card: card,
      eq: eq,
      // b 块依次飞入后面的空位；已有的 have 块原地不动
      launch: function () {
        var jobs = [];
        for (var i = 0; i < b; i += 1) {
          var c = cube();
          ones.slots[have + i].appendChild(c);
          jobs.push(flyIn(c, i * GAP_MS));
        }
        return Promise.all(jobs);
      }
    };
  }

  /** 18 − 5：一捆十块 + 8 块，飞走最后 5 块 */
  function buildSubCard(a, b) {
    var card = el('div', 'l13-card l13-card--sub');
    card.appendChild(cardBadge('\u2212'));

    var pile = el('div', 'l13-pile');
    pile.appendChild(packTen());
    var ones = slotGrid(a - 10, 3, a - 10);
    pile.appendChild(ones.node);
    card.appendChild(pile);

    var eq = teachEq(a, '\u2212', b);
    card.appendChild(eq.node);

    return {
      card: card,
      eq: eq,
      launch: function () {
        var targets = ones.cubes.slice(ones.cubes.length - b);
        return Promise.all(targets.map(function (c, i) { return flyOut(c, i * 90, i); }));
      }
    };
  }

  async function sceneOne(host) {
    host.innerHTML = '';

    var duo = el('div', 'l13-duo');
    var add = buildAddCard(12, 3);
    var sub = buildSubCard(18, 5);
    duo.appendChild(add.card);
    duo.appendChild(sub.card);
    host.appendChild(duo);

    popIn(add.card, 0);
    popIn(sub.card, 110);
    await sleep(560);
    if (!alive) return;

    // Let's review! When we add, we put blocks together. —— 积木飞入合并
    var v1 = saySeq(['t1_a']);
    await sleep(280);
    if (!alive) return;
    await add.launch();
    await v1;
    if (!alive) return;

    var rAdd = fillRes(add.eq.res, 15);
    popIn(add.eq.res);
    await sleep(280);
    if (!alive) return;

    // When we take away, we remove blocks. —— 积木飞走消散
    var v2 = saySeq(['t1_b']);
    await sleep(240);
    if (!alive) return;
    await sub.launch();
    await v2;
    if (!alive) return;

    var rSub = fillRes(sub.eq.res, 13);
    popIn(sub.eq.res);

    await sleep(1000);                   // 教学节拍：停 1 秒再讲重点
    if (!alive) return;

    // Remember, always look at the ones first! —— 只把个位转红
    var v3 = saySeq(['t1_c']);
    markHot([add.eq.ones[0], add.eq.ones[1], rAdd[rAdd.length - 1]]);
    markHot([sub.eq.ones[0], sub.eq.ones[1], rSub[rSub.length - 1]]);
    await v3;
    if (!alive) return;

    await sleep(320);
  }

  /* ---------------- 教学第二幕：一个十 + 六个一 = 16 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';

    var stageBox = el('div', 'l13-stage');
    var pair = el('div', 'l13-pair');

    var frame = tenFrame(34, 10);
    var loose = slotGrid(6, 3, 6);
    pair.appendChild(frame.box);
    pair.appendChild(loose.node);
    stageBox.appendChild(pair);

    var big = el('div', 'l13-bignum is-hidden', '16');
    stageBox.appendChild(big);
    host.appendChild(stageBox);

    popIn(pair, 0);
    await sleep(520);
    if (!alive) return;

    // One ten and six ones make sixteen. —— 满十格发光，六块依次跳一下
    var v1 = saySeq(['t2_a']);
    frame.box.classList.add('is-full');
    loose.cubes.forEach(function (c, i) { bounce(c, i * 90); });
    await v1;
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    // 积木缩回中心，原地变出纯数字 16（同一块场地，不产生 reflow）
    await animate(pair, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.76)' }
    ], { duration: 300, easing: 'cubic-bezier(.4,0,.6,1)' });
    if (!alive) return;
    pair.style.visibility = 'hidden';

    big.classList.remove('is-hidden');
    popIn(big);
    bounce(big, 260);
    await sleep(200);
    if (!alive) return;

    // Let's see if you remember everything! Let's play!
    await saySeq(['t2_b']);
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
      var key = el('button', 'l13-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l13-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
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

    makeReplay(story, q.voice);

    var state = { locked: false, busy: false, errors: 0 };

    function advance() {
      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));
      if (solved.done) later(function () { finish(solved.star); }, 620);
      else later(function () { askQuestion(root); }, 700);
    }

    function correct(node) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);
      burst(story);
      advance();
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
    }

    if (q.type === 'pic') {
      buildPic(q, story, tray, state, correct, wrong);
    } else {
      buildEquation(q, story, tray, state, correct, wrong);
    }

    saySeq(q.voice);
  }

  function tile(text, cls) {
    return el('span', 'l13-tile' + (cls ? ' ' + cls : ''), text);
  }

  function eqRow(a, sign, b) {
    var row = el('div', 'l13-qeq');
    row.appendChild(tile(String(a)));
    row.appendChild(el('span', 'l13-qop', sign));
    row.appendChild(tile(String(b)));
    row.appendChild(el('span', 'l13-qop', '='));
    var q = tile('?', 'l13-tile--q');
    row.appendChild(q);
    return { node: row, q: q };
  }

  /* ---- 题型 A / B：纯算式 + 三个数字键 ---- */

  function buildEquation(q, story, tray, state, correct, wrong) {
    var isAdd = q.type === 'add';
    var answer = isAdd ? q.a + q.b : q.a - q.b;
    var refs = eqRow(q.a, isAdd ? '+' : '\u2212', q.b);
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          refs.q.textContent = String(answer);
          refs.q.classList.remove('l13-tile--q');
          refs.q.classList.add('is-filled', 'is-answer');
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          state.busy = false;
          paint();
        }, 320);
      });
    }

    paint();
  }

  /* ---- 题型 C：十格阵 + 零散积木 → 点数字 ---- */

  function buildPic(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones;

    var pic = el('div', 'l13-pic');
    var frame = tenFrame(30, 10);
    var loose = slotGrid(q.ones, 4, q.ones);
    pic.appendChild(frame.box);
    pic.appendChild(loose.node);
    story.appendChild(pic);
    popIn(pic);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          frame.box.classList.add('is-right');
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          state.busy = false;
          paint();
        }, 320);
      });
    }

    paint();
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
  global.LEVELS[13] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
