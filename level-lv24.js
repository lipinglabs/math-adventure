/* ============================================================
   level-lv24.js · Number Maze（终极运算迷宫 · 两位数加减混合）
   ------------------------------------------------------------
   第三阶段收官的热身关：把加、减、连算放进一条迷宫路上。
     教学 4 幕：① 迷宫起点，门上 25 + 12
                ② 岔路口三个出口（37 / 35 / 39）：问句 → 停 1 秒 → 自答 37，猫走过去
                ③ 连算 30 + 15 − 10 两拍：先 45，再 35
                ④ 终点：完整算式 30 + 15 − 10 = 35
     答题 10 题（整份打乱，三种题型）：
       lane     看门上的算式，点出结果让猫过门（4 题）
       chain    连算题，把正确结果拖进空格（3 题）
       wrong    三条路，点出算式算错的那一条（3 题）
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         §5.9 拖拽热区外扩 14px 且未命中平滑弹回；§6.11 找错题答对后只翻结果格并定格 1.5 秒。
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
      'stroke-linecap="round" stroke-linejoin="round"/></svg>',
    /* 小猫：本关的探路者 */
    cat:
      '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      '<path d="M14 26 12 10l14 8z" fill="#F7C98F"/><path d="M50 26 52 10 38 18z" fill="#F7C98F"/>' +
      '<circle cx="32" cy="34" r="19" fill="#FFDCB0"/>' +
      '<circle cx="25" cy="32" r="2.8" fill="#5C4632"/><circle cx="39" cy="32" r="2.8" fill="#5C4632"/>' +
      '<path d="M29 39c1.4 1.8 4.6 1.8 6 0" fill="none" stroke="#5C4632" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M18 36h6M18 40h6M46 36h-6M46 40h-6" stroke="#D9A56F" stroke-width="1.6" stroke-linecap="round"/>' +
      '<circle cx="21" cy="41" r="3" fill="#F7A98F" opacity=".7"/><circle cx="43" cy="41" r="3" fill="#F7A98F" opacity=".7"/>' +
      '</svg>'
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
        ctx.audio.play('lv24/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 连算：值 / 渲染 ---------------- */

  function evalParts(parts) {
    var value = Number(parts[0]);
    for (var i = 1; i < parts.length; i += 2) {
      var op = parts[i];
      var n = Number(parts[i + 1]);
      value = op === '−' ? value - n : value + n;
    }
    return value;
  }

  /** 把 [30, '+', 15, '−', 10] 渲染成一排黏土块 */
  function chainRow(parts, opts) {
    opts = opts || {};
    var row = el('div', 'l24-chain');
    parts.forEach(function (p) {
      if (typeof p === 'number') {
        row.appendChild(el('span', 'l24-tile', String(p)));
      } else {
        row.appendChild(el('span', 'l24-op', p));
      }
    });
    row.appendChild(el('span', 'l24-op', '='));
    var res = el('span', 'l24-tile ' + (opts.blank ? 'l24-tile--blank' : 'l24-tile--q'),
      opts.blank ? '' : '?');
    row.appendChild(res);
    return { node: row, res: res };
  }

  /* ---------------- 迷宫（教学用） ---------------- */

  function mazeSvg(opts) {
    opts = opts || {};
    var labels = opts.labels || null;
    var catAt = opts.cat || 'start';
    var wrap = el('div', 'l24-maze');
    var html =
      '<svg viewBox="0 0 300 210" aria-hidden="true">' +
      '<path d="M18 175 H104" stroke="#F1DCC0" stroke-width="18" stroke-linecap="round" fill="none"/>' +
      '<path d="M104 175 C152 175 150 44 236 44" stroke="#F1DCC0" stroke-width="18" stroke-linecap="round" fill="none"/>' +
      '<path d="M104 175 C158 175 168 106 236 106" stroke="#F1DCC0" stroke-width="18" stroke-linecap="round" fill="none"/>' +
      '<path d="M104 175 C152 175 150 166 236 166" stroke="#F1DCC0" stroke-width="18" stroke-linecap="round" fill="none"/>' +
      '<circle cx="104" cy="175" r="9" fill="#E9CBA4"/>' +
      '</svg>';
    wrap.innerHTML = html;

    var cat = el('div', 'l24-cat l24-cat--' + catAt);
    cat.innerHTML = ICONS.cat;
    wrap.appendChild(cat);

    var gate = el('div', 'l24-gate');
    gate.textContent = opts.gate || '';
    wrap.appendChild(gate);

    if (labels) {
      labels.forEach(function (v, i) {
        var node = el('span', 'l24-exit l24-exit--' + i, String(v));
        wrap.appendChild(node);
      });
    }
    return { node: wrap, cat: cat, gate: gate };
  }

  /* ---------------- 教学第一幕：迷宫起点 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l24-teach');
    var m = mazeSvg({ gate: '25 + 12' });
    wrap.appendChild(m.node);
    host.appendChild(wrap);
    popIn(m.node);

    await saySeq(['t1_a']);
    if (!alive) return;
    await sleep(280);
  }

  /* ---------------- 教学第二幕：岔路口 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l24-teach');
    var m = mazeSvg({ gate: '25 + 12', labels: [37, 35, 39] });
    wrap.appendChild(m.node);
    host.appendChild(wrap);
    popIn(m.node);

    // Which way?
    await saySeq(['t1_q']);
    if (!alive) return;
    await sleep(1000);                     // 停顿 1 秒后自答（§6.1）

    // Thirty-seven! Well done.
    var v = saySeq(['t1_c']);
    await sleep(160);
    if (!alive) return;
    var exits = m.node.querySelectorAll('.l24-exit');
    exits[0].classList.add('is-right');
    m.cat.classList.add('is-walk');
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(320);
  }

  /* ---------------- 教学第三幕：连算两拍 ---------------- */

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l24-teach');
    var refs = chainRow([30, '+', 15, '−', 10], { question: true });
    wrap.appendChild(refs.node);
    var steps = el('div', 'l24-steps');
    var s1 = el('div', 'l24-step is-hidden', '');
    s1.appendChild(el('span', 'l24-step-t', '30 + 15 = 45'));
    var s2 = el('div', 'l24-step is-hidden', '');
    s2.appendChild(el('span', 'l24-step-t', '45 − 10 = 35'));
    steps.appendChild(s1);
    steps.appendChild(s2);
    wrap.appendChild(steps);
    host.appendChild(wrap);
    popIn(refs.node);

    // First, thirty plus fifteen is forty-five. Then, forty-five minus ten is thirty-five.
    var v = saySeq(['t1_d']);
    await sleep(760);
    if (!alive) return;
    s1.classList.remove('is-hidden');
    popIn(s1);
    Engine.sfx.tap();

    await sleep(1500);
    if (!alive) return;
    s2.classList.remove('is-hidden');
    popIn(s2);
    refs.res.textContent = '35';
    refs.res.classList.remove('l24-tile--q');
    refs.res.classList.add('is-answer');
    snapPop(refs.res);
    Engine.sfx.star();

    await v;
    if (!alive) return;
    await sleep(320);
  }

  /* ---------------- 教学第四幕：终点 ---------------- */

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l24-teach');
    var flag = el('div', 'l24-flag');
    flag.innerHTML = ICONS.star;
    var refs = chainRow([30, '+', 15, '−', 10], {});
    refs.res.textContent = '35';
    refs.res.classList.remove('l24-tile--q');
    refs.res.classList.add('is-answer');
    wrap.appendChild(flag);
    wrap.appendChild(refs.node);
    host.appendChild(wrap);
    popIn(flag);
    popIn(refs.node);

    Engine.sfx.star();
    await sleep(900);
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
      var key = el('button', 'l24-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l24-key-digit', String(value)));
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

  /* ---------------- 题型 A：门上算式，点结果过门 ---------------- */

  function buildLane(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;

    var lane = el('div', 'l24-lane');
    var cat = el('div', 'l24-cat l24-cat--start');
    cat.innerHTML = ICONS.cat;
    lane.appendChild(cat);
    var path = el('div', 'l24-lanepath');
    lane.appendChild(path);
    var gate = el('div', 'l24-gate l24-gate--inline', q.a + ' + ' + q.b);
    lane.appendChild(gate);
    story.appendChild(lane);
    popIn(lane);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          gate.textContent = String(answer);
          gate.classList.add('is-open');
          cat.classList.add('is-walk');
          snapPop(gate);
          burst(lane);
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

    tray.classList.add('l24-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：连算拖结果 ---------------- */

  function buildChain(q, story, tray, state, correct, wrong) {
    var answer = evalParts(q.parts);

    var board = el('div', 'l24-board');
    var refs = chainRow(q.parts, { blank: true });
    refs.res.classList.add('l24-slot');
    board.appendChild(refs.node);
    story.appendChild(board);
    popIn(board);

    var candidates = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      tray.innerHTML = '';
      candidates.forEach(function (value, i) {
        var chip = el('button', 'l24-chip');
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
              var g = el('span', 'l24-chip l24-ghost');
              g.textContent = String(value);
              return g;
            },
            find: function (x, y) {
              return insidePad(refs.res.getBoundingClientRect(), x, y) ? { ok: value === answer } : null;
            },
            onDrop: function (hit) {
              if (!hit.ok) {
                shake(chip);
                return;
              }
              refs.res.textContent = String(value);
              refs.res.classList.remove('l24-tile--blank');
              refs.res.classList.add('is-answer');
              snapPop(refs.res);
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

    tray.classList.add('l24-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三条路找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.routes.map(function (r) {
      var copy = { parts: r.parts.slice(), total: r.total };
      copy.bad = evalParts(copy.parts) !== copy.total;
      return copy;
    }));

    var board = el('div', 'l24-routes');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (r, i) {
        var card = el('button', 'l24-route');
        card.type = 'button';
        card.dataset.key = r.parts.join('') + '=' + r.total;
        card.setAttribute('aria-label', r.parts.join(' ') + ' equals ' + r.total);
        var row = chainRow(r.parts, {});
        row.res.textContent = String(r.total);
        row.res.classList.remove('l24-tile--q');
        card.appendChild(row.node);
        card.addEventListener('click', function () { pick(r, row, card); });
        popIn(card, i * 60);
        board.appendChild(card);
      });
    }

    function pick(r, row, card) {
      if (state.locked || state.busy) return;
      if (!r.bad) {
        /* busy 由 wrong() 自己置位，先置会把它挡在门外（§6.17） */
        wrong(card);
        later(function () {
          if (state.locked || !alive) return;
          state.busy = false;
          Engine.quiz.reshuffle(list, list.filter(function (x) { return evalParts(x.parts) !== x.total; })[0],
            function (x) { return x.parts.join('') + '=' + x.total; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      card.classList.add('is-right');
      var tick = el('span', 'l24-tick');
      tick.innerHTML = ICONS.check;
      card.appendChild(tick);
      popIn(tick, 40);
      snapPop(card);

      // 只翻结果格（§6.11）
      later(function () {
        row.res.classList.add('is-flip');
        later(function () {
          row.res.textContent = String(evalParts(r.parts));
          row.res.classList.remove('is-flip');
          row.res.classList.add('is-fixed');
          bounce(row.res);
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

    if (q.type === 'lane') buildLane(q, story, tray, state, correct, wrong);
    else if (q.type === 'chain') buildChain(q, story, tray, state, correct, wrong);
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
    Array.prototype.slice.call(document.querySelectorAll('.l24-ghost'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[24] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
