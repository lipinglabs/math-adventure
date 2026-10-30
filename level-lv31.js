/* ============================================================
   level-lv31.js · Wheels & Legs（3 与 4 的乘法）
   ------------------------------------------------------------
   第四阶段第四关：三脚架的三条腿、四轮车的四个轮子。
     教学 4 幕：① 三个三脚架，逐条点亮腿 3·6·9
                ② 两辆四轮车，4 + 4 = 8
                ③ 3 × 3 = 9 与 2 × 4 = 8 并排，乘号点亮
                ④ 两句口诀条收尾
     答题 10 题：实物点选 4 / 拖车拼阵列 3 / 三算式找错 3
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

  var TRIPOD_SVG =
    '<svg class="l31-art" viewBox="0 0 48 56" aria-hidden="true">' +
    '<path class="l31-leg" d="M24 23 7 51" stroke-width="4" stroke-linecap="round"/>' +
    '<path class="l31-leg" d="M24 23v29" stroke-width="4" stroke-linecap="round"/>' +
    '<path class="l31-leg" d="M24 23 41 51" stroke-width="4" stroke-linecap="round"/>' +
    '<circle class="l31-seat" cx="24" cy="17" r="8.6"/>' +
    '<ellipse class="l31-seat-top" cx="24" cy="14.6" rx="8.6" ry="3.2"/>' +
    '<circle class="l31-hub" cx="24" cy="24.6" r="2.6"/>' +
    '</svg>';

  var CAR_SVG =
    '<svg class="l31-art" viewBox="0 0 48 56" aria-hidden="true">' +
    '<rect class="l31-body" x="10" y="6" width="28" height="44" rx="11"/>' +
    '<rect class="l31-glass" x="15" y="14" width="18" height="11" rx="5"/>' +
    '<rect class="l31-glass" x="15" y="34" width="18" height="9" rx="4.5"/>' +
    '<rect class="l31-wheel" data-i="0" x="3" y="11" width="8" height="14" rx="4"/>' +
    '<rect class="l31-wheel" data-i="1" x="37" y="11" width="8" height="14" rx="4"/>' +
    '<rect class="l31-wheel" data-i="2" x="3" y="31" width="8" height="14" rx="4"/>' +
    '<rect class="l31-wheel" data-i="3" x="37" y="31" width="8" height="14" rx="4"/>' +
    '</svg>';

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
        ctx.audio.play('lv31/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 三脚架 / 四轮车 ---------------- */

  function tripod(cls) {
    var node = el('span', 'l31-unit l31-unit--tripod' + (cls ? ' ' + cls : ''));
    node.innerHTML = TRIPOD_SVG;
    return { node: node, parts: [].slice.call(node.querySelectorAll('.l31-leg')) };
  }

  function car(cls) {
    var node = el('span', 'l31-unit l31-unit--car' + (cls ? ' ' + cls : ''));
    node.innerHTML = CAR_SVG;
    return { node: node, parts: [].slice.call(node.querySelectorAll('.l31-wheel')) };
  }

  function makeVehicle(kind, cls) {
    return kind === 'car' ? car(cls) : tripod(cls);
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l31-teach');
    var row = el('div', 'l31-row');
    var units = [];
    for (var i = 0; i < 3; i += 1) {
      var t = tripod();
      units.push(t);
      row.appendChild(t.node);
    }
    wrap.appendChild(row);

    var counter = el('div', 'l31-counter', '0');
    wrap.appendChild(counter);

    host.appendChild(wrap);
    await popIn(row);
    await popIn(counter, 120);
    if (!alive) return;

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(1000);                 // 讲完停 1 秒再点数（§6.1）
    if (!alive) return;

    var v = saySeq(['t1_b']);
    await sleep(380);
    if (!alive) return;

    var n = 0;
    for (var k = 0; k < units.length; k += 1) {
      units[k].node.classList.add('is-active');
      for (var j = 0; j < units[k].parts.length; j += 1) {
        units[k].parts[j].classList.add('is-on');
        n += 1;
        counter.textContent = String(n);
        bounce(counter);
        Engine.sfx.tap();
        await sleep(180);
        if (!alive) return;
      }
      await sleep(120);
      if (!alive) return;
    }
    counter.classList.add('is-final');
    snapPop(counter);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l31-teach');
    var row = el('div', 'l31-row');
    var units = [];
    for (var i = 0; i < 2; i += 1) {
      var c = car();
      units.push(c);
      row.appendChild(c.node);
    }
    wrap.appendChild(row);

    var sum = el('div', 'l31-sum');
    sum.appendChild(el('span', 'l31-op', '4'));
    sum.appendChild(el('span', 'l31-op', '+'));
    sum.appendChild(el('span', 'l31-op', '4'));
    sum.appendChild(el('span', 'l31-op', '='));
    var sumRes = el('span', 'l31-op l31-op--res', '?');
    sum.appendChild(sumRes);
    wrap.appendChild(sum);

    host.appendChild(wrap);
    await popIn(row);
    await popIn(sum, 120);
    if (!alive) return;

    var v = saySeq(['t2_a']);
    await sleep(900);
    if (!alive) return;

    var n = 0;
    for (var k = 0; k < units.length; k += 1) {
      units[k].node.classList.add('is-active');
      for (var j = 0; j < units[k].parts.length; j += 1) {
        units[k].parts[j].classList.add('is-on');
        n += 1;
        Engine.sfx.tap();
        await sleep(190);
        if (!alive) return;
      }
      await sleep(120);
      if (!alive) return;
    }
    sumRes.textContent = '8';
    sumRes.classList.add('is-lit');
    popIn(sumRes);
    snapPop(sumRes);
    Engine.sfx.correct();

    await v;
    if (!alive) return;
    await sleep(200);
    if (!alive) return;

    await saySeq(['t2_b']);
    if (!alive) return;
    await sleep(280);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l31-teach');
    var card = el('div', 'l31-duo');

    function line(a, b, res) {
      var row = el('div', 'l31-eq');
      row.appendChild(el('span', 'l31-tile', String(a)));
      var op = el('span', 'l31-op l31-op--times', '×');
      row.appendChild(op);
      row.appendChild(el('span', 'l31-tile', String(b)));
      row.appendChild(el('span', 'l31-op', '='));
      var r = el('span', 'l31-tile l31-tile--q', '?');
      row.appendChild(r);
      card.appendChild(row);
      return { node: row, op: op, res: r };
    }
    var l1 = line(3, 3);
    var l2 = line(2, 4);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;

    var v = saySeq(['t2_c']);
    await sleep(620);
    if (!alive) return;
    l1.op.classList.add('is-lit');
    snapPop(l1.op);
    l1.res.textContent = '9';
    l1.res.classList.remove('l31-tile--q');
    l1.res.classList.add('l31-tile--res');
    popIn(l1.res);
    Engine.sfx.tap();
    await sleep(820);
    if (!alive) return;
    l2.op.classList.add('is-lit');
    snapPop(l2.op);
    l2.res.textContent = '8';
    l2.res.classList.remove('l31-tile--q');
    l2.res.classList.add('l31-tile--res');
    popIn(l2.res);
    snapPop(l2.res);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(280);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l31-teach');
    var card = el('div', 'l31-chant');

    function chant(label, values) {
      var row = el('div', 'l31-chant-row');
      row.appendChild(el('span', 'l31-chant-label', label));
      values.forEach(function (v, i) {
        var chip = el('span', 'l31-jump', String(v));
        row.appendChild(chip);
        popIn(chip, 80 * i);
      });
      card.appendChild(row);
      return row;
    }
    chant('×3', [3, 6, 9, 12]);
    chant('×4', [4, 8, 12, 16]);

    var note = el('div', 'l31-note', 'count up, then say it');
    card.appendChild(note);

    wrap.appendChild(card);
    host.appendChild(wrap);
    await popIn(card);
    if (!alive) return;

    var v = saySeq(['t2_d']);
    await sleep(700);
    if (!alive) return;
    snapPop(card);
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
      var key = el('button', 'l31-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l31-key-digit', String(value)));
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

  /* ---------------- 题型 A：看实物点结果 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;
    var kind = q.b === 3 ? 'tripod' : 'car';

    var board = el('div', 'l31-board');
    var eq = el('div', 'l31-eq l31-eq--ask');
    eq.appendChild(el('span', 'l31-tile l31-tile--sm', String(q.a)));
    eq.appendChild(el('span', 'l31-op', '×'));
    eq.appendChild(el('span', 'l31-tile l31-tile--sm', String(q.b)));
    eq.appendChild(el('span', 'l31-op', '='));
    var res = el('span', 'l31-tile l31-tile--sm l31-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var array = el('div', 'l31-array');
    for (var i = 0; i < q.a; i += 1) {
      var u = makeVehicle(kind, 'l31-unit--sm');
      u.parts.forEach(function (p) { p.classList.add('is-on'); });
      popIn(u.node, i * 50);
      array.appendChild(u.node);
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
          res.classList.remove('l31-tile--q');
          res.classList.add('l31-tile--res');
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

    tray.classList.add('l31-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：拖车拼阵列 ---------------- */

  function buildBuild(q, story, tray, state, correct, wrong) {
    var answer = q.a * q.b;
    var kind = q.b === 3 ? 'tripod' : 'car';

    var board = el('div', 'l31-build');
    var eq = el('div', 'l31-eq l31-eq--ask');
    eq.appendChild(el('span', 'l31-tile l31-tile--sm', String(q.a)));
    eq.appendChild(el('span', 'l31-op', '×'));
    eq.appendChild(el('span', 'l31-tile l31-tile--sm', String(q.b)));
    eq.appendChild(el('span', 'l31-op', '='));
    var res = el('span', 'l31-tile l31-tile--sm l31-tile--q', '?');
    eq.appendChild(res);
    board.appendChild(eq);

    var box = el('div', 'l31-box');
    var slots = [];
    for (var i = 0; i < q.a; i += 1) {
      var slot = el('div', 'l31-slot');
      box.appendChild(slot);
      slots.push({ node: slot, filled: false });
    }
    board.appendChild(box);

    var meter = el('div', 'l31-meter');
    meter.appendChild(el('span', 'l31-meter-label', '0'));
    board.appendChild(meter);

    story.appendChild(board);
    popIn(board);

    var count = 0;
    var pool = [];
    for (var k = 0; k <= q.a; k += 1) pool.push(k);

    tray.innerHTML = '';
    pool.forEach(function (idx, i) {
      var chip = el('button', 'l31-chip');
      chip.type = 'button';
      chip.dataset.unit = String(idx);
      chip.setAttribute('aria-label', kind === 'car' ? 'a car' : 'a tripod');
      var mini = makeVehicle(kind, 'l31-unit--xs');
      mini.parts.forEach(function (p) { p.classList.add('is-on'); });
      chip.appendChild(mini.node);
      chip.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || chip.classList.contains('is-used')) return;
        e.preventDefault();
        beginDrag(e, {
          source: chip,
          ghost: function () {
            var g = el('div', 'l31-ghost');
            var gg = makeVehicle(kind, 'l31-unit--xs');
            gg.parts.forEach(function (p) { p.classList.add('is-on'); });
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
            var mini = makeVehicle(kind, 'l31-unit--xs');
            mini.parts.forEach(function (p) { p.classList.add('is-on'); });
            slotRef.node.appendChild(mini.node);
            snapPop(slotRef.node);
            Engine.sfx.tap();
            chip.classList.add('is-used');
            chip.style.visibility = 'hidden';
            count += q.b;
            meter.firstChild.textContent = String(count);
            bounce(meter);
            if (count >= answer) {
              res.textContent = String(answer);
              res.classList.remove('l31-tile--q');
              res.classList.add('l31-tile--res');
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

    tray.classList.add('l31-tray');
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三算式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sums.map(function (s) {
      return { a: s.a, b: s.b, shown: s.shown, bad: s.a * s.b !== s.shown };
    }));

    var board = el('div', 'l31-cards');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var card = el('button', 'l31-card');
        card.type = 'button';
        card.dataset.key = s.a + 'x' + s.b + '=' + s.shown;
        card.setAttribute('aria-label', s.a + ' times ' + s.b + ' equals ' + s.shown);
        var row = el('div', 'l31-eq l31-eq--small');
        row.appendChild(el('span', 'l31-tile l31-tile--sm', String(s.a)));
        row.appendChild(el('span', 'l31-op', '×'));
        row.appendChild(el('span', 'l31-tile l31-tile--sm', String(s.b)));
        row.appendChild(el('span', 'l31-op', '='));
        var res = el('span', 'l31-tile l31-tile--sm l31-tile--ans', String(s.shown));
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
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(card);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) { return x.a * x.b !== x.shown; })[0],
            function (x) { return x.a + 'x' + x.b + '=' + x.shown; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      card.classList.add('is-right');
      var tick = el('span', 'l31-tick');
      tick.innerHTML = ICONS.check;
      card.appendChild(tick);
      popIn(tick, 40);
      snapPop(card);

      later(function () {
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.a * s.b);
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
    Array.prototype.slice.call(document.querySelectorAll('.l31-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[31] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
