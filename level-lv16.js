/* ============================================================
   level-lv16.js · Make Ten（满十进一 · 进位加法）
   ------------------------------------------------------------
   第三阶段开场。核心是把「凑十」讲清楚：
     教学 3 幕：① 十格阵 9 个红苹果 + 外面 4 个蓝苹果
                ② 1 个蓝苹果飞进第 10 格 → 满十发光 + 打包成一整盒
                ③ 竖式 9 + 4 = 13，进位币飞进十位，十位的 1 高亮闪烁
     答题 10 题（整份打乱，三种题型）：
       fill   看凑十动画 → 点数字结果（4 题）
       drag   自己把苹果拖进十格阵凑满 → 再点总数（3 题）
       wrong  三句里找出错的那一句，答对后翻结果改正（3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         十格阵按 §5.8（2×5、左上到右下、满十强化）；
         拖拽按 §5.9（HIT_PAD=14、轻点兜底、未命中 320ms 弹回）；
         拖满再问按 §6.8（操作段不判分、选项最后出现、托盘预留高度）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;              // §5.9 落点热区外扩
  var TAP_SLOP = 8;              // 小于 8px 视为轻点
  var NEXT_MS = 700;             // 答对到下一题
  var FIX_HOLD = 1500;           // 找错句答对后定格演示改正（§6.11）

  /* ---------------- 苹果 ---------------- */

  function appleSVG(fill) {
    return '<svg viewBox="0 0 40 44" aria-hidden="true">' +
      '<path d="M20 12c-3-4-10-5-14 0-5 6-3 17 3 24 3 4 7 6 11 6s8-2 11-6c6-7 8-18 3-24-4-5-11-4-14 0z" ' +
      'fill="' + fill + '"/>' +
      '<ellipse cx="13" cy="21" rx="3.6" ry="5.4" fill="#fff" opacity=".42" transform="rotate(-22 13 21)"/>' +
      '<path d="M20 12c0-4 2-7 6-8" stroke="#8B5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<path d="M26 5c4-3 8 0 7 3-3 2-7 1-7-3z" fill="#6FA84E"/>' +
      '</svg>';
  }

  var APPLE_RED = appleSVG('#E4574E');
  var APPLE_BLUE = appleSVG('#5B9FE3');

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
      { opacity: 0, transform: 'scale(.7)' },
      { opacity: 1, transform: 'scale(1.06)', offset: 0.66 },
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
      { transform: 'scale(1.16,.8)' },
      { transform: 'scale(.94,1.08)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' });
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
        ctx.audio.play('lv16/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 十格阵与苹果 ---------------- */

  function apple(kind) {
    var node = el('span', 'l16-apple');
    node.innerHTML = kind === 'blue' ? APPLE_BLUE : APPLE_RED;
    return node;
  }

  /** 十格阵：2 行 × 5 列，左上 → 右下（§5.8） */
  function tenFrame(filled, kind) {
    var box = el('div', 'tenframe l16-frame');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var c = el('div', 'tf-cell');
      if (i < filled) {
        c.classList.add('is-on');
        c.appendChild(apple(kind));
      }
      box.appendChild(c);
      cells.push(c);
    }
    return { node: box, cells: cells };
  }

  /** 满十之后打包成一整盒：金色封边 + 「10」标签 */
  function packedBox(frame) {
    var box = el('div', 'l16-box');
    box.appendChild(frame.node);
    var lid = el('div', 'l16-lid');
    lid.appendChild(el('span', 'l16-tag', '10'));
    lid.appendChild(el('i', 'l16-shine'));
    box.appendChild(lid);
    return box;
  }

  /** 散落苹果：固定格位，被拿走后占位仍在（§5.7） */
  function looseGrid(count, kind, cols) {
    var grid = el('div', 'l16-loose');
    grid.style.setProperty('--cols', String(cols));
    var slots = [];
    var apples = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('span', 'l16-slot');
      var a = apple(kind);
      slot.appendChild(a);
      grid.appendChild(slot);
      slots.push(slot);
      apples.push(a);
    }
    return { node: grid, slots: slots, apples: apples };
  }

  /** 苹果从外部格位飞进十格阵的某一格 */
  function flyIn(cell, from, kind, delay) {
    var c = cell.getBoundingClientRect();
    var f = from ? from.getBoundingClientRect() : c;
    var dx = Math.round((f.left + f.width / 2) - (c.left + c.width / 2));
    var dy = Math.round((f.top + f.height / 2) - (c.top + c.height / 2));
    cell.classList.add('is-on');
    var a = apple(kind);
    cell.appendChild(a);
    return animate(a, [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.24)' },
      { transform: 'translate(0,0) scale(1.12)', offset: 0.78 },
      { transform: 'translate(0,0) scale(1)' }
    ], { duration: 460, delay: delay || 0, easing: 'cubic-bezier(.32,.72,.36,1)' });
  }

  /* ---------------- 教学第一幕：9 + 4 ---------------- */

  function teachBoard() {
    var board = el('div', 'l16-board');
    var frame = tenFrame(9, 'red');
    frame.node.setAttribute('aria-label', 'ten frame with nine apples');
    var box = packedBox(frame);
    var loose = looseGrid(4, 'blue', 2);
    board.appendChild(box);
    board.appendChild(loose.node);
    return { node: board, box: box, frame: frame, loose: loose };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';
    var b = teachBoard();
    host.appendChild(b.node);
    popIn(b.box);
    popIn(b.loose.node, 140);

    // Look! Nine apples in the box, and four outside. Let's add them.
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                      // 教学节拍：停 1 秒
  }

  /* ---------------- 教学第二幕：凑十 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';
    var b = teachBoard();
    host.appendChild(b.node);
    popIn(b.box);
    popIn(b.loose.node, 120);
    await sleep(360);
    if (!alive) return;

    // We move one apple to fill the ten! Now the box is full.
    var voice = saySeq(['t2_a']);
    await sleep(1500);                       // 跟着「We move one apple to fill the ten!」起飞
    if (!alive) return;

    var src = b.loose.apples[3];
    if (src) src.classList.add('is-gone');
    await flyIn(b.frame.cells[9], src, 'blue', 0);
    if (!alive) return;

    b.frame.node.classList.add('is-full');   // 满十发光（§5.8.4）
    Engine.sfx.tap();
    await sleep(230);
    if (!alive) return;
    b.box.classList.add('is-packed');        // 打包成一整盒
    later(function () { Engine.sfx.tap(); }, 110);

    await voice;
    if (!alive) return;
    await sleep(1000);                      // 停顿 1 秒

    // So, nine plus one is ten. And three more ones make thirteen.
    await saySeq(['t2_b']);
    if (!alive) return;
    // Nine plus four equals thirteen!
    await saySeq(['t2_c']);
    if (!alive) return;
    await sleep(260);
  }

  /* ---------------- 教学第三幕：竖式与进位 ---------------- */

  function buildSum() {
    var sum = el('div', 'l16-vsum');

    // 竖式两列：十位列 + 个位列；「+」右对齐放在十位列里，紧贴个位数字
    function row(tens, ones, op) {
      var r = el('div', 'l16-vrow');
      var t = el('span', 'l16-vnum l16-vnum--t' + (op ? ' is-op' : ''), tens);
      var o = el('span', 'l16-vnum', ones);
      r.appendChild(t);
      r.appendChild(o);
      sum.appendChild(r);
      return { row: r, tens: t, ones: o };
    }

    var r1 = row('', '9');
    var r2 = row('+', '4', true);
    sum.appendChild(el('div', 'l16-vline'));
    var r3 = row('', '');
    return { node: sum, top: r1, add: r2, res: r3 };
  }

  /** 进位币：从个位一格飞到十位，代表「满十进一」 */
  function carryCoin(sum, fromEl, toEl) {
    var f = fromEl.getBoundingClientRect();
    var t = toEl.getBoundingClientRect();
    var sb = sum.getBoundingClientRect();
    var coin = el('span', 'l16-carry', '10');
    coin.style.left = Math.round(f.left - sb.left + f.width / 2) + 'px';
    coin.style.top = Math.round(f.top - sb.top + f.height / 2) + 'px';
    sum.appendChild(coin);

    var dx = Math.round((t.left + t.width / 2) - (f.left + f.width / 2));
    var dy = Math.round((t.top + t.height / 2) - (f.top + f.height / 2));

    return animate(coin, [
      { transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.14)', opacity: 1, offset: 0.32 },
      { transform: 'translate(-50%,-50%) scale(1) translate(0,-24px)', opacity: 1, offset: 0.58 },
      { transform: 'translate(-50%,-50%) scale(.9) translate(' + dx + 'px,' + (dy - 4) + 'px)', opacity: 0.25 }
    ], { duration: 780, easing: 'cubic-bezier(.34,1.2,.5,1)' }).then(function () {
      remove(coin);
    });
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';
    var sum = buildSum();
    host.appendChild(sum.node);
    popIn(sum.node);

    // When the ones are full, we make a new ten.
    var voice = saySeq(['t3_a']);
    await sleep(1050);
    if (!alive) return;

    // 个位先落下 3（剩下的三个一）
    sum.res.ones.textContent = '3';
    popIn(sum.res.ones);
    await sleep(240);
    if (!alive) return;

    // 进位币飞进十位 → 十位的 1 高亮闪烁
    await carryCoin(sum.node, sum.res.ones, sum.res.tens);
    if (!alive) return;
    sum.res.tens.textContent = '1';
    sum.res.tens.classList.add('is-carry');
    popIn(sum.res.tens);

    await voice;
    if (!alive) return;
    await sleep(240);

    // Nine plus four equals thirteen!
    await saySeq(['t2_c']);
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
      var key = el('button', 'l16-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l16-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  function opText(op) {
    return op === '+' ? '+' : '\u2212';
  }

  function valueOf(a, b, op) {
    return op === '+' ? a + b : a - b;
  }

  /* ---------------- 题型 A：看凑十动画 → 点结果 ---------------- */

  function buildFill(q, story, tray, state, correct, wrong) {
    var need = 10 - q.inFrame;
    var left = q.outside - need;
    var answer = 10 + left;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var board = el('div', 'l16-board');
    var frame = tenFrame(q.inFrame, 'red');
    frame.node.setAttribute('aria-label', 'ten frame with ' + q.inFrame + ' apples');
    var box = packedBox(frame);
    var loose = looseGrid(q.outside, 'blue', q.outside >= 5 ? 3 : 2);
    board.appendChild(box);
    board.appendChild(loose.node);
    story.appendChild(board);
    popIn(board);

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
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

    function maybePaint() {
      if (state.fillDone && state.voiceDone) paint();
    }

    saySeq(q.voice).then(function () {
      state.voiceDone = true;
      maybePaint();
    });

    // 自动演示：外面最后 need 只苹果飞进去填满十格阵
    (async function demo() {
      await sleep(2000);          // 等「Eight apples in the box. Five more outside.」说完
      for (var i = 0; i < need; i += 1) {
        if (!alive || state.locked) return;
        var src = loose.apples[q.outside - 1 - i];
        if (src) src.classList.add('is-gone');
        await flyIn(frame.cells[q.inFrame + i], src, 'blue', 0);
        if (i < need - 1) await sleep(90);
      }
      if (!alive || state.locked) return;
      frame.node.classList.add('is-full');
      Engine.sfx.tap();
      await sleep(240);
      if (!alive || state.locked) return;
      box.classList.add('is-packed');
      later(function () { Engine.sfx.tap(); }, 110);
      state.fillDone = true;
      maybePaint();
    })();
  }

  /* ---------------- 题型 B：拖苹果凑满十格阵 ---------------- */

  function buildDrag(q, story, tray, state, correct, wrong) {
    var need = 10 - q.inFrame;
    var left = q.outside - need;
    var answer = 10 + left;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var board = el('div', 'l16-drag');
    var frame = tenFrame(q.inFrame, 'red');
    frame.node.setAttribute('aria-label', 'ten frame with ' + q.inFrame + ' apples');
    var box = packedBox(frame);
    var pile = looseGrid(q.outside, 'blue', q.outside === 6 ? 3 : 4);
    board.appendChild(box);
    board.appendChild(pile.node);
    story.appendChild(board);
    popIn(board);

    state.filled = q.inFrame;

    var hint = null;
    var hintTimer = setTimeout(function () {
      if (!alive || state.filled > q.inFrame) return;
      hint = el('div', 'l16-hint');
      hint.innerHTML = ICONS.hand;
      box.appendChild(hint);
      box.classList.add('is-hint');
    }, 3400);
    timers.push(hintTimer);

    function dropHint() {
      clearTimeout(hintTimer);
      if (hint) { remove(hint); hint = null; }
      box.classList.remove('is-hint');
    }

    function nextEmpty() {
      for (var i = 0; i < 10; i += 1) {
        if (!frame.cells[i].classList.contains('is-on')) return i;
      }
      return -1;
    }

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
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

    function completeFill() {
      if (state.fillDone) return;
      state.fillDone = true;
      dropHint();
      frame.node.classList.add('is-full');
      Engine.sfx.tap();
      later(function () {
        box.classList.add('is-packed');
        Engine.sfx.tap();
      }, 240);
      // 凑满之后才问总数（§6.8：操作段不判分、选项最后出现）
      later(function () {
        if (!alive) return;
        saySeq(['b_total_q']);
        later(paint, 760);
      }, 640);
    }

    function place(src, slot) {
      if (state.locked || state.fillDone) return false;
      var idx = nextEmpty();
      if (idx < 0) return false;
      src.classList.add('is-gone');
      if (slot) slot.classList.add('is-used');
      var cell = frame.cells[idx];
      cell.classList.add('is-on');
      var a = apple('blue');
      cell.appendChild(a);
      snapPop(a);
      Engine.sfx.tap();
      state.filled += 1;
      dropHint();
      if (state.filled >= 10) completeFill();
      return true;
    }

    // 每一只散落苹果都是一个可拖的源；落到框里任意位置即吸附到下一个空格
    pile.apples.forEach(function (src, i) {
      var slot = pile.slots[i];
      var ghost = null;
      var start = { x: 0, y: 0 };
      var origin = { x: 0, y: 0 };
      var moved = false;
      var detach = null;

      function onMove(e) {
        if (!canDrag()) return;
        if (!moved) {
          if (Math.abs(e.clientX - start.x) <= TAP_SLOP &&
              Math.abs(e.clientY - start.y) <= TAP_SLOP) return;
          moved = true;
          var r = src.getBoundingClientRect();
          origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          ghost = apple('blue');
          ghost.classList.add('l16-ghost');
          ghost.style.width = r.width + 'px';
          ghost.style.height = r.height + 'px';
          ghost.style.left = e.clientX + 'px';
          ghost.style.top = e.clientY + 'px';
          document.body.appendChild(ghost);
          src.classList.add('is-dragging');
          box.classList.add('is-target');
        }
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
      }

      function canDrag() {
        return alive && !state.locked && !state.fillDone;
      }

      function onUp(e) {
        if (detach) { detach(); detach = null; }
        if (!moved) {
          place(src, slot);           // 轻点兜底（§5.9.2）：直接放进下一个空格
          return;
        }
        src.classList.remove('is-dragging');
        box.classList.remove('is-target');

        var b = box.getBoundingClientRect();
        var hit = e.clientX >= b.left - HIT_PAD && e.clientX <= b.right + HIT_PAD &&
                  e.clientY >= b.top - HIT_PAD && e.clientY <= b.bottom + HIT_PAD;

        if (hit && ghost && nextEmpty() >= 0) {
          // 幽灵先飞到那个空格里，落定再换成本体（吸附的「咔哒」感）
          var gnode = ghost;
          ghost = null;
          var cell = frame.cells[nextEmpty()];
          var cb = cell.getBoundingClientRect();
          var gb = gnode.getBoundingClientRect();
          var mx = Math.round((cb.left + cb.width / 2) - (gb.left + gb.width / 2));
          var my = Math.round((cb.top + cb.height / 2) - (gb.top + gb.height / 2));
          gnode.animate([
            { transform: 'translate(-50%,-50%) translate(0,0) scale(1.15)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + mx + 'px,' + my + 'px) scale(.84)', opacity: 1 }
          ], { duration: 150, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }).finished.then(function () {
            remove(gnode);
            place(src, slot);
          }, function () { remove(gnode); place(src, slot); });
          return;
        }

        if (ghost) {
          var gnode2 = ghost;
          ghost = null;
          var g = gnode2.getBoundingClientRect();
          var dx = origin.x - (g.left + g.width / 2);
          var dy = origin.y - (g.top + g.height / 2);
          gnode2.animate([
            { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + (dx * 0.55) + 'px,' + (dy * 0.55) + 'px) scale(.86)', opacity: 0.85, offset: 0.62 },
            { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.55)', opacity: 0 }
          ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' }).finished
            .then(function () { remove(gnode2); }, function () { remove(gnode2); });
        }
      }

      src.addEventListener('pointerdown', function (e) {
        if (!canDrag()) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();
        start = { x: e.clientX, y: e.clientY };
        moved = false;
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
        detach = function () {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        };
      });
    });

    saySeq(['b_fill_q']);
  }

  /* ---------------- 题型 C：找错误算式 ---------------- */

  function sentenceRow(entry) {
    var row = el('div', 'l16-sent');
    row.appendChild(el('span', 'l16-stile', String(entry.a)));
    row.appendChild(el('span', 'l16-sop', opText(entry.op)));
    row.appendChild(el('span', 'l16-stile', String(entry.b)));
    row.appendChild(el('span', 'l16-sop', '='));
    var res = el('span', 'l16-stile l16-stile--res', String(entry.shown));
    row.appendChild(res);
    return { node: row, res: res };
  }

  function buildWrong(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l16-sents');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      return { a: s.a, b: s.b, op: s.op, shown: s.shown };
    }));
    var keyOf = function (s) { return s.a + s.op + s.b + '=' + s.shown; };
    var bad = null;
    list.forEach(function (s) {
      if (valueOf(s.a, s.b, s.op) !== s.shown) bad = s;
    });

    function paint() {
      board.innerHTML = '';
      list.forEach(function (entry, i) {
        var card = el('button', 'l16-scard');
        card.type = 'button';
        card.dataset.key = keyOf(entry);
        card.setAttribute('aria-label',
          entry.a + (entry.op === '+' ? ' plus ' : ' minus ') + entry.b + ' equals ' + entry.shown);
        var s = sentenceRow(entry);
        card.appendChild(s.node);
        card._res = s.res;
        card.addEventListener('click', function () { pick(entry, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    function showFix(card, entry) {
      var trueVal = valueOf(entry.a, entry.b, entry.op);
      var res = card._res;
      res.classList.add('is-flip');
      later(function () {
        res.textContent = String(trueVal);
        res.classList.remove('is-flip');
        res.classList.add('is-fixed');
        var mark = el('span', 'l16-tick');
        mark.innerHTML = ICONS.check;
        card.appendChild(mark);
        popIn(mark);
        bounce(res);
      }, 260);
    }

    function pick(entry, card) {
      if (state.locked || state.busy) return;
      if (entry === bad) {
        correct(card, FIX_HOLD);
        showFix(card, entry);
        return;
      }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, bad, keyOf);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();

    var q = queue[session.index];
    if (!q) return;

    root.innerHTML = '';
    Array.prototype.slice.call(document.querySelectorAll('.l16-ghost'))
      .forEach(function (n) { remove(n); });
    renderId += 1;

    var wrap = el('div', 'lv');
    var story = el('div', 'lv-story');
    var tray = el('div', 'lv-tray l16-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    if (q.type === 'wrong') tray.classList.remove('l16-tray');

    if (q.type === 'drag') {
      makeReplay(story, function () {
        return state.fillDone ? ['b_total_q'] : ['b_fill_q'];
      });
    } else {
      makeReplay(story, q.voice);
    }

    var state = { locked: false, busy: false, errors: 0, filled: 0 };

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);
      burst(story);

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

    if (q.type === 'fill') buildFill(q, story, tray, state, correct, wrong);
    else if (q.type === 'drag') buildDrag(q, story, tray, state, correct, wrong);
    else buildWrong(q, story, tray, state, correct, wrong);

    if (q.type === 'wrong') saySeq(q.voice);
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
    Array.prototype.slice
      .call(document.querySelectorAll('.l16-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[16] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
