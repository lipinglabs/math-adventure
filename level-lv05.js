/* ============================================================
   level-lv05.js · Cookie Party（发饼干 · 11–19 场景互动）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     give   听数字 → 拖饼干进盒子（满 10 自动打包成一盒，再拖零散）
     count  看「一盒 + 零散」→ 点数字
     pick   听指令 → 点端着对应饼干的小动物
   铁律：全英文、教学问句 1 秒后自答、点按推进、
         十格阵 2 行 × 5 列、拖拽热区外扩且未命中平滑弹回。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;        // 拖拽命中热区：在视觉边界外再放 14px（§5.9）

  /* ---------------- 图形 ---------------- */

  var COOKIE =
    '<svg viewBox="0 0 40 40" aria-hidden="true">' +
    '<circle cx="20" cy="20" r="16.5" fill="#E9B96E"/>' +
    '<circle cx="20" cy="20" r="16.5" fill="none" stroke="#D19A4E" stroke-width="2"/>' +
    '<circle cx="14" cy="14.5" r="2.8" fill="#8B5A2B"/>' +
    '<circle cx="25.5" cy="12.5" r="2.1" fill="#8B5A2B"/>' +
    '<circle cx="26" cy="23.5" r="3" fill="#8B5A2B"/>' +
    '<circle cx="15" cy="25" r="2.4" fill="#8B5A2B"/>' +
    '<circle cx="20" cy="19" r="1.7" fill="#8B5A2B"/>' +
    '<ellipse cx="13.5" cy="12.5" rx="3.6" ry="2.3" fill="#fff" opacity=".34" ' +
    'transform="rotate(-30 13.5 12.5)"/>' +
    '</svg>';

  var ANIMALS = {
    bear:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle cx="11" cy="12" r="8" fill="#B98055"/><circle cx="37" cy="12" r="8" fill="#B98055"/>' +
      '<circle cx="11" cy="12" r="4.2" fill="#E3B489"/><circle cx="37" cy="12" r="4.2" fill="#E3B489"/>' +
      '<circle cx="24" cy="27" r="17" fill="#C68B5E"/>' +
      '<ellipse cx="24" cy="33" rx="9.5" ry="7" fill="#F0D3B4"/>' +
      '<ellipse cx="24" cy="30" rx="3.6" ry="2.8" fill="#6B4430"/>' +
      '<circle cx="18" cy="24" r="2.3" fill="#4A2E1E"/><circle cx="30" cy="24" r="2.3" fill="#4A2E1E"/>' +
      '<path d="M21 35c1.6 2 4.4 2 6 0" stroke="#6B4430" stroke-width="1.8" fill="none" stroke-linecap="round"/>' +
      '</svg>',
    puppy:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<ellipse cx="9" cy="21" rx="6.5" ry="11" fill="#B98B5E" transform="rotate(-14 9 21)"/>' +
      '<ellipse cx="39" cy="21" rx="6.5" ry="11" fill="#B98B5E" transform="rotate(14 39 21)"/>' +
      '<circle cx="24" cy="25" r="16" fill="#EBCBA4"/>' +
      '<ellipse cx="24" cy="31" rx="9" ry="7" fill="#FFF6E8"/>' +
      '<ellipse cx="24" cy="28" rx="3.4" ry="2.6" fill="#4A3428"/>' +
      '<circle cx="18" cy="22" r="2.3" fill="#4A3428"/><circle cx="30" cy="22" r="2.3" fill="#4A3428"/>' +
      '<path d="M24 31v3.5" stroke="#4A3428" stroke-width="1.6" stroke-linecap="round"/>' +
      '</svg>',
    cat:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M9 17 L11 4 L22 11 Z" fill="#F2B36B"/><path d="M39 17 L37 4 L26 11 Z" fill="#F2B36B"/>' +
      '<circle cx="24" cy="27" r="16" fill="#F5BF7D"/>' +
      '<circle cx="18" cy="24" r="2.4" fill="#4A3428"/><circle cx="30" cy="24" r="2.4" fill="#4A3428"/>' +
      '<path d="M21.5 30h5" stroke="#C4703C" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M15 33h-6M15 37h-6M33 33h6M33 37h6" stroke="#C4703C" stroke-width="1.3" ' +
      'opacity=".65" stroke-linecap="round"/>' +
      '</svg>',
    rabbit:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<ellipse cx="17" cy="9" rx="4.6" ry="10" fill="#F3EDE4" transform="rotate(-10 17 9)"/>' +
      '<ellipse cx="31" cy="9" rx="4.6" ry="10" fill="#F3EDE4" transform="rotate(10 31 9)"/>' +
      '<ellipse cx="17" cy="9" rx="2.2" ry="6" fill="#F3C7C2" transform="rotate(-10 17 9)"/>' +
      '<ellipse cx="31" cy="9" rx="2.2" ry="6" fill="#F3C7C2" transform="rotate(10 31 9)"/>' +
      '<circle cx="24" cy="30" r="14" fill="#F8F4EC"/>' +
      '<circle cx="19" cy="28" r="2.2" fill="#4A3428"/><circle cx="29" cy="28" r="2.2" fill="#4A3428"/>' +
      '<path d="M21 34q3 2.6 6 0" stroke="#C4703C" stroke-width="1.6" fill="none" stroke-linecap="round"/>' +
      '</svg>'
  };

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">' +
      '<path d="M18 26V11a3 3 0 0 1 6 0v10" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M24 21V9a3 3 0 0 1 6 0v12" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>' +
      '<path d="M30 22v-8a3 3 0 0 1 6 0v14c0 8-5 14-13 14s-12-5-12-12v-6a3 3 0 0 1 6 0v3" ' +
      'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    handSmall:
      '<svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true">' +
      '<path d="M18 26V11a3 3 0 0 1 6 0v10" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M24 21V9a3 3 0 0 1 6 0v12" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>' +
      '<path d="M30 22v-8a3 3 0 0 1 6 0v14c0 8-5 14-13 14s-12-5-12-12v-6a3 3 0 0 1 6 0v3" ' +
      'fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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

  function bounce(node) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-11px) scale(1.08)', offset: 0.4 },
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

  function cookieInCell(cell) {
    var cookie = el('span', 'tf-cookie');
    cookie.innerHTML = COOKIE;
    cell.appendChild(cookie);
    return cookie;
  }

  /** 填满前 n 格；返回新加的饼干节点 */
  function fillFrame(frame, n, animateIt) {
    var added = [];
    for (var i = 0; i < n && i < frame.cells.length; i += 1) {
      var cell = frame.cells[i];
      if (cell.dataset.on === '1') continue;
      cell.dataset.on = '1';
      cell.classList.add('is-on');
      var cookie = cookieInCell(cell);
      if (animateIt) popIn(cookie, i * 55);
      added.push(cookie);
    }
    return added;
  }

  /** 饼干从框外飞进指定格（只影响这一格，不挤压其它格） */
  function flyIntoCell(frame, index, dx, dy, delay) {
    var cell = frame.cells[index];
    if (!cell || cell.dataset.on === '1') return null;
    cell.dataset.on = '1';
    cell.classList.add('is-on');
    var cookie = cookieInCell(cell);
    animate(cookie, [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.6)', opacity: 0 },
      { transform: 'translate(0,0) scale(1.16)', opacity: 1, offset: 0.72 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 }
    ], { duration: 420, delay: delay || 0, easing: 'cubic-bezier(.3,.7,.4,1)' });
    return cookie;
  }

  function looseCookie(size) {
    var node = el('span', 'l5-one');
    if (size) {
      node.style.width = size + 'px';
      node.style.height = size + 'px';
    }
    node.innerHTML = COOKIE;
    return node;
  }

  function animalHead(key, size) {
    var node = el('div', 'l5-animal');
    if (size) {
      node.style.width = size + 'px';
      node.style.height = size + 'px';
    }
    node.innerHTML = ANIMALS[key] || ANIMALS.bear;
    return node;
  }

  function bigNumber(value) {
    return el('div', 'l5-bignum', String(value));
  }

  function plusSign() {
    return el('span', 'l5-plus', '+');
  }

  /* ---------------- 教学 ---------------- */

  function supplyRow(count, size, cols) {
    var row = el('div', 'l5-supply');
    row.style.gridTemplateColumns = 'repeat(' + (cols || 6) + ', ' + size + 'px)';
    var items = [];
    for (var i = 0; i < count; i += 1) {
      var node = looseCookie(size);
      row.appendChild(node);
      items.push(node);
    }
    return { node: row, items: items };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    var board = el('div', 'l5-board');
    board.appendChild(animalHead('puppy', 82));

    var stageRow = el('div', 'l5-stage');
    var frame = makeFrame({ cell: 46 });
    stageRow.appendChild(frame.box);
    board.appendChild(stageRow);
    host.appendChild(board);

    await ctx.audio.play('lv05/t1_a');       // Let's give the puppy some cookies. Let's count ten.
    if (!alive) return;

    var line = ctx.audio.play('lv05/t1_b');   // Ten cookies make one box. That's a ten!
    for (var i = 0; i < 10; i += 1) flyIntoCell(frame, i, 150, -20, i * 90);
    await line;
    if (!alive) return;

    frame.box.classList.add('is-full', 'is-packed');
    bounce(frame.box);
    var num = bigNumber(10);
    board.appendChild(num);
    popIn(num, 360);
    await sleep(700);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    var board = el('div', 'l5-board');
    board.appendChild(animalHead('puppy', 66));

    var stageRow = el('div', 'l5-stage');
    var frame = makeFrame({ cell: 31 });
    fillFrame(frame, 10);
    frame.box.classList.add('is-ten');
    stageRow.appendChild(frame.box);
    stageRow.appendChild(plusSign());

    // 5 块零散饼干排成 3 列（3 + 2），避免单排放不下被压成 4 + 1
    var loose = el('div', 'l5-loose');
    loose.style.gridTemplateColumns = 'repeat(3, 26px)';
    var items = [];
    for (var i = 0; i < 5; i += 1) {
      var node = looseCookie(26);
      items.push(node);
      loose.appendChild(node);
    }
    stageRow.appendChild(loose);
    board.appendChild(stageRow);
    host.appendChild(board);

    await ctx.audio.play('lv05/t2_a');       // Here is one full box of ten. And five more outside.
    if (!alive) return;

    await sleep(1000);                        // 铁律：问句前给一拍
    await ctx.audio.play('lv05/t2_q');         // How many cookies in total?
    if (!alive) return;

    await sleep(1000);                        // 铁律：问句后 1 秒必须自答
    var line = ctx.audio.play('lv05/t2_b');    // One ten and five ones make fifteen!
    var num = bigNumber(15);
    board.appendChild(num);
    popIn(num, 0);
    items.forEach(function (node, k) { later(function () { bounce(node); }, 260 + k * 300); });
    await line;
    if (!alive) return;

    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    var board = el('div', 'l5-board');
    board.appendChild(animalHead('bear', 56));

    var stageRow = el('div', 'l5-stage');
    var frame = makeFrame({ cell: 32 });
    var plate = el('div', 'l5-plate');
    stageRow.appendChild(frame.box);
    stageRow.appendChild(plate);
    board.appendChild(stageRow);

    var supply = supplyRow(18, 20, 6);
    board.appendChild(supply.node);
    host.appendChild(board);

    await ctx.audio.play('lv05/t3_a');       // Now, you try! Give the bear eighteen cookies.
    if (!alive) return;

    var i;
    for (i = 0; i < 10; i += 1) {
      if (supply.items[i]) supply.items[i].style.visibility = 'hidden';
      flyIntoCell(frame, i, 120, 60, i * 95);
    }
    await sleep(10 * 95 + 380);
    if (!alive) return;

    frame.box.classList.add('is-full', 'is-packed');
    bounce(frame.box);
    plate.classList.add('is-ready');
    await sleep(320);
    if (!alive) return;

    var line = ctx.audio.play('lv05/t3_b');   // One box of ten, and eight ones make eighteen.
    for (i = 0; i < 8; i += 1) {
      if (supply.items[10 + i]) supply.items[10 + i].style.visibility = 'hidden';
      var cookie = looseCookie(20);
      plate.appendChild(cookie);
      animate(cookie, [
        { transform: 'translate(90px, 90px) scale(.6)', opacity: 0 },
        { transform: 'translate(0,0) scale(1.18)', opacity: 1, offset: 0.7 },
        { transform: 'translate(0,0) scale(1)', opacity: 1 }
      ], { duration: 380, delay: i * 110 });
    }
    await sleep(8 * 110 + 380);
    if (!alive) return;

    var num = bigNumber(18);
    board.appendChild(num);
    popIn(num, 0);
    await line;
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

  /* ---------------- 拖拽（热区外扩 + 未命中平滑弹回） ---------------- */

  function bindDrag(pile, dropZone, handlers) {
    var ghost = null;
    var start = { x: 0, y: 0 };
    var origin = { x: 0, y: 0 };
    var moved = false;

    function place(x, y) {
      if (!ghost) return;
      ghost.style.left = x + 'px';
      ghost.style.top = y + 'px';
    }

    function detach() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    function onMove(e) {
      if (!ghost) return;
      if (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8) moved = true;
      place(e.clientX, e.clientY);
    }

    function onUp(e) {
      detach();
      if (!ghost) return;
      var node = ghost;
      ghost = null;

      var box = dropZone.getBoundingClientRect();
      var inside = e.clientX >= box.left - HIT_PAD && e.clientX <= box.right + HIT_PAD &&
        e.clientY >= box.top - HIT_PAD && e.clientY <= box.bottom + HIT_PAD;

      // 轻点苹果罐也算「取一个」，触屏兜底
      if (inside || !moved) {
        var shrink = node.animate([
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(.4)', opacity: 0 }
        ], { duration: 140, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
        shrink.finished.then(function () { remove(node); }, function () { remove(node); });
        handlers.onDrop();
        return;
      }

      // 未命中：平滑弹回原位，绝不落子
      var dx = origin.x - e.clientX;
      var dy = origin.y - e.clientY;
      var back = node.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + (dx * 0.55) + 'px,' + (dy * 0.55) + 'px) scale(.84)', opacity: 0.8, offset: 0.6 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.5)', opacity: 0 }
      ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
      back.finished.then(function () { remove(node); }, function () { remove(node); });
      if (handlers.onMiss) handlers.onMiss();
    }

    pile.addEventListener('pointerdown', function (e) {
      if (ghost) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();

      var rect = pile.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY };
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      moved = false;

      ghost = el('div', 'l5-ghost');
      ghost.innerHTML = COOKIE;
      document.body.appendChild(ghost);
      place(e.clientX, e.clientY);

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
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

  function makeReplay(story, voiceKey) {
    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      ctx.audio.play('lv05/' + voiceKey);
    });
    story.appendChild(replay);
  }

  /** 干扰项优先取 ±2 / ±4，避免「相邻一个数」蒙对 */
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

    if (q.type === 'give') buildGiveQuestion(q, story, tray, state, correct);
    else if (q.type === 'count') buildCountQuestion(q, story, tray, state, correct, wrong);
    else buildPickQuestion(q, story, tray, state, correct, wrong);

    ctx.audio.play('lv05/' + q.voice);
  }

  /* ---- 题型 A：听数字 → 拖饼干进盒子 ---- */

  function buildGiveQuestion(q, story, tray, state, correct) {
    var need = q.target;
    var placed = 0;

    var board = el('div', 'l5-board');
    board.appendChild(animalHead(q.animal, 54));

    var stageRow = el('div', 'l5-stage');
    var frame = makeFrame({ cell: 29 });
    var plate = el('div', 'l5-plate');
    stageRow.appendChild(frame.box);
    stageRow.appendChild(plate);
    board.appendChild(stageRow);

    var pileWrap = el('div', 'l5-pile-wrap');
    var pile = el('div', 'l5-pile');
    for (var i = 0; i < 5; i += 1) pile.appendChild(looseCookie(26));
    var hint = el('span', 'l5-pile-hint');
    hint.innerHTML = ICONS.handSmall;
    pileWrap.appendChild(pile);
    pileWrap.appendChild(hint);
    board.appendChild(pileWrap);
    story.appendChild(board);

    function pack() {
      frame.box.classList.add('is-full', 'is-packed');
      bounce(frame.box);
      plate.classList.add('is-ready');
    }

    function drop() {
      if (state.locked || placed >= need) return;

      if (placed < 10) {
        var cookie = fillFrame(frame, placed + 1).pop();
        if (cookie) popIn(cookie, 0);
        placed += 1;
        if (placed === 10) pack();
      } else {
        var loose = looseCookie(24);
        plate.appendChild(loose);
        popIn(loose, 0);
        placed += 1;
      }

      Engine.sfx.tap();
      if (placed >= need) {
        var num = bigNumber(need);
        num.classList.add('l5-bignum--small');
        board.appendChild(num);
        popIn(num, 0);
        burst(story);
        later(function () { correct(null); }, 560);
      }
    }

    bindDrag(pile, stageRow, { onDrop: drop });
    // 触屏兜底：直接点盒子区域也能放一块
    stageRow.addEventListener('pointerdown', function () {
      if (state.locked) return;
      drop();
    });
  }

  /* ---- 题型 B：看「一盒 + 零散」→ 点数字 ---- */

  function buildCountQuestion(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones;

    var board = el('div', 'l5-board l5-board--tight');
    board.appendChild(animalHead(q.animal, 50));

    var stageRow = el('div', 'l5-stage');
    var frame = makeFrame({ cell: 31 });
    fillFrame(frame, 10);
    frame.box.classList.add('is-ten');
    stageRow.appendChild(frame.box);
    stageRow.appendChild(plusSign());

    // 零散饼干固定 3 列：满盒 187px + 加号 + 3 列 24px 才能装进 354px 的内容宽
    var loose = el('div', 'l5-loose');
    loose.style.gridTemplateColumns = 'repeat(3, 24px)';
    for (var i = 0; i < q.ones; i += 1) loose.appendChild(looseCookie(24));
    stageRow.appendChild(loose);
    board.appendChild(stageRow);
    story.appendChild(board);

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
        popIn(key, i * 55);
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

  /* ---- 题型 C：听指令 → 点端着对应饼干的小动物 ---- */

  function makeAnimalCard(opt) {
    var card = el('button', 'l5-card');
    card.type = 'button';
    card.dataset.ones = String(opt.ones);

    card.appendChild(animalHead(opt.animal, 44));

    var frame = makeFrame({ cell: 19 });
    fillFrame(frame, 10);
    frame.box.classList.add('is-ten');
    card.appendChild(frame.box);

    var loose = el('div', 'l5-card-ones');
    for (var i = 0; i < opt.ones; i += 1) loose.appendChild(looseCookie(16));
    card.appendChild(loose);
    return card;
  }

  function buildPickQuestion(q, story, tray, state, correct, wrong) {
    var options = Engine.quiz.shuffle(q.options.map(function (o) { return { animal: o.animal, ones: o.ones }; }));
    var answer = null;
    options.forEach(function (o) { if (o.ones === q.ones) answer = o; });

    var list = el('div', 'l5-cards');
    story.appendChild(list);

    function paint() {
      list.innerHTML = '';
      options.forEach(function (opt, i) {
        var card = makeAnimalCard(opt);
        card.addEventListener('click', function () { pick(opt, card); });
        popIn(card, i * 60);
        list.appendChild(card);
      });
    }

    function pick(opt, card) {
      if (state.locked) return;
      if (opt === answer) {
        correct(card);
        return;
      }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(options, answer, function (o) { return o.animal + o.ones; });
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

    if (ctx.quick) {          // 验收用：跳过教学直接进题
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
    Array.prototype.slice.call(document.querySelectorAll('.l5-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[5] = {
    mount: mount,
    // 只读：给验收脚本用
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
