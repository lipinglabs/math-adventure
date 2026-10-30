/* ============================================================
   level-lv29.js · Candy Strings（5 的乘法）
   ------------------------------------------------------------
   第四阶段第二关：把「几串五颗」看成 5 的乘法。
     教学 4 幕：① 三串糖果，每串五颗
                ② 逐颗点亮，每串末尾弹出累计 5 / 10 / 15
                ③ 三串收成 3 × 5 = 15
                ④ 跳跃数列 5 → 10 → 15
     答题 10 题：点选结果 4 / 拖糖串 3 / 纯听速算 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var PER_STRING = 5;

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
    ear:
      '<svg viewBox="0 0 48 48" width="54" height="54" aria-hidden="true">' +
      '<path d="M6 20h7l9-7v22l-9-7H6z" fill="currentColor"/>' +
      '<path d="M28 17a9 9 0 0 1 0 14M33.5 12a16 16 0 0 1 0 24" fill="none" stroke="currentColor" ' +
      'stroke-width="3.2" stroke-linecap="round"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
      '<path d="M4.7 12.6l5 4.9L19.4 6.9" fill="none" stroke="currentColor" stroke-width="3.4" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>'
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
        ctx.audio.play('lv29/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 糖果串 ---------------- */

  function candyString(cls) {
    var node = el('div', 'l29-string' + (cls ? ' ' + cls : ''));
    var loop = el('span', 'l29-loop');
    node.appendChild(loop);
    var body = el('div', 'l29-candies');
    var candies = [];
    for (var i = 0; i < PER_STRING; i += 1) {
      var c = el('span', 'l29-candy');
      body.appendChild(c);
      candies.push(c);
    }
    node.appendChild(body);
    return { node: node, candies: candies };
  }

  function badge(text) {
    return el('b', 'l29-count', text);
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l29-teach');
    var row = el('div', 'l29-strings');
    for (var i = 0; i < 3; i += 1) {
      row.appendChild(candyString().node);
    }
    wrap.appendChild(row);
    host.appendChild(wrap);
    await popIn(row);
    if (!alive) return;

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                 // 讲完这一句停 1 秒，再进入点数
    if (!alive) return;
    await sleep(240);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l29-teach');
    var row = el('div', 'l29-strings');
    var strings = [];
    for (var i = 0; i < 3; i += 1) {
      var s = candyString();
      strings.push(s);
      row.appendChild(s.node);
    }
    wrap.appendChild(row);
    host.appendChild(wrap);
    await popIn(row);
    if (!alive) return;
    await sleep(320);

    var v = saySeq(['t1_b']);
    await sleep(360);
    if (!alive) return;

    var total = 0;
    for (var k = 0; k < strings.length; k += 1) {
      for (var j = 0; j < PER_STRING; j += 1) {
        strings[k].candies[j].classList.add('is-on');
        Engine.sfx.tap();
        await sleep(120);
        if (!alive) return;
      }
      total += PER_STRING;
      var b = badge(String(total));
      strings[k].node.appendChild(b);
      popIn(b);
      bounce(b);
      await sleep(240);
      if (!alive) return;
    }

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l29-teach');
    var eq = el('div', 'l29-eq l29-eq--big');
    var t3 = el('span', 'l29-tile', '3');
    var op = el('span', 'l29-op l29-op--times', '×');
    var t5 = el('span', 'l29-tile', '5');
    var res = el('span', 'l29-tile l29-tile--q', '?');
    eq.appendChild(t3);
    eq.appendChild(op);
    eq.appendChild(t5);
    eq.appendChild(el('span', 'l29-op', '='));
    eq.appendChild(res);
    wrap.appendChild(eq);

    var note = el('div', 'l29-note', '3 strings of 5');
    note.classList.add('is-hidden');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(eq);
    if (!alive) return;
    await sleep(360);

    var v = saySeq(['t2_a']);
    await sleep(720);
    if (!alive) return;
    op.classList.add('is-lit');
    snapPop(op);
    Engine.sfx.tap();
    await sleep(720);
    if (!alive) return;
    res.classList.remove('l29-tile--q');
    res.classList.add('l29-tile--res');
    res.textContent = '15';
    popIn(res);
    snapPop(res);
    bounce(t3);
    Engine.sfx.correct();
    await sleep(200);
    note.classList.remove('is-hidden');
    popIn(note);

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l29-teach');
    var track = el('div', 'l29-jumps');
    var stones = [];

    [5, 10, 15].forEach(function (v, i) {
      if (i) track.appendChild(el('span', 'l29-jump-line'));
      var s = el('div', 'l29-stone', String(v));
      track.appendChild(s);
      stones.push(s);
    });
    wrap.appendChild(track);

    var note = el('div', 'l29-note', 'count by fives');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(track);
    if (!alive) return;

    var v = saySeq(['t2_b']);
    await sleep(600);
    if (!alive) return;
    for (var i = 0; i < stones.length; i += 1) {
      stones[i].classList.add('is-on');
      bounce(stones[i]);
      Engine.sfx.tap();
      await sleep(420);
      if (!alive) return;
    }
    stones[2].classList.add('is-final');
    snapPop(stones[2]);
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
      var key = el('button', 'l29-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l29-key-digit', String(value)));
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
          opacity: .8, offset: .55
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

  /* ---------------- 题型 A：看糖果串点结果 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.n * PER_STRING;

    var board = el('div', 'l29-board');
    var eq = el('div', 'l29-eq');
    eq.appendChild(el('span', 'l29-tile l29-tile--sm', String(q.n)));
    eq.appendChild(el('span', 'l29-op', '×'));
    eq.appendChild(el('span', 'l29-tile l29-tile--sm', '5'));
    eq.appendChild(el('span', 'l29-op', '='));
    var res = el('span', 'l29-tile l29-tile--sm l29-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var array = el('div', 'l29-array');
    for (var i = 0; i < q.n; i += 1) {
      var s = candyString('l29-string--sm');
      for (var j = 0; j < PER_STRING; j += 1) s.candies[j].classList.add('is-on');
      popIn(s.node, i * 50);
      array.appendChild(s.node);
    }
    board.appendChild(array);

    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l29-tile--q');
          res.classList.add('l29-tile--res');
          snapPop(res);
          burst(story);
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

    tray.classList.add('l29-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖糖串进框 ---------------- */

  function buildBuild(q, story, tray, state, correct, wrong) {
    var target = q.n * PER_STRING;

    var board = el('div', 'l29-build');
    var eq = el('div', 'l29-eq');
    eq.appendChild(el('span', 'l29-tile l29-tile--sm', '5'));
    eq.appendChild(el('span', 'l29-op', '×'));
    eq.appendChild(el('span', 'l29-tile l29-tile--sm', String(q.n)));
    eq.appendChild(el('span', 'l29-op', '='));
    var res = el('span', 'l29-tile l29-tile--sm l29-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var box = el('div', 'l29-box');
    var slots = [];
    for (var i = 0; i < q.n; i += 1) {
      var slot = el('div', 'l29-slot');
      box.appendChild(slot);
      slots.push({ node: slot, filled: false });
    }
    board.appendChild(box);

    var meter = el('div', 'l29-meter');
    meter.appendChild(el('span', 'l29-meter-label', '0 candies'));
    board.appendChild(meter);

    story.appendChild(board);
    popIn(board);

    var count = 0;
    var pool = [];
    for (var k = 0; k <= q.n; k += 1) pool.push(k);

    tray.innerHTML = '';
    pool.forEach(function (idx, i) {
      var chip = el('button', 'l29-chip');
      chip.type = 'button';
      chip.dataset.string = String(idx);
      chip.setAttribute('aria-label', 'a string of five candies');
      var mini = candyString('l29-string--xs');
      for (var j = 0; j < PER_STRING; j += 1) mini.candies[j].classList.add('is-on');
      chip.appendChild(mini.node);
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l29-ghost');
            var gg = candyString('l29-string--xs');
            for (var j = 0; j < PER_STRING; j += 1) gg.candies[j].classList.add('is-on');
            g.appendChild(gg.node);
            return g;
          },
          find: function (x, y) {
            var best = null;
            var bestD = Infinity;
            slots.forEach(function (s) {
              if (s.filled) return;
              var r = s.node.getBoundingClientRect();
              if (!insidePad(r, x, y)) return;
              var d = Math.abs(x - (r.left + r.width / 2)) + Math.abs(y - (r.top + r.height / 2));
              if (d < bestD) { bestD = d; best = s; }
            });
            return best;
          },
          onDrop: function (slotRef) {
            slotRef.filled = true;
            slotRef.node.classList.add('is-filled');
            var mini = candyString('l29-string--xs');
            for (var j = 0; j < PER_STRING; j += 1) mini.candies[j].classList.add('is-on');
            slotRef.node.appendChild(mini.node);
            snapPop(slotRef.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            chip.style.visibility = 'hidden';
            count += PER_STRING;
            meter.firstChild.textContent = count + ' candies';
            bounce(meter);
            if (count >= target) {
              res.textContent = String(target);
              res.classList.remove('l29-tile--q');
              res.classList.add('l29-tile--res');
              snapPop(res);
              later(function () {
                if (!alive) return;
                burst(board);
                correct(null);
              }, 260);
            }
          }
        });
      });
      popIn(chip, i * 40);
      tray.appendChild(chip);
    });

    tray.classList.add('l29-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：纯听速算 ---------------- */

  function buildListen(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;

    var board = el('div', 'l29-listen');
    var ear = el('button', 'l29-ear');
    ear.type = 'button';
    ear.setAttribute('aria-label', 'Play the question again');
    ear.innerHTML = ICONS.ear;
    ear.addEventListener('click', function () {
      Engine.sfx.tap();
      saySeq(q.voice);
      snapPop(board);
    });
    board.appendChild(ear);
    board.appendChild(el('div', 'l29-listen-q', '?'));
    story.appendChild(board);
    popIn(board);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          board.classList.add('is-answer');
          board.querySelector('.l29-listen-q').textContent = String(answer);
          burst(story);
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

    tray.classList.add('l29-tray');
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
      if (q.type === 'build') {
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
    else if (q.type === 'build') buildBuild(q, story, tray, state, correct, wrong);
    else buildListen(q, story, tray, state, correct, wrong);
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
    if (tapFinish) { tapFinish(); tapFinish = null; }
    Array.prototype.slice.call(document.querySelectorAll('.l29-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[29] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
