/* ============================================================
   level-lv02.js · Balloon Take Away（9 以内减法）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱）。
   新增铁律：教学里的问句绝不能悬空——问句播完后停 1 秒，
   系统立即播答案语音并同步点数，见 PROJECT_MATH_RULES §6.1。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;

  var COLORS = ['#F58FA0', '#7FC8E8', '#93D7C3', '#F7C948', '#B9A6E8',
                '#F6A96B', '#8FBF6A', '#E58FC8', '#6FB1E8'];

  var BALLOON =
    '<svg viewBox="0 0 100 118" aria-hidden="true">' +
    '<ellipse cx="50" cy="40" rx="27" ry="32" fill="currentColor"/>' +
    '<ellipse cx="39" cy="28" rx="7" ry="10" fill="rgba(255,255,255,.5)" transform="rotate(-20 39 28)"/>' +
    '<path d="M50 72l-7 9h14z" fill="currentColor"/>' +
    '<path d="M50 81c8 7-8 9 0 17" stroke="#C0AFA0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
    '</svg>';

  var ICONS = {
    hand:
      '<svg viewBox="0 0 48 48" width="46" height="46" aria-hidden="true">' +
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

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
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
    return anim.finished.then(function () { anim.cancel(); }, function () { /* 取消 */ });
  }

  function popIn(node, delay) {
    return animate(node, [
      { opacity: 0, transform: 'scale(.5)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 420, delay: delay || 0 });
  }

  function bounce(node) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-12px) scale(1.06)', offset: 0.4 },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: 380 });
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

  /* ---------------- 气球 ---------------- */

  function makeBalloon(size, color) {
    var slot = el('span', 'balloon-slot');
    var balloon = el('span', 'obj balloon');
    balloon.style.setProperty('--s', size + 'px');
    balloon.style.color = color;
    balloon.innerHTML = BALLOON;
    slot.appendChild(balloon);
    return { slot: slot, balloon: balloon };
  }

  function bobOn(item, index) {
    item.balloon.style.setProperty('--d', (index * 0.22).toFixed(2) + 's');
    item.balloon.classList.add('is-bobbing');
  }

  function bobOff(item) {
    item.balloon.classList.remove('is-bobbing');
  }

  /** 向上飘走并淡出，结束后移除整个 slot */
  function flyAway(item, delay) {
    bobOff(item);
    var p = animate(item.balloon, [
      { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(10px,-46px) rotate(7deg) scale(1.06)', opacity: 1, offset: 0.45 },
      { transform: 'translate(22px,-160px) rotate(13deg) scale(.94)', opacity: 0 }
    ], { duration: 900, delay: delay || 0, easing: 'cubic-bezier(.3,.7,.4,1)' });

    later(function () {
      if (item.slot.parentNode) item.slot.parentNode.removeChild(item.slot);
    }, (delay || 0) + 940);
    return p;
  }

  function countUp(items, step) {
    return items.reduce(function (chain, item, i) {
      return chain.then(function () {
        if (!alive) return null;
        bounce(item.balloon);
        var dot = el('span', 'count-dot');
        item.slot.appendChild(dot);
        requestAnimationFrame(function () { dot.classList.add('is-on'); });
        return sleep(i === items.length - 1 ? 0 : step);
      });
    }, Promise.resolve());
  }

  /* ---------------- 教学 ---------------- */

  function makeFrame(host) {
    var frame = el('div', 'tut-frame tut-frame--card');
    host.appendChild(frame);
    return frame;
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    var frame = makeFrame(host);
    var row = el('div', 'tut-row tut-row--balloons');
    frame.appendChild(row);

    var items = [];
    for (var i = 0; i < 3; i += 1) {
      var item = makeBalloon(92, COLORS[i]);
      row.appendChild(item.slot);
      items.push(item);
    }

    await Promise.all([
      popIn(items[0].balloon, 0),
      popIn(items[1].balloon, 120),
      popIn(items[2].balloon, 240),
      ctx.audio.play('lv02/t1_a')          // Look! Three balloons.
    ]);
    if (!alive) return;
    items.forEach(bobOn);

    await Promise.all([
      ctx.audio.play('lv02/t1_b'),         // Pop! One balloon flew away.
      flyAway(items[2], 120)
    ]);
    if (!alive) return;

    await sleep(1000);                     // 飘走后的停顿
    await ctx.audio.play('lv02/t1_q');     // How many left?
    if (!alive) return;

    await sleep(1000);                     // 铁律：问句后停 1 秒
    var answer = ctx.audio.play('lv02/t1_c');   // One, two. Two balloons!
    await countUp([items[0], items[1]], 900);
    await answer;
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    var frame = makeFrame(host);
    var row = el('div', 'tut-row tut-row--balloons tut-row--tight');
    frame.appendChild(row);

    var items = [];
    for (var i = 0; i < 5; i += 1) {
      var item = makeBalloon(78, COLORS[i]);
      row.appendChild(item.slot);
      items.push(item);
    }

    await Promise.all([
      popIn(items[0].balloon, 0),
      popIn(items[1].balloon, 90),
      popIn(items[2].balloon, 180),
      popIn(items[3].balloon, 270),
      popIn(items[4].balloon, 360),
      ctx.audio.play('lv02/t2_a')          // Here are five balloons. Let's count.
    ]);
    if (!alive) return;
    items.forEach(bobOn);

    await Promise.all([
      ctx.audio.play('lv02/t2_b'),         // Two balloons flew away!
      flyAway(items[4], 80),
      flyAway(items[3], 260)
    ]);
    if (!alive) return;

    await sleep(1000);
    await ctx.audio.play('lv02/t1_q');     // 复用 How many left?
    if (!alive) return;

    await sleep(1000);
    var answer = ctx.audio.play('lv02/t2_c');   // One, two, three. Three balloons left.
    await countUp([items[0], items[1], items[2]], 1100);
    await answer;
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    var frame = makeFrame(host);
    var stack = el('div', 'tut-stack');
    frame.appendChild(stack);

    var eq = el('div', 'eq');
    stack.appendChild(eq);

    var t5 = el('span', 'tile', '5');
    var op = el('span', 'tile tile--op', '−');
    var t2 = el('span', 'tile', '2');
    eq.appendChild(t5);
    eq.appendChild(op);
    eq.appendChild(t2);

    await Promise.all([popIn(t5), popIn(op, 100), popIn(t2, 200)]);
    if (!alive) return;

    await ctx.audio.play('lv02/t3_a');     // The minus sign means take away.
    if (!alive) return;

    var dotRow = el('div', 'dot-row');
    stack.appendChild(dotRow);
    var dots = [];
    for (var i = 0; i < 5; i += 1) {
      var dot = el('span', 'dot');
      dotRow.appendChild(dot);
      dots.push(dot);
      popIn(dot, i * 80);
    }
    await sleep(500);
    if (!alive) return;

    var answer = ctx.audio.play('lv02/t3_b');   // Five take away two equals three.

    await sleep(300);
    animate(dots[4], [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }],
      { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)' });
    animate(dots[3], [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2)', opacity: 0 }],
      { duration: 320, delay: 140, easing: 'cubic-bezier(.22,.61,.36,1)' });
    later(function () {
      [dots[3], dots[4]].forEach(function (d) {
        if (d.parentNode) d.parentNode.removeChild(d);
      });
    }, 620);

    await sleep(1500);
    if (!alive) return;

    var eqSign = el('span', 'tile tile--op', '=');
    var total = el('span', 'tile tile--total', '3');
    eq.appendChild(eqSign);
    eq.appendChild(total);
    await Promise.all([popIn(eqSign), popIn(total, 100)]);
    await answer;
  }

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
        var hint = host.querySelector('.tap-hint');
        if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
        resolve();
      }

      tapFinish = finish;
      document.addEventListener('pointerdown', finish, true);
    });
  }

  /* ---------------- 答题 ---------------- */

  function burst(host) {
    if (Engine.anim.budgetLeft() <= 0) return;
    var node = el('div', 'burst-star');
    node.innerHTML = ICONS.star;
    host.appendChild(node);
    later(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 900);
  }

  function sizeFor(count) {
    if (count <= 3) return 88;
    if (count <= 6) return 74;
    return 66;
  }

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();          // 切题先掐掉上一题残留语音，避免叠音

    var q = queue[session.index];
    if (!q) return;

    var answer = q.a - q.b;
    var size = sizeFor(q.a);

    root.innerHTML = '';
    var wrap = el('div', 'lv');

    var story = el('div', 'lv-story');
    var card = el('div', 'q-story');
    var field = el('div', 'balloon-field');
    card.appendChild(field);

    var items = [];
    for (var i = 0; i < q.a; i += 1) {
      var item = makeBalloon(size, COLORS[i % COLORS.length]);
      field.appendChild(item.slot);
      items.push(item);
      popIn(item.balloon, i * 55);
      bobOn(item, i);
    }
    story.appendChild(card);

    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      ctx.audio.play('lv02/' + q.voice);
    });
    story.appendChild(replay);

    // 语音开始后 1.2 秒，让 b 个气球飘走（此时孩子已看到总数）
    later(function () {
      var flown = items.slice(items.length - q.b);
      flown.forEach(function (it, idx) { flyAway(it, idx * 120); });
    }, 1200);

    var tray = el('div', 'lv-tray');
    var optionCount = ctx.level.optionCount || 4;
    var options = Engine.quiz.optionsFor(answer, { min: 1, max: 9, count: optionCount });
    var locked = false;
    var errorCount = 0;

    function paintTray(animateIn) {
      tray.innerHTML = '';
      options.forEach(function (value, i) {
        var key = el('button', 'numkey');
        key.type = 'button';
        key.dataset.value = String(value);
        key.setAttribute('aria-label', String(value));
        key.appendChild(el('span', 'numkey-digit', String(value)));
        key.addEventListener('click', function () { pick(value, key); });
        if (animateIn) popIn(key, i * 60);
        tray.appendChild(key);
      });
    }

    function pick(value, key) {
      if (locked) return;

      if (value === answer) {
        locked = true;
        key.classList.add('is-right');
        Engine.sfx.correct();
        later(function () { Engine.sfx.star(); }, 90);

        items.forEach(function (it, i) {
          if (it.slot.parentNode) later(function () { bounce(it.balloon); }, i * 50);
        });
        burst(story);

        var solved = session.answer(true);
        ctx.step(Math.min(session.index, TOTAL));

        later(function () {
          if (solved.done) finish(solved.star);
          else askQuestion(root);
        }, 650);
        return;
      }

      errorCount += 1;
      session.answer(false);
      if (errorCount === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 240);
      }
      Engine.sfx.wrong();
      shake(key);

      later(function () {
        if (locked) return;
        Engine.quiz.reshuffle(options, answer);
        paintTray(true);
      }, 300);
    }

    paintTray(false);
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    ctx.audio.play('lv02/' + q.voice);
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

    if (ctx.quick) {          // 验收用：跳过教学，直接进题
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
  global.LEVELS[2] = { mount: mount };
})(window);
