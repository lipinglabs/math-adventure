/* ============================================================
   level-lv01.js · Apple Addition（5 以内加法）
   ------------------------------------------------------------
   只做本关的事：3 幕教学 + 10 道题 + 结算。
   通用能力一律回 engine.js（音频池、判定、动画预算、弹层）。

   教学：每幕语音播完后定格，等用户点屏幕任意位置才继续。
   答题：纯数字按钮；答对只播金币音 + 星星音，650ms 进下一题；
        答错原地重做，同一题最多播一次鼓励语音。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;

  /* ---------------- 图标与实物（全部内联 SVG） ---------------- */

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
    home:
      '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
      '<path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    replay:
      '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
      '<path d="M19 12a7 7 0 1 1-2.4-5.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>'
  };

  var SHAPES = {
    apple:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M50 31c-7-9-21-9-27 2-7 13 3 39 16 46 5 3 8 2 11 2s6 1 11-2c13-7 23-33 16-46-6-11-20-11-27-2z" fill="#F2705B"/>' +
      '<ellipse cx="38" cy="44" rx="7" ry="11" fill="rgba(255,255,255,.45)" transform="rotate(-18 38 44)"/>' +
      '<path d="M50 30v-8" stroke="#8B5E3C" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M52 20c7-8 15-7 17-4-2 8-10 10-17 4z" fill="#7FBF6A"/>' +
      '</svg>',
    balloon:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="50" cy="38" rx="26" ry="31" fill="#7FC8E8"/>' +
      '<path d="M50 68l-7 9h14z" fill="#5FAFD2"/>' +
      '<path d="M50 77c8 7-8 9 0 17" stroke="#C0AFA0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="39" cy="27" rx="7" ry="10" fill="rgba(255,255,255,.5)" transform="rotate(-22 39 27)"/>' +
      '</svg>',
    fish:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<ellipse cx="54" cy="50" rx="30" ry="20" fill="#F6A96B"/>' +
      '<path d="M24 50L6 36v28z" fill="#EE8F52"/>' +
      '<circle cx="64" cy="45" r="4.2" fill="#4A3B33"/>' +
      '<path d="M46 33c7 5 7 29 0 34" stroke="rgba(255,255,255,.4)" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '</svg>',
    star:
      '<svg viewBox="0 0 100 100" aria-hidden="true">' +
      '<path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="#F7C948"/>' +
      '<path d="M50 24l6.5 14 15 1.8-11 10.4 3 14.8L50 58l-13.5 7 3-14.8-11-10.4 15-1.8z" fill="rgba(255,255,255,.28)"/>' +
      '</svg>'
  };

  /* ---------------- 运行时状态 ---------------- */

  var stage = null;
  var ctx = null;
  var alive = false;
  var timers = [];
  var session = null;
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

  /** WAAPI 封装：结束后 cancel，元素回落到 CSS 的最终状态 */
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
    return anim.finished.then(function () { anim.cancel(); }, function () { /* 被取消 */ });
  }

  function objectNode(kind, size) {
    var span = el('span', 'obj');
    span.style.setProperty('--s', size + 'px');
    span.innerHTML = SHAPES[kind] || SHAPES.apple;
    return span;
  }

  function popIn(node, delay) {
    return animate(node, [
      { opacity: 0, transform: 'scale(.5)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 420, delay: delay || 0 });
  }

  function dropIn(node) {
    return animate(node, [
      { transform: 'translateY(-150px) scale(.92,1.08)' },
      { transform: 'translateY(0) scale(1.06,.8)', offset: 0.55, easing: 'cubic-bezier(.3,.8,.4,1)' },
      { transform: 'translateY(0) scale(.95,1.06)', offset: 0.78 },
      { transform: 'translateY(0) scale(1,1)' }
    ], { duration: 540, easing: 'ease-in' });
  }

  function slideIn(node) {
    return animate(node, [
      { opacity: 0, transform: 'translate(150px,-70px) rotate(14deg)' },
      { opacity: 1, transform: 'translate(0,0) rotate(-4deg)', offset: 0.7 },
      { opacity: 1, transform: 'translate(0,0) rotate(0deg)' }
    ], { duration: 520 });
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

  /* ---------------- 教学 ---------------- */

  function makeFrame(host) {
    var frame = el('div', 'tut-frame');
    host.appendChild(frame);
    return frame;
  }

  function drawRing(frame) {
    var ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    ring.setAttribute('class', 'tut-ring');
    ring.setAttribute('viewBox', '0 0 100 100');
    ring.setAttribute('preserveAspectRatio', 'none');
    ring.setAttribute('aria-hidden', 'true');
    ring.innerHTML =
      '<ellipse cx="50" cy="50" rx="46" ry="42" pathLength="100" ' +
      'fill="none" stroke="#F3A78F" stroke-width="2.4" stroke-dasharray="100" stroke-dashoffset="100"/>';
    frame.appendChild(ring);

    var ellipse = ring.querySelector('ellipse');
    var anim = ellipse.animate(
      [{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }],
      { duration: 560, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }
    );
    Engine.anim.track(ring, 560);
    return anim.finished.then(function () {
      // 保留最终态，别让它缩回不可见
      ellipse.style.strokeDashoffset = '0';
      anim.cancel();
    }, function () { /* 取消 */ });
  }

  function makeDots(host, count) {
    var wrap = el('div', 'tut-dots');
    var dots = [];
    for (var i = 0; i < count; i += 1) {
      var dot = el('span', 'tut-dot');
      wrap.appendChild(dot);
      dots.push(dot);
    }
    host.appendChild(wrap);
    return dots;
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    var frame = makeFrame(host);
    var row = el('div', 'tut-row');
    frame.appendChild(row);

    var first = objectNode('apple', 92);
    row.appendChild(first);
    await Promise.all([dropIn(first), ctx.audio.play('lv01/t1_a')]);
    if (!alive) return;

    var second = objectNode('apple', 92);
    row.appendChild(second);
    await Promise.all([slideIn(second), ctx.audio.play('lv01/t1_b')]);
    if (!alive) return;

    var dots = makeDots(host, 2);
    await Promise.all([
      popIn(dots[0], 0),
      popIn(dots[1], 160),
      ctx.audio.play('lv01/t1_c')
    ]);
    if (!alive) return;

    await Promise.all([drawRing(frame), ctx.audio.play('lv01/t1_d')]);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    var frame = makeFrame(host);

    var plate = el('div', 'tut-plate');
    frame.appendChild(plate);

    var row = el('div', 'tut-row');
    frame.appendChild(row);

    for (var i = 0; i < 2; i += 1) {
      row.appendChild(objectNode('apple', 82));
    }

    await ctx.audio.play('lv01/t2_a');
    if (!alive) return;

    var drops = (async function () {
      var extra = objectNode('apple', 82);
      row.appendChild(extra);
      dropIn(extra);
      await sleep(300);
      if (!alive) return;
      var last = objectNode('apple', 82);
      row.appendChild(last);
      dropIn(last);
    })();

    await Promise.all([ctx.audio.play('lv01/t2_b'), drops]);
    if (!alive) return;

    var dots = makeDots(host, 4);
    await Promise.all([
      popIn(dots[0], 0), popIn(dots[1], 120), popIn(dots[2], 240), popIn(dots[3], 360),
      ctx.audio.play('lv01/t2_c')
    ]);
    if (!alive) return;

    await Promise.all([drawRing(frame), ctx.audio.play('lv01/t2_d')]);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    var eq = el('div', 'eq');
    host.appendChild(eq);

    var t1 = el('span', 'tile', '1');
    eq.appendChild(t1);
    await popIn(t1);
    if (!alive) return;

    var plus = el('span', 'tile tile--op', '+');
    eq.appendChild(plus);
    var popping = popIn(plus);
    await ctx.audio.play('lv01/t3_a');   // The plus sign means adding together.
    if (!alive) return;
    await popping;
    await shake(plus);
    if (!alive) return;

    var t2 = el('span', 'tile', '1');
    var eqSign = el('span', 'tile tile--op', '=');
    var total = el('span', 'tile tile--total', '2');
    eq.appendChild(t2);
    eq.appendChild(eqSign);
    eq.appendChild(total);

    await Promise.all([
      popIn(t2),
      popIn(eqSign, 100),
      popIn(total, 200),
      ctx.audio.play('lv01/t1_d')        // One plus one equals two.
    ]);
    if (!alive) return;

    var dots = makeDots(host, 2);
    await Promise.all([popIn(dots[0], 0), popIn(dots[1], 120)]);
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

  function optionsFor(answer) {
    var set = [answer];
    var deltas = [-1, 1, -2, 2];
    for (var i = 0; i < deltas.length && set.length < 3; i += 1) {
      var v = answer + deltas[i];
      if (v >= 1 && v <= 5 && set.indexOf(v) < 0) set.push(v);
    }
    for (var k = set.length - 1; k > 0; k -= 1) {
      var j = Math.floor(Math.random() * (k + 1));
      var tmp = set[k]; set[k] = set[j]; set[j] = tmp;
    }
    return set;
  }

  function addObjects(group, kind, count, size) {
    for (var i = 0; i < count; i += 1) {
      var node = objectNode(kind, size || 60);
      group.appendChild(node);
      popIn(node, i * 70);
    }
  }

  function burst(host) {
    if (Engine.anim.budgetLeft() <= 0) return;
    var node = el('div', 'burst-star');
    node.innerHTML = ICONS.star;
    host.appendChild(node);
    later(function () {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 900);
  }

  function askQuestion(root) {
    if (!alive) return;

    var index = session.index;
    var q = ctx.level.questions[index];
    if (!q) return;

    var answer = q.a + q.b;
    // 题目越简单，实物越大；总数 5 时收到 60px 保证 390 宽不出界
    var size = answer <= 2 ? 96 : answer === 3 ? 84 : answer === 4 ? 70 : 56;

    root.innerHTML = '';
    var wrap = el('div', 'lv');

    var story = el('div', 'lv-story');
    var row = el('div', 'q-story');

    var left = el('div', 'q-group');
    addObjects(left, q.object, q.a, size);

    var plus = el('div', 'q-plus', '+');

    var right = el('div', 'q-group');
    addObjects(right, q.object, q.b, size);

    row.appendChild(left);
    row.appendChild(plus);
    row.appendChild(right);
    story.appendChild(row);

    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      ctx.audio.play('lv01/q' + (index + 1));
    });
    story.appendChild(replay);

    var tray = el('div', 'lv-tray');
    var options = optionsFor(answer);
    var locked = false;
    var tried = false;

    options.forEach(function (value) {
      var key = el('button', 'numkey');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'numkey-digit', String(value)));

      key.addEventListener('click', function () {
        if (locked) return;

        if (value === answer) {
          locked = true;
          key.classList.add('is-right');
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);

          plus.classList.add('is-gone');
          left.classList.add('is-merged');
          right.classList.add('is-merged');
          burst(story);

          var solved = session.answer(true);
          ctx.step(Math.min(session.index, TOTAL));

          later(function () {
            if (solved.done) finish(solved.star);
            else askQuestion(root);
          }, 650);
          return;
        }

        if (!tried) {
          tried = true;
          session.answer(false);
          later(function () { ctx.audio.play('common/try_again'); }, 240);
        } else {
          session.answer(false);
        }
        Engine.sfx.wrong();
        shake(key);
      });

      tray.appendChild(key);
    });

    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    ctx.audio.play('lv01/q' + (index + 1));
  }

  /* ---------------- 结算 ---------------- */

  function iconButton(kind, label, onClick) {
    var btn = el('button', 'result-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = ICONS[kind];
    btn.addEventListener('click', function () {
      Engine.sfx.tap();
      onClick();
    });
    return btn;
  }

  function showResult(star) {
    if (!currentRoot) return;
    currentRoot.innerHTML = '';

    var box = el('div', 'result');
    var starWrap = el('div', 'result-star result-star--' + star);
    starWrap.innerHTML = ICONS.star;

    var rays = el('div', 'result-rays');
    var rayCount = star === 'gold' ? 8 : 4;
    for (var i = 0; i < rayCount; i += 1) {
      var ray = el('span', 'result-ray');
      ray.style.setProperty('--i', String(i));
      ray.style.setProperty('--n', String(rayCount));
      rays.appendChild(ray);
    }
    starWrap.appendChild(rays);
    box.appendChild(starWrap);

    var actions = el('div', 'result-actions');
    actions.appendChild(iconButton('replay', 'Play this level again', function () {
      ctx.restart();
    }));
    actions.appendChild(iconButton('home', 'Back to the map', function () {
      ctx.exit();
    }));
    box.appendChild(actions);

    currentRoot.appendChild(box);

    animate(starWrap, [
      { transform: 'scale(.2) rotate(-18deg)', opacity: 0 },
      { transform: 'scale(1.14) rotate(4deg)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 }
    ], { duration: 700 });

    animate(rays, [
      { opacity: 0, transform: 'scale(.6)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 600, delay: 220, easing: 'cubic-bezier(.22,.61,.36,1)' });

    ctx.audio.play(star === 'gold' ? 'common/gold' : 'common/silver');
  }

  function finish(star) {
    ctx.complete(star);
    showResult(star);
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
  global.LEVELS[1] = { mount: mount };
})(window);
