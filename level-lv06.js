/* ============================================================
   level-lv06.js · Number Link（数字连线 · 11–19 半抽象匹配）
   ------------------------------------------------------------
   2 幕教学 + 10 题（顺序每局打乱），三种题型：
     link-num   左侧三个数字 / 右侧三个十格阵图案 → 拖线配对
     link-pic   左侧三个十格阵图案 / 右侧三个数字 → 拖线配对
     fill       中间一个「一 ten + 零散」的图案 → 点三个数字键
   铁律：全英文、点按推进、连线有平滑绘制动画、
         十格阵 2 行 × 5 列、命中热区比视觉外扩 HIT_PAD。
   教学两幕都没有问句（台词按需求给定），因此不存在「问句悬空」；
   第一幕里「Look at number thirteen.」之后停 1 秒再画线，属演示节拍。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;               // 连线落点热区：卡片矩形四边各外扩 14px（§5.9）
  var SVG_NS = 'http://www.w3.org/2000/svg';

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

  /* ---------------- 运行时状态 ---------------- */

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

  function ns(tag) {
    return document.createElementNS(SVG_NS, tag);
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

  function bounce(node) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-10px) scale(1.07)', offset: 0.4 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 340 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px) rotate(-2deg)', offset: 0.25 },
      { transform: 'translateX(6px) rotate(2deg)', offset: 0.55 },
      { transform: 'translateX(-3px)', offset: 0.8 },
      { transform: 'translateX(0)' }
    ], { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' });
  }

  /* ---------------- 语音链（一条接一条，绝不叠音 §6.7） ---------------- */

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
        ctx.audio.play('lv06/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 十格阵（严格 2 行 × 5 列） ---------------- */

  function makeFrame(cell) {
    var box = el('div', 'tenframe');
    box.style.setProperty('--cell', (cell || 20) + 'px');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var node = el('div', 'tf-cell');
      box.appendChild(node);
      cells.push(node);
    }
    return { box: box, cells: cells, cell: cell };
  }

  function fillDots(frame, n, animateIt) {
    for (var i = 0; i < n && i < frame.cells.length; i += 1) {
      var cell = frame.cells[i];
      if (cell.dataset.on === '1') continue;
      cell.dataset.on = '1';
      cell.classList.add('is-on');
      var dot = el('span', 'l6-dot');
      cell.appendChild(dot);
      if (animateIt) popIn(dot, i * 42);
    }
  }

  /**
   * 「一个十 + 零散几个」的图案卡：满十阵 + 加号 + 零散圆点。
   * ones 指零散个数；返回的元素 data-ones 记录它代表的数量（10 + ones）。
   */
  function picCard(ones, opts) {
    opts = opts || {};
    var cell = opts.cell || 17;
    var dotSize = opts.dot || 12;
    var cols = opts.cols || 3;

    var card = el('div', 'l6-pic');
    var frame = makeFrame(cell);
    fillDots(frame, 10);
    frame.box.classList.add('is-ten');
    card.appendChild(frame.box);

    card.appendChild(el('span', 'l6-plus', '+'));

    var extra = el('div', 'l6-ones');
    extra.style.gridTemplateColumns = 'repeat(' + cols + ', ' + dotSize + 'px)';
    for (var i = 0; i < ones; i += 1) {
      var dot = el('span', 'l6-dot l6-dot--loose');
      dot.style.width = dotSize + 'px';
      dot.style.height = dotSize + 'px';
      extra.appendChild(dot);
    }
    card.appendChild(extra);
    return card;
  }

  /* ---------------- 连线画布 ---------------- */

  function linePath(svg) {
    var path = ns('path');
    path.setAttribute('class', 'l6-line');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);
    return path;
  }

  /** 两点的平滑 S 形三次贝塞尔 */
  function curve(a, b) {
    var dx = b.x - a.x;
    var k = Math.min(56, Math.max(22, Math.abs(dx) * 0.42));
    return 'M' + a.x.toFixed(1) + ' ' + a.y.toFixed(1) +
      ' C' + (a.x + k).toFixed(1) + ' ' + a.y.toFixed(1) +
      ', ' + (b.x - k).toFixed(1) + ' ' + b.y.toFixed(1) +
      ', ' + b.x.toFixed(1) + ' ' + b.y.toFixed(1);
  }

  /** 卡片朝向绳子的那条边的中点（相对 svg 左上角） */
  function anchorOf(svg, item) {
    var r = item.getBoundingClientRect();
    var b = svg.getBoundingClientRect();
    var side = item.dataset.side === 'left' ? 'right' : 'left';
    return {
      x: (side === 'left' ? r.left : r.right) - b.left,
      y: r.top - b.top + r.height / 2
    };
  }

  /** 线条「一笔画出来」的动画（stroke-dashoffset） */
  function strokeDraw(path, ms) {
    var len = 400;
    try { len = Math.max(40, path.getTotalLength()); } catch (e) { /* 未挂载 */ }
    path.style.strokeDasharray = len + ' ' + len;
    Engine.anim.track(path, ms);
    var anim = path.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: ms, easing: 'cubic-bezier(.33,.8,.35,1)', fill: 'both' }
    );
    return anim.finished.then(function () {
      path.style.strokeDashoffset = '0';
      try { anim.cancel(); } catch (e) { /* 已取消 */ }
    }, function () { /* 已取消 */ });
  }

  /* ---------------- 一列卡片 ---------------- */

  function numItem(value, side) {
    var item = el('button', 'l6-item l6-item--num');
    item.type = 'button';
    item.dataset.side = side;
    item.dataset.key = String(value);
    item.appendChild(el('span', 'l6-num', String(value)));
    item.setAttribute('aria-label', String(value));
    return item;
  }

  function picItem(ones, side, opts) {
    var item = el('button', 'l6-item l6-item--pic');
    item.type = 'button';
    item.dataset.side = side;
    item.dataset.key = String(10 + ones);
    item.appendChild(picCard(ones, opts));
    item.setAttribute('aria-label', 'One ten and ' + ones + ' ones');
    return item;
  }

  /* ---------------- 教学 ---------------- */

  /**
   * 教学用静态盘面：左数字 / 右图案。
   * 返回 { board, svg, num(值) / pic(值) 两种查表 }
   */
  function teachBoard(nums, onesList, opts) {
    opts = opts || {};
    var board = el('div', 'l6-board l6-board--teach');
    if (nums.length === 1) board.classList.add('l6-board--single');
    var svg = ns('svg');
    svg.setAttribute('class', 'l6-lines');
    svg.setAttribute('aria-hidden', 'true');
    board.appendChild(svg);

    var colNum = el('div', 'l6-col');
    var colPic = el('div', 'l6-col');
    board.appendChild(colNum);
    board.appendChild(colPic);

    var byNum = {};
    nums.forEach(function (v, i) {
      var item = numItem(v, 'left');
      colNum.appendChild(item);
      byNum[v] = item;
      popIn(item, i * 70);
    });

    var byPic = {};
    onesList.forEach(function (o, i) {
      var item = picItem(o, 'right', opts);
      colPic.appendChild(item);
      byPic[10 + o] = item;
      popIn(item, 90 + i * 70);
    });

    return { board: board, svg: svg, num: byNum, pic: byPic };
  }

  function demoLine(svg, a, b) {
    var path = linePath(svg);
    path.setAttribute('d', curve(anchorOf(svg, a), anchorOf(svg, b)));
    return path;
  }

  async function sceneOne(host) {
    host.innerHTML = '';

    // 右侧图案顺序打乱（10+5 / 10+7 / 10+3）
    var view = teachBoard([13, 15, 17], Engine.quiz.shuffle([5, 7, 3]), { cell: 26, dot: 16 });
    host.appendChild(view.board);

    var focus = view.num[13];
    focus.classList.add('is-focus');

    await saySeq(['t1_a']);                    // Let's match the numbers and the pictures. Look at number thirteen.
    if (!alive) return;

    await sleep(1000);                          // 演示节拍：说完「看 13」停一秒再落笔
    if (!alive) return;

    var path = demoLine(view.svg, view.num[13], view.pic[13]);
    var line = saySeq(['t1_b']);                // Thirteen is one ten and three ones. They match!
    strokeDraw(path, 720).then(function () { path.classList.add('is-on'); });
    await line;
    if (!alive) return;

    view.num[13].classList.remove('is-focus');
    view.num[13].classList.add('is-linked');
    view.pic[13].classList.add('is-linked');
    await sleep(320);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';

    var view = teachBoard([16], [6], { cell: 28, dot: 17 });
    host.appendChild(view.board);

    var saying = saySeq(['t2_a']);              // Let's find sixteen. One ten and six ones. Yes, this is sixteen.

    later(function () {
      var path = demoLine(view.svg, view.num[16], view.pic[16]);
      strokeDraw(path, 780).then(function () {
        path.classList.add('is-on');
        view.num[16].classList.add('is-linked');
        view.pic[16].classList.add('is-linked');
        bounce(view.num[16]);
        bounce(view.pic[16]);
      });
    }, 1500);

    await saying;
    if (!alive) return;
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

  /* ---------------- 答题 ---------------- */

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

    if (q.type === 'link') buildLinkQuestion(q, story, tray, state, correct, wrong);
    else buildFillQuestion(q, story, tray, state, correct, wrong);

    saySeq(q.voice);
  }

  /* ---- 题型 A / B：拖线配对（数字 ↔ 十格阵图案） ---- */

  function buildLinkQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l6-board');
    var svg = ns('svg');
    svg.setAttribute('class', 'l6-lines');
    svg.setAttribute('aria-hidden', 'true');
    board.appendChild(svg);

    var numOnLeft = q.left === 'num';
    var colNum = el('div', 'l6-col');
    var colPic = el('div', 'l6-col');
    board.appendChild(numOnLeft ? colNum : colPic);
    board.appendChild(numOnLeft ? colPic : colNum);
    story.appendChild(board);

    var items = [];

    Engine.quiz.shuffle(q.nums.slice()).forEach(function (v, i) {
      var item = numItem(v, numOnLeft ? 'left' : 'right');
      colNum.appendChild(item);
      items.push(item);
      popIn(item, i * 60);
    });

    Engine.quiz.shuffle(q.ones.slice()).forEach(function (o, i) {
      var item = picItem(o, numOnLeft ? 'right' : 'left', { cell: 20, dot: 13 });
      colPic.appendChild(item);
      items.push(item);
      popIn(item, 80 + i * 60);
    });

    var active = null;
    var live = null;
    var startPt = null;
    var moved = false;

    function detach() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    function clearLive() {
      remove(live);
      live = null;
    }

    function clearNear() {
      items.forEach(function (it) { it.classList.remove('is-near'); });
    }

    function disarm() {
      if (active) active.classList.remove('is-armed');
      active = null;
      clearLive();
      clearNear();
    }

    function setActive(item) {
      if (active && active !== item) active.classList.remove('is-armed');
      active = item;
      item.classList.add('is-armed');
    }

    /** 落点：先按最上层元素找，找不到再按「矩形外扩 HIT_PAD」取最近的一张 */
    function itemAt(x, y, mySide) {
      var node = document.elementFromPoint(x, y);
      var hit = node && node.closest ? node.closest('.l6-item') : null;
      if (hit && hit.dataset.side !== mySide) return hit;

      var best = null;
      var bestDist = HIT_PAD + 1;
      items.forEach(function (it) {
        if (it.dataset.side === mySide) return;
        if (it.dataset.done === '1') return;
        var r = it.getBoundingClientRect();
        var dx = Math.max(r.left - x, 0, x - r.right);
        var dy = Math.max(r.top - y, 0, y - r.bottom);
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) { bestDist = dist; best = it; }
      });
      return best;
    }

    function onMove(e) {
      if (!active) return;
      if (Math.abs(e.clientX - startPt.x) > 8 || Math.abs(e.clientY - startPt.y) > 8) moved = true;
      if (!moved) return;

      var b = svg.getBoundingClientRect();
      var from = anchorOf(svg, active);
      var to = { x: e.clientX - b.left, y: e.clientY - b.top };

      if (!live) {
        live = linePath(svg);
        live.classList.add('l6-line--live');
      }
      live.setAttribute('d', curve(from, to));

      var target = itemAt(e.clientX, e.clientY, active.dataset.side);
      items.forEach(function (it) { it.classList.toggle('is-near', it === target); });
    }

    function onUp(e) {
      detach();
      if (!active) return;
      var target = itemAt(e.clientX, e.clientY, active.dataset.side);
      clearLive();
      clearNear();

      if (target && target !== active && target.dataset.done !== '1') {
        var from = active;
        disarm();
        resolve(from, target);
        return;
      }
      if (moved) disarm();          // 拖到空处：取消选中，不算答错
      // 轻点则保持选中，等第二次轻点完成连线（触屏兜底）
    }

    function bind(item) {
      item.addEventListener('pointerdown', function (e) {
        if (state.locked) return;
        if (item.dataset.done === '1') return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();

        // 第二下轻点：直接连线
        if (active && active !== item && active.dataset.side !== item.dataset.side) {
          var from = active;
          disarm();
          resolve(from, item);
          return;
        }
        if (active === item) { disarm(); return; }

        setActive(item);
        startPt = { x: e.clientX, y: e.clientY };
        moved = false;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      });
    }

    function resolve(a, b) {
      if (state.locked) return;
      var leftItem = a.dataset.side === 'left' ? a : b;
      var rightItem = leftItem === a ? b : a;

      var path = linePath(svg);
      path.setAttribute('d', curve(anchorOf(svg, leftItem), anchorOf(svg, rightItem)));

      if (a.dataset.key !== b.dataset.key) {
        // 连错：线闪一下收回，不落子、不锁定
        path.classList.add('l6-line--bad');
        Engine.sfx.deny();
        shake(a);
        shake(b);
        later(function () { remove(path); }, 560);
        wrong(a);
        return;
      }

      // 连对：线条平滑画出并保持发光
      a.dataset.done = '1';
      b.dataset.done = '1';
      a.classList.add('is-linked');
      b.classList.add('is-linked');
      Engine.sfx.tap();
      strokeDraw(path, 460).then(function () { path.classList.add('is-on'); });

      // 题目只要求连出 target 那一对；连对其它对也属于正确配对，安静锁定
      if (a.dataset.key === String(q.target)) {
        later(function () {
          if (!state.locked) {
            burst(story);
            correct(a);
          }
        }, 560);
      }
    }

    items.forEach(bind);
  }

  /* ---- 题型 C：看图选数字 ---- */

  function buildFillQuestion(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones;

    var board = el('div', 'l6-board l6-board--single');
    board.appendChild(picCard(q.ones, { cell: 40, dot: 22, cols: 3 }));
    story.appendChild(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      tray.innerHTML = '';
      options.forEach(function (value, i) {
        var key = el('button', 'numkey');
        key.type = 'button';
        key.dataset.value = String(value);
        key.setAttribute('aria-label', String(value));
        key.appendChild(el('span', 'numkey-digit', String(value)));
        key.addEventListener('click', function () { pick(value, key); });
        popIn(key, i * 55);
        tray.appendChild(key);
      });
    }

    function pick(value, key) {
      if (state.locked) return;
      if (value === answer) {
        correct(key);
        return;
      }
      wrong(key);
      later(function () {
        Engine.quiz.reshuffle(options, answer);
        paint();
      }, 320);
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

    if (ctx.quick) {            // 验收用：跳过教学直接进题
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
  global.LEVELS[6] = {
    mount: mount,
    // 只读：给验收脚本用
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
