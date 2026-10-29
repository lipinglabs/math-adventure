/* ============================================================
   level-lv07.js · Block Build（积木堆叠 · 不进位加法，和为 11–19）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     count   一捆（十）+ 若干零散，再飞来几块 → 点三个数字键
     pick    三组积木（10+n）→ 点出「ten plus N」对应的那一组
     solve   横式 13 + 4 = ▢ → 拖/点数字键把答案填进空格
   铁律：全英文、点按推进、教学无问句、积木落地有挤压回弹、
         十位始终是「一捆 10 块」不动，只加个位（不进位）。
   拖拽遵循 §5.9：HIT_PAD 外扩、未命中平滑弹回、点按兜底。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;               // 数字键拖进空格的热区：四边各外扩 14px（§5.9）
  var CUBE = 20;                  // 单块积木边长（px）

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
      'fill="currentColor"/></svg>'
  };

  /* ---------------- 运行时状态 ---------------- */

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
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 380, delay: delay || 0 });
  }

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-8px) scale(1.06)', offset: 0.42 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 320, delay: delay || 0 });
  }

  function shake(node) {
    return animate(node, [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-7px) rotate(-2deg)', offset: 0.25 },
      { transform: 'translateX(6px) rotate(2deg)', offset: 0.55 },
      { transform: 'translateX(-3px)', offset: 0.8 },
      { transform: 'translateX(0)' }
    ], { duration: 420, easing: 'cubic-bezier(.22,.61,.36,1)' });
  }

  /** 积木落地：从右上方飞来，触地瞬间压扁再回弹（§5.1 果冻） */
  function land(node, delay) {
    return animate(node, [
      { transform: 'translate(46px, -58px) scale(.72) rotate(-9deg)', opacity: 0 },
      { transform: 'translate(0, 0) scale(1.16, .74)', opacity: 1, offset: 0.62 },
      { transform: 'translate(0, 0) scale(.94, 1.08)', opacity: 1, offset: 0.8 },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 }
    ], { duration: 540, delay: delay || 0, easing: 'cubic-bezier(.34,.9,.4,1)' });
  }

  /* ---------------- 语音链（一条接一条，绝不叠音 §6.7） ---------------- */

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
        ctx.audio.play('lv07/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 积木件 ---------------- */

  function cube(tone) {
    return el('span', 'l7-cube' + (tone ? ' l7-cube--' + tone : ''));
  }

  /** 一捆 = 10 块（5 × 2），中间扎一条带子，读作「一个十」 */
  function bundle() {
    var box = el('div', 'l7-bundle');
    for (var i = 0; i < 10; i += 1) box.appendChild(cube());
    return box;
  }

  /**
   * 「一捆 + 零散格位」盘面。
   * capacity 决定先摆几个空格（必须一开始就定好，动画期间不得 reflow，§5.7）。
   */
  function bench(cfg) {
    cfg = cfg || {};
    var size = cfg.cube || CUBE;
    var cap = cfg.capacity == null ? (cfg.ones || 0) : cfg.capacity;

    var node = el('div', 'l7-bench' + (cfg.mini ? ' l7-bench--mini' : '') + (cfg.solo ? ' l7-bench--solo' : ''));
    node.style.setProperty('--cube', size + 'px');

    var bd = bundle();
    node.appendChild(bd);

    if (cfg.plus !== false) node.appendChild(el('span', 'l7-plus', '+'));

    var ones = el('div', 'l7-ones');
    var grid = el('div', 'l7-slots');
    ones.appendChild(grid);
    node.appendChild(ones);

    var slots = [];
    for (var i = 0; i < cap; i += 1) {
      var slot = el('div', 'l7-slot');
      grid.appendChild(slot);
      slots.push(slot);
    }

    var filled = [];

    function add(n, tone) {
      var out = [];
      for (var k = 0; k < n; k += 1) {
        var slot = slots[filled.length];
        if (!slot) break;
        var c = cube(tone);
        slot.appendChild(c);
        slot.classList.add('is-filled');
        filled.push(c);
        out.push(c);
      }
      return out;
    }

    var initial = add(cfg.ones || 0, cfg.tone || 'warm');

    return { node: node, bundle: bd, ones: ones, grid: grid, slots: slots, filled: filled, initial: initial, add: add };
  }

  /** 散落的积木（不占格位，歪一点才像「散着」） */
  function loose(n, size) {
    var box = el('div', 'l7-loose');
    box.style.setProperty('--cube', (size || CUBE) + 'px');
    for (var i = 0; i < n; i += 1) box.appendChild(cube(i % 2 ? 'new' : 'warm'));
    return box;
  }

  /** 个位区上方浮出的小数字徽标 */
  function badge(host, text) {
    var tag = el('div', 'l7-badge');
    var chip = el('span', 'l7-badge-chip', text);
    tag.appendChild(chip);
    host.appendChild(tag);
    popIn(chip);
    return tag;
  }

  /* ---------------- 竖式（教学第三幕） ---------------- */

  function verticalForm(cfg) {
    var wrap = el('div', 'l7-vert');

    function row(cls) {
      var r = el('div', 'l7-vrow' + (cls ? ' ' + cls : ''));
      wrap.appendChild(r);
      return r;
    }

    function cell(text, cls) {
      var c = el('span', 'l7-vcell' + (cls ? ' ' + cls : ''), text == null ? '' : String(text));
      return c;
    }

    var r1 = row();
    r1.appendChild(el('span', 'l7-vsign'));
    var tensA = cell(Math.floor(cfg.a / 10));
    var onesA = cell(cfg.a % 10);
    r1.appendChild(tensA);
    r1.appendChild(onesA);

    var r2 = row();
    r2.appendChild(el('span', 'l7-vsign', '+'));
    r2.appendChild(cell('', 'l7-vcell--blank'));
    var onesB = cell(cfg.b);
    r2.appendChild(onesB);

    var line = el('div', 'l7-vline');
    wrap.appendChild(line);

    var r3 = row('l7-vrow--sum is-hidden');
    r3.appendChild(el('span', 'l7-vsign'));
    var tensS = cell(Math.floor(cfg.sum / 10), 'l7-vcell--sum');
    var onesS = cell(cfg.sum % 10, 'l7-vcell--sum');
    r3.appendChild(tensS);
    r3.appendChild(onesS);

    return {
      node: wrap,
      tens: [tensA, tensS],
      ones: [onesA, onesB],
      sumRow: r3,
      sumDigits: [tensS, onesS],
      line: line
    };
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';

    var view = bench({ ones: 2, capacity: 5, cube: 38 });
    host.appendChild(view.node);

    popIn(view.bundle);
    view.initial.forEach(function (c, i) { land(c, 140 + i * 120); });

    await saySeq(['t1_a']);                 // Look! Here is one ten and two ones. That's twelve.
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    var saying = saySeq(['t1_b']);          // Now, three more blocks come.
    view.add(3, 'new').forEach(function (c, i) {
      later(function () { land(c, 0); }, i * 170);
    });
    await saying;
    if (!alive) return;

    await sleep(420);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';

    // 同一盘面：一捆 + 2 块老积木 + 3 块新积木
    var view = bench({ ones: 2, capacity: 5, cube: 38 });
    host.appendChild(view.node);
    var fresh = view.add(3, 'new');
    fresh.forEach(function (c, i) { popIn(c, i * 90); });

    await sleep(320);
    if (!alive) return;

    // 「We add the ones first.」——个位区亮起，十位一动不动
    saySeq(['t2_a']);
    view.ones.classList.add('is-focus');

    await sleep(1900);
    if (!alive) return;

    // 「Two ones plus three ones equals five ones.」——先点两块，再点三块
    saySeq(['t2_b']);
    later(function () {
      view.filled.slice(0, 2).forEach(function (c, i) { bounce(c, i * 130); });
    }, 260);
    later(function () {
      fresh.forEach(function (c, i) { bounce(c, i * 130); });
    }, 1500);
    later(function () {
      view.filled.forEach(function (c, i) { bounce(c, i * 60); });
      view.ones.classList.remove('is-focus');
      view.ones.classList.add('is-joined');
      badge(view.ones, '5');
    }, 3150);

    await sleep(5200);
    if (!alive) return;

    await saySeq(['t2_c']);                 // So, twelve plus three equals fifteen! One ten and five ones.
    if (!alive) return;

    await sleep(380);
  }

  async function sceneThree(host) {
    host.innerHTML = '';

    var wrap = el('div', 'l7-sum');
    var holder = el('div', 'l7-stack');
    holder.appendChild(bundle());
    holder.style.setProperty('--cube', '28px');

    var vert = verticalForm({ a: 12, b: 3, sum: 15 });
    wrap.appendChild(holder);
    wrap.appendChild(vert.node);
    host.appendChild(wrap);

    popIn(holder);
    popIn(vert.tens[0], 120);
    popIn(vert.ones[0], 180);
    popIn(vert.ones[1], 260);

    animate(vert.line, [
      { transform: 'scaleX(0)' },
      { transform: 'scaleX(1)' }
    ], { duration: 380, delay: 460, easing: 'cubic-bezier(.22,.61,.36,1)' });

    await sleep(900);
    if (!alive) return;

    // 「When we add, the ten stays the same.」——十位列 + 左边那一捆一起呼吸
    saySeq(['t3_a']);
    holder.classList.add('is-ten-on');
    vert.tens.forEach(function (c, i) {
      c.classList.add('is-ten');
      bounce(c, i * 220);
    });

    await sleep(2600);
    if (!alive) return;

    // 「We only add the ones together.」——个位两格亮起，和浮出
    saySeq(['t3_b']);
    vert.ones.forEach(function (c, i) {
      c.classList.add('is-ones');
      bounce(c, i * 180);
    });

    later(function () {
      vert.sumRow.classList.remove('is-hidden');
      vert.sumDigits.forEach(function (c, i) { popIn(c, i * 140); });
      vert.ones.forEach(function (c) { c.classList.add('is-merged'); });
    }, 1500);

    await sleep(4200);
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

  function numKeys(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'numkey');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'numkey-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 55);
      tray.appendChild(key);
    });
  }

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

    makeReplay(story, q.voice);

    var state = { locked: false, errors: 0 };

    function correct(node) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);

      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));

      if (solved.done) later(function () { finish(solved.star); }, 620);
      else later(function () { askQuestion(root); }, 700);
    }

    function wrong(node) {
      if (state.locked) return;
      state.errors += 1;
      session.answer(false);
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 240);
      }
      Engine.sfx.wrong();
      if (node) shake(node);
    }

    var built = null;
    if (q.type === 'count') built = buildCountQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') built = buildPickQuestion(q, story, tray, state, correct, wrong);
    else built = buildSolveQuestion(q, story, tray, state, correct, wrong);

    if (built && built.speak) built.speak();
    else saySeq(q.voice);
  }

  /* ---- 题型 A：看积木——一捆 + 零散，又飞来几块 ---- */

  function buildCountQuestion(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones + q.add;

    var view = bench({ ones: q.ones, capacity: q.ones + q.add, cube: 34 });
    story.appendChild(view.node);
    view.initial.forEach(function (c, i) { popIn(c, i * 45); });

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      numKeys(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) { correct(key); return; }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paint();
        }, 320);
      });
    }
    paint();

    var dropped = false;

    async function speak() {
      await saySeq([q.voice[0]]);                 // There are fourteen blocks.
      if (!alive) return;
      await sleep(520);
      if (!alive) return;

      var saying = saySeq([q.voice[1]]);          // Two more blocks come.
      if (!dropped) {
        dropped = true;
        view.add(q.add, 'new').forEach(function (c, i) {
          later(function () { land(c, 0); }, i * 170);
        });
      }
      await saying;
      if (!alive) return;

      await sleep(360);
      if (!alive) return;
      saySeq([q.voice[2]]);                       // How many in total?
    }

    return { speak: speak };
  }

  /* ---- 题型 B：听算式——点出对应的积木组合 ---- */

  function buildPickQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l7-opts');
    story.appendChild(board);

    var targetOnes = q.target - 10;         // target 是总数（如 12），卡片按零散数（2）比对
    var list = Engine.quiz.shuffle(q.combos.slice());

    function paint() {
      board.innerHTML = '';
      list.forEach(function (ones, i) {
        var card = el('button', 'l7-opt');
        card.type = 'button';
        card.dataset.ones = String(ones);
        card.setAttribute('aria-label', 'One ten and ' + ones + ' ones');
        card.appendChild(bench({ ones: ones, capacity: ones, cube: 24, mini: true }).node);
        card.addEventListener('click', function () { pick(ones, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    function pick(ones, card) {
      if (state.locked) return;
      if (ones === targetOnes) { correct(card); return; }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, targetOnes);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：横式填空——把数字拖进（或点进）空格 ---- */

  function buildSolveQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;

    // 横式 13 + 4 = ▢
    var eq = el('div', 'l7-eq');
    function tile(text) { return el('span', 'l7-eq-tile', String(text)); }
    eq.appendChild(tile(q.a));
    eq.appendChild(el('span', 'l7-eq-op', '+'));
    eq.appendChild(tile(q.b));
    eq.appendChild(el('span', 'l7-eq-op', '='));

    var slot = el('div', 'l7-eq-slot');
    var mark = el('span', 'l7-eq-mark', '?');
    slot.appendChild(mark);
    eq.appendChild(slot);
    story.appendChild(eq);

    // 下方散落的积木：一捆 + 个位若干（= 第一个加数），旁边一小盘待加的块
    var view = bench({ ones: q.a - 10, capacity: q.a - 10, cube: 22, plus: false });
    view.node.classList.add('l7-bench--flat');
    story.appendChild(view.node);

    var pile = el('div', 'l7-pile');
    pile.appendChild(loose(q.b, 22));
    view.node.appendChild(pile);

    var options = Engine.quiz.shuffle(q.options.slice());
    var dragging = null;

    function slotHit(x, y) {
      var r = slot.getBoundingClientRect();
      if (x >= r.left - HIT_PAD && x <= r.right + HIT_PAD &&
          y >= r.top - HIT_PAD && y <= r.bottom + HIT_PAD) return true;
      var node = document.elementFromPoint(x, y);
      return !!(node && node.closest && node.closest('.l7-eq-slot'));
    }

    function resolve(value, key) {
      if (state.locked) return;
      if (value === answer) {
        slot.classList.remove('is-near');
        slot.classList.add('is-filled');
        mark.textContent = String(answer);
        popIn(slot);
        Engine.sfx.tap();
        correct(key);
        return;
      }
      slot.classList.add('is-bad');
      later(function () { slot.classList.remove('is-bad'); }, 520);
      Engine.sfx.deny();
      shake(key);
      wrong(key);
      later(function () {
        Engine.quiz.reshuffle(options, answer);
        paint();
      }, 340);
    }

    function paint() {
      tray.innerHTML = '';
      options.forEach(function (value, i) {
        var key = el('button', 'numkey l7-key');
        key.type = 'button';
        key.dataset.value = String(value);
        key.setAttribute('aria-label', String(value));
        key.appendChild(el('span', 'numkey-digit', String(value)));
        bindKey(key, value);
        popIn(key, i * 55);
        tray.appendChild(key);
      });
    }

    function bindKey(key, value) {
      key.addEventListener('pointerdown', function (e) {
        if (state.locked) return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();

        var x0 = e.clientX;
        var y0 = e.clientY;
        var moved = false;
        var ghost = null;
        var home = key.getBoundingClientRect();

        function onMove(ev) {
          if (!moved && (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8)) {
            moved = true;
            ghost = key.cloneNode(true);
            ghost.classList.add('l7-ghost');
            ghost.style.left = ev.clientX + 'px';
            ghost.style.top = ev.clientY + 'px';
            document.body.appendChild(ghost);
            key.classList.add('is-dragging');
            dragging = ghost;
          }
          if (!moved) return;
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          slot.classList.toggle('is-near', slotHit(ev.clientX, ev.clientY));
        }

        function dropGhost(anim) {
          if (!ghost) return;
          var g = ghost;
          ghost = null;
          dragging = null;
          keys.forEach(function (k) { k.classList.remove('is-dragging'); });
          if (!anim) { remove(g); return; }
          Engine.anim.track(g, 360);
          g.animate(anim, { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }).finished
            .then(function () { remove(g); }, function () { remove(g); });
        }

        function onUp(ev) {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
          slot.classList.remove('is-near');

          var inSlot = moved && slotHit(ev.clientX, ev.clientY);

          if (!moved) { dropGhost(null); resolve(value, key); return; }

          if (inSlot) { dropGhost(null); resolve(value, key); return; }

          // 未命中：320ms 三段平滑弹回，不落子、不算答错（§5.9.3）
          var dx = home.left + home.width / 2 - ev.clientX;
          var dy = home.top + home.height / 2 - ev.clientY;
          dropGhost([
            { transform: 'translate(-50%,-50%) scale(1.08)', opacity: 0.96 },
            { transform: 'translate(calc(-50% + ' + (dx * 0.55).toFixed(0) + 'px), calc(-50% + ' + (dy * 0.55).toFixed(0) + 'px)) scale(.84)', opacity: 0.8, offset: 0.55 },
            { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + dy.toFixed(0) + 'px)) scale(.5)', opacity: 0, offset: 1 }
          ]);
        }

        var keys = tray.querySelectorAll('.l7-key');
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      });
    }

    paint();
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

    if (ctx.quick) {            // 验收用：跳过教学直接进题
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
    Array.prototype.forEach.call(document.querySelectorAll('.l7-ghost'), function (g) { remove(g); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[7] = {
    mount: mount,
    // 只读：给验收脚本用
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
