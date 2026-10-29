/* ============================================================
   level-lv14.js · Match Maker（拖拽算式与答案配对）
   ------------------------------------------------------------
   2 幕示范教学 + 10 题（顺序每局打乱），三种题型：
     pair     左边一张算式卡 → 拖到右边三个数字里正确的那个
     listen   左边三张算式卡，语音点名一张 → 拖到右边对应数字
     reverse  左边一个数字 → 把右边正确的算式卡拖过去
   铁律：全英文、点按推进、教学问句 1 秒后自答（第二幕）、
         拖拽热区外扩 HIT_PAD=14（§5.9）、未命中平滑弹回不判错、
         吸附必须有「咔哒」挤压回弹（§5.11）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;              // §5.9 落点热区四边外扩
  var TAP_SLOP = 8;              // 位移小于 8px 视为轻点，走「点两下」兜底
  var SNAP_MS = 170;             // 松手 → 吸附到目标卡
  var NEXT_MS = 700;             // 答对到下一题（§6.4）

  /* ---------------- 图标 ---------------- */

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">' +
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
      { opacity: 0, transform: 'scale(.72)' },
      { opacity: 1, transform: 'scale(1.06)', offset: 0.66 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 360, delay: delay || 0 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px) rotate(-1.4deg)', offset: 0.22 },
      { transform: 'translateX(6px) rotate(1.4deg)', offset: 0.5 },
      { transform: 'translateX(-3px)', offset: 0.78 },
      { transform: 'translateX(0)' }
    ], { duration: 400, easing: 'cubic-bezier(.22,.61,.36,1)' });
  }

  /** 吸附那一下的挤压回弹（§5.11 三段形变） */
  function snapPop(node) {
    return animate(node, [
      { transform: 'scale(1.14,.82)' },
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
        ctx.audio.play('lv14/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 卡片 ---------------- */

  function valueOf(eq) {
    return eq.op === '+' ? eq.a + eq.b : eq.a - eq.b;
  }

  function eqCard(eq) {
    var card = el('div', 'l14-card l14-card--eq');
    card.dataset.kind = 'eq';
    card.dataset.value = String(valueOf(eq));
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', eq.a + (eq.op === '+' ? ' plus ' : ' minus ') + eq.b);
    card.appendChild(el('span', 'l14-eq-num', String(eq.a)));
    card.appendChild(el('span', 'l14-eq-op', eq.op === '+' ? '+' : '\u2212'));
    card.appendChild(el('span', 'l14-eq-num', String(eq.b)));
    return card;
  }

  function numCard(value, solo) {
    var card = el('div', 'l14-card l14-card--num' + (solo ? ' l14-card--solo' : ''));
    card.dataset.kind = 'num';
    card.dataset.value = String(value);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', String(value));
    card.appendChild(el('span', 'l14-num', String(value)));
    return card;
  }

  /**
   * 三种题型共用一块板：始终「算式可拖、数字是落点」。
   * pair    → 左 1 张算式、右 3 个数字
   * listen  → 左 3 张算式、右 3 个数字
   * reverse → 左 1 个数字（落点）、右 3 张算式
   */
  function buildBoard(q, opts) {
    opts = opts || {};
    var keep = opts.shuffle === false;          // 教学演示用固定顺序
    var board = el('div', 'l14-board l14-board--' + q.type);
    var left = el('div', 'l14-col l14-col--left');
    var right = el('div', 'l14-col l14-col--right');
    var sources = [];
    var targets = [];
    var i;

    if (q.type === 'pair') {
      left.classList.add('l14-col--single');
      var eq = { a: q.a, b: q.b, op: q.op };
      var card = eqCard(eq);
      left.appendChild(card);
      sources.push(card);

      var nums = keep ? q.numbers.slice() : Engine.quiz.shuffle(q.numbers.slice());
      for (i = 0; i < nums.length; i += 1) {
        var n = numCard(nums[i]);
        right.appendChild(n);
        targets.push(n);
      }
    } else if (q.type === 'listen') {
      var order = keep ? q.eqs.map(function (e, k) { return k; }) : Engine.quiz.shuffle(q.eqs.map(function (e, k) { return k; }));
      order.forEach(function (k) {
        var c = eqCard(q.eqs[k]);
        left.appendChild(c);
        sources.push(c);
      });
      var ns = keep ? q.numbers.slice() : Engine.quiz.shuffle(q.numbers.slice());
      ns.forEach(function (v) {
        var n2 = numCard(v);
        right.appendChild(n2);
        targets.push(n2);
      });
    } else {
      left.classList.add('l14-col--single');
      var target = numCard(q.target, true);
      left.appendChild(target);
      targets.push(target);

      var order2 = keep ? q.eqs.map(function (e, k) { return k; }) : Engine.quiz.shuffle(q.eqs.map(function (e, k) { return k; }));
      order2.forEach(function (k) {
        var c2 = eqCard(q.eqs[k]);
        right.appendChild(c2);
        sources.push(c2);
      });
    }

    board.appendChild(left);
    board.appendChild(right);
    return { node: board, sources: sources, targets: targets };
  }

  /* ---------------- 拖拽（§5.9 / §5.10 两下轻点兜底） ---------------- */

  function makeGhost(card, x, y) {
    var ghost = card.cloneNode(true);
    ghost.classList.add('l14-ghost');
    ghost.style.left = x + 'px';
    ghost.style.top = y + 'px';
    document.body.appendChild(ghost);
    return ghost;
  }

  /** 未命中：320ms 三段回弹，绝不落子、不算错 */
  function bounceBack(ghost, fromX, fromY, toX, toY) {
    var dx = toX - fromX;
    var dy = toY - fromY;
    var back = ghost.animate([
      { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(-50%,-50%) translate(' + (dx * 0.55) + 'px,' + (dy * 0.55) + 'px) scale(.86)', opacity: 0.85, offset: 0.62 },
      { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.55)', opacity: 0 }
    ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
    back.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
  }

  function hitTest(targets, x, y) {
    for (var i = 0; i < targets.length; i += 1) {
      var b = targets[i].getBoundingClientRect();
      if (x >= b.left - HIT_PAD && x <= b.right + HIT_PAD &&
          y >= b.top - HIT_PAD && y <= b.bottom + HIT_PAD) {
        return targets[i];
      }
    }
    return null;
  }

  function bindBoard(board, opts) {
    var ghost = null;
    var src = null;
    var start = { x: 0, y: 0 };
    var origin = { x: 0, y: 0 };
    var moved = false;
    var armed = null;
    var detach = null;

    function setArmed(card) {
      if (armed === card) return;
      if (armed) armed.classList.remove('is-armed');
      armed = card;
      if (armed) armed.classList.add('is-armed');
      board.node.classList.toggle('has-armed', !!armed);
    }

    function onMove(e) {
      if (!src) return;
      if (!moved) {
        if (Math.abs(e.clientX - start.x) <= TAP_SLOP && Math.abs(e.clientY - start.y) <= TAP_SLOP) return;
        moved = true;
        var r = src.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        ghost = makeGhost(src, e.clientX, e.clientY);
        src.classList.add('is-dragging');
        board.node.classList.add('is-dragging');
      }
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    }

    function finishDrag() {
      if (detach) detach();
      detach = null;
    }

    function onUp(e) {
      finishDrag();
      if (!src) return;
      var card = src;
      src = null;

      if (!moved) {
        // 轻点：选中 / 取消（§5.10.4 的两下轻点兜底）
        if (armed === card) setArmed(null);
        else setArmed(card);
        Engine.sfx.tap();
        return;
      }

      board.node.classList.remove('is-dragging');
      card.classList.remove('is-dragging');

      var target = hitTest(opts.targets, e.clientX, e.clientY);
      if (target) {
        setArmed(null);
        opts.resolve(card, target, ghost, origin, { x: e.clientX, y: e.clientY });
        ghost = null;
        return;
      }

      // 没有落在任何卡片上：平滑弹回（不判错）
      if (ghost) {
        bounceBack(ghost, e.clientX, e.clientY, origin.x, origin.y);
        ghost = null;
      }
      opts.onMiss();
    }

    function onDown(e) {
      if (!alive || opts.locked()) return;
      if (e.button != null && e.button !== 0) return;
      var card = e.target && e.target.closest ? e.target.closest('.l14-card') : null;
      if (!card || !board.node.contains(card)) return;
      if (card.classList.contains('is-matched') || card.classList.contains('is-used')) return;

      var isSource = opts.sources.indexOf(card) >= 0;
      if (!isSource) {
        // 点的是数字/落点：已经选中算式就直接配
        if (armed && opts.targets.indexOf(card) >= 0) {
          e.preventDefault();
          var from = armed;
          setArmed(null);
          opts.resolve(from, card, null, null, { x: e.clientX, y: e.clientY });
        }
        return;
      }

      e.preventDefault();
      src = card;
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
    }

    board.node.addEventListener('pointerdown', onDown);

    return function () {
      finishDrag();
      board.node.removeEventListener('pointerdown', onDown);
      if (ghost) { remove(ghost); ghost = null; }
      if (armed) { armed.classList.remove('is-armed'); armed = null; }
    };
  }

  /* ---------------- 吸附动画 ---------------- */

  /**
   * 松手命中后：幽灵卡飞到目标中心 → 挤压回弹 → 两张卡同时发光。
   * 全程约 420ms，进下一题仍守 700ms（§6.4）。
   */
  function snapInto(ghost, target, source, origin, dropPoint) {
    var gb = ghost.getBoundingClientRect();
    var tb = target.getBoundingClientRect();
    var dx = (tb.left + tb.width / 2) - (gb.left + gb.width / 2);
    var dy = (tb.top + tb.height / 2) - (gb.top + gb.height / 2);

    var fly = ghost.animate([
      { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
      { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.9)', opacity: 1 }
    ], { duration: SNAP_MS, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' });

    return fly.finished.then(function () {
      Engine.sfx.tap();                 // 咔哒
      snapPop(target);
      ghost.classList.add('is-snapped');
      var out = ghost.animate([
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.9)', opacity: 1 },
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.16,.84)', opacity: 1, offset: 0.45 },
        { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.7)', opacity: 0 }
      ], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' });
      out.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
      markMatched(source, target);
    }, function () { remove(ghost); });
  }

  function markMatched(source, target) {
    if (source) source.classList.add('is-used');
    target.classList.add('is-matched');
    var badge = el('span', 'l14-check');
    badge.innerHTML = ICONS.check;
    target.appendChild(badge);
    popIn(badge, 40);
  }

  /* ---------------- 教学演示：手把卡片拖过去 ---------------- */

  function demoDrag(source, target) {
    return new Promise(function (resolve) {
      var sb = source.getBoundingClientRect();
      var tb = target.getBoundingClientRect();
      var sx = sb.left + sb.width / 2;
      var sy = sb.top + sb.height / 2;
      var tx = tb.left + tb.width / 2;
      var ty = tb.top + tb.height / 2;

      var ghost = makeGhost(source, sx, sy);
      ghost.classList.add('l14-ghost--demo');

      var hand = el('div', 'l14-hand');
      hand.innerHTML = ICONS.hand;
      hand.style.left = (sx + 54) + 'px';
      hand.style.top = (sy + 26) + 'px';
      document.body.appendChild(hand);

      source.classList.add('is-dragging');

      var mid = {
        x: (tx - sx) * 0.55,
        y: (ty - sy) * 0.55 - 18
      };
      var frames = [
        { transform: 'translate(-50%,-50%) translate(0,0) scale(1.04)' },
        { transform: 'translate(-50%,-50%) translate(' + mid.x + 'px,' + mid.y + 'px) scale(1.06)', offset: 0.5 },
        { transform: 'translate(-50%,-50%) translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(.96)' }
      ];
      var opts = { duration: 820, easing: 'cubic-bezier(.32,.02,.4,1)', fill: 'both' };

      animate(ghost, frames, opts);
      animate(hand, frames, opts);

      later(function () {
        Engine.sfx.tap();
        snapPop(target);
        animate(ghost, [
          { transform: 'translate(-50%,-50%) translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(.96)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(1.18,.8)', opacity: 1, offset: 0.45 },
          { transform: 'translate(-50%,-50%) translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px) scale(.72)', opacity: 0 }
        ], { duration: 280, easing: 'cubic-bezier(.34,1.56,.64,1)' });
        markMatched(source, target);
        source.classList.remove('is-dragging');
        animate(hand, [
          { transform: 'translate(0,0)', opacity: 1 },
          { transform: 'translate(10px,-8px)', opacity: 0 }
        ], { duration: 260, easing: 'cubic-bezier(.4,0,.6,1)' });
        later(function () {
          remove(ghost);
          remove(hand);
          resolve();
        }, 300);
      }, 840);
    });
  }

  /* ---------------- 教学第一幕：12 + 3 → 15 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';

    var board = buildBoard({
      type: 'pair', a: 12, b: 3, op: '+', numbers: [15, 16, 18]
    }, { shuffle: false });
    host.appendChild(board.node);

    board.sources.concat(board.targets).forEach(function (c, i) { popIn(c, i * 60); });
    await sleep(620);
    if (!alive) return;

    // Let's match the math sentence to the answer.
    await saySeq(['t1_a']);
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    // 手把 12 + 3 拖到 15 上，两张卡吸附发光
    await demoDrag(board.sources[0], board.targets[0]);
    if (!alive) return;

    await sleep(160);
    // Twelve plus three equals fifteen. They match!
    await saySeq(['t1_b']);
    if (!alive) return;

    await sleep(300);
  }

  /* ---------------- 教学第二幕：18 − 5 → 13 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';

    var board = buildBoard({
      type: 'pair', a: 18, b: 5, op: '\u2212', numbers: [13, 14, 12]
    }, { shuffle: false });
    host.appendChild(board.node);

    board.sources.concat(board.targets).forEach(function (c, i) { popIn(c, i * 60); });
    await sleep(600);
    if (!alive) return;

    // Let's try another one. Eighteen minus five. Which card matches?
    await saySeq(['t2_a']);
    if (!alive) return;

    await sleep(1000);                     // §6.1 问句后停 1 秒
    if (!alive) return;

    // 自答：The thirteen card!（同时开始拖）
    var voice = saySeq(['t2_b']);
    await sleep(200);
    if (!alive) return;

    await demoDrag(board.sources[0], board.targets[0]);
    if (!alive) return;
    await voice;
    if (!alive) return;

    // Eighteen minus five equals thirteen.
    await saySeq(['t2_c']);
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
      saySeq(keys);
    });
    story.appendChild(replay);
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();

    var q = queue[session.index];
    if (!q) return;

    root.innerHTML = '';
    // 兜底：上一题没走完的幽灵卡 / 手势不留在页面上
    Array.prototype.slice.call(document.querySelectorAll('.l14-ghost, .l14-hand'))
      .forEach(function (n) { remove(n); });
    renderId += 1;
    var wrap = el('div', 'lv');
    var story = el('div', 'lv-story');
    var tray = el('div', 'lv-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    makeReplay(story, q.voice);

    var board = buildBoard(q);
    story.appendChild(board.node);
    popIn(board.node);

    var state = { locked: false, busy: false, errors: 0 };

    function next() {
      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));
      if (solved.done) later(function () { finish(solved.star); }, 620);
      else later(function () { askQuestion(root); }, NEXT_MS);
    }

    function resolved(source, target, ghost, origin, point) {
      var ok = Number(source.dataset.value) === Number(target.dataset.value);

      if (ok) {
        if (state.locked) { remove(ghost); return; }
        state.locked = true;
        Engine.audio.stop();
        if (ghost) {
          snapInto(ghost, target, source, origin, point);
        } else {
          Engine.sfx.tap();
          snapPop(target);
          markMatched(source, target);
        }
        later(function () {
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(target);
        }, 120);
        next();
        return;
      }

      // 配错：摇一下、记一次错、卡片回原位，题号不前进
      if (state.busy) { remove(ghost); return; }
      state.busy = true;
      state.errors += 1;
      session.answer(false);
      Engine.sfx.wrong();
      shake(source);
      shake(target);
      target.classList.add('is-bad');
      later(function () { target.classList.remove('is-bad'); }, 560);
      if (ghost && origin) {
        var gb = ghost.getBoundingClientRect();
        bounceBack(ghost, gb.left + gb.width / 2, gb.top + gb.height / 2, origin.x, origin.y);
      } else {
        remove(ghost);
      }
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 260);
      }
      later(function () { state.busy = false; }, 460);
    }

    bindBoard(board, {
      sources: board.sources,
      targets: board.targets,
      locked: function () { return state.locked; },
      resolve: resolved,
      onMiss: function () { /* 落在空处：只弹回，不判错 */ }
    });

    saySeq(q.voice);
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
    Array.prototype.slice.call(document.querySelectorAll('.l14-ghost, .l14-hand'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[14] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
