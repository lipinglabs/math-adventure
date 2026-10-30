/* ============================================================
   level-lv26.js · Subtraction Safari（退位减法综合大闯关）
   ------------------------------------------------------------
   第三阶段大复习之二：把「破十」讲透并复用到两位数。
     教学 4 幕：① 1 捆 + 4 根 = 十四，要拿走八
                ② 解捆成十根，拿走八根
                ③ 数字拆解：10 − 8 = 2，2 + 4 = 6
                ④ 竖式 14 − 8 = 6（十位 1 划掉补 0、个位 4 补 14）
     答题 10 题：点选结果 4 / 拖拽填破十链 3 / 三算式找错 3
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
        ctx.audio.play('lv26/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小棒 ---------------- */

  function stick() {
    return el('span', 'l26-stick');
  }

  function makeRow(count, hideFirst) {
    var row = el('div', 'l26-row');
    var slots = [];
    for (var i = 0; i < count; i += 1) {
      var slot = el('div', 'l26-slot');
      var s = stick();
      if (hideFirst != null && i < hideFirst) s.classList.add('is-hidden');
      slot.appendChild(s);
      row.appendChild(slot);
      slots.push({ slot: slot, stick: s });
    }
    return { node: row, slots: slots };
  }

  function bundle() {
    var box = el('div', 'l26-bundle');
    var inner = el('div', 'l26-bundle-in');
    for (var i = 0; i < 10; i += 1) inner.appendChild(stick());
    box.appendChild(inner);
    var band = el('span', 'l26-band');
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
        s.style.setProperty('--d', (n * 58) + 'ms');
        s.classList.add('is-away');
        later(function () { s.classList.add('is-gone'); }, 520 + n * 58);
      })(i);
    }
  }

  /* ---------------- 教学 ---------------- */

  function buildMat(openBundle) {
    var mat = el('div', 'l26-mat');
    var row = makeRow(14, 10);
    mat.appendChild(row.node);
    var b = bundle();
    if (openBundle) {
      b.node.classList.add('is-open');
      for (var i = 0; i < 10; i += 1) row.slots[i].stick.classList.remove('is-hidden');
    }
    mat.appendChild(b.node);
    return { mat: mat, row: row, bundle: b };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l26-teach');
    var m = buildMat(false);
    wrap.appendChild(m.mat);
    host.appendChild(wrap);
    popIn(m.mat);

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l26-teach');
    var m = buildMat(false);
    wrap.appendChild(m.mat);
    host.appendChild(wrap);
    popIn(m.mat);

    // We don't have enough ones. Break the ten.
    var v = saySeq(['t1_b']);
    await sleep(900);
    if (!alive) return;
    await breakBundle(m.bundle, m.row.slots);
    if (!alive) return;
    await sleep(200);
    takeAway(m.row.slots, 0, 8);
    await sleep(600);

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l26-teach');
    var line = el('div', 'l26-eqline');
    line.appendChild(el('span', 'l26-tile l26-tile--res', '10'));
    line.appendChild(el('span', 'l26-op', '−'));
    line.appendChild(el('span', 'l26-tile', '8'));
    line.appendChild(el('span', 'l26-op', '='));
    line.appendChild(el('span', 'l26-tile l26-tile--ans', '2'));
    wrap.appendChild(line);

    var line2 = el('div', 'l26-eqline is-hidden');
    line2.appendChild(el('span', 'l26-tile l26-tile--ans', '2'));
    line2.appendChild(el('span', 'l26-op', '+'));
    line2.appendChild(el('span', 'l26-tile', '4'));
    line2.appendChild(el('span', 'l26-op', '='));
    line2.appendChild(el('span', 'l26-tile l26-tile--res', '6'));
    wrap.appendChild(line2);

    host.appendChild(wrap);
    popIn(line);

    var v = saySeq(['t1_c']);
    await sleep(1000);
    if (!alive) return;
    snapPop(line);
    Engine.sfx.tap();
    await sleep(1200);
    if (!alive) return;
    line2.classList.remove('is-hidden');
    popIn(line2);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(300);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l26-teach');
    var box = el('div', 'l26-vs l26-vs--big');
    function vrow(sign, t, o) {
      var r = el('div', 'l26-vrow');
      r.appendChild(el('span', 'l26-vsign', sign || ''));
      var ct = el('span', 'l26-vcell', t == null ? '' : String(t));
      var co = el('span', 'l26-vcell', o == null ? '' : String(o));
      r.appendChild(ct);
      r.appendChild(co);
      box.appendChild(r);
      return { node: r, tens: ct, ones: co };
    }
    var r1 = vrow('', 1, 4);
    var r2 = vrow('−', null, 8);
    box.appendChild(el('div', 'l26-vline'));
    var r3 = vrow('', null, null);
    wrap.appendChild(box);
    host.appendChild(wrap);
    popIn(box);

    var v = saySeq(['t1_d']);
    await sleep(560);
    if (!alive) return;
    r1.tens.classList.add('is-borrowed');
    r1.ones.classList.add('is-borrowed');
    var mt = el('b', 'l26-mark', '0');
    var mo = el('b', 'l26-mark', '14');
    r1.tens.appendChild(mt);
    r1.ones.appendChild(mo);
    popIn(mt);
    popIn(mo);
    await sleep(800);
    if (!alive) return;
    r3.ones.textContent = '6';
    r3.ones.classList.add('is-res');
    popIn(r3.ones);
    snapPop(r3.ones);
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
      var key = el('button', 'l26-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l26-key-digit', String(value)));
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

  /* ---------------- 题型 A ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a - q.b;
    var box = el('div', 'l26-eq');
    box.appendChild(el('span', 'l26-tile', String(q.a)));
    box.appendChild(el('span', 'l26-op', '−'));
    box.appendChild(el('span', 'l26-tile', String(q.b)));
    box.appendChild(el('span', 'l26-op', '='));
    var res = el('span', 'l26-tile l26-tile--q', '?');
    box.appendChild(res);
    story.appendChild(box);
    popIn(box);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          res.textContent = String(answer);
          res.classList.remove('l26-tile--q');
          res.classList.add('is-answer');
          snapPop(res);
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

    tray.classList.add('l26-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：破十链拖拽（三个空） ---------------- */

  function buildChain(q, story, tray, state, correct, wrong) {
    var ones = q.a - 10;                 // 个位那几根
    var rest = 10 - q.b;                 // 破十后剩下的
    var sum = ones + rest;
    var values = [ones, ones, sum];

    var board = el('div', 'l26-chain');
    function tile(text, extra) {
      return el('span', 'l26-tile' + (extra ? ' ' + extra : ''), text);
    }
    function slot(i) {
      var s = el('span', 'l26-tile l26-drop', '');
      s.dataset.i = String(i);
      return s;
    }
    function line(parts) {
      var row = el('div', 'l26-crow');
      parts.forEach(function (p) { row.appendChild(p); });
      board.appendChild(row);
      return row;
    }

    line([tile(String(q.a)), el('span', 'l26-op', '−'), tile(String(q.b))]);
    line([el('span', 'l26-op', '='), tile('10'), el('span', 'l26-op', '−'), tile(String(q.b)),
      el('span', 'l26-op', '+'), slot(0)]);
    line([el('span', 'l26-op', '='), tile(String(rest)), el('span', 'l26-op', '+'), slot(1)]);
    line([el('span', 'l26-op', '='), slot(2)]);

    story.appendChild(board);
    popIn(board);

    var slots = [].slice.call(board.querySelectorAll('.l26-drop')).map(function (node, i) {
      return { node: node, value: values[i], filled: false };
    });

    var pool = Engine.quiz.shuffle(values.slice());

    tray.innerHTML = '';
    pool.forEach(function (value, i) {
      var chip = el('button', 'l26-chip');
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
            var g = el('span', 'l26-chip l26-ghost');
            g.textContent = String(value);
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
            if (slotRef.value !== value) { shake(chip); return; }
            slotRef.filled = true;
            slotRef.node.classList.add('is-filled');
            slotRef.node.textContent = String(value);
            snapPop(slotRef.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            chip.style.visibility = 'hidden';
            if (slots.filter(function (s) { return s.filled; }).length === slots.length) {
              later(function () {
                if (!alive) return;
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

    tray.classList.add('l26-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      var copy = { a: s.a, b: s.b, shown: s.shown };
      copy.bad = s.a - s.b !== s.shown;
      return copy;
    }));

    var board = el('div', 'l26-cards');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var card = el('button', 'l26-card');
        card.type = 'button';
        card.dataset.key = s.a + '-' + s.b + '=' + s.shown;
        card.setAttribute('aria-label', s.a + ' minus ' + s.b + ' equals ' + s.shown);
        var row = el('div', 'l26-eq l26-eq--small');
        row.appendChild(el('span', 'l26-tile l26-tile--sm', String(s.a)));
        row.appendChild(el('span', 'l26-op', '−'));
        row.appendChild(el('span', 'l26-tile l26-tile--sm', String(s.b)));
        row.appendChild(el('span', 'l26-op', '='));
        var res = el('span', 'l26-tile l26-tile--sm l26-tile--ans', String(s.shown));
        row.appendChild(res);
        card.appendChild(row);
        card.addEventListener('click', function () { pick(s, res, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(s, res, card) {
      if (state.locked || state.busy) return;
      if (!s.bad) {
        state.busy = true;
        wrong(card);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) { return x.a - x.b !== x.shown; })[0],
            function (x) { return x.a + '-' + x.b + '=' + x.shown; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      card.classList.add('is-right');
      var tick = el('span', 'l26-tick');
      tick.innerHTML = ICONS.check;
      card.appendChild(tick);
      popIn(tick, 40);
      snapPop(card);

      later(function () {
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.a - s.b);
          res.classList.remove('is-flip');
          res.classList.add('is-fixed');
          bounce(res);
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(card);
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
      if (q.type === 'chain') {
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
    else if (q.type === 'chain') buildChain(q, story, tray, state, correct, wrong);
    else buildWrong(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l26-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[26] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
