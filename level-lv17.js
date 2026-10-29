/* ============================================================
   level-lv17.js · Corn Basket（小猴子搬玉米 · 进位加法）
   ------------------------------------------------------------
   第三阶段第二关，接着讲凑十，换成「筐 + 地上的玉米」：
     教学 3 幕：① 筐里 8 个玉米 + 地上 5 个
                ② 小猴子把地上 2 个拖进筐 → 满十发光 + 打包
                ③ 竖式 8 + 5：5 拆成 2 和 3，2 飞过去凑成 10
     答题 10 题（整份打乱，三种题型）：
       fill  拖玉米把筐填满 → 再点总数（4 题）
       pick  听算式，点对应的那筐玉米（3 题）
       split 找拆分里缺的那个数（3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         凑十按 §5.15（发光 + 打包两拍）、拖拽按 §5.9、
         两段式按 §6.8（操作段不判分、选项最后出现、托盘预留高度）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;              // §5.9 落点热区外扩
  var TAP_SLOP = 8;              // 小于 8px 视为轻点
  var NEXT_MS = 700;             // 答对到下一题
  var SPLIT_HOLD = 1100;         // 拆分数答对后定格看两处填空

  /* ---------------- 玉米 / 小猴子 ---------------- */

  var CORN =
    '<svg viewBox="0 0 40 50" aria-hidden="true">' +
    // 两片叶子（先画，压在玉米后面）
    '<path d="M13 26c-6 8-6 17 0 20-7-1-10-10-8-17 1-4 4-6 8-3z" fill="#7FAE52"/>' +
    '<path d="M27 26c6 8 6 17 0 20 7-1 10-10 8-17-1-4-4-6-8-3z" fill="#93C063"/>' +
    // 玉米棒
    '<path d="M20 6c7.6 0 11.6 8.6 11.6 18.4C31.6 35.6 27 44 20 44s-11.6-8.4-11.6-19.6C8.4 14.6 12.4 6 20 6z" fill="#F7C948"/>' +
    '<path d="M20 6c7.6 0 11.6 8.6 11.6 18.4C31.6 35.6 27 44 20 44s-11.6-8.4-11.6-19.6C8.4 14.6 12.4 6 20 6z" ' +
    'fill="none" stroke="#E0A82F" stroke-width="1.6"/>' +
    // 玉米粒
    '<g fill="#FFDD70">' +
    '<ellipse cx="15.4" cy="14.6" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="20" cy="13.8" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="24.6" cy="14.6" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="13.6" cy="20.2" rx="2.4" ry="2.8"/>' +
    '<ellipse cx="18.2" cy="19.6" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="22.8" cy="19.8" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="26.4" cy="20.4" rx="2.4" ry="2.8"/>' +
    '<ellipse cx="15.4" cy="25.6" rx="2.4" ry="2.8"/>' +
    '<ellipse cx="20" cy="25" rx="2.5" ry="2.9"/>' +
    '<ellipse cx="24.6" cy="25.6" rx="2.4" ry="2.8"/>' +
    '<ellipse cx="17.6" cy="31" rx="2.4" ry="2.7"/>' +
    '<ellipse cx="22.4" cy="31" rx="2.4" ry="2.7"/>' +
    '</g>' +
    // 高光
    '<path d="M15 10.6c-2.4 3.2-3 7.4-2.6 11.4-2.6-4.6-1.4-10 2.6-11.4z" fill="#FFF3C4" opacity=".7"/>' +
    '</svg>';

  function monkeySVG() {
    return '' +
      '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      // 耳朵
      '<circle cx="12" cy="26" r="9" fill="#A9764C"/>' +
      '<circle cx="52" cy="26" r="9" fill="#A9764C"/>' +
      '<circle cx="12" cy="26" r="5" fill="#E7BE9C"/>' +
      '<circle cx="52" cy="26" r="5" fill="#E7BE9C"/>' +
      // 头
      '<ellipse cx="32" cy="30" rx="20" ry="19" fill="#B98153"/>' +
      // 脸
      '<ellipse cx="32" cy="34" rx="14.5" ry="12" fill="#F2D3B3"/>' +
      // 眼睛
      '<ellipse cx="25.6" cy="28" rx="2.6" ry="3" fill="#3B2A1C"/>' +
      '<ellipse cx="38.4" cy="28" rx="2.6" ry="3" fill="#3B2A1C"/>' +
      '<circle cx="26.5" cy="27" r="0.9" fill="#FFF"/>' +
      '<circle cx="39.3" cy="27" r="0.9" fill="#FFF"/>' +
      // 鼻子与嘴
      '<ellipse cx="32" cy="35" rx="3.2" ry="2.2" fill="#D9A379"/>' +
      '<path d="M26 39.4c2.4 3 9.6 3 12 0" fill="none" stroke="#8A5A32" stroke-width="2" stroke-linecap="round"/>' +
      '</svg>';
  }

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
      { transform: 'scale(1.18,.78)' },
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
        ctx.audio.play('lv17/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 筐与玉米 ---------------- */

  function corn() {
    var node = el('span', 'l17-corn');
    node.innerHTML = CORN;
    return node;
  }

  /** 十格阵（§5.8：2 行 × 5 列，左上 → 右下），外面套一层筐 */
  function basket(filled, frameCls) {
    var wrap = el('div', 'l17-basket');
    var frame = el('div', 'tenframe ' + (frameCls || 'l17-frame'));
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var c = el('div', 'tf-cell');
      if (i < filled) {
        c.classList.add('is-on');
        c.appendChild(corn());
      }
      frame.appendChild(c);
      cells.push(c);
    }
    wrap.appendChild(frame);
    var tag = el('span', 'l17-tag', '10');
    wrap.appendChild(tag);
    return { node: wrap, frame: frame, cells: cells, tag: tag };
  }

  /** 地上的玉米：固定格位，被搬走后占位仍在（§5.7） */
  function groundRow(count, cols) {
    var grid = el('div', 'l17-ground');
    grid.style.setProperty('--cols', String(cols));
    var slots = [];
    var items = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('span', 'l17-slot');
      var c = corn();
      slot.appendChild(c);
      grid.appendChild(slot);
      slots.push(slot);
      items.push(c);
    }
    return { node: grid, slots: slots, corns: items };
  }

  /** 玉米沿弧线飞进筐里某一格 */
  function flyArc(cell, from, delay) {
    var c = cell.getBoundingClientRect();
    var f = from ? from.getBoundingClientRect() : c;
    var dx = Math.round((f.left + f.width / 2) - (c.left + c.width / 2));
    var dy = Math.round((f.top + f.height / 2) - (c.top + c.height / 2));
    cell.classList.add('is-on');
    var item = corn();
    cell.appendChild(item);
    return animate(item, [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.2)' },
      { transform: 'translate(' + Math.round(dx * 0.44) + 'px,' + (Math.round(dy * 0.44) - 30) + 'px) scale(1.12)', offset: 0.45 },
      { transform: 'translate(0,' + (-6) + 'px) scale(1.08)', offset: 0.82 },
      { transform: 'translate(0,0) scale(1)' }
    ], { duration: 520, delay: delay || 0, easing: 'cubic-bezier(.34,.62,.36,1)' });
  }

  function monkey(size) {
    var node = el('div', 'l17-monkey');
    if (size) node.style.setProperty('--m', size + 'px');
    node.innerHTML = monkeySVG();
    return node;
  }

  /* ---------------- 教学第一幕：8 + 5 ---------------- */

  function teachBoard() {
    var board = el('div', 'l17-board l17-board--teach');
    var b = basket(8);
    var ground = groundRow(5, 2);
    board.appendChild(b.node);
    board.appendChild(ground.node);
    var m = monkey();
    board.appendChild(m);
    return { node: board, basket: b, ground: ground, monkey: m };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';
    var b = teachBoard();
    host.appendChild(b.node);
    popIn(b.basket.node);
    popIn(b.ground.node, 120);
    popIn(b.monkey, 260);

    // Look! The little monkey has eight corn in the basket.
    await saySeq(['t1_a']);
    if (!alive) return;
    // And five more corn on the ground.
    await saySeq(['t1_b']);
    if (!alive) return;
    await sleep(1000);                      // 教学节拍：停 1 秒
  }

  /* ---------------- 教学第二幕：搬两个凑十 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';
    var b = teachBoard();
    host.appendChild(b.node);
    popIn(b.basket.node);
    popIn(b.ground.node, 120);
    popIn(b.monkey, 200);
    await sleep(360);
    if (!alive) return;

    // We move two corn to fill the basket. Now we have ten!
    var voice = saySeq(['t2_a']);
    await sleep(1500);                      // 跟着「We move two corn」起飞
    if (!alive) return;

    for (var i = 0; i < 2; i += 1) {
      if (!alive) return;
      var src = b.ground.corns[4 - i];
      if (src) src.classList.add('is-gone');
      bounce(b.monkey, 0);                  // 小猴子每搬一个颠一下
      await flyArc(b.basket.cells[8 + i], src, 0);
      if (i === 0) await sleep(90);
    }
    if (!alive) return;

    b.basket.frame.classList.add('is-full');   // 满十发光（§5.15.3）
    Engine.sfx.tap();
    await sleep(230);
    if (!alive) return;
    b.basket.node.classList.add('is-pack');    // 打包成一筐
    later(function () { Engine.sfx.tap(); }, 110);

    await voice;
    if (!alive) return;
    await sleep(1000);                      // 停顿 1 秒

    // And there are three corn left on the ground.
    await saySeq(['t2_b']);
    if (!alive) return;
    // Ten plus three equals thirteen. Eight plus five equals thirteen!
    await saySeq(['t2_c']);
    if (!alive) return;
    await sleep(260);
  }

  /* ---------------- 教学第三幕：拆数凑十 ---------------- */

  function chainTile(text, cls) {
    return el('span', 'l17-tile' + (cls ? ' ' + cls : ''), text);
  }

  /**
   * 拆数链（竖着展开的三行，每行都等于同一个和）：
   *   8 + 5 = 13
   *   8 + 2 + ? = 13
   *   10 + ? = 13
   * 两个 ? 是同一个数，答对时一起填上。
   */
  function buildChain(a, b, split, total, opts) {
    opts = opts || {};
    var box = el('div', 'l17-chain');

    function row(items, cls) {
      var r = el('div', 'l17-crow' + (cls ? ' ' + cls : ''));
      items.forEach(function (it) { r.appendChild(it); });
      box.appendChild(r);
      return r;
    }

    function op(txt) { return chainTile(txt, 'l17-op'); }

    var bTile = chainTile(String(b), 'l17-b');
    var splitTile = chainTile(String(split), 'l17-split-tile' + (opts.hideSplit ? ' is-hidden' : ''));
    var tenTile = chainTile('10', opts.hideTen ? 'is-hidden' : '');
    var blank2 = chainTile('?', 'l17-q');
    var blank3 = chainTile('?', 'l17-q');

    var r1 = row([chainTile(String(a), 'l17-a'), op('+'), bTile, op('='), chainTile(String(total), 'l17-total')]);
    var r2 = row([chainTile(String(a)), op('+'), splitTile, op('+'), blank2, op('='), chainTile(String(total))]);
    var r3 = row([tenTile, op('+'), blank3, op('='), chainTile(String(total)), ], 'l17-row3');

    return {
      node: box, r1: r1, r2: r2, r3: r3,
      aTile: r1.firstChild, bTile: bTile,
      splitTile: splitTile, tenTile: tenTile,
      blank2: blank2, blank3: blank3
    };
  }

  /**
   * 把第二个加数拆开：一枚「2」从 5 那格飞向 8，凑成 10。
   * 落定后揭出拆分格与 10 那一行，再把两个空填上。
   */
  function splitDemo(chain, split, rest) {
    var box = chain.node;
    var bb = chain.bTile.getBoundingClientRect();
    var pb = box.getBoundingClientRect();
    var tb = chain.splitTile.getBoundingClientRect();

    var chip = el('span', 'l17-chip', String(split));
    chip.style.left = Math.round(bb.left - pb.left + bb.width / 2) + 'px';
    chip.style.top = Math.round(bb.top - pb.top + bb.height / 2) + 'px';
    box.appendChild(chip);

    var dx = Math.round((tb.left + tb.width / 2) - (bb.left + bb.width / 2));
    var dy = Math.round((tb.top + tb.height / 2) - (bb.top + bb.height / 2));

    return animate(chip, [
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.12)', opacity: 1, offset: 0.3 },
      { transform: 'translate(-50%,-50%) scale(1) translate(6px,' + Math.round(bb.height * 0.5) + 'px)', opacity: 1, offset: 0.6 },
      { transform: 'translate(-50%,-50%) scale(.9) translate(' + (dx + 6) + 'px,' + (dy + bb.height * 0.5) + 'px)', opacity: 0.25 }
    ], { duration: 760, easing: 'cubic-bezier(.34,1.2,.5,1)' }).then(function () {
      remove(chip);
      chain.splitTile.classList.remove('is-hidden');
      popIn(chain.splitTile);
      bounce(chain.splitTile);
      if (chain.tenTile) {
        chain.tenTile.classList.remove('is-hidden');
        popIn(chain.tenTile);
      }
      later(function () {
        fillBlanks(chain, rest);
      }, 260);
    });
  }

  /** 两个空同时填上同一个数 */
  function fillBlanks(chain, value) {
    [chain.blank2, chain.blank3].forEach(function (blank, i) {
      if (!blank) return;
      blank.classList.add('is-flip');
      later(function () {
        blank.textContent = String(value);
        blank.classList.remove('is-flip');
        blank.classList.add('is-filled');
        bounce(blank);
      }, 160 + i * 90);
    });
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';
    var chain = buildChain(8, 5, 2, 13, { hideSplit: true, hideTen: true });
    host.appendChild(chain.node);
    popIn(chain.node);

    // When we add, we first make a ten, then add the rest.
    var voice = saySeq(['t3_a']);
    await sleep(900);
    if (!alive) return;

    await splitDemo(chain, 2, 3);
    if (!alive) return;

    await voice;
    if (!alive) return;
    await sleep(240);

    // Eight plus five equals thirteen.
    await saySeq(['t3_b']);
    if (!alive) return;
    chain.r3.classList.add('is-lit');
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
      var key = el('button', 'l17-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l17-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：拖玉米填满筐 → 点总数 ---------------- */

  function buildFill(q, story, tray, state, correct, wrong) {
    var need = 10 - q.inBasket;
    var left = q.ground - need;
    var answer = 10 + left;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var board = el('div', 'l17-board');
    var b = basket(q.inBasket);
    b.frame.setAttribute('aria-label', 'basket with ' + q.inBasket + ' corn');
    var ground = groundRow(q.ground, q.ground >= 6 ? 3 : 2);
    board.appendChild(b.node);
    board.appendChild(ground.node);
    story.appendChild(board);
    popIn(board);

    state.filled = q.inBasket;

    var hint = null;
    var hintTimer = setTimeout(function () {
      if (!alive || state.filled > q.inBasket) return;
      hint = el('div', 'l17-hint');
      hint.innerHTML = ICONS.hand;
      b.node.appendChild(hint);
      b.node.classList.add('is-hint');
    }, 3400);
    timers.push(hintTimer);

    function dropHint() {
      clearTimeout(hintTimer);
      if (hint) { remove(hint); hint = null; }
      b.node.classList.remove('is-hint');
    }

    function nextEmpty() {
      for (var i = 0; i < 10; i += 1) {
        if (!b.cells[i].classList.contains('is-on')) return i;
      }
      return -1;
    }

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) { correct(key); return; }
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
      b.frame.classList.add('is-full');
      Engine.sfx.tap();
      later(function () {
        b.node.classList.add('is-pack');
        Engine.sfx.tap();
      }, 240);
      // 填满之后才问总数（§6.8：操作段不判分、选项最后出现）
      later(function () {
        if (!alive) return;
        saySeq(['a_total_q']);
        later(paint, 700);
      }, 640);
    }

    function place(src, slot) {
      if (state.locked || state.fillDone) return false;
      var idx = nextEmpty();
      if (idx < 0) return false;
      src.classList.add('is-gone');
      if (slot) slot.classList.add('is-used');
      var cell = b.cells[idx];
      cell.classList.add('is-on');
      var c = corn();
      cell.appendChild(c);
      snapPop(c);
      Engine.sfx.tap();
      state.filled += 1;
      dropHint();
      if (state.filled >= 10) completeFill();
      return true;
    }

    ground.corns.forEach(function (src, i) {
      var slot = ground.slots[i];
      var ghost = null;
      var start = { x: 0, y: 0 };
      var origin = { x: 0, y: 0 };
      var moved = false;
      var detach = null;

      function canDrag() {
        return alive && !state.locked && !state.fillDone;
      }

      function onMove(e) {
        if (!canDrag()) return;
        if (!moved) {
          if (Math.abs(e.clientX - start.x) <= TAP_SLOP &&
              Math.abs(e.clientY - start.y) <= TAP_SLOP) return;
          moved = true;
          var r = src.getBoundingClientRect();
          origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          ghost = corn();
          ghost.classList.add('l17-ghost');
          ghost.style.width = r.width + 'px';
          ghost.style.height = r.height + 'px';
          ghost.style.left = e.clientX + 'px';
          ghost.style.top = e.clientY + 'px';
          document.body.appendChild(ghost);
          src.classList.add('is-dragging');
          b.node.classList.add('is-target');
        }
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
      }

      function onUp(e) {
        if (detach) { detach(); detach = null; }
        if (!moved) {
          place(src, slot);            // 轻点兜底（§5.9.2）
          return;
        }
        src.classList.remove('is-dragging');
        b.node.classList.remove('is-target');

        var box = b.node.getBoundingClientRect();
        var hit = e.clientX >= box.left - HIT_PAD && e.clientX <= box.right + HIT_PAD &&
                  e.clientY >= box.top - HIT_PAD && e.clientY <= box.bottom + HIT_PAD;

        if (hit && ghost && nextEmpty() >= 0) {
          var gnode = ghost;
          ghost = null;
          var cell = b.cells[nextEmpty()];
          var cb = cell.getBoundingClientRect();
          var gb = gnode.getBoundingClientRect();
          var mx = Math.round((cb.left + cb.width / 2) - (gb.left + gb.width / 2));
          var my = Math.round((cb.top + cb.height / 2) - (gb.top + gb.height / 2));
          gnode.animate([
            { transform: 'translate(-50%,-50%) translate(0,0) scale(1.12)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + mx + 'px,' + my + 'px) scale(.8)', opacity: 1 }
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

    saySeq([q.voice[0]]);
  }

  /* ---------------- 题型 B：听算式，点对应的那筐 ---------------- */

  function pickCard(group) {
    var card = el('button', 'l17-pick');
    card.type = 'button';
    card.dataset.basket = String(group.basket);
    card.dataset.ground = String(group.ground);
    card.setAttribute('aria-label',
      group.basket + ' corn in the basket and ' + group.ground + ' on the ground');

    var b = basket(group.basket, 'l17-miniframe');
    b.node.classList.add('l17-minib');
    card.appendChild(b.node);

    var g = el('div', 'l17-miniground');
    for (var i = 0; i < group.ground; i += 1) {
      var c = corn();
      c.classList.add('l17-minicorn');
      g.appendChild(c);
    }
    card.appendChild(g);
    return card;
  }

  function buildPick(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.groups.map(function (g) {
      return { basket: g.basket, ground: g.ground };
    }));
    var keyOf = function (g) { return g.basket + '+' + g.ground; };
    var target = q.groups[q.answer];

    var board = el('div', 'l17-picks');
    story.appendChild(board);
    makeReplay(story, q.voice);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (g, i) {
        var card = pickCard(g);
        card.dataset.key = keyOf(g);
        card.addEventListener('click', function () { pick(g, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function markRight(card) {
      card.classList.add('is-right');
      var badge = el('span', 'l17-check');
      badge.innerHTML = ICONS.check;
      card.appendChild(badge);
      popIn(badge, 40);
      snapPop(card);
    }

    function pick(g, card) {
      if (state.locked || state.busy) return;
      if (g.basket === target.basket && g.ground === target.ground) {
        markRight(card);
        Engine.sfx.tap();
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
        Engine.quiz.reshuffle(list, target, keyOf);
        state.busy = false;
        paint();
      }, 320);
    }

    paint();
  }

  /* ---------------- 题型 C：找拆分里缺的数 ---------------- */

  function buildSplit(q, story, tray, state, correct, wrong) {
    var answer = q.b - q.split;
    var options = Engine.quiz.shuffle(q.options.slice());
    var shown = false;

    var chain = buildChain(q.a, q.b, q.split, q.total);
    story.appendChild(chain.node);
    popIn(chain.node);

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          key.classList.add('is-right');
          fillBlanks(chain, answer);
          later(function () {
            chain.r3.classList.add('is-lit');
            Engine.sfx.correct();
            later(function () { Engine.sfx.star(); }, 90);
          }, 380);
          correct(null, SPLIT_HOLD);
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

    paint();
    saySeq(q.voice.concat(['c_ask_q']));
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();

    var q = queue[session.index];
    if (!q) return;

    root.innerHTML = '';
    Array.prototype.slice.call(document.querySelectorAll('.l17-ghost'))
      .forEach(function (n) { remove(n); });
    renderId += 1;

    var wrap = el('div', 'lv');
    var story = el('div', 'lv-story');
    var tray = el('div', 'lv-tray l17-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    if (q.type === 'pick') tray.classList.remove('l17-tray');

    var state = { locked: false, busy: false, errors: 0, filled: 0 };

    if (q.type === 'pick') {
      makeReplay(story, q.voice);
    } else {
      makeReplay(story, q.voice);
    }

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type !== 'pick' && q.type !== 'split') {
        Engine.sfx.correct();
        later(function () { Engine.sfx.star(); }, 90);
        burst(story);
      }
      if (q.type === 'split' && node) node.classList.add('is-right');

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
    else if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else buildSplit(q, story, tray, state, correct, wrong);

    if (q.type === 'pick') saySeq(q.voice);
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
      .call(document.querySelectorAll('.l17-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[17] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
