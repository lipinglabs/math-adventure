/* ============================================================
   level-lv20.js · Borrow a Ten（借十法 · 退位减法）
   ------------------------------------------------------------
   第三阶段第五关：个位不够减，就去十位借一个十回来。
     教学 3 幕：① 果篮里一个十 + 右边两个 = 十二，要拿走八
                ② 小人跑到果篮前，把那个十拖过来散成十个一 → 十二个一
                ③ 竖式 12 − 8：十位的 1 借走变 0，个位的 2 变成 12
     答题 10 题（整份打乱，三种题型）：
       borrow  把果篮里的十拖到个位垫上散开 → 拿走 b 个 → 点「还剩几个」（4 题）
       pick    听算式，点出对应的拆分图（3 题，三张图的总数互不相同）
       wrong   三句里找错的一句（3 题，答对后翻结果格改正）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         §5.7 只隐藏自身不重排；§5.9 热区外扩 14px、未命中平滑弹回；
         §5.11 落位挤压；§6.8 两段式；§6.11 找错句只翻结果格并定格 1.5 秒。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;             // 答对到下一题
  var WRONG_HOLD = 1500;         // 找错句答对后的定格
  var HIT_PAD = 14;              // §5.9 落点热区外扩
  var TAP_SLOP = 8;              // 位移小于此值视为轻点（§5.9.2）
  var SLOTS = 15;                // 个位垫固定 5 × 3 格位
  var MAT_COLS = 5;
  var MAT_ROWS = 3;
  var TEN = 10;

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
      'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    /* 帮忙搬十的小人：圆头 + 小身子 + 会摆的腿 */
    buddy:
      '<svg class="l20-buddy-svg" viewBox="0 0 64 80" width="58" height="72" aria-hidden="true">' +
      '<ellipse class="bd-shadow" cx="32" cy="75.5" rx="14" ry="3.1"/>' +
      '<rect class="bd-leg" x="24.4" y="56" width="5.6" height="15" rx="2.8"/>' +
      '<rect class="bd-leg bd-leg--b" x="34" y="56" width="5.6" height="15" rx="2.8"/>' +
      '<path class="bd-body" d="M18 40c0-8 6-13 14-13s14 5 14 13v11c0 6-5.6 9-14 9s-14-3-14-9z"/>' +
      '<circle class="bd-head" cx="32" cy="25" r="16.5"/>' +
      '<circle class="bd-ear" cx="17" cy="21" r="6.4"/>' +
      '<circle class="bd-ear" cx="47" cy="21" r="6.4"/>' +
      '<circle class="bd-eye" cx="25.6" cy="25" r="2.7"/>' +
      '<circle class="bd-eye" cx="38.4" cy="25" r="2.7"/>' +
      '<circle class="bd-cheek" cx="20.4" cy="31" r="3.3"/>' +
      '<circle class="bd-cheek" cx="43.6" cy="31" r="3.3"/>' +
      '<path class="bd-mouth" d="M28.2 31.4c1.5 2.2 6.1 2.2 7.6 0"/>' +
      '<path class="bd-arm" d="M18.4 41.5c-4 1.4-5.6 4.3-4.8 7.4"/>' +
      '<path class="bd-arm bd-arm--b" d="M45.6 41.5c4 1.4 5.6 4.3 4.8 7.4"/>' +
      '</svg>'
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
        ctx.audio.play('lv20/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 苹果 / 果篮 / 个位垫 ---------------- */

  function appleNode(cls) {
    return el('span', 'l20-apple' + (cls ? ' ' + cls : ''));
  }

  /** 果篮：一个整十。10 个苹果固定 5 × 2，运走时只隐藏自身（§5.7） */
  function basketNode() {
    var box = el('div', 'l20-basket');
    var inner = el('div', 'l20-basket-in');
    var apples = [];
    for (var i = 0; i < TEN; i += 1) {
      var a = appleNode();
      inner.appendChild(a);
      apples.push(a);
    }
    box.appendChild(inner);
    var badge = el('span', 'l20-ten-badge', '10');
    badge.setAttribute('aria-hidden', 'true');
    box.appendChild(badge);
    return { node: box, inner: inner, apples: apples, badge: badge };
  }

  /**
   * 个位垫：格位一次性建满，苹果只在格位里出现 / 隐藏（§5.7）。
   * 自下往上填：第 0 个苹果落在左下角，和果篮同坐在一条桌沿上；
   * 坐标由 index 一次定死，后面拿走多少个都不重排。
   */
  function matNode() {
    var mat = el('div', 'l20-mat');
    var cells = [];
    for (var i = 0; i < SLOTS; i += 1) {
      var slot = el('div', 'l20-slot');
      slot.style.gridRow = String(MAT_ROWS - Math.floor(i / MAT_COLS));
      slot.style.gridColumn = String((i % MAT_COLS) + 1);
      var a = appleNode('is-hidden');
      slot.appendChild(a);
      mat.appendChild(slot);
      cells.push({ slot: slot, apple: a, index: i });
    }
    return { node: mat, cells: cells };
  }

  function showOnes(st, from, count, step) {
    for (var i = 0; i < count; i += 1) {
      (function (n) {
        var cell = st.mat.cells[from + n];
        if (!cell) return;
        cell.apple.classList.remove('is-hidden');
        popIn(cell.apple, (step || 0) * n);
        st.filled += 1;
      })(i);
    }
  }

  /** 果篮里的十散开：10 个苹果从果篮飞进个位垫的空格（§5.11 三段形变） */
  function scatterTen(st, from) {
    if (!st || !st.mat) return 0;
    var bRect = st.basket.node.getBoundingClientRect();
    for (var i = 0; i < TEN; i += 1) {
      (function (n) {
        var cell = st.mat.cells[from + n];
        if (!cell) return;
        var sRect = cell.slot.getBoundingClientRect();
        var bx = bRect.left + bRect.width * (0.18 + (n % 5) * 0.16);
        var by = bRect.top + bRect.height * (n < 5 ? 0.42 : 0.62);
        var fx = bx - (sRect.left + sRect.width / 2);
        var fy = by - (sRect.top + sRect.height / 2);
        cell.apple.style.setProperty('--fx', Math.round(fx) + 'px');
        cell.apple.style.setProperty('--fy', Math.round(fy) + 'px');
        cell.apple.style.setProperty('--d', (n * 52) + 'ms');
        cell.apple.classList.remove('is-hidden');
        cell.apple.classList.add('is-fly');
        st.filled += 1;
        var src = st.basket.apples[n];
        src.style.setProperty('--d', (n * 52) + 'ms');
        src.classList.add('is-used');
      })(i);
    }
    return 700 + TEN * 52;
  }

  function takeAway(st, from, count) {
    for (var i = 0; i < count; i += 1) {
      (function (n) {
        var cell = st.mat.cells[from + n];
        if (!cell) return;
        var a = cell.apple;
        a.classList.remove('is-fly');
        a.style.setProperty('--dx', (((n % 3) - 1) * 18) + 'px');
        a.style.setProperty('--rot', ((n % 2 ? 1 : -1) * 22) + 'deg');
        a.style.setProperty('--d', (n * 76) + 'ms');
        a.classList.add('is-away');
        later(function () { a.classList.add('is-gone'); }, 560 + n * 76);
      })(i);
    }
    return 560 + count * 76;
  }

  /** 领圈：只框住还在场的那几个（§5.7.7） */
  function ringAround(scene, cells, keep) {
    if (!scene || !keep.length) return null;
    var sb = scene.getBoundingClientRect();
    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    keep.forEach(function (i) {
      var r = cells[i].slot.getBoundingClientRect();
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    var pad = 7;
    var ring = el('div', 'l20-ring');
    ring.style.left = Math.round(left - sb.left - pad) + 'px';
    ring.style.top = Math.round(top - sb.top - pad) + 'px';
    ring.style.width = Math.round(right - left + pad * 2) + 'px';
    ring.style.height = Math.round(bottom - top + pad * 2) + 'px';
    scene.appendChild(ring);
    popIn(ring);
    return ring;
  }

  /* ---------------- 场（果篮 + 个位垫） ---------------- */

  function buildScene(onesCount) {
    var scene = el('div', 'l20-scene');
    var basket = basketNode();
    var mat = matNode();
    scene.appendChild(basket.node);
    scene.appendChild(mat.node);
    var st = { scene: scene, basket: basket, mat: mat, filled: 0 };
    showOnes(st, 0, onesCount, 0);
    return st;
  }

  function buddyNode() {
    var node = el('div', 'l20-buddy');
    node.innerHTML = ICONS.buddy;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function runBuddy(scene, buddy, target) {
    var sRect = scene.getBoundingClientRect();
    var tRect = target.getBoundingClientRect();
    var bRect = buddy.getBoundingClientRect();
    var fromX = Math.max(0, sRect.width - bRect.width - 2);
    // 停在果篮右半侧、贴着它去够那个十（左侧出屏，只能从右边伸手）
    var toX = Math.max(0, tRect.right - sRect.left - bRect.width + 16);
    buddy.classList.add('is-on', 'is-run');
    buddy.style.setProperty('--bx', Math.round(fromX) + 'px');
    var anim = buddy.animate([
      { transform: 'translateX(' + Math.round(fromX) + 'px) translateY(0)' },
      { transform: 'translateX(' + Math.round(fromX + (toX - fromX) * 0.5) + 'px) translateY(-7px)', offset: 0.55 },
      { transform: 'translateX(' + Math.round(toX) + 'px) translateY(0)' }
    ], { duration: 780, easing: 'cubic-bezier(.34,.9,.5,1)', fill: 'both' });
    return anim.finished.then(function () {
      buddy.classList.remove('is-run');
      anim.cancel();
      buddy.style.setProperty('--bx', Math.round(toX) + 'px');
      buddy.classList.add('is-arrive');
    }, function () { /* 已取消 */ });
  }

  /* ---------------- 拖拽（§5.9） ---------------- */

  function beginDrag(e, cfg) {
    var startX = e.clientX;
    var startY = e.clientY;
    var ghost = cfg.ghost();
    var r = cfg.source.getBoundingClientRect();
    ghost.style.left = (r.left + r.width / 2) + 'px';
    ghost.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(ghost);
    cfg.source.classList.add('is-lifted');

    var moved = 0;

    function move(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      moved = Math.max(moved, Math.sqrt(dx * dx + dy * dy));
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.10) + 'deg)';
      if (cfg.onMove) cfg.onMove(ev);
    }

    function detach() {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    }

    function up(ev) {
      detach();
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      var hit = moved < TAP_SLOP || cfg.hit(ev.clientX, ev.clientY);
      cfg.source.classList.remove('is-lifted');
      if (hit) {
        if (cfg.dropGhost) cfg.dropGhost(ghost, dx, dy);
        else remove(ghost);
        cfg.onDrop();
        return;
      }
      // §5.9.3 三段回弹：55% 回移 + .84 → 回到原位 .5 淡出
      var anim = ghost.animate([
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 },
        {
          transform: 'translate(-50%,-50%) translate(' + Math.round(dx * 0.45) + 'px,' + Math.round(dy * 0.45) + 'px) scale(.84)',
          opacity: .8,
          offset: .55
        },
        { transform: 'translate(-50%,-50%) translate(0,0) scale(.5)', opacity: 0 }
      ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });
      anim.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
      if (cfg.onBounce) cfg.onBounce();
    }

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function ghostTen() {
    var g = el('div', 'l20-ghost');
    var inner = el('div', 'l20-ghost-in');
    for (var i = 0; i < TEN; i += 1) inner.appendChild(el('i', 'l20-dot'));
    g.appendChild(inner);
    var badge = el('span', 'l20-ghost-badge', '10');
    g.appendChild(badge);
    return g;
  }

  function ghostApple() {
    return appleNode('l20-ghost-apple');
  }

  function insidePad(rect, x, y) {
    return x >= rect.left - HIT_PAD && x <= rect.right + HIT_PAD &&
           y >= rect.top - HIT_PAD && y <= rect.bottom + HIT_PAD;
  }

  /* ---------------- 数字块 / 竖式 ---------------- */

  function tile(text, cls) {
    return el('span', 'l20-tile' + (cls ? ' ' + cls : ''), text);
  }

  function op(text) {
    return el('span', 'l20-op', text);
  }

  function vsum() {
    var box = el('div', 'l20-vsum');
    var rows = el('div', 'l20-vrows');

    function vrow(opText, tContent, oContent) {
      var r = el('div', 'l20-vrow');
      var t = el('span', 'l20-vcell l20-vcell--t' + (opText ? ' is-op' : ''));
      var o = el('span', 'l20-vcell');
      if (opText) t.textContent = opText;
      if (tContent) t.appendChild(tContent);
      if (oContent) o.appendChild(oContent);
      r.appendChild(t);
      r.appendChild(o);
      rows.appendChild(r);
      return { row: r, tens: t, ones: o };
    }

    function digit(text) {
      return el('i', 'l20-vdigit', text);
    }

    var r1 = vrow('', digit('1'), digit('2'));
    var r2 = vrow('−', null, digit('8'));
    var line = el('div', 'l20-vline');
    var r3 = vrow('', null, null);
    box.appendChild(rows);
    return { node: box, rows: rows, r1: r1, r2: r2, r3: r3, line: line };
  }

  function borrowMark(cell, text) {
    var mark = el('b', 'l20-vmark', text);
    cell.appendChild(mark);
    return mark;
  }

  /** 借位币：从十位飞到个位，落定才揭示新的数字（§5.15.5 手法） */
  function flyCoin(box, fromCell, toCell) {
    var bb = box.getBoundingClientRect();
    var f = fromCell.getBoundingClientRect();
    var t = toCell.getBoundingClientRect();
    var coin = el('span', 'l20-coin', '1');
    coin.style.left = Math.round(f.left - bb.left + f.width / 2) + 'px';
    coin.style.top = Math.round(f.top - bb.top + f.height / 2) + 'px';
    box.appendChild(coin);
    var dx = Math.round(t.left - f.left);
    var dy = Math.round(t.top - f.top);
    var anim = coin.animate([
      { transform: 'translate(-50%,-50%) scale(.9)', opacity: 0 },
      { transform: 'translate(-50%,-50%) translate(' + Math.round(dx * 0.4) + 'px,' + Math.round(dy * 0.4 - 26) + 'px) scale(1.12)', opacity: 1, offset: .45 },
      { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 }
    ], { duration: 620, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'both' });
    return anim.finished.then(function () {
      remove(coin);
    }, function () { remove(coin); });
  }

  /* ---------------- 教学第一幕：一个十 + 两个 = 十二 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l20-teach');
    var st = buildScene(2);
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // Look! One ten and two ones make twelve.
    await saySeq(['t1_a']);
    if (!alive) return;

    // Now, we need to take away eight.
    await saySeq(['t1_b']);
    if (!alive) return;
    await sleep(1000);

    // But we only have two ones. That's not enough!
    var v3 = saySeq(['t1_c']);
    await sleep(760);
    if (!alive) return;
    st.mat.cells[0].apple.classList.add('is-worry');
    st.mat.cells[1].apple.classList.add('is-worry');
    shake(st.mat.cells[0].apple);
    later(function () { shake(st.mat.cells[1].apple); }, 110);

    await v3;
    if (!alive) return;
    await sleep(320);
    st.mat.cells[0].apple.classList.remove('is-worry');
    st.mat.cells[1].apple.classList.remove('is-worry');
  }

  /* ---------------- 教学第二幕：借十 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l20-teach');
    var st = buildScene(2);
    wrap.appendChild(st.scene);
    var buddy = buddyNode();
    st.scene.appendChild(buddy);
    host.appendChild(wrap);
    popIn(st.scene);

    // So, we borrow one ten from the tens!
    var v1 = saySeq(['t2_a']);
    await sleep(320);
    if (!alive) return;
    await runBuddy(st.scene, buddy, st.basket.node);
    if (!alive) return;

    st.basket.node.classList.add('is-grab');
    Engine.sfx.tap();
    buddy.classList.add('is-cheer');

    await v1;
    if (!alive) return;
    await sleep(200);

    // Now we have twelve ones.
    var v2 = saySeq(['t2_b']);
    st.basket.node.classList.remove('is-grab');
    scatterTen(st, 2);
    await sleep(1120);
    if (!alive) return;
    st.basket.node.classList.add('is-empty');
    await v2;
    if (!alive) return;
    await sleep(1000);                       // 停顿 1 秒

    // Twelve minus eight equals four.
    var v3 = saySeq(['t2_c']);
    await sleep(240);
    if (!alive) return;
    takeAway(st, 4, 8);
    await v3;
    if (!alive) return;
    await sleep(220);

    // So, twelve minus eight equals four!
    var v4 = saySeq(['t2_d']);
    var keep = [0, 1, 2, 3];
    var ring = ringAround(st.scene, st.mat.cells, keep);
    keep.forEach(function (i, n) {
      later(function () { bounce(st.mat.cells[i].apple); }, n * 80);
    });
    Engine.sfx.star();
    await v4;
    if (!alive) return;
    await sleep(320);
    remove(ring);
  }

  /* ---------------- 教学第三幕：竖式里的借位 ---------------- */

  function stepRow(a, opText, b, res, cls) {
    var r = el('div', 'l20-step' + (cls ? ' ' + cls : ''));
    r.appendChild(tile(String(a)));
    r.appendChild(op(opText));
    r.appendChild(tile(String(b)));
    r.appendChild(op('='));
    r.appendChild(tile(String(res), 'l20-step-res'));
    return r;
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l20-teach');
    var v = vsum();
    wrap.appendChild(v.node);
    v.rows.insertBefore(v.line, v.r3.row);

    var steps = el('div', 'l20-steps');
    var s1 = stepRow(12, '−', 8, 4, 'is-hidden');
    steps.appendChild(s1);
    wrap.appendChild(steps);

    host.appendChild(wrap);
    popIn(v.node);

    // When we don't have enough ones, we borrow a ten.
    var v1 = saySeq(['t3_a']);
    await sleep(1500);
    if (!alive) return;
    // 十位那一位开始发光，等「borrow a ten」这句落点
    v.r1.tens.classList.add('is-armed');

    await v1;
    if (!alive) return;
    await sleep(240);

    // One ten becomes zero. And two ones become twelve.
    var v2 = saySeq(['t3_b']);
    await sleep(120);
    if (!alive) return;
    flyCoin(v.node, v.r1.tens, v.r1.ones);
    await sleep(660);
    if (!alive) return;

    v.r1.tens.classList.remove('is-armed');
    v.r1.tens.classList.add('is-borrowed');
    v.r1.ones.classList.add('is-borrowed');
    var markT = borrowMark(v.r1.tens, '0');
    var markO = borrowMark(v.r1.ones, '12');
    popIn(markT, 40);
    later(function () { popIn(markO); }, 620);
    snapPop(v.r1.ones);

    await v2;
    if (!alive) return;
    await sleep(300);

    // Twelve minus eight equals four.（复用第二幕那句）
    var v3 = saySeq(['t2_c']);
    await sleep(420);
    if (!alive) return;
    s1.classList.remove('is-hidden');
    popIn(s1);
    v.r3.ones.textContent = '4';
    v.r3.ones.classList.add('is-res');
    popIn(v.r3.ones);
    snapPop(v.r3.ones);
    Engine.sfx.star();

    await v3;
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
      var key = el('button', 'l20-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l20-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：拖十 → 散开 → 拿走 → 点剩余 ---------------- */

  function buildBorrow(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var ones = q.a - TEN;
    var options = Engine.quiz.shuffle(q.options.slice());

    var wrap = el('div', 'l20-teach l20-teach--quiz');
    var st = buildScene(ones);
    wrap.appendChild(st.scene);
    story.appendChild(wrap);
    popIn(st.scene);

    makeReplay(story, function () {
      return state.askShown ? ['a_ask_q'] : q.voice;
    });

    var hint = null;
    var hintTimer = setTimeout(function () {
      if (!alive || state.broken || state.locked) return;
      hint = el('div', 'l20-hint');
      hint.innerHTML = ICONS.hand;
      st.basket.node.appendChild(hint);
      st.basket.node.classList.add('is-armed');
    }, 2800);

    function dropHint() {
      clearTimeout(hintTimer);
      if (hint) { remove(hint); hint = null; }
      st.basket.node.classList.remove('is-armed');
    }

    function borrow() {
      if (state.broken || state.locked) return;
      state.broken = true;
      dropHint();
      st.basket.node.classList.add('is-grab');
      Engine.sfx.tap();
      later(function () {
        if (!alive) return;
        st.basket.node.classList.remove('is-grab');
        st.basket.node.classList.add('is-empty', 'is-done');
        scatterTen(st, ones);
        // 十个一就位后才允许拿走（散开动画 700ms + 10 × 52ms）
        later(function () {
          if (!alive) return;
          for (var i = 0; i < q.a; i += 1) bindTake(st.mat.cells[i]);
        }, 760);
      }, 260);
    }

    function ask() {
      if (state.askShown) return;
      state.askShown = true;
      later(function () {
        if (!alive) return;
        saySeq(['a_ask_q']);
        renderKeys();
      }, 280);
    }

    function bindTake(cell) {
      var a = cell.apple;
      if (a.dataset.bound === '1') return;
      a.dataset.bound = '1';
      a.classList.add('is-takeable');
      a.addEventListener('pointerdown', function (e) {
        if (!alive || state.locked || state.removed >= q.b) return;
        if (a.classList.contains('is-away') || a.classList.contains('is-gone')) return;
        e.preventDefault();
        e.stopPropagation();
        if (state.dragging) return;
        state.dragging = true;
        beginDrag(e, {
          source: a,
          ghost: ghostApple,
          hit: function () { return true; },        // 苹果松手就算拿走（离开垫子）
          dropGhost: function (ghost, dx, dy) {
            var anim = ghost.animate([
              { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1)', opacity: 1 },
              { transform: 'translate(-50%,-50%) translate(' + (dx + 8) + 'px,' + (dy - 70) + 'px) scale(.72) rotate(18deg)', opacity: 0 }
            ], { duration: 380, easing: 'cubic-bezier(.34,.9,.5,1)', fill: 'both' });
            anim.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
          },
          onDrop: function () { state.dragging = false; takeCell(cell); },
          onBounce: function () { state.dragging = false; }
        });
      });
    }

    function takeCell(cell) {
      if (state.locked || state.removed >= q.b) return;
      var a = cell.apple;
      if (a.classList.contains('is-away') || a.classList.contains('is-gone')) return;
      a.classList.remove('is-fly');
      a.style.setProperty('--dx', (((state.removed % 3) - 1) * 16) + 'px');
      a.style.setProperty('--rot', (state.removed % 2 ? 22 : -22) + 'deg');
      a.style.setProperty('--d', '0ms');
      a.classList.add('is-away');
      later(function () { a.classList.add('is-gone'); }, 520);
      state.removed += 1;
      Engine.sfx.tap();
      if (state.removed >= q.b) ask();
    }

    // 果篮 = 那个十：可拖（落在个位垫热区内松开）也可轻点
    st.basket.node.setAttribute('role', 'button');
    st.basket.node.setAttribute('tabindex', '0');
    st.basket.node.setAttribute('aria-label', 'Borrow a ten');
    st.basket.node.addEventListener('pointerdown', function (e) {
      if (!alive || state.broken || state.locked) return;
      e.preventDefault();
      if (state.dragging) return;
      state.dragging = true;
      beginDrag(e, {
        source: st.basket.node,
        ghost: ghostTen,
        hit: function (x, y) {
          return insidePad(st.mat.node.getBoundingClientRect(), x, y);
        },
        onMove: function (ev) {
          st.mat.node.classList.toggle('is-target',
            insidePad(st.mat.node.getBoundingClientRect(), ev.clientX, ev.clientY));
        },
        onDrop: function () {
          state.dragging = false;
          st.mat.node.classList.remove('is-target');
          borrow();
        },
        onBounce: function () {
          state.dragging = false;
          st.mat.node.classList.remove('is-target');
        }
      });
    });

    function renderKeys() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          burst(story);
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

    tray.classList.add('l20-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：听算式，点拆分图 ---------------- */

  function splitCard(pair) {
    var loose = pair[1];
    var card = el('button', 'l20-pcard');
    card.type = 'button';
    card.dataset.key = '10-' + loose;
    card.setAttribute('aria-label', 'Ten and ' + loose);

    var ten = el('div', 'l20-tenblock');
    for (var i = 0; i < TEN; i += 1) ten.appendChild(el('i', 'l20-dot'));
    var tenBadge = el('span', 'l20-tenblock-badge', '10');
    ten.appendChild(tenBadge);

    var plus = el('span', 'l20-plus', '+');

    var box = el('div', 'l20-loose');
    for (var j = 0; j < loose; j += 1) box.appendChild(el('i', 'l20-mini'));

    card.appendChild(ten);
    card.appendChild(plus);
    card.appendChild(box);
    return card;
  }

  function buildPick(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.cards.map(function (c) { return c.slice(); }));
    var keyOf = function (c) { return '10-' + c[1]; };
    var targetKey = keyOf(q.target);
    var targetItem = list.filter(function (c) { return keyOf(c) === targetKey; })[0];

    var board = el('div', 'l20-pcards');
    story.appendChild(board);
    makeReplay(story, q.voice);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (pair, i) {
        var card = splitCard(pair);
        card.addEventListener('click', function () { pick(pair, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(pair, card) {
      if (state.locked || state.busy) return;
      if (keyOf(pair) === targetKey) {
        card.classList.add('is-right');
        var badge = el('span', 'l20-check');
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

  /* ---------------- 题型 C：找错误算式 ---------------- */

  function sentenceCard(s) {
    var card = el('button', 'l20-scard');
    card.type = 'button';
    card.dataset.key = s.a + '-' + s.b + '=' + s.shown;
    card.setAttribute('aria-label', s.a + ' minus ' + s.b + ' equals ' + s.shown);

    var line = el('div', 'l20-sent');
    line.appendChild(tile(String(s.a), 'l20-stile'));
    line.appendChild(op('−'));
    line.appendChild(tile(String(s.b), 'l20-stile'));
    line.appendChild(op('='));
    var res = tile(String(s.shown), 'l20-stile l20-stile--res');
    line.appendChild(res);
    card.appendChild(line);

    return { node: card, res: res };
  }

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      var copy = { a: s.a, b: s.b, shown: s.shown, key: s.a + '-' + s.b + '=' + s.shown };
      copy.bad = s.a - s.b !== s.shown;
      return copy;
    }));
    var keyOf = function (s) { return s.key; };
    var badItem = list.filter(function (s) { return s.bad; })[0];

    var board = el('div', 'l20-sents');
    story.appendChild(board);
    makeReplay(story, q.voice);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var c = sentenceCard(s);
        c.node.addEventListener('click', function () { pick(s, c); });
        popIn(c.node, i * 60);
        board.appendChild(c.node);
      });
    }

    function pick(s, c) {
      if (state.locked || state.busy) return;
      if (s.bad) {
        c.node.classList.add('is-right');
        var tick = el('span', 'l20-tick');
        tick.innerHTML = ICONS.check;
        c.node.appendChild(tick);
        popIn(tick, 40);
        snapPop(c.node);

        // 只翻结果格：把错的结果换成正确答案（§6.11）
        later(function () {
          c.res.classList.add('is-flip');
          later(function () {
            c.res.textContent = String(s.a - s.b);
            c.res.classList.remove('is-flip');
            c.res.classList.add('is-fixed');
            bounce(c.res);
            Engine.sfx.correct();
            later(function () { Engine.sfx.star(); }, 90);
            burst(c.node);
          }, 230);
        }, 260);

        correct(null, WRONG_HOLD);
        return;
      }

      wrong(c.node);
      later(function () {
        Engine.quiz.reshuffle(list, badItem, keyOf);
        state.busy = false;
        paint();
      }, 320);
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
    var tray = el('div', 'lv-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    var state = {
      locked: false, busy: false, errors: 0, dragging: false,
      broken: false, removed: 0, askShown: false
    };

    if (q.type !== 'borrow') makeReplay(story, q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type === 'borrow') {
        Engine.sfx.correct();
        later(function () { Engine.sfx.star(); }, 90);
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

    if (q.type === 'borrow') buildBorrow(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else buildWrong(q, story, tray, state, correct, wrong);
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
    // 兜底：拖拽中残留的幽灵（§5.9.4）
    Array.prototype.slice.call(document.querySelectorAll('.l20-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[20] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
