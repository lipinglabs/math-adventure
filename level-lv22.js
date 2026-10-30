/* ============================================================
   level-lv22.js · Line Them Up（竖式对齐 · 两位数加两位数）
   ------------------------------------------------------------
   第三阶段第七关：把「个位加个位、十位加十位」讲透，并落到竖式对齐。
     教学 4 幕：① 摆出 23 与 15（2 捆 + 3 根 / 1 捆 + 5 根）
                ② 个位合流：3 根 + 5 根 = 8 根
                ③ 十位合流：2 捆 + 1 捆 = 3 捆
                ④ 竖式 23 + 15：数字飞进各自的位，结果 38
     答题 10 题（整份打乱，三种题型）：
       tap    听算式，点出正确结果（4 题）
       drag   把散落的六个数字拖进竖式的六个空位（3 题，六位对齐）
       wrong  三个竖式里点出错的（没对齐 / 算错，3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答（本关教学无问句）、答题绝不补答；
         §5.9 拖拽热区外扩 14px 且未命中平滑弹回；§6.11 找错题答对后翻结果格并定格 1.5 秒。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var TAP_SLOP = 8;

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
        ctx.audio.play('lv22/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 具象：十块 / 小棒 ---------------- */

  function tenBlock() {
    var b = el('span', 'l22-ten');
    for (var i = 0; i < 10; i += 1) b.appendChild(el('i', 'l22-dot'));
    return b;
  }

  function stick() {
    return el('span', 'l22-stick');
  }

  /** 一侧的「几捆 + 几根」 */
  function sideCard(tens, ones, hidden) {
    var card = el('div', 'l22-side');
    var top = el('div', 'l22-tens');
    var blocks = [];
    for (var i = 0; i < tens; i += 1) {
      var b = tenBlock();
      top.appendChild(b);
      blocks.push(b);
    }
    var bottom = el('div', 'l22-ones');
    var sticks = [];
    for (var j = 0; j < ones; j += 1) {
      var s = stick();
      if (hidden) s.classList.add('is-hidden');
      bottom.appendChild(s);
      sticks.push(s);
    }
    card.appendChild(top);
    card.appendChild(bottom);
    return { node: card, blocks: blocks, sticks: sticks };
  }

  /* ---------------- 竖式 ---------------- */

  /**
   * 竖式：两列（十位 / 个位）。
   * opts.skew：把个位那一列整体右移，做出「没对齐」的样子。
   */
  function vsum(a, b, opts) {
    opts = opts || {};
    var box = el('div', 'l22-vs' + (opts.big ? ' l22-vs--big' : '') + (opts.skew ? ' is-skew' : ''));

    function row(opText, tens, ones) {
      var r = el('div', 'l22-vrow');
      var sign = el('span', 'l22-vop', opText || '');
      var t = el('span', 'l22-vcell l22-vcell--t');
      var o = el('span', 'l22-vcell l22-vcell--o');
      if (tens != null) t.appendChild(el('i', 'l22-digit', String(tens)));
      if (ones != null) o.appendChild(el('i', 'l22-digit', String(ones)));
      r.appendChild(sign);
      r.appendChild(t);
      r.appendChild(o);
      box.appendChild(r);
      return { row: r, sign: sign, tens: t, ones: o };
    }

    var r1 = row(null, Math.floor(a / 10), a % 10);
    var r2 = row('+', Math.floor(b / 10), b % 10);
    var line = el('div', 'l22-vline');
    box.appendChild(line);
    var r3 = row(null, null, null);
    return { node: box, r1: r1, r2: r2, r3: r3, line: line };
  }

  function setResult(v, value) {
    v.r3.tens.appendChild(el('i', 'l22-digit', String(Math.floor(value / 10))));
    v.r3.ones.appendChild(el('i', 'l22-digit', String(value % 10)));
    v.r3.tens.classList.add('is-res');
    v.r3.ones.classList.add('is-res');
  }

  /* ---------------- 教学第一幕：摆出 23 与 15 ---------------- */

  function buildTeachScene(opts) {
    opts = opts || {};
    var scene = el('div', 'l22-scene');

    var left = sideCard(2, 3, opts.hideOnes);
    var right = sideCard(1, 5, opts.hideOnes);
    var plus = el('span', 'l22-plus', '+');

    scene.appendChild(left.node);
    scene.appendChild(plus);
    scene.appendChild(right.node);

    var tray = el('div', 'l22-tray2');
    var trayTens = el('div', 'l22-tray-tens');
    var trayOnes = el('div', 'l22-tray-ones');
    var tensTargets = [];
    var onesTargets = [];
    for (var i = 0; i < 3; i += 1) {
      var t = tenBlock();
      t.classList.add('l22-ghost-item');
      if (opts.showTens) t.classList.add('is-on');
      trayTens.appendChild(t);
      tensTargets.push(t);
    }
    for (var j = 0; j < 8; j += 1) {
      var s = stick();
      s.classList.add('l22-ghost-item');
      if (opts.showOnes) s.classList.add('is-on');
      trayOnes.appendChild(s);
      onesTargets.push(s);
    }
    tray.appendChild(trayTens);
    tray.appendChild(trayOnes);
    scene.appendChild(tray);

    return {
      scene: scene,
      left: left,
      right: right,
      tray: tray,
      tensTargets: tensTargets,
      onesTargets: onesTargets
    };
  }

  /** 把 src 飞到 dst 的位置，落地后隐藏 src、亮起 dst */
  function flyTo(src, dst, delay) {
    var s = src.getBoundingClientRect();
    var d = dst.getBoundingClientRect();
    var dx = Math.round((d.left + d.width / 2) - (s.left + s.width / 2));
    var dy = Math.round((d.top + d.height / 2) - (s.top + s.height / 2));
    src.style.zIndex = '6';
    var anim = src.animate([
      { transform: 'translate(0,0) scale(1)' },
      { transform: 'translate(' + Math.round(dx * 0.5) + 'px,' + Math.round(dy * 0.5 - 18) + 'px) scale(1.05)', offset: 0.55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1)' }
    ], { duration: 460, delay: delay || 0, easing: 'cubic-bezier(.34,.9,.5,1)', fill: 'both' });
    return anim.finished.then(function () {
      src.style.visibility = 'hidden';
      anim.cancel();
      dst.classList.add('is-on');
      snapPop(dst);
    }, function () { /* 已取消 */ });
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l22-teach');
    var st = buildTeachScene();
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l22-teach');
    var st = buildTeachScene();
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // We add the ones. Three plus five equals eight.
    var v = saySeq(['t1_b']);
    await sleep(720);
    if (!alive) return;
    var src = st.left.sticks.concat(st.right.sticks);
    for (var i = 0; i < src.length; i += 1) {
      flyTo(src[i], st.onesTargets[i], i * 60);
    }
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l22-teach');
    var st = buildTeachScene({ showOnes: true, hideOnes: true });
    wrap.appendChild(st.scene);
    host.appendChild(wrap);
    popIn(st.scene);

    // We add the tens. Two plus one equals three.
    var v = saySeq(['t1_c']);
    await sleep(700);
    if (!alive) return;
    var src = st.left.blocks.concat(st.right.blocks);
    for (var i = 0; i < src.length; i += 1) {
      flyTo(src[i], st.tensTargets[i], i * 80);
    }
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l22-teach');
    var v = vsum(23, 15, { big: true });
    wrap.appendChild(v.node);
    host.appendChild(wrap);
    popIn(v.node);

    // Line up the ones and tens. Twenty-three plus fifteen equals thirty-eight.
    var line = saySeq(['t1_d']);
    await sleep(600);
    if (!alive) return;
    v.r1.row.classList.add('is-in');
    await sleep(260);
    v.r2.row.classList.add('is-in');
    await sleep(420);
    v.line.classList.add('is-in');
    await sleep(360);
    v.r3.row.classList.add('is-in');
    await sleep(420);
    if (!alive) return;
    setResult(v, 38);
    snapPop(v.r3.ones);
    Engine.sfx.star();

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
      var key = el('button', 'l22-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l22-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  function equation(a, b) {
    var box = el('div', 'l22-eq');
    box.appendChild(el('span', 'l22-tile', String(a)));
    box.appendChild(el('span', 'l22-op', '+'));
    box.appendChild(el('span', 'l22-tile', String(b)));
    box.appendChild(el('span', 'l22-op', '='));
    var res = el('span', 'l22-tile l22-tile--q', '?');
    box.appendChild(res);
    return { node: box, res: res };
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
      ghost.style.transform = 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.04)';
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
      if (cfg.onBounce) cfg.onBounce();
    }

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function insidePad(rect, x, y) {
    return x >= rect.left - HIT_PAD && x <= rect.right + HIT_PAD &&
           y >= rect.top - HIT_PAD && y <= rect.bottom + HIT_PAD;
  }

  /* ---------------- 题型 A：听算式点结果 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;
    var refs = equation(q.a, q.b);
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          refs.res.textContent = String(answer);
          refs.res.classList.remove('l22-tile--q');
          refs.res.classList.add('is-answer');
          snapPop(refs.res);
          burst(story);
          correct(key);
          return;
        }
        state.busy = true;
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(options, answer, function (v) { return String(v); });
          paint();
        }, 380);
      });
    }

    tray.classList.add('l22-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：六个数字拖进竖式 ---------------- */

  function buildDrag(q, story, tray, state, correct, wrong) {
    var sum = q.a + q.b;
    var want = [Math.floor(q.a / 10), q.a % 10, Math.floor(q.b / 10), q.b % 10, Math.floor(sum / 10), sum % 10];

    var board = el('div', 'l22-board');
    var v = vsum(q.a, q.b);
    v.node.classList.add('l22-vs--slots');
    board.appendChild(v.node);
    story.appendChild(board);
    popIn(board);

    // 六个空位（按 want 的顺序：A十 A个 B十 B个 R十 R个）
    var slots = [];
    function makeSlot(cell, value, label) {
      cell.textContent = '';
      cell.classList.add('l22-slot');
      cell.setAttribute('aria-label', label);
      var s = { cell: cell, value: value, filled: false };
      slots.push(s);
      return s;
    }
    makeSlot(v.r1.tens, want[0], 'tens of the first number');
    makeSlot(v.r1.ones, want[1], 'ones of the first number');
    makeSlot(v.r2.tens, want[2], 'tens of the second number');
    makeSlot(v.r2.ones, want[3], 'ones of the second number');
    makeSlot(v.r3.tens, want[4], 'tens of the answer');
    makeSlot(v.r3.ones, want[5], 'ones of the answer');

    var pool = Engine.quiz.shuffle(want.slice());
    var chips = [];

    function paint() {
      tray.innerHTML = '';
      chips = [];
      pool.forEach(function (value, i) {
        var chip = el('button', 'l22-chip');
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
              var g = el('span', 'l22-chip l22-ghost');
              g.textContent = String(value);
              return g;
            },
            find: function (x, y) {
              var best = null;
              var bestD = Infinity;
              slots.forEach(function (s) {
                if (s.filled) return;
                var r = s.cell.getBoundingClientRect();
                if (!insidePad(r, x, y)) return;
                var d = Math.abs(x - (r.left + r.width / 2)) + Math.abs(y - (r.top + r.height / 2));
                if (d < bestD) { bestD = d; best = s; }
              });
              return best;
            },
            onDrop: function (slot) {
              if (slot.value !== value) {           // 放错位置：弹回，不记错（§5.9.3）
                shake(chip);
                return;
              }
              slot.filled = true;
              slot.cell.classList.add('is-filled');
              slot.cell.textContent = String(value);
              snapPop(slot.cell);
              Engine.sfx.tap();
              chip.classList.add('is-used');
              chip.style.visibility = 'hidden';
              chips.push(chip);
              if (slots.filter(function (s) { return s.filled; }).length === slots.length) {
                later(function () {
                  if (!alive) return;
                  v.r3.tens.classList.add('is-res');
                  v.r3.ones.classList.add('is-res');
                  burst(board);
                  correct(null);
                }, 220);
              }
            }
          });
        });
        popIn(chip, i * 40);
        tray.appendChild(chip);
      });
    }

    tray.classList.add('l22-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三个竖式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      var copy = { a: s.a, b: s.b, shown: s.shown, skew: !!s.skew };
      copy.bad = copy.skew || (s.a + s.b !== s.shown);
      return copy;
    }));

    var board = el('div', 'l22-vsrow');
    story.appendChild(board);

    var items = [];

    function paint() {
      board.innerHTML = '';
      items = [];
      list.forEach(function (s, i) {
        var v = vsum(s.a, s.b, { skew: s.skew });
        var wrap = el('button', 'l22-vcard');
        wrap.type = 'button';
        wrap.dataset.key = s.a + '+' + s.b + '=' + s.shown + (s.skew ? 's' : '');
        wrap.setAttribute('aria-label', s.a + ' plus ' + s.b + ' equals ' + s.shown);
        wrap.appendChild(v.node);
        setResult(v, s.shown);
        wrap.addEventListener('click', function () { pick(s, v, wrap); });
        popIn(wrap, i * 60);
        board.appendChild(wrap);
        items.push({ s: s, v: v, node: wrap });
      });
    }

    function pick(s, v, node) {
      if (state.locked || state.busy) return;
      if (!s.bad) {
        state.busy = true;
        wrong(node);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) {
            return x.skew || (x.a + x.b !== x.shown);
          })[0], function (x) { return x.a + '+' + x.b + '=' + x.shown + (x.skew ? 's' : ''); });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      node.classList.add('is-right');
      var tick = el('span', 'l22-tick');
      tick.innerHTML = ICONS.check;
      node.appendChild(tick);
      popIn(tick, 40);
      snapPop(node);

      if (s.skew) {
        // 没对齐：把它对齐回去
        later(function () {
          v.node.classList.remove('is-skew');
          v.node.classList.add('is-fixed');
          snapPop(v.node);
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(node);
        }, 300);
      } else {
        // 算错：只翻结果格（§6.11）
        later(function () {
          v.r3.tens.classList.add('is-flip');
          v.r3.ones.classList.add('is-flip');
          later(function () {
            v.r3.tens.textContent = '';
            v.r3.ones.textContent = '';
            var fixed = s.a + s.b;
            v.r3.tens.appendChild(el('i', 'l22-digit', String(Math.floor(fixed / 10))));
            v.r3.ones.appendChild(el('i', 'l22-digit', String(fixed % 10)));
            v.r3.tens.classList.remove('is-flip');
            v.r3.ones.classList.remove('is-flip');
            v.r3.tens.classList.add('is-res');
            v.r3.ones.classList.add('is-res');
            bounce(v.r3.ones);
            Engine.sfx.correct();
            later(function () { Engine.sfx.star(); }, 90);
            burst(node);
          }, 230);
        }, 240);
      }

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

    makeReplay(story, q.type === 'drag' ? q.voice : q.voice);

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      if (q.type === 'drag') {
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

    if (q.type === 'tap') buildTap(q, story, tray, state, correct, wrong);
    else if (q.type === 'drag') buildDrag(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l22-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[22] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
