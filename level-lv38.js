/* ============================================================
   level-lv38.js · Add to Multiply（连加与乘法，同一件事的两种读法）
   ------------------------------------------------------------
   第四阶段第十一关：**同一批圆点，只改「框」和「缝隙」**（§5.24）。
     教学 4 幕：① 3+3+3+3，12 个点分成四段
                ② 段缝收拢 + 四道组框 → 4 × 3 = 12
                ③ 2 × 5，两组各 5 点
                ④ 组框散开 → 5 + 5 = 10
     答题 10 题：听连加选乘法 4 / 连加与乘法连线 3 / 三组等式找错 3
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 12;

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
      'fill="currentColor"/></svg>'
  };

  var NS = 'http://www.w3.org/2000/svg';
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
        ctx.audio.play('lv38/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 圆点与组框 ---------------- */

  /**
   * @param count 组数
   * @param per   每组几个
   * @param dir   'row' 组横排（每组竖着叠）｜'col' 组竖排（每组横着排）
   */
  function dotGroups(count, per, dir) {
    var wrap = el('div', 'l38-groups l38-groups--' + dir);
    var groups = [];
    for (var i = 0; i < count; i += 1) {
      var g = el('div', 'l38-group');
      for (var k = 0; k < per; k += 1) {
        g.appendChild(el('span', 'l38-dot'));
      }
      wrap.appendChild(g);
      groups.push(g);
    }
    return { node: wrap, groups: groups, dots: wrap.querySelectorAll('.l38-dot') };
  }

  function frame(groups) {
    groups.forEach(function (g, i) {
      later(function () {
        if (!alive) return;
        g.classList.add('is-framed');
        snapPop(g);
        Engine.sfx.tap();
      }, i * 90);
    });
  }

  /* ---------------- 算式 ---------------- */

  function eqBar(parts) {
    var row = el('div', 'l38-eq');
    parts.forEach(function (p) {
      if (p.op) row.appendChild(el('span', 'l38-op', p.op));
      else row.appendChild(el('span', 'l38-tile' + (p.res ? ' l38-tile--res' : ''), String(p.n)));
    });
    return row;
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l38-teach');
    var board = el('div', 'l38-board');
    var dots = dotGroups(4, 3, 'row');
    dots.node.classList.add('is-loose');
    board.appendChild(dots.node);

    var add = eqBar([{ n: 3 }, { op: '+' }, { n: 3 }, { op: '+' }, { n: 3 }, { op: '+' }, { n: 3 },
      { op: '=' }, { n: 12, res: true }]);
    board.appendChild(add);
    wrap.appendChild(board);

    var note = el('div', 'l38-note', 'four groups of three');
    wrap.appendChild(note);

    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    var v = saySeq(['t1_a']);
    await sleep(480);
    if (!alive) return;
    /* 四段依次点亮，让孩子先看出「四份」 */
    for (var gi = 0; gi < dots.groups.length; gi += 1) {
      dots.groups[gi].classList.add('is-on');
      bounce(dots.groups[gi], 0);
      Engine.sfx.tap();
      await sleep(170);
      if (!alive) return;
    }
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l38-teach');
    var board = el('div', 'l38-board');
    var dots = dotGroups(4, 3, 'row');
    dots.node.classList.add('is-framed');
    board.appendChild(dots.node);

    var times = eqBar([{ n: 4 }, { op: '×' }, { n: 3 }, { op: '=' }, { n: 12, res: true }]);
    board.appendChild(times);

    var note = el('div', 'l38-note', '4 × 3 = 12');
    wrap.appendChild(board);
    wrap.appendChild(note);
    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    /* 先把段缝收拢（与上一幕同一批点），再让乘式落位 */
    var groups = dots.groups;
    groups.forEach(function (g) { g.classList.add('is-framed'); });
    await sleep(120);
    if (!alive) return;
    dots.node.classList.add('is-tight');
    Engine.sfx.tap();
    await sleep(360);
    if (!alive) return;
    dots.dots.forEach(function (d, i) { bounce(d, i * 14); });

    var v = saySeq(['t1_b']);
    await sleep(420);
    if (!alive) return;
    snapPop(times);
    Engine.sfx.star();
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l38-teach');
    var board = el('div', 'l38-board');
    var dots = dotGroups(2, 5, 'col');
    dots.node.classList.add('is-loose');
    board.appendChild(dots.node);

    var times = eqBar([{ n: 2 }, { op: '×' }, { n: 5 }, { op: '=' }, { n: 10, res: true }]);
    board.appendChild(times);

    var note = el('div', 'l38-note', 'two groups of five');
    wrap.appendChild(board);
    wrap.appendChild(note);
    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    var v = saySeq(['t1_c']);
    await sleep(420);
    if (!alive) return;
    for (var gj = 0; gj < dots.groups.length; gj += 1) {
      dots.groups[gj].classList.add('is-on', 'is-framed');
      bounce(dots.groups[gj], 0);
      Engine.sfx.tap();
      await sleep(190);
      if (!alive) return;
    }
    await v;
    if (!alive) return;
    await sleep(320);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l38-teach');
    var board = el('div', 'l38-board');
    var dots = dotGroups(2, 5, 'col');
    dots.node.classList.add('is-loose');
    dots.groups.forEach(function (g) { g.classList.add('is-on'); });
    board.appendChild(dots.node);

    var add = eqBar([{ n: 5 }, { op: '+' }, { n: 5 }, { op: '=' }, { n: 10, res: true }]);
    board.appendChild(add);

    var note = el('div', 'l38-note', '5 + 5 = 10');
    wrap.appendChild(board);
    wrap.appendChild(note);
    host.appendChild(wrap);
    await popIn(board);
    if (!alive) return;

    var v = saySeq(['t1_d']);
    await sleep(420);
    if (!alive) return;
    dots.groups.forEach(function (g) { g.classList.remove('is-framed'); });
    dots.node.classList.add('is-open');
    Engine.sfx.tap();
    await sleep(340);
    if (!alive) return;
    snapPop(add);
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
      var key = el('button', 'l38-key');
      key.type = 'button';
      key.dataset.key = value[0] + 'x' + value[1];
      key.setAttribute('aria-label', value[0] + ' times ' + value[1]);
      var row = el('div', 'l38-fact l38-fact--sm');
      row.appendChild(el('span', 'l38-tile l38-tile--sm', String(value[0])));
      row.appendChild(el('span', 'l38-op', '×'));
      row.appendChild(el('span', 'l38-tile l38-tile--sm', String(value[1])));
      key.appendChild(row);
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  /* ---------------- 题型 A：听连加选乘法 ---------------- */

  function buildSay(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l38-board');

    var add = el('div', 'l38-eq l38-eq--big');
    q.sum.forEach(function (v, i) {
      if (i) add.appendChild(el('span', 'l38-op', '+'));
      add.appendChild(el('span', 'l38-tile', String(v)));
    });
    add.appendChild(el('span', 'l38-op', '='));
    add.appendChild(el('span', 'l38-tile l38-tile--q', '?'));
    board.appendChild(add);

    var hint = el('div', 'l38-note', 'which times sentence?');
    board.appendChild(hint);
    story.appendChild(board);
    popIn(board);

    var answer = q.n + 'x' + q.b;

    function paint() {
      keysRow(tray, Engine.quiz.shuffle(q.options.slice()), function (value, key) {
        if (state.locked || state.busy) return;
        if (value[0] === q.n && value[1] === q.b) {
          state.busy = true;
          key.classList.add('is-right');
          snapPop(key);
          burst(story);
          correct(key);
          return;
        }
        state.busy = true;
        wrong(key);
        later(function () { state.busy = false; }, 420);
      });
    }

    tray.classList.add('l38-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 B：连加 ↔ 乘法连线 ---------------- */

  function buildLink(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l38-link');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'l38-lines');
    svg.setAttribute('aria-hidden', 'true');
    board.appendChild(svg);

    var topRow = el('div', 'l38-link-row');
    var bottomRow = el('div', 'l38-link-row');

    var sums = Engine.quiz.shuffle(q.pairs.map(function (p) { return p[0]; }));
    var times = Engine.quiz.shuffle(q.pairs.map(function (p) { return p[1]; }));

    var sumCards = [];
    var timeCards = [];

    sums.forEach(function (sum, i) {
      var card = el('button', 'l38-linkcard l38-linkcard--sum');
      card.type = 'button';
      card.dataset.key = sum.join('+');
      var row = el('div', 'l38-eq l38-eq--tiny');
      sum.forEach(function (v, k) {
        if (k) row.appendChild(el('span', 'l38-op', '+'));
        row.appendChild(el('span', 'l38-tile l38-tile--xs', String(v)));
      });
      card.appendChild(row);
      topRow.appendChild(card);
      sumCards.push({ node: card, v: sum, done: false });
    });

    times.forEach(function (t, i) {
      var card = el('button', 'l38-linkcard l38-linkcard--times');
      card.type = 'button';
      card.dataset.key = t.join('x');
      var row = el('div', 'l38-eq l38-eq--tiny');
      row.appendChild(el('span', 'l38-tile l38-tile--xs', String(t[0])));
      row.appendChild(el('span', 'l38-op', '×'));
      row.appendChild(el('span', 'l38-tile l38-tile--xs', String(t[1])));
      card.appendChild(row);
      bottomRow.appendChild(card);
      timeCards.push({ node: card, v: t, done: false });
    });

    board.appendChild(topRow);
    board.appendChild(bottomRow);
    story.appendChild(board);
    popIn(board);

    var linked = 0;
    var total = q.pairs.length;
    var active = null;
    var liveLine = null;

    function boardRect() { return board.getBoundingClientRect(); }
    function anchor(node, side) {
      var r = node.getBoundingClientRect();
      var br = boardRect();
      return {
        x: r.left - br.left + (side === 'right' ? r.width : 0),
        y: r.top - br.top + r.height / 2
      };
    }
    function drawLine(a, b, cls) {
      var line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', a.x);
      line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x);
      line.setAttribute('y2', b.y);
      line.setAttribute('class', 'l38-line' + (cls ? ' ' + cls : ''));
      svg.appendChild(line);
      return line;
    }

    function matches(sum, time) {
      var n = sum.length;
      var b = sum[0];
      return (time[0] === n && time[1] === b) || (time[0] === b && time[1] === n);
    }

    sumCards.forEach(function (sc) {
      sc.node.addEventListener('pointerdown', function (e) {
        if (state.locked || state.busy || sc.done) return;
        e.preventDefault();
        active = sc;
        var a = anchor(sc.node, 'right');
        liveLine = drawLine(a, { x: a.x, y: a.y }, 'is-live');
        sc.node.classList.add('is-lifted');

        function move(ev) {
          var br = boardRect();
          liveLine.setAttribute('x2', ev.clientX - br.left);
          liveLine.setAttribute('y2', ev.clientY - br.top);
        }
        function detach() {
          document.removeEventListener('pointermove', move);
          document.removeEventListener('pointerup', up);
          document.removeEventListener('pointercancel', up);
        }
        function up(ev) {
          detach();
          sc.node.classList.remove('is-lifted');
          remove(liveLine);
          liveLine = null;
          var hit = null;
          timeCards.forEach(function (tc) {
            if (hit || tc.done) return;
            var r = tc.node.getBoundingClientRect();
            if (ev.clientX >= r.left - HIT_PAD && ev.clientX <= r.right + HIT_PAD &&
                ev.clientY >= r.top - HIT_PAD && ev.clientY <= r.bottom + HIT_PAD) hit = tc;
          });
          if (!hit || !matches(sc.v, hit.v)) {
            if (hit) shake(hit.node);
            active = null;
            return;
          }
          sc.done = true;
          hit.done = true;
          sc.node.classList.add('is-linked');
          hit.node.classList.add('is-linked');
          drawLine(anchor(sc.node, 'right'), anchor(hit.node, 'left'), 'is-done');
          var tag = el('span', 'l38-linknum', String(linked + 1));
          sc.node.appendChild(tag);
          snapPop(sc.node);
          Engine.sfx.tap();
          linked += 1;
          active = null;
          if (linked === total) {
            later(function () {
              if (state.locked || !alive) return;
              burst(board);
              correct(null);
            }, 260);
          }
        }
        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
      });
    });

    tray.innerHTML = '';
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：三组等式找错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    function pairsOk(sum, times) {
      var n = sum.length;
      var b = sum[0];
      return (times[0] === n && times[1] === b) || (times[0] === b && times[1] === n);
    }

    var list = Engine.quiz.shuffle(q.pairs.map(function (p) {
      return { sum: p[0], times: p[1], bad: !pairsOk(p[0], p[1]) };
    }));

    var board = el('div', 'l38-cards');
    story.appendChild(board);

    list.forEach(function (item, i) {
      var card = el('button', 'l38-card');
      card.type = 'button';
      card.dataset.key = item.sum.join('+') + '|' + item.times.join('x');
      card.setAttribute('aria-label', item.sum.join(' plus ') + ' and ' + item.times.join(' times '));

      var line = el('div', 'l38-card-line');
      var sumRow = el('div', 'l38-eq l38-eq--tiny');
      item.sum.forEach(function (v, k) {
        if (k) sumRow.appendChild(el('span', 'l38-op', '+'));
        sumRow.appendChild(el('span', 'l38-tile l38-tile--xs', String(v)));
      });
      line.appendChild(sumRow);
      line.appendChild(el('span', 'l38-op', '='));
      var tRow = el('div', 'l38-eq l38-eq--tiny');
      tRow.appendChild(el('span', 'l38-tile l38-tile--xs', String(item.times[0])));
      tRow.appendChild(el('span', 'l38-op', '×'));
      tRow.appendChild(el('span', 'l38-tile l38-tile--xs', String(item.times[1])));
      line.appendChild(tRow);
      card.appendChild(line);

      card.addEventListener('click', function () {
        if (state.locked || state.busy) return;
        if (!item.bad) { wrong(card); return; }
        state.busy = true;
        card.classList.add('is-right');
        var tick = el('span', 'l38-tick');
        tick.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M4 12.5l5 5L20 6.5" ' +
          'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        card.appendChild(tick);
        popIn(tick);
        /* 把错的那一半翻成正确写法 */
        var n = item.sum.length;
        var b = item.sum[0];
        tRow.innerHTML = '';
        tRow.appendChild(el('span', 'l38-tile l38-tile--xs', String(n)));
        tRow.appendChild(el('span', 'l38-op', '×'));
        tRow.appendChild(el('span', 'l38-tile l38-tile--xs l38-tile--res', String(b)));
        tRow.classList.add('is-fixed');
        snapPop(tRow);
        later(function () {
          if (state.locked || !alive) return;
          burst(board);
          correct(null, WRONG_HOLD);
        }, 620);
      });
      popIn(card, i * 55);
      board.appendChild(card);
    });

    tray.innerHTML = '';
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

    if (q.type === 'say') buildSay(q, story, tray, state, correct, wrong);
    else if (q.type === 'link') buildLink(q, story, tray, state, correct, wrong);
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
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[38] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
