/* ============================================================
   level-lv04.js · Ten and Some More（11–19 与十格阵）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     count  看十格阵 + 零散苹果 → 点数字
     pick   听数字 → 点对应的十格阵组合
     build  拖拽苹果进盒子 → 凑出听到的数
   铁律：全英文、教学问句 1 秒后自答、点按推进、
         十格阵必须是标准 2 行 × 5 列、动画结束即销毁。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;

  var APPLE =
    '<svg viewBox="0 0 40 44" aria-hidden="true">' +
    '<path d="M20 12c-3-4-10-5-14 0-5 6-3 17 3 24 3 4 7 6 11 6s8-2 11-6c6-7 8-18 3-24-4-5-11-4-14 0z" fill="#E4574E"/>' +
    '<ellipse cx="13" cy="21" rx="3.6" ry="5.4" fill="#fff" opacity=".42" transform="rotate(-22 13 21)"/>' +
    '<path d="M20 12c0-4 2-7 6-8" stroke="#8B5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '<path d="M26 5c4-3 8 0 7 3-3 2-7 1-7-3z" fill="#6FA84E"/>' +
    '</svg>';

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">' +
      '<path d="M18 26V11a3 3 0 0 1 6 0v10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M24 21V9a3 3 0 0 1 6 0v12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M30 22v-8a3 3 0 0 1 6 0v14c0 8-5 14-13 14s-12-5-12-12v-6a3 3 0 0 1 6 0v3" ' +
      'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    speaker:
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' +
      '<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" fill="currentColor"/>' +
      '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="42" height="42" aria-hidden="true">' +
      '<path d="M4.7 12.6l5 4.9L19.4 6.9" fill="none" stroke="currentColor" stroke-width="3.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>',
    handSmall:
      '<svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true">' +
      '<path d="M18 26V11a3 3 0 0 1 6 0v10" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M24 21V9a3 3 0 0 1 6 0v12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M30 22v-8a3 3 0 0 1 6 0v14c0 8-5 14-13 14s-12-5-12-12v-6a3 3 0 0 1 6 0v3" ' +
      'fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
    return anim.finished.then(function () { anim.cancel(); }, function () { /* 取消 */ });
  }

  function popIn(node, delay) {
    return animate(node, [
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 400, delay: delay || 0 });
  }

  function bounce(node) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-11px) scale(1.06)', offset: 0.4 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 360 });
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

  /* ---------------- 十格阵（严格 2 行 × 5 列） ---------------- */

  function makeFrame(opts) {
    opts = opts || {};
    var cell = opts.cell || 30;
    var box = el('div', 'tenframe');
    box.style.setProperty('--cell', cell + 'px');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var node = el('div', 'tf-cell');
      box.appendChild(node);
      cells.push(node);
    }
    return { box: box, cells: cells, cell: cell };
  }

  /** 把前 n 个格子填上苹果；返回新加的苹果节点 */
  function fillFrame(frame, n, animateIt) {
    var added = [];
    for (var i = 0; i < n && i < frame.cells.length; i += 1) {
      var cell = frame.cells[i];
      if (cell.dataset.on === '1') continue;
      cell.dataset.on = '1';
      cell.classList.add('is-on');
      var apple = el('span', 'tf-apple');
      apple.innerHTML = APPLE;
      cell.appendChild(apple);
      if (animateIt) popIn(apple, i * 60);
      added.push(apple);
    }
    return added;
  }

  /** 苹果从框外飞进指定格 */
  function flyIntoCell(frame, index, fromX, fromY, delay) {
    var cell = frame.cells[index];
    if (!cell || cell.dataset.on === '1') return null;
    cell.dataset.on = '1';
    cell.classList.add('is-on');
    var apple = el('span', 'tf-apple');
    apple.innerHTML = APPLE;
    cell.appendChild(apple);
    animate(apple, [
      { transform: 'translate(' + fromX + 'px,' + fromY + 'px) scale(.6)', opacity: 0 },
      { transform: 'translate(0,0) scale(1.14)', opacity: 1, offset: 0.72 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 }
    ], { duration: 430, delay: delay || 0, easing: 'cubic-bezier(.3,.7,.4,1)' });
    return apple;
  }

  function looseApple(size) {
    var node = el('span', 'l4-one');
    if (size) {
      node.style.width = size + 'px';
      node.style.height = Math.round(size * 1.1) + 'px';
    }
    node.innerHTML = APPLE;
    return node;
  }

  function bigNumber(value) {
    var node = el('div', 'l4-bignum', String(value));
    return node;
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    var stageRow = el('div', 'l4-stage');
    var frame = makeFrame({ cell: 38 });
    var ones = el('div', 'l4-ones');
    var i;
    for (i = 0; i < 3; i += 1) ones.appendChild(looseApple(32));
    stageRow.appendChild(frame.box);
    stageRow.appendChild(ones);
    host.appendChild(stageRow);

    await ctx.audio.play('lv04/t1_a');       // Let's count! We have one, two, three...
    if (!alive) return;
    await sleep(1000);

    var line = ctx.audio.play('lv04/t1_b');   // Look! Ten apples fill the box. This is a ten.
    for (i = 0; i < 10; i += 1) {
      flyIntoCell(frame, i, 190, -30, i * 85);
    }
    await line;
    if (!alive) return;

    frame.box.classList.add('is-full');
    await sleep(500);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    var stageRow = el('div', 'l4-stage');
    var frame = makeFrame({ cell: 36 });
    fillFrame(frame, 10);
    var ones = el('div', 'l4-ones');
    var loose = [];
    var i;
    for (i = 0; i < 3; i += 1) {
      var apple = looseApple(30);
      loose.push(apple);
      ones.appendChild(apple);
    }
    stageRow.appendChild(frame.box);
    stageRow.appendChild(ones);
    host.appendChild(stageRow);

    await ctx.audio.play('lv04/t2_a');       // Ten apples, and three more. How many in total?
    if (!alive) return;
    await sleep(1000);                        // 铁律：问句后停 1 秒自答

    var line = ctx.audio.play('lv04/t2_b');   // One, two, three... thirteen!
    var num = bigNumber(13);
    host.appendChild(num);
    popIn(num, 60);
    loose.forEach(function (node, k) { later(function () { bounce(node); }, 420 + k * 380); });
    await line;
    if (!alive) return;

    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    var stageRow = el('div', 'l4-stage l4-stage--pair');
    var left = makeFrame({ cell: 27 });
    fillFrame(left, 10);
    left.box.classList.add('is-ten');
    var right = makeFrame({ cell: 27 });
    stageRow.appendChild(left.box);
    stageRow.appendChild(right.box);
    host.appendChild(stageRow);

    await ctx.audio.play('lv04/t3_a');       // Here is one ten. Add six more. What number is it?
    if (!alive) return;
    await sleep(1000);                        // 铁律：问句后停 1 秒自答

    var line = ctx.audio.play('lv04/t3_b');   // One ten and six ones make sixteen.
    var i;
    for (i = 0; i < 6; i += 1) flyIntoCell(right, i, -170, -30, i * 130);
    await line;
    if (!alive) return;

    var num = bigNumber(16);
    host.appendChild(num);
    popIn(num, 0);
    await sleep(600);
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
        var hint = host.querySelector('.tap-hint');
        if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
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
    later(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 900);
  }

  function makeReplay(story, voiceKey) {
    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      ctx.audio.play('lv04/' + voiceKey);
    });
    story.appendChild(replay);
    return replay;
  }

  /** 干扰项优先取 ±2 / ±4，避免「相邻一个数」的蒙对 */
  function spreadOptions(answer, count, min, max) {
    var deltas = [2, -2, 4, -4, 3, -3, 1, -1, 5, -5];
    var out = [answer];
    for (var i = 0; i < deltas.length && out.length < count; i += 1) {
      var v = answer + deltas[i];
      if (v >= min && v <= max && out.indexOf(v) < 0) out.push(v);
    }
    return Engine.quiz.shuffle(out);
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

    function correct(node, extra) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);

      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));

      if (typeof extra === 'function') {
        extra(solved);
      } else if (solved.done) {
        later(function () { finish(solved.star); }, 620);
      } else {
        later(function () { askQuestion(root); }, 680);
      }
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
      shake(node);
    }

    if (q.type === 'count') buildCountQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') buildPickQuestion(q, story, tray, state, correct, wrong);
    else buildBuildQuestion(q, story, tray, state, correct, wrong);

    ctx.audio.play('lv04/' + q.voice);
  }

  /* ---- 题型 A：看十格阵 → 点数字 ---- */

  function buildCountQuestion(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones;

    var box = el('div', 'l4-count');
    var frame = makeFrame({ cell: 36 });
    fillFrame(frame, 10);
    frame.box.classList.add('is-ten');
    box.appendChild(frame.box);

    var ones = el('div', 'l4-ones l4-ones--row');
    ones.appendChild(el('span', 'l4-plus', '+'));
    for (var i = 0; i < q.ones; i += 1) ones.appendChild(looseApple(32));
    box.appendChild(ones);
    story.appendChild(box);

    var options = spreadOptions(answer, 3, 11, 19);

    function paint() {
      tray.innerHTML = '';
      options.forEach(function (value, i) {
        var key = el('button', 'numkey');
        key.type = 'button';
        key.dataset.value = String(value);
        key.setAttribute('aria-label', String(value));
        key.appendChild(el('span', 'numkey-digit', String(value)));
        key.addEventListener('click', function () { pick(value, key); });
        popIn(key, i * 60);
        tray.appendChild(key);
      });
    }

    function pick(value, key) {
      if (state.locked) return;
      if (value === answer) {
        frame.box.classList.add('is-full');
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

  /* ---- 题型 B：听数字 → 点对应的十格阵 ---- */

  function makePickCard(value) {
    var card = el('button', 'tf-option');
    card.type = 'button';
    card.dataset.value = String(value);

    var tens = makeFrame({ cell: 20 });
    fillFrame(tens, 10);
    tens.box.classList.add('is-ten');
    var ones = makeFrame({ cell: 20 });
    fillFrame(ones, value - 10);

    card.appendChild(tens.box);
    card.appendChild(el('span', 'tf-plus', '+'));
    card.appendChild(ones.box);
    return card;
  }

  function buildPickQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.target;
    var options = Engine.quiz.shuffle(q.options.slice());

    var list = el('div', 'l4-options');
    story.appendChild(list);

    function paint() {
      list.innerHTML = '';
      options.forEach(function (value, i) {
        var card = makePickCard(value);
        card.addEventListener('click', function () { pick(value, card); });
        popIn(card, i * 60);
        list.appendChild(card);
      });
    }

    function pick(value, card) {
      if (state.locked) return;
      if (value === answer) {
        card.classList.add('is-right');
        correct(card);
        return;
      }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(options, answer);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：拖拽苹果 → 凑出听到的数 ---- */

  function bindDrag(pile, target, onDrop) {
    var ghost = null;
    var startX = 0;
    var startY = 0;
    var moved = false;

    function placeGhost(x, y) {
      if (!ghost) return;
      ghost.style.left = x + 'px';
      ghost.style.top = y + 'px';
    }

    function cleanup() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    function onMove(e) {
      if (!ghost) return;
      if (Math.abs(e.clientX - startX) > 6 || Math.abs(e.clientY - startY) > 6) moved = true;
      placeGhost(e.clientX, e.clientY);
    }

    function onUp(e) {
      cleanup();
      if (!ghost) return;
      var box = target.getBoundingClientRect();
      var inside = e.clientX >= box.left && e.clientX <= box.right &&
        e.clientY >= box.top && e.clientY <= box.bottom;
      var node = ghost;
      ghost = null;
      node.style.transition = 'opacity 160ms ease';
      node.style.opacity = '0';
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 180);
      // 拖到框里，或只是点了一下苹果堆，都算「取一个苹果」
      if (inside || !moved) onDrop();
    }

    pile.addEventListener('pointerdown', function (e) {
      if (ghost) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      ghost = el('div', 'l4-ghost');
      ghost.innerHTML = APPLE;
      document.body.appendChild(ghost);
      placeGhost(e.clientX, e.clientY);
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });
  }

  function buildBuildQuestion(q, story, tray, state, correct, wrong) {
    var need = q.target - 10;
    // 允许凑多 3 块（十格阵只有 10 格，最多到 10）：不能「填到自动对」
    var limit = Math.min(need + 3, 10);
    var placed = 0;
    var takeHint = null;

    var row = el('div', 'l4-build');
    var left = makeFrame({ cell: 27 });
    fillFrame(left, 10);
    left.box.classList.add('is-ten');
    var right = makeFrame({ cell: 27 });
    row.appendChild(left.box);
    row.appendChild(right.box);
    story.appendChild(row);

    var pileWrap = el('div', 'l4-pile-wrap');
    var pile = el('div', 'l4-pile');
    for (var i = 0; i < 3; i += 1) pile.appendChild(looseApple(30));
    var hint = el('span', 'l4-pile-hint');
    hint.innerHTML = ICONS.handSmall;
    pileWrap.appendChild(pile);
    pileWrap.appendChild(hint);
    story.appendChild(pileWrap);

    // 托盘里只有一个「确认」键
    var check = el('button', 'submit-key');
    check.type = 'button';
    check.setAttribute('aria-label', 'Done');
    check.innerHTML = ICONS.check;
    check.addEventListener('click', submit);
    tray.appendChild(check);
    paintCheck();

    function paintCheck() {
      check.classList.toggle('is-dim', placed === 0);
    }

    function dropTakeHint() {
      if (takeHint) { remove(takeHint); takeHint = null; }
    }

    function showTakeHint() {
      if (!alive || state.locked || takeHint) return;
      takeHint = el('span', 'l4-take-hint');
      takeHint.innerHTML = ICONS.handSmall;
      row.appendChild(takeHint);
      later(dropTakeHint, 2800);
    }

    function drop() {
      if (state.locked || placed >= limit) return;
      var apple = fillFrame(right, placed + 1).pop();
      if (apple) popIn(apple, 0);
      placed += 1;
      Engine.sfx.tap();
      paintCheck();
    }

    // 点已放好的苹果 = 拿回最后一个
    function removeLast() {
      if (state.locked || placed === 0) return;
      var cell = right.cells[placed - 1];
      var node = cell ? cell.querySelector('.tf-apple') : null;
      if (cell) {
        cell.dataset.on = '0';
        cell.classList.remove('is-on');
      }
      placed -= 1;
      if (node) {
        var anim = node.animate([
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(.35)' }
        ], { duration: 190, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
        anim.finished.then(function () { remove(node); }, function () { remove(node); });
      }
      Engine.sfx.tap();
      paintCheck();
      dropTakeHint();
    }

    function submit() {
      if (state.locked) return;
      if (placed === 0) { shake(check); return; }

      if (placed === need) {
        right.box.classList.add('is-full');
        left.box.classList.add('is-full');
        var num = bigNumber(q.target);
        num.classList.add('l4-bignum--small');
        story.appendChild(num);
        popIn(num, 0);
        later(function () { correct(check); }, 520);
        return;
      }

      wrong(check);
      shake(row);
      if (placed > need) later(showTakeHint, 480);
    }

    bindDrag(pile, right.box, drop);

    // 点空格子 = 再放一个；点已放好的苹果 = 拿回一个
    right.box.addEventListener('pointerdown', function (e) {
      if (state.locked) return;
      var t = e.target;
      if (t && t.closest && t.closest('.tf-apple')) { removeLast(); return; }
      drop();
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

    if (ctx.quick) {          // 验收用：跳过教学，直接进题
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
  global.LEVELS[4] = {
    mount: mount,
    // 只读：给验收脚本用
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
