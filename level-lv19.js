/* ============================================================
   level-lv19.js · Break the Ten（破十法 · 退位减法）
   ------------------------------------------------------------
   第三阶段第四关：个位不够减，就把那一捆十解开成十根。
     教学 3 幕：① 一捆（十根）+ 三根零散 = 十三
                ② 解开那捆 → 十三根 → 拿走九根 → 剩四根
                ③ 竖式 13 − 9，13 拆成 10 和 3 → 10 − 9 = 1 → 1 + 3 = 4
     答题 10 题（整份打乱，三种题型）：
       break   点开那捆、拖走 b 根，再点「还剩几根」（4 题）
       process 听算式，点出对应的破十过程（3 题）
       wrong   三句里找错的一句（3 题，答对后翻结果格改正）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         §5.7 只隐藏自身不重排；§5.11 落位挤压；§6.8 两段式；
         §6.11 找错句只翻结果格并定格 1.5 秒。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;             // 答对到下一题
  var WRONG_HOLD = 1500;         // 找错句答对后的定格

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
        ctx.audio.play('lv19/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小棒 ---------------- */

  function stickNode() {
    return el('span', 'l19-stick');
  }

  /**
   * 固定格位的一排小棒。
   * 格位一次性建满，飞走只隐藏自身，其余坐标不变（§5.7）。
   * openFrom：前 openFrom 根先藏起来（等着从捆里散出来）。
   */
  function makeRow(count, openFrom) {
    var row = el('div', 'l19-row');
    var slots = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('div', 'l19-slot');
      var s = stickNode();
      if (openFrom != null && i < openFrom) s.classList.add('is-hidden');
      slot.appendChild(s);
      row.appendChild(slot);
      slots.push({ slot: slot, stick: s });
    }
    return { node: row, slots: slots };
  }

  /** 一捆：十根小棒 + 一圈绑带 */
  function bundleNode() {
    var box = el('button', 'l19-bundle');
    box.type = 'button';
    box.setAttribute('aria-label', 'Break the ten');

    var inner = el('div', 'l19-bundle-in');
    for (var i = 0; i < 10; i += 1) inner.appendChild(stickNode());
    box.appendChild(inner);

    var band = el('span', 'l19-band');
    band.setAttribute('aria-hidden', 'true');
    box.appendChild(band);

    return { node: box, band: band, inner: inner };
  }

  /** 绑带弹开 → 十根散开（只在这一步动，之后所有格位定死） */
  function breakBundle(b, slots, count) {
    b.node.disabled = true;
    b.band.classList.add('is-snap');
    Engine.sfx.tap();

    // 先让绑带飞 380ms（§5.15 的「解绳」要看得见），再让整捆淡出、十根散开
    return sleep(380).then(function () {
      if (!alive) return null;
      b.node.classList.add('is-open');
      for (var i = 0; i < count; i += 1) {
        var s = slots[i].stick;
        s.style.setProperty('--d', (i * 24) + 'ms');
        s.classList.remove('is-hidden');
      }
      return sleep(520);
    });
  }

  /** 拿走 from 起的 count 根：只隐藏自身，占位与其余小棒一动不动 */
  function takeAway(slots, from, count) {
    for (var i = 0; i < count; i += 1) {
      (function (n) {
        var s = slots[from + n].stick;
        s.style.setProperty('--dx', (((n % 3) - 1) * 16) + 'px');
        s.style.setProperty('--rot', ((n % 2 ? 1 : -1) * 20) + 'deg');
        s.style.setProperty('--d', (n * 68) + 'ms');
        s.classList.add('is-away');
        later(function () { s.classList.add('is-gone'); }, 560 + n * 68);
      })(i);
    }
  }

  /** 领圈：只框住还在场的那几根（§5.7.7） */
  function ringAround(mat, slots) {
    if (!mat || !slots.length) return null;
    var mb = mat.getBoundingClientRect();
    var left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    slots.forEach(function (s) {
      var r = s.slot.getBoundingClientRect();
      left = Math.min(left, r.left);
      top = Math.min(top, r.top);
      right = Math.max(right, r.right);
      bottom = Math.max(bottom, r.bottom);
    });
    var ring = el('div', 'l19-ring');
    ring.style.left = Math.round(left - mb.left - 7) + 'px';
    ring.style.top = Math.round(top - mb.top - 9) + 'px';
    ring.style.width = Math.round(right - left + 14) + 'px';
    ring.style.height = Math.round(bottom - top + 18) + 'px';
    mat.appendChild(ring);
    popIn(ring);
    return ring;
  }

  /* ---------------- 数字块 ---------------- */

  function tile(text, cls) {
    return el('span', 'l19-tile' + (cls ? ' ' + cls : ''), text);
  }

  function op(text) {
    return el('span', 'l19-op', text);
  }

  function blank(cls) {
    return el('span', 'l19-tile l19-blank' + (cls ? ' ' + cls : ''), '?');
  }

  /* ---------------- 教学第一幕：一捆 + 三根 ---------------- */

  function buildMat(total, openFrom) {
    var mat = el('div', 'l19-mat');
    var row = makeRow(total, openFrom);
    mat.appendChild(row.node);
    var b = bundleNode();
    mat.appendChild(b.node);
    return { mat: mat, row: row, bundle: b };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l19-teach');
    var m = buildMat(13, 10);
    m.bundle.node.disabled = true;           // 教学里不用孩子点
    wrap.appendChild(m.mat);
    host.appendChild(wrap);
    popIn(m.mat);

    // Look! One ten and three ones make thirteen. Now, let's take away nine.
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                       // 停顿 1 秒
  }

  /* ---------------- 教学第二幕：破十 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l19-teach');
    var m = buildMat(13, 10);
    m.bundle.node.disabled = true;
    wrap.appendChild(m.mat);
    host.appendChild(wrap);
    popIn(m.mat);

    // We don't have enough ones. So, we break the ten into ten ones.
    var voice = saySeq(['t2_a']);
    await sleep(2600);                       // 等「So, we break the ten...」说到再解绳
    if (!alive) return;

    await breakBundle(m.bundle, m.row.slots, 10);
    if (!alive) return;

    await voice;
    if (!alive) return;
    await sleep(1000);

    // Now we have thirteen ones. Take away nine, and one is left.
    var v2 = saySeq(['t2_b']);
    await sleep(2900);                       // 等「Take away nine」再逐根拿走
    if (!alive) return;
    takeAway(m.row.slots, 0, 9);

    await v2;
    if (!alive) return;
    await sleep(520);

    // So, thirteen minus nine equals four!
    var v3 = saySeq(['t2_c']);
    var ring = ringAround(m.mat, m.row.slots.slice(9));
    if (ring) {
      m.row.slots.slice(9).forEach(function (s, i) {
        later(function () { bounce(s.stick); }, i * 70);
      });
    }
    Engine.sfx.star();
    await v3;
    if (!alive) return;
    await sleep(320);
  }

  /* ---------------- 教学第三幕：竖式与拆分 ---------------- */

  function vsum() {
    var box = el('div', 'l19-vsum');
    var rows = el('div', 'l19-vrows');

    function row(opText, tens, ones) {
      var r = el('div', 'l19-vrow');
      var t = el('span', 'l19-vcell l19-vcell--t' + (opText ? ' is-op' : ''), opText || tens || '');
      var o = el('span', 'l19-vcell', ones || '');
      r.appendChild(t);
      r.appendChild(o);
      rows.appendChild(r);
      return { row: r, tens: t, ones: o };
    }

    var r1 = row('', '1', '3');
    var r2 = row('−', '', '9');
    var line = el('div', 'l19-vline');
    var r3 = row('', '', '');

    box.appendChild(rows);
    return { node: box, r1: r1, r2: r2, r3: r3, line: line };
  }

  function stepRow(a, opText, b, res, cls) {
    var r = el('div', 'l19-step' + (cls ? ' ' + cls : ''));
    r.appendChild(tile(String(a)));
    r.appendChild(op(opText));
    r.appendChild(tile(String(b)));
    r.appendChild(op('='));
    r.appendChild(tile(String(res), 'l19-step-res'));
    return r;
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l19-teach');
    var v = vsum();
    wrap.appendChild(v.node);
    // 竖式里的横线插在第二行与第三行之间
    v.node.querySelector('.l19-vrows').insertBefore(v.line, v.r3.row);

    var steps = el('div', 'l19-steps');
    // 13 = 10 + 3（十三被拆开）
    var s1 = el('div', 'l19-step is-hidden');
    s1.appendChild(tile('13'));
    s1.appendChild(op('='));
    s1.appendChild(tile('10', 'l19-ten'));
    s1.appendChild(op('+'));
    s1.appendChild(tile('3'));
    var s2 = stepRow(10, '−', 9, 1, 'is-hidden');        // 10 − 9 = 1
    var s3 = stepRow(1, '+', 3, 4, 'is-hidden');         // 1 + 3 = 4
    steps.appendChild(s1);
    steps.appendChild(s2);
    steps.appendChild(s3);
    wrap.appendChild(steps);

    host.appendChild(wrap);
    popIn(v.node);

    // When we don't have enough ones, we break the ten.
    var v1 = saySeq(['t3_a']);
    await sleep(1900);                       // 等「we break the ten」说到再亮拆分
    if (!alive) return;
    s1.classList.remove('is-hidden');
    popIn(s1);
    Engine.sfx.tap();

    await v1;
    if (!alive) return;
    await sleep(300);

    // Thirteen minus nine equals four.
    var v2 = saySeq(['t3_b']);
    await sleep(560);
    if (!alive) return;
    s2.classList.remove('is-hidden');
    popIn(s2);
    Engine.sfx.tap();

    await sleep(1000);
    if (!alive) return;
    s3.classList.remove('is-hidden');
    popIn(s3);

    // 竖式结果落 4，个位转绿（教学拆位：只有个位变）
    v.r3.ones.textContent = '4';
    v.r3.ones.classList.add('is-res');
    popIn(v.r3.ones);
    snapPop(v.r3.ones);
    Engine.sfx.star();

    await v2;
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
      var key = el('button', 'l19-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l19-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：破十 → 拿走 → 点剩余 ---------------- */

  function buildBreak(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var options = Engine.quiz.shuffle(q.options.slice());

    var wrap = el('div', 'l19-teach l19-teach--quiz');
    var m = buildMat(q.a, 10);
    wrap.appendChild(m.mat);
    story.appendChild(wrap);
    popIn(m.mat);

    makeReplay(story, function () {
      return state.askShown ? ['a_left_q'] : q.voice;
    });

    // 2.8 秒还没点开那捆 → 小手提示（§6.1）
    var hint = null;
    var hintTimer = setTimeout(function () {
      if (!alive || state.broken || state.locked) return;
      hint = el('div', 'l19-hint');
      hint.innerHTML = ICONS.hand;
      m.bundle.node.appendChild(hint);
      m.bundle.node.classList.add('is-armed');
    }, 2800);

    function dropHint() {
      clearTimeout(hintTimer);
      if (hint) { remove(hint); hint = null; }
      m.bundle.node.classList.remove('is-armed');
    }

    function ask() {
      if (state.askShown) return;
      state.askShown = true;
      later(function () {
        if (!alive) return;
        saySeq(['a_left_q']);
        renderKeys();
      }, 280);
    }

    function pickStick(e) {
      if (!alive || state.locked || !state.broken || state.askShown) return;
      if (state.removed >= q.b) return;
      var st = e.currentTarget;
      if (st.classList.contains('is-away') || st.classList.contains('is-gone')) return;
      e.preventDefault();
      e.stopPropagation();

      var r = st.getBoundingClientRect();
      var ghost = el('span', 'l19-stick l19-ghost');
      ghost.style.left = r.left + 'px';
      ghost.style.top = r.top + 'px';
      ghost.style.width = r.width + 'px';
      ghost.style.height = r.height + 'px';
      document.body.appendChild(ghost);

      var startX = e.clientX, startY = e.clientY;

      function move(ev) {
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        ghost.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.5) + 'deg)';
      }

      function up(ev) {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        remove(ghost);
        take(st);
      }

      document.addEventListener('pointermove', move);
      document.addEventListener('pointerup', up);
      document.addEventListener('pointercancel', up);
    }

    function take(st) {
      if (state.locked || state.removed >= q.b) return;
      if (st.classList.contains('is-away')) return;
      st.style.setProperty('--dx', ((state.removed % 3) - 1) * 12 + 'px');
      st.style.setProperty('--rot', (state.removed % 2 ? 20 : -20) + 'deg');
      st.style.setProperty('--d', '0ms');
      st.classList.add('is-away');
      later(function () { st.classList.add('is-gone'); }, 520);
      state.removed += 1;
      Engine.sfx.tap();
      if (state.removed >= q.b) ask();
    }

    m.bundle.node.addEventListener('pointerdown', function (e) {
      if (!alive || state.broken || state.locked) return;
      e.preventDefault();
      state.broken = true;
      dropHint();
      breakBundle(m.bundle, m.row.slots, 10).then(function () {
        if (!alive) return;
        m.row.slots.forEach(function (s) {
          s.stick.addEventListener('pointerdown', pickStick);
        });
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

    tray.classList.add('l19-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：听算式，点破十过程 ---------------- */

  function processCard(pair) {
    var a = pair[0];
    var b = pair[1];
    var ones = a - 10;
    var rest = 10 - b;
    var total = rest + ones;

    var card = el('button', 'l19-pcard');
    card.type = 'button';
    card.dataset.key = a + '-' + b;
    card.setAttribute('aria-label', a + ' minus ' + b);

    var r1 = el('div', 'l19-prow');
    r1.appendChild(tile('10', 'l19-ten'));
    r1.appendChild(op('−'));
    r1.appendChild(tile(String(b)));
    r1.appendChild(op('='));
    r1.appendChild(tile(String(rest)));

    var r2 = el('div', 'l19-prow');
    r2.appendChild(tile(String(rest)));
    r2.appendChild(op('+'));
    r2.appendChild(tile(String(ones), 'l19-ones'));
    r2.appendChild(op('='));
    r2.appendChild(tile(String(total), 'l19-ans'));

    var down = el('i', 'l19-down');
    down.setAttribute('aria-hidden', 'true');

    card.appendChild(r1);
    card.appendChild(down);
    card.appendChild(r2);
    return card;
  }

  function buildProcess(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.cards.map(function (c) { return c.slice(); }));
    var keyOf = function (c) { return c[0] + '-' + c[1]; };
    var targetKey = keyOf(q.target);
    var targetItem = list.filter(function (c) { return keyOf(c) === targetKey; })[0];

    var board = el('div', 'l19-pcards');
    story.appendChild(board);
    makeReplay(story, q.voice);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (pair, i) {
        var card = processCard(pair);
        card.addEventListener('click', function () { pick(pair, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(pair, card) {
      if (state.locked || state.busy) return;
      if (keyOf(pair) === targetKey) {
        card.classList.add('is-right');
        var badge = el('span', 'l19-check');
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
    var card = el('button', 'l19-scard');
    card.type = 'button';
    card.dataset.key = s.a + '-' + s.b + '=' + s.shown;
    card.setAttribute('aria-label', s.a + ' minus ' + s.b + ' equals ' + s.shown);

    var line = el('div', 'l19-sent');
    line.appendChild(tile(String(s.a), 'l19-stile'));
    line.appendChild(op('−'));
    line.appendChild(tile(String(s.b), 'l19-stile'));
    line.appendChild(op('='));
    var res = tile(String(s.shown), 'l19-stile l19-stile--res');
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

    var board = el('div', 'l19-sents');
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
        var tick = el('span', 'l19-tick');
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
      locked: false, busy: false, errors: 0,
      broken: false, removed: 0, askShown: false
    };

    if (q.type !== 'break') makeReplay(story, q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type === 'break') {
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

    if (q.type === 'break') buildBreak(q, story, tray, state, correct, wrong);
    else if (q.type === 'process') buildProcess(q, story, tray, state, correct, wrong);
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
    // 兜底：拖拽中残留的幽灵小棒
    Array.prototype.slice.call(document.querySelectorAll('.l19-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[19] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
