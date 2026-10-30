/* ============================================================
   level-lv45.js · Find the Missing Number（两位数乘一位数 · 半抽象）
   ------------------------------------------------------------
   第五阶段第六关：把 13 × 3 拆成 10 × 3 与 3 × 3 求结果，
   再把同一套拆分反过来用，求「什么乘四等于四十八」。
     教学 4 幕：① 出题（13 × 3 = ?，问号呼吸）
                ② 拆（10×3=30 与 3×3=9 两张卡依次亮）
                ③ 合（30 + 9 = 39，问号翻成 39）
                ④ 求乘数（? × 4 = 48，问号快闪 10→11→12，转绿）
     答题 10 题：点选结果 4 / 拖拽填空 3 / 五秒闪电 3
   铁律：问句绝不悬空（§6.1）；答错只由 wrong() 置 busy（§6.17）；
         闪电条语音播完才走（§6.9）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 720;
  var WRONG_HOLD = 1500;
  var LIMIT_MS = 5000;
  var LOW_AT = 3000;

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
    bolt:
      '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' +
      '<path d="M13.4 2L4 13.6h5.4L8.8 22l9.6-12.2h-5.6z" fill="currentColor"/></svg>'
  };

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
  var cleanups = [];

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
    var id = setTimeout(function () { if (alive) fn(); }, ms);
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
    return anim.finished.then(function () { anim.cancel(); }, function () { });
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
        ctx.audio.play('lv45/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 数字块 ---------------- */

  function tile(text, cls) {
    return el('span', 'l45-tile' + (cls ? ' ' + cls : ''), text);
  }

  function eqHead(a, b, resText, resCls) {
    var head = el('div', 'l45-head');
    head.appendChild(tile(String(a)));
    head.appendChild(el('span', 'l45-op', '×'));
    head.appendChild(tile(String(b)));
    head.appendChild(el('span', 'l45-op', '='));
    var res = tile(resText, resCls);
    head.appendChild(res);
    return { node: head, res: res };
  }

  /* ---------------- 限时条（§6.9） ---------------- */

  function makeTimer(host, onEnd) {
    var bar = el('div', 'l45-bar is-idle');
    var fill = el('div', 'l45-bar-fill');
    bar.appendChild(fill);
    host.appendChild(bar);

    var anim = null;
    var lowT = 0;
    var endT = 0;
    var running = false;

    function clear() {
      if (lowT) { clearTimeout(lowT); lowT = 0; }
      if (endT) { clearTimeout(endT); endT = 0; }
      if (anim) { anim.cancel(); anim = null; }
      running = false;
    }

    function arm() {
      if (running) return;
      running = true;
      bar.classList.remove('is-idle', 'is-low', 'is-over', 'is-done');
      bar.classList.add('is-armed');
      anim = fill.animate(
        [{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: LIMIT_MS, easing: 'linear', fill: 'both' }
      );
      lowT = setTimeout(function () {
        if (running) bar.classList.add('is-low');
      }, LOW_AT);
      endT = setTimeout(function () {
        if (!running) return;
        clear();
        bar.classList.remove('is-low');
        bar.classList.add('is-over');
        if (onEnd) onEnd();
      }, LIMIT_MS);
    }

    function stop() {
      clear();
      bar.classList.remove('is-armed');
    }

    function reset() {
      stop();
      bar.classList.remove('is-low', 'is-over', 'is-done');
      bar.classList.add('is-idle');
    }

    function succeed() {
      stop();
      bar.classList.remove('is-low', 'is-over', 'is-idle', 'is-armed');
      bar.classList.add('is-done');
      fill.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }],
        { duration: 180, easing: 'ease-out', fill: 'both' });
    }

    return { node: bar, arm: arm, stop: stop, reset: reset, succeed: succeed };
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l45-teach');
    var head = eqHead(13, 3, '?', 'l45-tile--q');
    wrap.appendChild(head.node);
    wrap.appendChild(el('div', 'l45-cap', 'Split it into tens and ones'));
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;
    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l45-teach');
    var head = eqHead(13, 3, '?', 'l45-tile--q');
    wrap.appendChild(head.node);

    var cards = el('div', 'l45-split');
    var c1 = el('div', 'l45-card');
    c1.appendChild(el('span', 'l45-card-n', '10'));
    c1.appendChild(el('span', 'l45-card-op', '×'));
    c1.appendChild(el('span', 'l45-card-n', '3'));
    c1.appendChild(el('span', 'l45-card-op', '='));
    c1.appendChild(el('span', 'l45-card-n l45-card-n--res', '30'));
    cards.appendChild(c1);

    var c2 = el('div', 'l45-card');
    c2.appendChild(el('span', 'l45-card-n', '3'));
    c2.appendChild(el('span', 'l45-card-op', '×'));
    c2.appendChild(el('span', 'l45-card-n', '3'));
    c2.appendChild(el('span', 'l45-card-op', '='));
    c2.appendChild(el('span', 'l45-card-n l45-card-n--res', '9'));
    cards.appendChild(c2);

    wrap.appendChild(cards);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_b']);
    later(function () {
      if (!alive) return;
      c1.classList.add('is-on');
      popIn(c1);
      Engine.sfx.tap();
    }, 120);

    later(function () {
      if (!alive) return;
      c2.classList.add('is-on');
      popIn(c2);
      Engine.sfx.tap();
    }, 1560);

    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l45-teach');
    var head = eqHead(13, 3, '?', 'l45-tile--q');
    wrap.appendChild(head.node);

    var sum = el('div', 'l45-sum');
    sum.appendChild(tile('30', 'l45-tile--sm'));
    sum.appendChild(el('span', 'l45-op', '+'));
    sum.appendChild(tile('9', 'l45-tile--sm'));
    sum.appendChild(el('span', 'l45-op', '='));
    var res = tile('39', 'l45-tile--sm l45-tile--res');
    sum.appendChild(res);
    wrap.appendChild(sum);
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    later(function () {
      if (!alive) return;
      sum.classList.add('is-on');
      popIn(sum);
      Engine.sfx.tap();
    }, 180);

    later(function () {
      if (!alive || state3Done) return;
      head.res.classList.add('is-flip');
    }, 1240);

    later(function () {
      if (!alive || state3Done) return;
      state3Done = true;
      head.res.textContent = '39';
      head.res.classList.remove('is-flip', 'l45-tile--q');
      head.res.classList.add('l45-tile--res');
      snapPop(head.res);
      Engine.sfx.tap();
    }, 1460);

    await v;
    if (!alive) return;
    if (!state3Done) {
      state3Done = true;
      head.res.textContent = '39';
      head.res.classList.remove('l45-tile--q');
      head.res.classList.add('l45-tile--res');
      snapPop(head.res);
    }
    await sleep(400);
    state3Done = false;
  }

  var state3Done = false;

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l45-teach');
    var head = el('div', 'l45-head');
    var q = tile('?', 'l45-tile--q l45-tile--qmark');
    head.appendChild(q);
    head.appendChild(el('span', 'l45-op', '×'));
    head.appendChild(tile('4'));
    head.appendChild(el('span', 'l45-op', '='));
    head.appendChild(tile('48', 'l45-tile--res'));
    wrap.appendChild(head);
    wrap.appendChild(el('div', 'l45-cap', 'What times four is forty-eight?'));
    host.appendChild(wrap);
    await popIn(wrap);
    if (!alive) return;

    /* 问句单独一条语音，答句停 1 秒再播（§6.1：问句绝不悬空） */
    var asked = saySeq(['t1_d']);
    await asked;
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    var said = saySeq(['t1_e']);
    later(function () {
      if (!alive) return;
      var steps = ['10', '11', '12'];
      steps.forEach(function (val, i) {
        later(function () {
          if (!alive) return;
          q.textContent = val;
          q.classList.add('is-try');
          bounce(q);
          Engine.sfx.tap();
          later(function () { q.classList.remove('is-try'); }, 200);
        }, i * 300);
      });
    }, 220);

    later(function () {
      if (!alive) return;
      q.classList.remove('l45-tile--q', 'l45-tile--qmark');
      q.classList.add('l45-tile--res');
      snapPop(q);
      head.classList.add('is-green');
      Engine.sfx.star();
    }, 1180);

    await said;
    if (!alive) return;
    await sleep(360);
  }

  function waitTap(host) {
    return new Promise(function (resolve) {
      var done = false;
      var hintTimer = setTimeout(function () {
        if (done || !alive) return;
        var hint = el('div', 'tap-hint');
        hint.innerHTML = ICONS.hand;
        host.appendChild(hint);
      }, 3000);

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
      var key = el('button', 'l45-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l45-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：点选结果 ---------------- */

  function buildPick(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l45-board');
    var head = eqHead(q.a, q.b, '?', 'l45-tile--q');
    board.appendChild(head.node);

    var hint = el('div', 'l45-hint');
    hint.appendChild(el('span', 'l45-hint-t', ' '));
    board.appendChild(hint);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          head.res.classList.add('is-flip');
          later(function () {
            if (!alive) return;
            head.res.textContent = String(answer);
            head.res.classList.remove('is-flip', 'l45-tile--q');
            head.res.classList.add('l45-tile--res');
            snapPop(head.res);
          }, 200);
          later(function () {
            if (!alive) return;
            hint.classList.add('is-on');
            hint.firstChild.textContent = '10 × ' + q.b + '  +  ' + (q.a - 10) + ' × ' + q.b;
            popIn(hint);
          }, 420);
          Engine.sfx.tap();
          burst(story);
          correct(key, NEXT_MS + 240);
          return;
        }
        /* 先错一次：错完把选项重排（§6.17，busy 由 wrong() 自己置） */
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          options = Engine.quiz.shuffle(options);
          paint();
        }, 520);
      });
    }

    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖拽填空 ---------------- */

  function buildFill(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l45-board');
    var head = el('div', 'l45-head');
    head.appendChild(tile(String(q.a)));
    head.appendChild(el('span', 'l45-op', '×'));
    head.appendChild(tile(String(q.b)));
    head.appendChild(el('span', 'l45-op', '='));

    var slot = el('span', 'l45-slot');
    slot.dataset.value = '';
    head.appendChild(slot);
    board.appendChild(head);
    story.appendChild(board);
    popIn(board);

    var pool = el('div', 'l45-pool');
    var chips = Engine.quiz.shuffle(q.pool.slice());
    var placed = false;

    story.appendChild(pool);

    function finishChip(chip) {
      if (placed || state.locked) return;
      placed = true;
      chip.classList.add('is-used');
      slot.textContent = String(answer);
      slot.classList.add('is-filled');
      snapPop(slot);
      Engine.sfx.tap();
      burst(story);
      correct(null, NEXT_MS + 160);
    }

    function rejectChip(chip) {
      chip.classList.add('is-wrong');
      later(function () { chip.classList.remove('is-wrong'); }, 420);
    }

    function tryValue(value, chip) {
      if (placed || state.locked || state.busy) return;
      if (value === answer) { finishChip(chip); return; }
      /* 放错只弹回、不记错（§5.9.3 / §6.10：放不进不算答错） */
      rejectChip(chip);
      Engine.sfx.deny();
      bounce(chip);
      shake(board);
    }

    chips.forEach(function (value, i) {
      var chip = el('button', 'l45-chip');
      chip.type = 'button';
      chip.dataset.value = String(value);
      chip.setAttribute('aria-label', String(value));
      chip.appendChild(el('span', 'l45-chip-n', String(value)));
      chip.addEventListener('click', function () { tryValue(value, chip); });
      popIn(chip, i * 50);
      pool.appendChild(chip);
    });

    /* 拖拽：ghost 跟随，落在空位上才判；拖到别处弹回不判错（§5.9） */
    var drag = null;

    function point(e) {
      var t = e.touches && e.touches[0] ? e.touches[0] : e;
      return { x: t.clientX != null ? t.clientX : 0, y: t.clientY != null ? t.clientY : 0 };
    }

    function startDrag(e, chip) {
      if (placed || state.locked || state.busy) return;
      var p = point(e);
      var r = chip.getBoundingClientRect();
      drag = {
        chip: chip,
        value: Number(chip.dataset.value),
        dx: p.x - r.left,
        dy: p.y - r.top,
        moved: false,
        ghost: null
      };
      chip.setPointerCapture && e.pointerId != null && chip.setPointerCapture(e.pointerId);
    }

    function moveDrag(e) {
      if (!drag) return;
      var p = point(e);
      if (!drag.ghost) {
        drag.ghost = el('div', 'l45-ghost');
        drag.ghost.textContent = drag.chip.textContent;
        document.body.appendChild(drag.ghost);
        drag.ghost.style.width = '46px';
        drag.ghost.style.height = '46px';
      }
      drag.moved = true;
      drag.ghost.style.transform = 'translate(' + (p.x - 23) + 'px,' + (p.y - 23) + 'px)';
      var r = slot.getBoundingClientRect();
      var pad = 14;
      var hot = p.x >= r.left - pad && p.x <= r.right + pad &&
        p.y >= r.top - pad && p.y <= r.bottom + pad;
      slot.classList.toggle('is-hot', hot);
    }

    function endDrag(e) {
      if (!drag) return;
      var p = point(e);
      var chip = drag.chip;
      var value = drag.value;
      var moved = drag.moved;
      remove(drag.ghost);
      drag = null;
      slot.classList.remove('is-hot');
      if (!moved) return;
      var r = slot.getBoundingClientRect();
      var pad = 14;
      var hit = p.x >= r.left - pad && p.x <= r.right + pad &&
        p.y >= r.top - pad && p.y <= r.bottom + pad;
      if (hit) {
        tryValue(value, chip);
      } else {
        bounce(chip);
      }
    }

    pool.addEventListener('pointerdown', function (e) {
      var chip = e.target.closest ? e.target.closest('.l45-chip') : null;
      if (chip) startDrag(e, chip);
    });
    document.addEventListener('pointermove', moveDrag);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
    cleanups.push(function () {
      document.removeEventListener('pointermove', moveDrag);
      document.removeEventListener('pointerup', endDrag);
      document.removeEventListener('pointercancel', endDrag);
      if (drag && drag.ghost) remove(drag.ghost);
      drag = null;
    });

    popIn(pool);
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：五秒闪电 ---------------- */

  function buildFlash(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var top = el('div', 'l45-timed');
    var timer = makeTimer(top, function () {
      if (state.locked) return;
      timeout();
    });
    story.appendChild(top);

    var board = el('div', 'l45-board');
    var head = eqHead(q.a, q.b, '?', 'l45-tile--q l45-tile--big-q');
    board.appendChild(head.node);

    var chip = el('div', 'l45-flag');
    chip.innerHTML = ICONS.bolt + '<span>5 seconds</span>';
    board.appendChild(chip);
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function timeout() {
      if (state.locked) return;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 200);
      }
      Engine.sfx.wrong();
      shake(board);
      /* 空条停半秒让孩子看见「时间到」，再回满重来（§6.9） */
      later(function () {
        if (state.locked || !alive) return;
        timer.reset();
      }, 560);
      later(function () {
        if (state.locked || !alive) return;
        timer.arm();
      }, 1000);
    }

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          timer.succeed();
          head.res.textContent = String(answer);
          head.res.classList.remove('l45-tile--q');
          head.res.classList.add('l45-tile--res');
          snapPop(head.res);
          burst(story);
          correct(key);
          return;
        }
        timer.reset();
        wrong(key);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          timer.arm();
        }, 520);
      });
    }

    paint();
    /* 语音播完才计时（§6.9） */
    saySeq(q.voice).then(function () {
      if (state.locked || !alive) return;
      later(function () {
        if (state.locked || !alive) return;
        timer.arm();
      }, 260);
    });
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];

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
      later(function () { if (!state.locked) state.busy = false; }, 460);
    }

    if (q.type === 'pick') buildPick(q, story, tray, state, correct, wrong);
    else if (q.type === 'fill') buildFill(q, story, tray, state, correct, wrong);
    else buildFlash(q, story, tray, state, correct, wrong);
  }

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

  async function run(root) {
    var body = el('div', 'lv');
    var host = el('div', 'lv-story');
    body.appendChild(host);
    root.appendChild(body);

    if (ctx.quick) { askQuestion(root); return; }

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
    cleanups = [];
    sayToken = 0;
    state3Done = false;
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
    cleanups.forEach(function (fn) { fn(); });
    cleanups = [];
    clearTimers();
    if (tapFinish) { tapFinish(); tapFinish = null; }
    Array.prototype.slice.call(document.querySelectorAll('.l45-ghost')).forEach(remove);
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[45] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
