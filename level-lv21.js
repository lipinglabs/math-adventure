/* ============================================================
   level-lv21.js · Flash Math（闪电心算 · 退位减法）
   ------------------------------------------------------------
   第三阶段第六关：把借十法从「数小棒」推到「纯数字」。
     教学 2 幕：① 一捆十根 + 三根 = 十三，旁边竖式 13 − 9 = ?；解捆 → 拿走九根 → 剩四根
                ② 竖式 13 − 9 = 4（十位 1 划掉补 0、个位 3 划掉补 13）+ 闪电徽标
     答题 10 题（整份打乱，三种题型，全部限时 5 秒）：
       flash    纯算式 + 三个数字键（4 题）
       balloon  算式卡 + 三个写着答案的气球（3 题）
       wrong    三句里限时点出错误的那一句（3 题，答对后翻结果格）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         §6.9 限时题（5 秒条、超时与点错同权、原地重做、剩余 40% 转红、瞬间停表）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var FLASH_MS = 5000;           // §6.9 五秒进度条
  var LOW_AT = 0.6;              // 走过 60% → 剩余不足 40%，转暖红
  var NEXT_MS = 700;             // 答对到下一题
  var WRONG_HOLD = 1500;         // 找错句答对后的定格（§6.11）
  var REARM_MS = 1000;           // 超时后停一下再重新计时
  var HIT_PAD = 14;              // 保留：本关无拖拽，恒定口径与 §5.9 一致
  var COLORS = ['#F58FA0', '#7FC7E8', '#F7C063'];

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
    balloon:
      '<svg viewBox="0 0 100 118" aria-hidden="true">' +
      '<ellipse cx="50" cy="40" rx="30" ry="35" fill="currentColor"/>' +
      '<ellipse cx="38" cy="26" rx="7.5" ry="11" fill="rgba(255,255,255,.55)" transform="rotate(-20 38 26)"/>' +
      '<path d="M50 74l-8 10h16z" fill="currentColor"/>' +
      '<path d="M50 84c9 7-9 9 0 18" stroke="#C0AFA0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    /* 闪电：本关的速度符号，只做一次呼吸提示 */
    bolt:
      '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">' +
      '<path d="M13.6 2 5.4 13.2h5.1L9.9 22l8.7-11.6h-5.3z" fill="currentColor"/></svg>'
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
  var liveTimer = null;          // 当前题的限时器，退关时必须停掉

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
        ctx.audio.play('lv21/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 限时器（§6.9） ---------------- */

  function makeTimer(story) {
    var bar = el('div', 'l21-timer is-idle');
    var fill = el('span', 'l21-timer-fill');
    bar.appendChild(fill);
    story.appendChild(bar);

    var anim = null;
    var timeoutId = null;
    var lowId = null;
    var armed = false;
    var handler = null;

    function stop() {
      armed = false;
      if (anim) {
        try { anim.cancel(); } catch (e) { /* 已取消 */ }
        anim = null;
      }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
      if (lowId) { clearTimeout(lowId); lowId = null; }
    }

    function arm(fn) {
      stop();
      if (fn) handler = fn;
      bar.classList.remove('is-idle', 'is-out', 'is-done', 'is-low');
      fill.style.transform = 'scaleX(1)';
      armed = true;
      lowId = setTimeout(function () {
        lowId = null;
        if (armed) bar.classList.add('is-low');
      }, Math.round(FLASH_MS * LOW_AT));
      anim = fill.animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: FLASH_MS, easing: 'linear', fill: 'both' }
      );
      timeoutId = setTimeout(function () {
        timeoutId = null;
        if (!armed) return;
        armed = false;
        if (anim) {
          try { anim.cancel(); } catch (e) { /* 已取消 */ }
          anim = null;
        }
        fill.style.transform = 'scaleX(0)';
        bar.classList.add('is-out');
        if (handler) handler();
      }, FLASH_MS);
    }

    function done() {
      stop();
      bar.classList.remove('is-low', 'is-out');
      bar.classList.add('is-done');
      fill.style.transform = 'scaleX(0)';
    }

    return { bar: bar, fill: fill, arm: arm, stop: stop, done: done };
  }

  /* ---------------- 小棒与竖式（教学） ---------------- */

  function stickNode() {
    return el('span', 'l21-stick');
  }

  function makeRow(count, hideFirst) {
    var row = el('div', 'l21-row');
    var slots = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('div', 'l21-slot');
      var s = stickNode();
      if (hideFirst != null && i < hideFirst) s.classList.add('is-hidden');
      slot.appendChild(s);
      row.appendChild(slot);
      slots.push({ slot: slot, stick: s });
    }
    return { node: row, slots: slots };
  }

  function bundleNode() {
    var box = el('div', 'l21-bundle');
    var inner = el('div', 'l21-bundle-in');
    for (var i = 0; i < 10; i += 1) inner.appendChild(stickNode());
    box.appendChild(inner);
    var band = el('span', 'l21-band');
    band.setAttribute('aria-hidden', 'true');
    box.appendChild(band);
    return { node: box, band: band };
  }

  function breakBundle(b, slots) {
    b.band.classList.add('is-snap');
    Engine.sfx.tap();
    return sleep(360).then(function () {
      if (!alive) return null;
      b.node.classList.add('is-open');
      for (var i = 0; i < 10; i += 1) {
        var s = slots[i].stick;
        s.style.setProperty('--d', (i * 22) + 'ms');
        s.classList.remove('is-hidden');
      }
      return sleep(480);
    });
  }

  function takeAway(slots, from, count) {
    for (var i = 0; i < count; i += 1) {
      (function (n) {
        var s = slots[from + n].stick;
        s.style.setProperty('--dx', (((n % 3) - 1) * 16) + 'px');
        s.style.setProperty('--rot', ((n % 2 ? 1 : -1) * 20) + 'deg');
        s.style.setProperty('--d', (n * 62) + 'ms');
        s.classList.add('is-away');
        later(function () { s.classList.add('is-gone'); }, 520 + n * 62);
      })(i);
    }
  }

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
    var ring = el('div', 'l21-ring');
    ring.style.left = Math.round(left - mb.left - 7) + 'px';
    ring.style.top = Math.round(top - mb.top - 9) + 'px';
    ring.style.width = Math.round(right - left + 14) + 'px';
    ring.style.height = Math.round(bottom - top + 18) + 'px';
    mat.appendChild(ring);
    popIn(ring);
    return ring;
  }

  /** 竖式 13 − 9：十位 1 / 个位 3，第二行减 9，结果格先给 ? */
  function vsum(opts) {
    opts = opts || {};
    var box = el('div', 'l21-vsum' + (opts.big ? ' l21-vsum--big' : ''));
    var rows = el('div', 'l21-vrows');

    function vrow(opText, tContent, oContent) {
      var r = el('div', 'l21-vrow');
      var t = el('span', 'l21-vcell l21-vcell--t' + (opText ? ' is-op' : ''));
      var o = el('span', 'l21-vcell');
      if (opText) t.textContent = opText;
      if (tContent) t.appendChild(tContent);
      if (oContent) o.appendChild(oContent);
      r.appendChild(t);
      r.appendChild(o);
      rows.appendChild(r);
      return { row: r, tens: t, ones: o };
    }

    function digit(text) {
      return el('i', 'l21-vdigit', text);
    }

    var r1 = vrow('', digit('1'), digit('3'));
    var r2 = vrow('−', null, digit('9'));
    var line = el('div', 'l21-vline');
    var r3 = vrow('', null, null);
    box.appendChild(rows);
    if (opts.question) {
      var q = el('i', 'l21-vdigit l21-vq', '?');
      r3.ones.appendChild(q);
    }
    return { node: box, rows: rows, r1: r1, r2: r2, r3: r3, line: line };
  }

  function mark(cell, text) {
    var m = el('b', 'l21-vmark', text);
    cell.appendChild(m);
    popIn(m);
    return m;
  }

  /* ---------------- 教学第一幕：解捆、拿走九根 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l21-teach');
    var scene = el('div', 'l21-scene');
    var mat = el('div', 'l21-mat');
    var row = makeRow(13, 10);
    mat.appendChild(row.node);
    var b = bundleNode();
    mat.appendChild(b.node);
    scene.appendChild(mat);

    var v = vsum({ question: true });
    scene.appendChild(v.node);
    v.rows.insertBefore(v.line, v.r3.row);

    wrap.appendChild(scene);
    host.appendChild(wrap);
    popIn(mat);
    popIn(v.node);

    // Look! We have thirteen. We need to take away nine.
    await saySeq(['t1_a']);
    if (!alive) return;

    // We don't have enough ones.
    var v2 = saySeq(['t1_b']);
    await sleep(320);
    if (!alive) return;
    row.slots[10].stick.classList.add('is-worry');
    later(function () { row.slots[11].stick.classList.add('is-worry'); }, 100);
    later(function () { row.slots[12].stick.classList.add('is-worry'); }, 200);
    await v2;
    if (!alive) return;
    row.slots.forEach(function (s) { s.stick.classList.remove('is-worry'); });
    await sleep(1000);                     // 停顿 1 秒

    // We break the ten. Ten minus nine is one.
    var v3 = saySeq(['t1_c']);
    await sleep(760);
    if (!alive) return;
    await breakBundle(b, row.slots);
    if (!alive) return;
    v.r1.tens.classList.add('is-borrowed');
    v.r1.ones.classList.add('is-borrowed');
    mark(v.r1.tens, '0');
    mark(v.r1.ones, '13');
    await v3;
    if (!alive) return;
    await sleep(220);

    // One plus three is four. Thirteen minus nine equals four.
    var v4 = saySeq(['t1_d']);
    await sleep(180);
    if (!alive) return;
    takeAway(row.slots, 0, 9);
    await sleep(940);
    if (!alive) return;
    var ring = ringAround(mat, row.slots.slice(9));
    row.slots.slice(9).forEach(function (s, i) {
      later(function () { bounce(s.stick); }, i * 70);
    });
    if (v.r3.ones.firstChild) remove(v.r3.ones.firstChild);
    var res = el('i', 'l21-vdigit', '4');
    v.r3.ones.appendChild(res);
    v.r3.ones.classList.add('is-res');
    popIn(res);
    snapPop(v.r3.ones);
    Engine.sfx.star();

    await v4;
    if (!alive) return;
    await sleep(300);
    remove(ring);
  }

  /* ---------------- 教学第二幕：速算规律 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l21-teach');
    var v = vsum({ big: true });
    v.rows.insertBefore(v.line, v.r3.row);
    v.r1.tens.classList.add('is-borrowed');
    v.r1.ones.classList.add('is-borrowed');
    mark(v.r1.tens, '0');
    mark(v.r1.ones, '13');
    var res = el('i', 'l21-vdigit', '4');
    v.r3.ones.appendChild(res);
    v.r3.ones.classList.add('is-res');
    wrap.appendChild(v.node);

    var bolt = el('div', 'l21-bolt');
    bolt.innerHTML = ICONS.bolt;
    wrap.appendChild(bolt);

    host.appendChild(wrap);
    popIn(v.node);

    // Remember, when we take away, we can break the ten.
    await saySeq(['t2_a']);
    if (!alive) return;

    // Now, let's try some quick math!
    var v2 = saySeq(['t2_b']);
    bolt.classList.add('is-on');
    Engine.sfx.tap();
    await v2;
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
      var key = el('button', 'l21-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l21-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  function equation(a, b, opts) {
    opts = opts || {};
    var box = el('div', 'l21-eq');
    box.appendChild(el('span', 'l21-tile', String(a)));
    box.appendChild(el('span', 'l21-op', '−'));
    box.appendChild(el('span', 'l21-tile', String(b)));
    box.appendChild(el('span', 'l21-op', '='));
    var res = el('span', 'l21-tile ' + (opts.blank ? 'l21-tile--blank' : 'l21-tile--q'),
      opts.blank ? '' : '?');
    box.appendChild(res);
    return { node: box, res: res };
  }

  function fillResult(refs, answer) {
    refs.res.textContent = String(answer);
    refs.res.classList.remove('l21-tile--q', 'l21-tile--blank');
    refs.res.classList.add('is-answer');
    snapPop(refs.res);
  }

  /* ---------------- 题型 A：纯算式闪电点选 ---------------- */

  function buildFlash(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var timer = makeTimer(story);
    liveTimer = timer;

    var refs = equation(q.a, q.b, { question: true });
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function armTimer() {
      timer.arm(function () {
        if (state.locked || !alive) return;
        wrong(refs.node);                    // 超时与点错同权
        later(function () {
          if (state.locked || !alive) return;
          armTimer();                        // 进度条重置，同一题重来
        }, REARM_MS);
      });
    }

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          timer.done();
          fillResult(refs, answer);
          burst(story);
          correct(key);
          return;
        }
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        timer.stop();
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
          armTimer();
        }, 420);
      });
    }

    paint();
    return { begin: armTimer };
  }

  /* ---------------- 题型 B：算式卡 + 三个气球 ---------------- */

  function buildBalloon(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var timer = makeTimer(story);
    liveTimer = timer;

    var card = el('div', 'l21-card');
    var refs = equation(q.a, q.b, { blank: true });
    card.appendChild(refs.node);
    story.appendChild(card);
    popIn(card);

    var field = el('div', 'l21-balloons');
    story.appendChild(field);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      field.innerHTML = '';
      options.forEach(function (value, i) {
        var btn = el('button', 'l21-balloon');
        btn.type = 'button';
        btn.dataset.value = String(value);
        btn.setAttribute('aria-label', String(value));
        btn.style.color = COLORS[i % COLORS.length];
        btn.style.setProperty('--d', (i * 0.31).toFixed(2) + 's');
        var art = el('span', 'l21-balloon-art');
        art.innerHTML = ICONS.balloon;
        btn.appendChild(art);
        btn.appendChild(el('span', 'l21-balloon-num', String(value)));
        btn.addEventListener('click', function () { pick(value, btn); });
        popIn(btn, i * 70);
        field.appendChild(btn);
      });
    }

    function pick(value, btn) {
      if (state.locked || state.busy) return;
      if (value === answer) {
        state.busy = true;
        timer.done();
        fillResult(refs, answer);
        btn.classList.add('is-right');
        burst(btn);
        correct(btn);
        return;
      }
      /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
      timer.stop();
      wrong(btn);
      later(function () {
        if (state.locked || !alive) return;
        state.busy = false;
        Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
        paint();
        armTimer();
      }, 420);
    }

    function armTimer() {
      timer.arm(function () {
        if (state.locked || !alive) return;
        wrong(card);
        later(function () {
          if (state.locked || !alive) return;
          armTimer();
        }, REARM_MS);
      });
    }

    paint();
    return { begin: armTimer };
  }

  /* ---------------- 题型 C：限时找错误算式 ---------------- */

  function sentenceCard(s) {
    var card = el('button', 'l21-scard');
    card.type = 'button';
    card.dataset.key = s.a + '-' + s.b + '=' + s.shown;
    card.setAttribute('aria-label', s.a + ' minus ' + s.b + ' equals ' + s.shown);

    var line = el('div', 'l21-sent');
    line.appendChild(el('span', 'l21-tile l21-stile', String(s.a)));
    line.appendChild(el('span', 'l21-op', '−'));
    line.appendChild(el('span', 'l21-tile l21-stile', String(s.b)));
    line.appendChild(el('span', 'l21-op', '='));
    var res = el('span', 'l21-tile l21-stile l21-stile--res', String(s.shown));
    line.appendChild(res);
    card.appendChild(line);

    return { node: card, res: res };
  }

  function buildWrong(q, story, tray, state, correct, wrong) {
    var timer = makeTimer(story);
    liveTimer = timer;

    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      var copy = { a: s.a, b: s.b, shown: s.shown, key: s.a + '-' + s.b + '=' + s.shown };
      copy.bad = s.a - s.b !== s.shown;
      return copy;
    }));
    var keyOf = function (s) { return s.key; };
    var badItem = list.filter(function (s) { return s.bad; })[0];

    var board = el('div', 'l21-sents');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var c = sentenceCard(s);
        c.node.addEventListener('click', function () { pick(s, c); });
        popIn(c.node, i * 55);
        board.appendChild(c.node);
      });
    }

    function pick(s, c) {
      if (state.locked || state.busy) return;
      if (s.bad) {
        state.busy = true;
        timer.done();
        c.node.classList.add('is-right');
        var tick = el('span', 'l21-tick');
        tick.innerHTML = ICONS.check;
        c.node.appendChild(tick);
        popIn(tick, 40);
        snapPop(c.node);

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
        }, 240);

        correct(null, WRONG_HOLD);
        return;
      }

      /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
      timer.stop();
      wrong(c.node);
      later(function () {
        if (state.locked || !alive) return;
        state.busy = false;
        Engine.quiz.reshuffle(list, badItem, keyOf);
        paint();
        armTimer();
      }, 420);
    }

    function armTimer() {
      timer.arm(function () {
        if (state.locked || !alive) return;
        wrong(board);
        later(function () {
          if (state.locked || !alive) return;
          armTimer();
        }, REARM_MS);
      });
    }

    paint();
    return { begin: armTimer };
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }

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
      liveTimer = null;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type !== 'wrong') {
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

    var api = null;
    if (q.type === 'flash') api = buildFlash(q, story, tray, state, correct, wrong);
    else if (q.type === 'balloon') api = buildBalloon(q, story, tray, state, correct, wrong);
    else api = buildWrong(q, story, tray, state, correct, wrong);

    if (q.type === 'flash') tray.classList.add('l21-tray');

    // 计时从题干播完开始：孩子先听清算式，再拿满 5 秒（§6.9）
    saySeq(q.voice).then(function () {
      if (!alive || state.locked || !api) return;
      api.begin();
    });
  }

  /* ---------------- 结算 ---------------- */

  function finish(star) {
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }
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
    liveTimer = null;
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
    if (liveTimer) { liveTimer.stop(); liveTimer = null; }
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
  global.LEVELS[21] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
