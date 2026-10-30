/* ============================================================
   level-lv23.js · Market Day（超市购物 · 两位数加两位数应用）
   ------------------------------------------------------------
   第三阶段第八关：把竖式加法放进买东西的场景里。
     教学 4 幕：① 货架：苹果 24、面包 13
                ② 问句「How much in total?」→ 停 1 秒 → 自答 37
                ③ 钱币飞进收银台，总额翻成 37
                ④ 算式 24 + 13 = 37 与竖式对齐
     答题 10 题（整份打乱，三种题型）：
       shop     看两件商品的价格，点出总价（4 题）
       receipt  小票缺总价，把正确数字拖进空格（3 题）
       wrong    三张购物清单，点出总价算错的那张（3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         §5.9 拖拽热区外扩 14px 且未命中平滑弹回；§6.11 找错题答对后只翻总价格并定格 1.5 秒。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;

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

  /* 商品：纯 SVG，不用图片 */
  var GOODS = [
    { key: 'apple', svg:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M24 13c8-5 17 1 17 12 0 9-7 17-12 17-2 0-3-1-5-1s-3 1-5 1c-5 0-12-8-12-17 0-11 9-17 17-12z" fill="#E4604A"/>' +
      '<path d="M24 13c0-4 2-7 6-8" fill="none" stroke="#7A5A2E" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M29 6c3-2 7-1 8 1-2 3-6 4-8 3z" fill="#5FA85B"/>' +
      '<ellipse cx="18" cy="22" rx="3.4" ry="5" fill="rgba(255,255,255,.45)"/></svg>' },
    { key: 'bread', svg:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M8 26c0-8 6-13 16-13s16 5 16 13c0 5-2 8-6 8H14c-4 0-6-3-6-8z" fill="#E8B269"/>' +
      '<path d="M14 21c1 2 1 4 0 6M22 19c1 2 1 4 0 6M30 19c1 2 1 4 0 6" fill="none" stroke="#C98B3F" ' +
      'stroke-width="2" stroke-linecap="round"/></svg>' },
    { key: 'milk', svg:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<path d="M17 10h14v6l4 6v17a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V22l4-6z" fill="#F4F0E6" stroke="#D9CDB8" stroke-width="2"/>' +
      '<path d="M18 20h12v9H18z" fill="#8FC7E8"/></svg>' },
    { key: 'cookie', svg:
      '<svg viewBox="0 0 48 48" aria-hidden="true">' +
      '<circle cx="24" cy="25" r="15" fill="#DEB273"/>' +
      '<circle cx="18" cy="20" r="2.4" fill="#8A5A2E"/><circle cx="29" cy="22" r="2.2" fill="#8A5A2E"/>' +
      '<circle cx="22" cy="31" r="2.6" fill="#8A5A2E"/><circle cx="31" cy="30" r="2" fill="#8A5A2E"/></svg>' }
  ];

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
        ctx.audio.play('lv23/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 商品与价签 ---------------- */

  function goodsCard(index, price) {
    var g = GOODS[index % GOODS.length];
    var card = el('div', 'l23-goods');
    var art = el('span', 'l23-goods-art');
    art.innerHTML = g.svg;
    card.appendChild(art);
    var tag = el('span', 'l23-price', String(price));
    card.appendChild(tag);
    return { node: card, tag: tag, art: art };
  }

  /** 收银台：一个能翻数字的总价牌 */
  function counter() {
    var box = el('div', 'l23-counter');
    var screenEl = el('div', 'l23-screen');
    var label = el('span', 'l23-total', '?');
    screenEl.appendChild(label);
    box.appendChild(screenEl);
    return { node: box, screen: screenEl, label: label };
  }

  /** 小票：两行商品 + 一行总价（总价可以是空位） */
  function receipt(rows, opts) {
    opts = opts || {};
    var slip = el('div', 'l23-slip');
    rows.forEach(function (r) {
      var line = el('div', 'l23-line');
      var art = el('span', 'l23-line-art');
      art.innerHTML = GOODS[r.item % GOODS.length].svg;
      line.appendChild(art);
      line.appendChild(el('span', 'l23-line-price', String(r.price)));
      slip.appendChild(line);
    });
    var total = el('div', 'l23-line l23-line--total');
    var slot = el('span', 'l23-total-slot' + (opts.blank ? ' is-blank' : ''), opts.value != null ? String(opts.value) : '');
    total.appendChild(slot);
    slip.appendChild(total);
    return { node: slip, slot: slot };
  }

  /* ---------------- 教学第一幕：货架 ---------------- */

  function buildShelf() {
    var scene = el('div', 'l23-scene');
    var a = goodsCard(0, 24);
    var b = goodsCard(1, 13);
    var plus = el('span', 'l23-plus', '+');
    scene.appendChild(a.node);
    scene.appendChild(plus);
    scene.appendChild(b.node);
    var c = counter();
    c.node.classList.add('l23-counter--under');
    scene.appendChild(c.node);
    return { scene: scene, a: a, b: b, counter: c };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l23-teach');
    var st = buildShelf();
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // Let's go shopping! The apple is twenty-four. / The bread is thirteen.
    await saySeq(['t1_a', 't1_b']);
    if (!alive) return;
    await sleep(280);
  }

  /* ---------------- 教学第二幕：问句 + 自答 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l23-teach');
    var st = buildShelf();
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // How much in total?
    await saySeq(['t1_q']);
    if (!alive) return;
    await sleep(1000);                     // 停顿 1 秒，紧接着自答（§6.1）

    // Twenty-four plus thirteen equals thirty-seven.
    var v = saySeq(['t1_c']);
    await sleep(200);
    if (!alive) return;
    st.counter.label.textContent = '37';
    st.counter.label.classList.add('is-on');
    snapPop(st.counter.screen);
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(300);
  }

  /* ---------------- 教学第三幕：钱币飞进收银台 ---------------- */

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l23-teach');
    var st = buildShelf();
    st.counter.label.textContent = '0';
    st.counter.label.classList.remove('is-on');
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // 无语音的一幕：两枚钱币依次飞进收银台，屏幕从 0 翻到 37
    var coins = [];
    for (var i = 0; i < 2; i += 1) {
      var coin = el('span', 'l23-coin', i === 0 ? '24' : '13');
      coin.style.left = (30 + i * 60) + '%';
      st.scene.appendChild(coin);
      coins.push(coin);
    }
    await sleep(260);
    if (!alive) return;
    var target = st.counter.screen.getBoundingClientRect();
    var sceneRect = st.scene.getBoundingClientRect();
    for (var k = 0; k < coins.length; k += 1) {
      var r = coins[k].getBoundingClientRect();
      var dx = (target.left + target.width / 2) - (r.left + r.width / 2);
      var dy = (target.top + target.height / 2) - (r.top + r.height / 2);
      coins[k].style.transform = 'translate(' + Math.round(dx) + 'px,' + Math.round(dy) + 'px) scale(.7)';
      coins[k].style.opacity = '0';
      Engine.sfx.tap();
      await sleep(360);
      if (!alive) return;
    }
    remove(coins[0]);
    remove(coins[1]);
    st.counter.label.textContent = '37';
    st.counter.label.classList.add('is-on');
    snapPop(st.counter.screen);
    Engine.sfx.star();
    await sleep(420);
  }

  /* ---------------- 教学第四幕：算式与竖式 ---------------- */

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l23-teach');
    var eq = el('div', 'l23-eq');
    eq.appendChild(el('span', 'l23-tile', '24'));
    eq.appendChild(el('span', 'l23-op', '+'));
    eq.appendChild(el('span', 'l23-tile', '13'));
    eq.appendChild(el('span', 'l23-op', '='));
    var res = el('span', 'l23-tile l23-tile--q', '?');
    eq.appendChild(res);
    wrap.appendChild(eq);

    var sum = el('div', 'l23-vs');
    function vrow(sign, t, o) {
      var r = el('div', 'l23-vrow');
      r.appendChild(el('span', 'l23-vsign', sign || ''));
      r.appendChild(el('span', 'l23-vcell', t == null ? '' : String(t)));
      r.appendChild(el('span', 'l23-vcell', o == null ? '' : String(o)));
      sum.appendChild(r);
      return r;
    }
    vrow('', 2, 4);
    vrow('+', 1, 3);
    sum.appendChild(el('div', 'l23-vline'));
    var r3 = vrow('', null, null);
    wrap.appendChild(sum);

    host.appendChild(wrap);
    popIn(eq);
    popIn(sum);

    // Line up the numbers. The total is thirty-seven.
    var v = saySeq(['t1_d']);
    await sleep(620);
    if (!alive) return;
    res.textContent = '37';
    res.classList.remove('l23-tile--q');
    res.classList.add('is-answer');
    snapPop(res);
    r3.children[1].textContent = '3';
    r3.children[2].textContent = '7';
    r3.children[1].classList.add('is-res');
    r3.children[2].classList.add('is-res');
    popIn(r3);
    Engine.sfx.star();
    await v;
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
      saySeq(typeof keys === 'function' ? keys() : keys);
    });
    story.appendChild(replay);
  }

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l23-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l23-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  function beginDrag(e, cfg) {
    var startX = e.clientX;
    var startY = e.clientY;
    var ghost = cfg.ghost();
    var r = cfg.source.getBoundingClientRect();
    ghost.style.left = (r.left + r.width / 2) + 'px';
    ghost.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(ghost);
    cfg.source.classList.add('is-lifted');

    function move(ev) {
      var dx = ev.clientX - startX;
      var dy = ev.clientY - startY;
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.04)';
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
      cfg.source.classList.remove('is-lifted');
      var target = cfg.find(ev.clientX, ev.clientY);
      if (target) {
        remove(ghost);
        cfg.onDrop(target);
        return;
      }
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
    }

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function insidePad(rect, x, y) {
    return x >= rect.left - HIT_PAD && x <= rect.right + HIT_PAD &&
           y >= rect.top - HIT_PAD && y <= rect.bottom + HIT_PAD;
  }

  /* ---------------- 题型 A：看价格点总价 ---------------- */

  function buildShop(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;
    var scene = el('div', 'l23-scene');
    scene.appendChild(goodsCard(q.items[0], q.a).node);
    scene.appendChild(el('span', 'l23-plus', '+'));
    scene.appendChild(goodsCard(q.items[1], q.b).node);
    story.appendChild(scene);
    popIn(scene);

    var c = counter();
    c.label.textContent = '?';
    scene.appendChild(c.node);
    c.node.classList.add('l23-counter--under');

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          c.label.textContent = String(answer);
          c.label.classList.add('is-on');
          snapPop(c.screen);
          burst(scene);
          correct(key);
          return;
        }
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
        }, 380);
      });
    }

    tray.classList.add('l23-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：小票拖总价 ---------------- */

  function buildReceipt(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;
    var board = el('div', 'l23-board');
    var slip = receipt([{ item: q.items[0], price: q.a }, { item: q.items[1], price: q.b }], { blank: true });
    board.appendChild(slip.node);
    story.appendChild(board);
    popIn(board);

    var candidates = Engine.quiz.shuffle(q.options.slice());
    var chips = [];

    function paint() {
      tray.innerHTML = '';
      chips = [];
      candidates.forEach(function (value, i) {
        var chip = el('button', 'l23-chip');
        chip.type = 'button';
        chip.dataset.value = String(value);
        chip.setAttribute('aria-label', String(value));
        chip.textContent = String(value);
        chip.addEventListener('pointerdown', function (e) {
          if (state.locked || state.busy || chip.classList.contains('is-used')) return;
          e.preventDefault();
          beginDrag(e, {
            source: chip,
            ghost: function () {
              var g = el('span', 'l23-chip l23-ghost');
              g.textContent = String(value);
              return g;
            },
            find: function (x, y) {
              return insidePad(slip.slot.getBoundingClientRect(), x, y) ? { ok: value === answer, value: value } : null;
            },
            onDrop: function (hit) {
              if (!hit.ok) {                       // 数字不对：弹回，不记错（§5.9.3）
                shake(chip);
                return;
              }
              slip.slot.textContent = String(value);
              slip.slot.classList.remove('is-blank');
              slip.slot.classList.add('is-filled');
              snapPop(slip.slot);
              Engine.sfx.tap();
              chip.classList.add('is-used');
              chip.style.visibility = 'hidden';
              later(function () {
                if (!alive) return;
                burst(board);
                correct(null);
              }, 220);
            }
          });
        });
        popIn(chip, i * 45);
        tray.appendChild(chip);
      });
    }

    tray.classList.add('l23-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三张清点找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.lists.map(function (s) {
      var copy = { a: s.a, b: s.b, total: s.total, items: s.items.slice() };
      copy.bad = s.a + s.b !== s.total;
      return copy;
    }));

    var board = el('div', 'l23-lists');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var wrap = el('button', 'l23-list');
        wrap.type = 'button';
        wrap.dataset.key = s.a + '+' + s.b + '=' + s.total;
        wrap.setAttribute('aria-label', s.a + ' plus ' + s.b + ' equals ' + s.total);
        var slip = receipt([{ item: s.items[0], price: s.a }, { item: s.items[1], price: s.b }], { value: s.total });
        wrap.appendChild(slip.node);
        wrap.addEventListener('click', function () { pick(s, slip, wrap); });
        popIn(wrap, i * 60);
        board.appendChild(wrap);
      });
    }

    function pick(s, slip, node) {
      if (state.locked || state.busy) return;
      if (!s.bad) {
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(node);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) { return x.a + x.b !== x.total; })[0],
            function (x) { return x.a + '+' + x.b + '=' + x.total; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      node.classList.add('is-right');
      var tick = el('span', 'l23-tick');
      tick.innerHTML = ICONS.check;
      node.appendChild(tick);
      popIn(tick, 40);
      snapPop(node);

      // 只翻总价格（§6.11）
      later(function () {
        slip.slot.classList.add('is-flip');
        later(function () {
          slip.slot.textContent = String(s.a + s.b);
          slip.slot.classList.remove('is-flip');
          slip.slot.classList.add('is-fixed');
          bounce(slip.slot);
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(node);
        }, 230);
      }, 240);

      correct(null, WRONG_HOLD);
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

    var state = { locked: false, busy: false, errors: 0 };

    makeReplay(story, q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type === 'receipt') {
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

    if (q.type === 'shop') buildShop(q, story, tray, state, correct, wrong);
    else if (q.type === 'receipt') buildReceipt(q, story, tray, state, correct, wrong);
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

    await sceneFour(host);
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
    Array.prototype.slice.call(document.querySelectorAll('.l23-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[23] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
