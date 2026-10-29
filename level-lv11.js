/* ============================================================
   level-lv11.js · Candy Share（分糖果 · 不退位减法 11–19）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     take   一盒十颗 + 零散若干，把指定颗数拖到盘里，再点剩下的颗数
     group  三组「一盒 + n 颗」，听总数点出对应的那组
     wrong  三句算式，找出一句错的；点对后把错句改成正确算式演示一遍
   铁律：全英文、点按推进、教学自问自答、物件离场后其余糖果不得位移（§5.7）、
         拖拽热区外扩 14px 且未命中平滑弹回（§5.9）、落位有挤压回弹（§5.11）、
         拖糖阶段不判分（§6.8 两段式），答对只播音效（§6.4）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;               // §5.9 落点热区外扩
  var DROP_MS = 520;              // 单颗糖果落盘（含挤压回弹）

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
    check:
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path d="M4.7 12.6l5 4.9L19.4 6.9" fill="none" stroke="currentColor" stroke-width="3.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  var TONES = ['berry', 'lemon', 'mint', 'grape', 'peach'];

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
  var dragCleanup = null;

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
        ctx.audio.play('lv11/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 糖果 ---------------- */

  /** 一颗糖果：CSS 半球体（径向渐变 + 高光），像包着糖纸的软糖。 */
  function candy(tone, size) {
    var node = el('span', 'l11-candy l11-candy--' + tone);
    if (size) { node.style.width = size + 'px'; node.style.height = size + 'px'; }
    return node;
  }

  /**
   * 十格盒：2 行 × 5 列的透明盒（§5.8），装满十颗。
   * 每颗糖都在自己的格位里，任何动画都不改格位坐标（§5.7）。
   */
  function candyBox(filled, opts) {
    opts = opts || {};
    var cell = opts.cell || 30;
    var box = el('div', 'l11-box');
    box.style.setProperty('--cell', cell + 'px');

    var grid = el('div', 'l11-grid');
    var items = [];
    for (var i = 0; i < 10; i += 1) {
      var slot = el('span', 'l11-cell');
      if (i < filled) {
        var c = candy(TONES[i % TONES.length]);
        slot.appendChild(c);
        items.push({ slot: slot, candy: c });
      }
      grid.appendChild(slot);
    }
    box.appendChild(grid);
    box.appendChild(el('span', 'l11-box-lid'));     // 盒盖高光，读作「一整个盒子」
    return { node: box, items: items, cell: cell };
  }

  /**
   * 零散糖果：3 列从下往上堆，每颗固定格位。
   * 拿走一颗只隐藏糖本身，格位留在原位（§5.7）。
   */
  function looseGroup(n, opts) {
    opts = opts || {};
    var cols = opts.cols || 3;
    var cell = opts.cell || 32;
    var wrap = el('div', 'l11-loose');
    wrap.style.setProperty('--cell', cell + 'px');

    var rows = Math.max(1, Math.ceil(n / cols));
    var items = [];
    var left = n;
    for (var r = 0; r < rows; r += 1) {
      var take = Math.min(cols, left);
      var row = el('div', 'l11-lrow');
      for (var i = 0; i < take; i += 1) {
        var slot = el('span', 'l11-lslot');
        var c = candy(TONES[(items.length + 2) % TONES.length]);
        slot.appendChild(c);
        row.appendChild(slot);
        items.push({ slot: slot, candy: c });
      }
      left -= take;
      wrap.appendChild(row);      // 配合 column-reverse：第一排在最下面
    }
    return { node: wrap, items: items };
  }

  /** 盘子里预留的落点：先建好固定格位，落糖时只填空位，盘子不会长大（§5.7） */
  function plate(capacity, opts) {
    opts = opts || {};
    var cell = opts.cell || 30;
    var wrap = el('div', 'l11-plate');
    wrap.style.setProperty('--cell', cell + 'px');

    var cols = Math.min(capacity, 5);
    var rows = Math.max(1, Math.ceil(capacity / cols));
    var grid = el('div', 'l11-plate-grid');
    grid.style.gridTemplateColumns = 'repeat(' + cols + ', var(--cell))';
    var slots = [];
    for (var i = 0; i < capacity; i += 1) {
      var slot = el('span', 'l11-pslot');
      grid.appendChild(slot);
      slots.push(slot);
    }
    wrap.appendChild(grid);
    wrap.style.setProperty('--rows', String(rows));
    return { node: wrap, slots: slots, used: 0 };
  }

  /** 把一颗糖放进盘子第 index 格：先定格位，再做「触地压扁 → 回弹」（§5.11） */
  function dropIntoPlate(p, index, tone) {
    var slot = p.slots[index];
    if (!slot) return null;
    var c = candy(tone);
    c.style.transformOrigin = '50% 100%';
    slot.appendChild(c);
    animate(c, [
      { opacity: 0, transform: 'translateY(-26px) scale(1.16, .74)' },
      { opacity: 1, transform: 'translateY(0) scale(1.16, .74)', offset: 0.42 },
      { transform: 'translateY(0) scale(.94, 1.08)', offset: 0.72 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: DROP_MS, easing: 'cubic-bezier(.3,.7,.4,1)' });
    p.used += 1;
    return c;
  }

  /* 还在场的糖（被拖走的那颗不算） */
  function liveSlots(items) {
    return items.filter(function (it) { return it.candy.dataset.gone !== '1'; })
      .map(function (it) { return it.slot; });
  }

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

  /* 绿圈只圈住还在场的那几颗，不圈空出来的上半截（§5.7 第 7 条） */
  function ringRound(host, slots) {
    var m = unionOf(host, slots);
    if (!m) return null;
    var ring = el('div', 'l11-ring');
    ring.style.left = (m.l - 9) + 'px';
    ring.style.top = (m.t - 9) + 'px';
    ring.style.width = (m.w + 18) + 'px';
    ring.style.height = (m.h + 18) + 'px';
    host.appendChild(ring);
    return ring;
  }

  function placeBadge(badge, host, slots) {
    var m = unionOf(host, slots);
    if (!m) return;
    badge.style.left = (m.l + m.w / 2) + 'px';
    badge.style.top = (m.t - 50) + 'px';
    badge.style.marginLeft = '0';
    badge.style.transform = 'translateX(-50%)';
  }

  /* ---------------- 一整套场景：盒 + 零散 + 盘 ---------------- */

  function sceneBoard(ones, opts) {
    opts = opts || {};
    var wrap = el('div', 'l11-scene');

    var row = el('div', 'l11-row');
    var box = candyBox(10, { cell: opts.boxCell || 30 });
    var loose = looseGroup(ones, { cell: opts.looseCell || 32 });
    row.appendChild(box.node);
    row.appendChild(loose.node);
    wrap.appendChild(row);

    return { node: wrap, row: row, box: box, ones: loose };
  }

  /* ---------------- 教学第一幕：认识 18 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';

    var b = sceneBoard(8, { boxCell: 34, looseCell: 40 });
    b.node.classList.add('l11-scene--teach');
    host.appendChild(b.node);

    popIn(b.box.node, 0);
    popIn(b.ones.node, 160);

    // Look at the candies. One full box of ten, and eight outside. That's eighteen.
    await saySeq(['t1_a']);
    if (!alive) return;

    b.box.node.classList.add('is-full');      // 满十给强化反馈（§5.8）
    b.box.items.forEach(function (it, i) { bounce(it.candy, i * 42); });

    await sleep(1000);
    if (!alive) return;
  }

  /* ---------------- 教学第二幕：拿走 5 颗 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';

    var b = sceneBoard(8, { boxCell: 34, looseCell: 40 });
    b.node.classList.add('l11-scene--teach');
    var p = plate(5, { cell: 34 });
    b.node.appendChild(p.node);
    host.appendChild(b.node);

    // 悬浮小手：从零散糖上滑到盘子，示意「拖走」
    var hand = el('div', 'l11-hand');
    hand.innerHTML = ICONS.hand;
    b.ones.node.appendChild(hand);
    hand.classList.add('is-hint');

    popIn(b.box.node, 0);
    popIn(b.ones.node, 140);
    popIn(p.node, 260);

    await sleep(420);
    if (!alive) return;

    // Let's take away five candies from the ones.
    var saying = saySeq(['t2_a']);

    // 从最上面一颗开始拖走（个位只剩最下面一排三颗）
    var victims = b.ones.items.slice(b.ones.items.length - 5);
    var flies = victims.map(function (it, i) {
      return later(function () {
        if (!alive) return;
        it.candy.dataset.gone = '1';
        it.candy.classList.add('is-gone');
        var tone = it.candy.classList.contains('l11-candy--lemon') ? 'lemon'
          : it.candy.classList.contains('l11-candy--mint') ? 'mint'
            : it.candy.classList.contains('l11-candy--grape') ? 'grape'
              : it.candy.classList.contains('l11-candy--peach') ? 'peach' : 'berry';
        dropIntoPlate(p, p.used, tone);
        Engine.sfx.tap();
      }, 520 + i * 190);
    });

    await saying;
    if (!alive) return;

    await sleep(1000);                 // 停顿 1 秒再自答
    if (!alive) return;

    hand.classList.remove('is-hint');

    // Eight minus five equals three.
    var s2 = saySeq(['t2_b']);
    var leftSlots = liveSlots(b.ones.items);
    ringRound(b.ones.node, leftSlots);
    var badge = el('div', 'l11-badge');
    var chip = el('span', 'l11-badge-chip', '3');
    badge.appendChild(chip);
    b.ones.node.appendChild(badge);
    placeBadge(badge, b.ones.node, leftSlots);
    badge.style.visibility = 'visible';
    popIn(chip);
    b.ones.items.slice(0, 3).forEach(function (it, i) { bounce(it.candy, i * 90); });
    await s2;
    if (!alive) return;

    await sleep(320);
    if (!alive) return;

    // So, eighteen minus five equals thirteen!
    await saySeq(['t2_c']);
    if (!alive) return;

    b.box.items.slice(0, 3).forEach(function (it, i) { bounce(it.candy, i * 60); });
    await sleep(420);
  }

  /* ---------------- 教学第三幕：竖式规律 ---------------- */

  function verticalSum(a, b, res) {
    var col = el('div', 'l11-vert');

    function row(cls, sign, cells) {
      var r = el('div', 'l11-vrow' + (cls ? ' ' + cls : ''));
      r.appendChild(el('span', 'l11-vsign', sign || ''));
      cells.forEach(function (c) {
        var cell = el('span', 'l11-vcell' + (c.cls ? ' ' + c.cls : ''), c.text);
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
      { text: '', cls: 'l11-vcell--blank' },
      { text: String(b), cls: 'is-sub-ones' }
    ]);
    var line = el('div', 'l11-vline');
    var sum = row('l11-vrow--sum is-hidden', '', [
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
        // 终态先写进内联样式，再播「从 0 拉出」，否则 cancel() 会回落到 0（L10 踩过的坑）
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

    var wrap = el('div', 'l11-sum');
    var box = candyBox(10, { cell: 28 });
    var v = verticalSum(18, 5, 13);
    wrap.appendChild(box.node);
    wrap.appendChild(v.node);
    host.appendChild(wrap);

    popIn(box.node, 0);
    popIn(v.node, 200);
    v.reveal();

    await sleep(420);
    if (!alive) return;

    // When we take away, the box of ten stays the same.
    var s1 = saySeq(['t3_a']);
    box.node.classList.add('is-ten-on');
    v.markTens();
    await s1;
    if (!alive) return;

    await sleep(360);
    if (!alive) return;

    // We only take away the ones.
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

  /* ---------------- 拖糖果（§5.9） ---------------- */

  /**
   * 从零散糖果拖到盘子。
   * 按住拖到盘上松手 = 落盘；轻点糖果（位移 < 8px）= 同样落盘；
   * 松手在热区外 = 平滑弹回、不落盘、不算错。
   */
  function bindCandyDrag(group, zone, opts) {
    var ghost = null;
    var start = { x: 0, y: 0 };
    var origin = { x: 0, y: 0 };
    var moved = false;
    var source = null;

    function detach() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
    }

    function onMove(e) {
      if (!ghost) return;
      if (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8) moved = true;
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    }

    function onUp(e) {
      detach();
      if (!ghost) return;

      var node = ghost;
      ghost = null;
      var box = zone.getBoundingClientRect();
      var inside = e.clientX >= box.left - HIT_PAD && e.clientX <= box.right + HIT_PAD &&
        e.clientY >= box.top - HIT_PAD && e.clientY <= box.bottom + HIT_PAD;

      if (inside || !moved) {
        var shrink = node.animate([
          { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 }
        ], { duration: 140, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'both' });
        shrink.finished.then(function () { remove(node); }, function () { remove(node); });
        opts.onDrop(source);
        return;
      }

      // 未命中：平滑弹回（320ms 三段），绝不落盘
      var dx = origin.x - e.clientX;
      var dy = origin.y - e.clientY;
      var back = node.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + (dx * 0.55) + 'px), calc(-50% + ' + (dy * 0.55) + 'px)) scale(.84)', opacity: 0.8, offset: 0.6 },
        { transform: 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(.5)', opacity: 0 }
      ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
      back.finished.then(function () { remove(node); }, function () { remove(node); });
      if (source) source.classList.remove('is-armed');
    }

    function onDown(e) {
      if (ghost || !alive) return;
      if (e.button != null && e.button !== 0) return;
      var candyEl = e.target && e.target.closest ? e.target.closest('.l11-candy') : null;
      if (!candyEl || candyEl.dataset.gone === '1') return;
      if (!group.contains(candyEl)) return;
      e.preventDefault();

      source = candyEl;
      var rect = candyEl.getBoundingClientRect();
      start = { x: e.clientX, y: e.clientY };
      origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      moved = false;

      ghost = el('div', 'l11-ghost');
      ghost.innerHTML = '<span class="l11-candy ' + candyEl.className.replace('l11-candy ', '').replace(' is-armed', '') + '"></span>';
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
      document.body.appendChild(ghost);
      candyEl.classList.add('is-armed');

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    }

    group.addEventListener('pointerdown', onDown);

    return function () {
      detach();
      group.removeEventListener('pointerdown', onDown);
      if (ghost) { remove(ghost); ghost = null; }
    };
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

    var voice = q.type === 'take' ? q.voice.concat(['how_many']) : q.voice;
    makeReplay(story, voice);

    var state = { locked: false, errors: 0 };

    // holdMs：本型需要把画面多留一会儿（找错句要在原地演示正确算式）
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

      var hold = Math.max(0, holdMs || 0);
      if (solved.done) later(function () { finish(solved.star); }, Math.max(620, hold));
      else later(function () { askQuestion(root); }, Math.max(700, hold));
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

    if (q.type === 'take') buildTakeQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'group') buildGroupQuestion(q, story, tray, state, correct, wrong);
    else buildWrongQuestion(q, story, tray, state, correct, wrong);

    // take 自己排语音（动作完成才问），其余直接读题
    if (q.type === 'group' || q.type === 'wrong') saySeq(q.voice);
  }

  /* ---- 题型 A：拖走指定颗数，再点剩下的颗数 ---- */

  function buildTakeQuestion(q, story, tray, state, correct, wrong) {
    tray.classList.add('lv-tray--reserved');       // 选项迟一步出现（§6.8）

    var b = sceneBoard(q.a - 10, { boxCell: 34, looseCell: 38 });
    var p = plate(q.b, { cell: 34 });
    b.node.appendChild(p.node);

    // 还要拖走几颗：一排小圆点，每拖一颗灭一盏
    var tally = el('div', 'l11-tally');
    var dots = [];
    for (var i = 0; i < q.b; i += 1) {
      var dot = el('span', 'l11-dot');
      tally.appendChild(dot);
      dots.push(dot);
    }
    b.node.insertBefore(tally, p.node);

    story.appendChild(b.node);
    popIn(b.node);

    var answer = q.a - q.b;
    var options = Engine.quiz.shuffle(q.options.slice());
    var left = q.b;
    var cleared = 0;               // 已落盘的颗数（不能只看 left，先落的那颗会提前触发）
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
      remove(b.node.querySelector('.tap-hint'));
      tally.classList.add('is-done');
      p.node.classList.add('is-full');
      later(function () {
        if (state.locked || !alive) return;
        saySeq(['how_many']).then(function () {
          if (state.locked || !alive) return;
          paint();
        });
      }, 420);
    }

    function take(source) {
      if (actionDone || state.locked || !source || source.dataset.gone === '1') return;
      source.dataset.gone = '1';
      left -= 1;
      var dot = dots[left];
      if (dot) dot.classList.add('is-used');

      // 糖本体淡出（格位留下，§5.7），盘里落一颗新的
      var tone = 'berry';
      TONES.forEach(function (t) { if (source.classList.contains('l11-candy--' + t)) tone = t; });
      source.classList.add('is-gone');
      source.classList.remove('is-armed');
      dropIntoPlate(p, p.used, tone);
      Engine.sfx.tap();

      cleared += 1;
      if (cleared >= q.b) later(finishAction, DROP_MS - 80);
    }

    dragCleanup = bindCandyDrag(b.ones.node, p.node, { onDrop: take });

    // 台词读完再提示「拖糖」，避免孩子提前乱拖
    saySeq(q.voice).then(function () {
      if (actionDone || !alive || state.locked) return;
      b.ones.node.classList.add('is-ready');
      var hint = el('div', 'tap-hint tap-hint--plate');
      hint.innerHTML = ICONS.hand;
      p.node.appendChild(hint);            // 手势悬在盘子上方：指「放这里」
    });
  }

  /* ---- 题型 B：听总数，点出对应的那一组 ---- */

  function miniGroup(ones, cell) {
    var wrap = el('div', 'l11-mini');
    var box = candyBox(10, { cell: cell });
    var loose = looseGroup(ones, { cell: cell, cols: 3 });
    wrap.appendChild(box.node);
    wrap.appendChild(el('span', 'l11-plus', '+'));
    wrap.appendChild(loose.node);
    return wrap;
  }

  function buildGroupQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l11-opts');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.combos.slice());

    function paint() {
      board.innerHTML = '';
      list.forEach(function (ones, i) {
        var card = el('button', 'l11-opt');
        card.type = 'button';
        card.dataset.ones = String(ones);
        card.setAttribute('aria-label', 'One box of ten and ' + ones + ' candies');
        card.appendChild(miniGroup(ones, 21));
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

  /* ---- 题型 C：找错误算式，点对后演示正确算式 ---- */

  function sentence(entry) {
    // 每个数占一整块（「16」不是「1」+「6」两块），孩子一眼读成十六
    var row = el('div', 'l11-sent');
    row.appendChild(el('span', 'l11-tile', String(entry.a)));
    row.appendChild(el('span', 'l11-sop', '\u2212'));
    row.appendChild(el('span', 'l11-tile', String(entry.b)));
    row.appendChild(el('span', 'l11-sop', '='));
    var res = el('span', 'l11-tile l11-tile--res', String(entry.shown));
    row.appendChild(res);
    return { node: row, res: res };
  }

  function buildWrongQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l11-sents');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown };
    }));
    var keyOf = function (s) { return s.a + '-' + s.b + '=' + s.shown; };
    var bad = null;
    list.forEach(function (s) { if (s.a - s.b !== s.shown) bad = s; });

    function paint() {
      board.innerHTML = '';
      list.forEach(function (entry, i) {
        var card = el('button', 'l11-card');
        card.type = 'button';
        card.dataset.key = keyOf(entry);
        card.setAttribute('aria-label',
          entry.a + ' minus ' + entry.b + ' equals ' + entry.shown);
        var s = sentence(entry);
        card.appendChild(s.node);
        card._res = s.res;
        card.addEventListener('click', function () { pick(entry, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    // 点对后：把错句的错误结果翻成正确答案，并打上对勾 —— 演示一遍正确算式
    function showFix(card, entry) {
      var trueVal = entry.a - entry.b;
      var res = card._res;
      res.classList.add('is-flip');
      later(function () {
        res.textContent = String(trueVal);
        res.classList.remove('is-flip');
        res.classList.add('is-fixed');
        var mark = el('span', 'l11-tick');
        mark.innerHTML = ICONS.check;
        card.appendChild(mark);
        popIn(mark);
        bounce(res);
      }, 260);
    }

    function pick(entry, card) {
      if (state.locked) return;
      if (entry === bad) {
        // 定格 1.5 秒把错句改成正确算式，孩子才看得见「错在哪」（§6.11）
        correct(card, 1500);
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
    dragCleanup = null;
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
    if (dragCleanup) { dragCleanup(); dragCleanup = null; }
    if (tapFinish) {
      tapFinish();
      tapFinish = null;
    }
    // 兜底清一次幽灵（§5.9 第 4 条）
    Array.prototype.slice.call(document.querySelectorAll('.l11-ghost')).forEach(function (n) {
      if (n.parentNode) n.parentNode.removeChild(n);
    });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[11] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
