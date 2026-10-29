/* ============================================================
   level-lv03.js · Orchard Harvest（10 以内加减混合判断）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），含三种题型：
     sign     听情境 → 点「+ / −」
     sentence 看动画 → 点正确的算式卡
     number   听情境 → 点结果数字
   铁律：全英文、教学自问自答（本关教学台词无问句，停顿由代码控制）、
         点按推进、答对只播音效（sign 题例外：播算式语音，属教学内容）、
         物件消失后其余物件零位移（§5.7）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;

  /* 树上 10 个苹果格位（果园盒子百分比）。前缀顺序保证 3 / 5 / 6 / 8 个都摆得匀 */
  var SPOTS = [
    { x: 42, y: 19 }, { x: 27, y: 28 }, { x: 58, y: 25 },
    { x: 50, y: 37 }, { x: 34, y: 44 }, { x: 66, y: 42 },
    { x: 30, y: 58 }, { x: 61, y: 57 }, { x: 46, y: 53 }, { x: 72, y: 33 }
  ];

  var FIELD = { w: 330, h: 240 };

  var COLOR = {
    dog: '#D9A46B', bird: '#6FBFD8', rabbit: '#C7AFE3', fish: '#F09A5B',
    balloon: '#F58FA0', apple: '#E4574E'
  };

  var ART = {
    tree: function () {
      return '<svg viewBox="0 0 300 250" aria-hidden="true">' +
        '<path d="M143 250V150h14v100z" fill="#A9744C"/>' +
        '<path d="M150 180c-20-4-34-18-38-38 18 4 32 16 38 28z" fill="#A9744C"/>' +
        '<path d="M150 166c18-6 30-20 32-40-18 6-28 18-32 30z" fill="#A9744C"/>' +
        '<circle cx="104" cy="98" r="56" fill="#79BB64"/>' +
        '<circle cx="196" cy="96" r="52" fill="#6EB259"/>' +
        '<circle cx="150" cy="62" r="50" fill="#8CCB74"/>' +
        '<circle cx="150" cy="118" r="50" fill="#7CBE68"/>' +
        '</svg>';
    },
    apple: function () {
      return '<svg viewBox="0 0 40 44" aria-hidden="true">' +
        '<path d="M20 12c-3-4-10-5-14 0-5 6-3 17 3 24 3 4 7 6 11 6s8-2 11-6c6-7 8-18 3-24-4-5-11-4-14 0z" fill="#E4574E"/>' +
        '<ellipse cx="13" cy="21" rx="3.6" ry="5.4" fill="#fff" opacity=".42" transform="rotate(-22 13 21)"/>' +
        '<path d="M20 12c0-4 2-7 6-8" stroke="#8B5A2B" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<path d="M26 5c4-3 8 0 7 3-3 2-7 1-7-3z" fill="#6FA84E"/>' +
        '</svg>';
    },
    bird: function () {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<ellipse cx="30" cy="38" rx="18" ry="13" fill="currentColor"/>' +
        '<circle cx="45" cy="27" r="10" fill="currentColor"/>' +
        '<path d="M54 25l10 4-10 4z" fill="#F0A63C"/>' +
        '<circle cx="48" cy="25" r="1.9" fill="#3B332B"/>' +
        '<path d="M18 36c-9-2-13-8-13-15 9 0 15 5 17 11z" fill="#fff" opacity=".34"/>' +
        '<path d="M28 50l-3 9M38 50l3 9" stroke="#F0A63C" stroke-width="3.4" stroke-linecap="round"/>' +
        '</svg>';
    },
    dog: function () {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<ellipse cx="30" cy="40" rx="17" ry="12" fill="currentColor"/>' +
        '<circle cx="46" cy="28" r="11" fill="currentColor"/>' +
        '<path d="M36 20c-2-7 1-11 5-11 3 0 4 4 3 8-1 3-4 5-8 3z" fill="#00000030"/>' +
        '<circle cx="50" cy="26" r="2" fill="#3B332B"/>' +
        '<ellipse cx="56" cy="31" rx="3.4" ry="2.6" fill="#3B332B"/>' +
        '<path d="M14 34c-6-3-8-9-6-13" stroke="currentColor" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path d="M22 50v8M36 50v8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>' +
        '</svg>';
    },
    rabbit: function () {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<ellipse cx="32" cy="44" rx="16" ry="14" fill="currentColor"/>' +
        '<circle cx="41" cy="27" r="10" fill="currentColor"/>' +
        '<ellipse cx="37" cy="11" rx="4" ry="11" fill="currentColor"/>' +
        '<ellipse cx="46" cy="12" rx="4" ry="11" fill="currentColor"/>' +
        '<circle cx="48" cy="25" r="1.8" fill="#3B332B"/>' +
        '<ellipse cx="20" cy="38" rx="6" ry="5" fill="#fff" opacity=".35"/>' +
        '</svg>';
    },
    fish: function () {
      return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
        '<path d="M8 32c11-15 30-15 40 0-10 15-29 15-40 0z" fill="currentColor"/>' +
        '<path d="M47 32l11-9v18z" fill="currentColor"/>' +
        '<circle cx="21" cy="28" r="2.2" fill="#fff"/>' +
        '</svg>';
    },
    balloon: function () {
      return '<svg viewBox="0 0 100 118" aria-hidden="true">' +
        '<ellipse cx="50" cy="40" rx="27" ry="32" fill="currentColor"/>' +
        '<ellipse cx="39" cy="28" rx="7" ry="10" fill="rgba(255,255,255,.5)" transform="rotate(-20 39 28)"/>' +
        '<path d="M50 72l-7 9h14z" fill="currentColor"/>' +
        '<path d="M50 81c8 7-8 9 0 17" stroke="#C0AFA0" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '</svg>';
    }
  };

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
  var renderId = 0;          // 仅用于验收：每渲染一题 +1

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
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.1)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 400, delay: delay || 0 });
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

  /* ---------------- 果园 ---------------- */

  function buildOrchard(host) {
    var box = el('div', 'orchard');
    var tree = el('div', 'tree');
    tree.innerHTML = ART.tree();
    box.appendChild(tree);
    var layer = el('div', 'apple-layer');
    box.appendChild(layer);
    host.appendChild(box);
    return { box: box, layer: layer, apples: [] };
  }

  function addApple(orchard, index) {
    var spot = SPOTS[index % SPOTS.length];
    var node = el('div', 'apple-spot');
    node.style.left = spot.x + '%';
    node.style.top = spot.y + '%';
    node.innerHTML = ART.apple();
    orchard.layer.appendChild(node);
    orchard.apples.push(node);
    return node;
  }

  /** 小鸟叼着苹果飞入并放下：苹果落位后小鸟飞走 */
  function flyInApple(orchard, index, delay) {
    var spot = SPOTS[index % SPOTS.length];
    var bird = el('div', 'bird-fly');
    bird.innerHTML = ART.bird();
    bird.style.left = spot.x + '%';
    bird.style.top = spot.y + '%';
    orchard.layer.appendChild(bird);

    return animate(bird, [
      { transform: 'translate(-300px,-110px) rotate(-10deg)', opacity: 0 },
      { transform: 'translate(-150px,-46px) rotate(-4deg)', opacity: 1, offset: 0.45 },
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 }
    ], { duration: 1100, delay: delay || 0, easing: 'cubic-bezier(.3,.7,.4,1)' }).then(function () {
      if (!alive) return null;
      var apple = addApple(orchard, index);
      popIn(apple);
      animate(bird, [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(26px,-30px) scale(1.05)', opacity: 1, offset: 0.4 },
        { transform: 'translate(120px,-150px) scale(.9)', opacity: 0 }
      ], { duration: 760, easing: 'cubic-bezier(.3,.7,.4,1)' }).then(function () {
        if (bird.parentNode) bird.parentNode.removeChild(bird);
      });
      return apple;
    });
  }

  /** 飞走 / 掉落：动画结束后隐藏本体，占位保留（§5.7） */
  function flyOut(node, frames, opts) {
    return animate(node, frames, opts).then(function () {
      if (node) node.style.visibility = 'hidden';
    });
  }

  /** 苹果掉下树并滚走：只隐藏自身，格位保留（§5.7） */
  function dropApple(node, delay) {
    if (!node) return Promise.resolve();
    return flyOut(node, [
      { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
      { transform: 'translate(6px,54px) rotate(40deg)', opacity: 1, offset: 0.42 },
      { transform: 'translate(26px,182px) rotate(190deg)', opacity: 1, offset: 0.78 },
      { transform: 'translate(86px,208px) rotate(320deg)', opacity: 0 }
    ], { duration: 1080, delay: delay || 0, easing: 'cubic-bezier(.4,.1,.6,1)' });
  }

  function startWind(box) {
    var wind = el('div', 'wind');
    wind.innerHTML =
      '<svg viewBox="0 0 300 250" aria-hidden="true">' +
      '<path class="w1" d="M30 84c60-18 120 12 180-6" fill="none" stroke="#BFE3EF" stroke-width="7" stroke-linecap="round"/>' +
      '<path class="w2" d="M20 132c70-16 140 14 210-8" fill="none" stroke="#CFEAF3" stroke-width="6" stroke-linecap="round"/>' +
      '<path class="w3" d="M40 182c60-14 126 12 186-6" fill="none" stroke="#BFE3EF" stroke-width="6" stroke-linecap="round"/>' +
      '</svg>';
    box.appendChild(wind);
    box.classList.add('is-windy');
    return wind;
  }

  function stopWind(box, wind) {
    box.classList.remove('is-windy');
    if (wind && wind.parentNode) wind.parentNode.removeChild(wind);
  }

  function buildEquation(host, parts) {
    var strip = el('div', 'eq-strip');
    parts.forEach(function (part, i) {
      var tile = el('div', 'tile' + (part.kind ? ' tile--' + part.kind : ''), part.text);
      strip.appendChild(tile);
      popIn(tile, i * 90);
    });
    host.appendChild(strip);
    return strip;
  }

  /* ---------------- 教学 ---------------- */

  async function sceneOne(host) {
    host.innerHTML = '';
    var orchard = buildOrchard(host);

    var pops = [];
    for (var i = 0; i < 3; i += 1) pops.push(popIn(addApple(orchard, i), i * 130));

    await Promise.all(pops.concat([ctx.audio.play('lv03/t1_a')]));   // Look! Three apples on the tree.
    if (!alive) return;

    await sleep(1000);

    var line = ctx.audio.play('lv03/t1_b');                          // Two more apples fly in...
    await Promise.all([flyInApple(orchard, 3, 120), flyInApple(orchard, 4, 560)]);
    await line;
    if (!alive) return;

    buildEquation(host, [
      { text: '3' }, { text: '+', kind: 'op' }, { text: '2' },
      { text: '=', kind: 'op' }, { text: '5', kind: 'total' }
    ]);
    await ctx.audio.play('lv03/t1_c');                               // Three plus two equals five.
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    var orchard = buildOrchard(host);

    var nodes = [];
    for (var i = 0; i < 5; i += 1) {
      var node = addApple(orchard, i);
      nodes.push(node);
      popIn(node, i * 80);
    }
    await sleep(520);
    if (!alive) return;

    var wind = startWind(orchard.box);
    await ctx.audio.play('lv03/t2_a');                               // Oh no! A strong wind is blowing.
    if (!alive) return;

    stopWind(orchard.box, wind);
    await sleep(1000);

    var line = ctx.audio.play('lv03/t2_b');                          // Two apples fall down and roll away...
    await Promise.all([dropApple(nodes[4], 40), dropApple(nodes[3], 220)]);
    await line;
    if (!alive) return;

    buildEquation(host, [
      { text: '5' }, { text: '−', kind: 'op' }, { text: '2' },
      { text: '=', kind: 'op' }, { text: '3', kind: 'total' }
    ]);
    await ctx.audio.play('lv03/t2_c');                               // Five minus two equals three.
  }

  function makeSignCard(kind, symbol, label) {
    var card = el('div', 'sign-card sign-card--' + kind);
    card.setAttribute('aria-label', label);
    var sym = el('div', 'sign-sym', symbol);
    card.appendChild(sym);
    var row = el('div', 'sign-apples');
    card.appendChild(row);
    return { card: card, sym: sym, row: row, apples: [] };
  }

  function addSignApple(card) {
    var node = el('div', 'sign-apple');
    node.innerHTML = ART.apple();
    card.row.appendChild(node);
    card.apples.push(node);
    return node;
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    var row = el('div', 'sign-row');
    var plus = makeSignCard('plus', '+', 'Add');
    var minus = makeSignCard('minus', '−', 'Take away');
    row.appendChild(plus.card);
    row.appendChild(minus.card);
    host.appendChild(row);

    var pops = [];
    var i;
    for (i = 0; i < 4; i += 1) pops.push(popIn(addSignApple(plus), i * 70));
    for (i = 0; i < 4; i += 1) pops.push(popIn(addSignApple(minus), i * 70));
    await Promise.all(pops);
    if (!alive) return;

    // 左：加号 → 苹果合拢
    var line = ctx.audio.play('lv03/t3_a');                          // When we add, numbers go up.
    plus.card.classList.add('is-lit');
    plus.apples.forEach(function (apple, idx) {
      var push = [22, 8, -8, -22][idx] || 0;
      animate(apple, [
        { transform: 'translateX(0)' },
        { transform: 'translateX(' + push + 'px) scale(1.06)', offset: 0.6 },
        { transform: 'translateX(' + (push * 0.8) + 'px) scale(1)' }
      ], { duration: 620, delay: 60 + idx * 40 });
    });
    await line;
    if (!alive) return;
    plus.card.classList.remove('is-lit');

    // 右：减号 → 苹果飞走（格位保留）
    var line2 = ctx.audio.play('lv03/t3_b');                         // When we take away, numbers go down.
    minus.card.classList.add('is-lit');
    [2, 3].forEach(function (idx, k) {
      flyOut(minus.apples[idx], [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: 'translate(10px,-34px) rotate(12deg)', opacity: 1, offset: 0.4 },
        { transform: 'translate(34px,-86px) rotate(24deg)', opacity: 0 }
      ], { duration: 720, delay: 120 + k * 160 });
    });
    await line2;
    if (!alive) return;
    minus.card.classList.remove('is-lit');
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

  /** 按行居中摆好位置：坐标只算一次，之后任何入场/离场都不再重排（§5.7） */
  function layoutField(field, nodes, size) {
    var count = nodes.length;
    var rows = Math.ceil(count / 4);
    var perRow = Math.ceil(count / rows);
    var gap = 12;
    var rowH = size + 16;
    var top = (FIELD.h - rows * rowH) / 2;

    nodes.forEach(function (node, i) {
      var row = Math.floor(i / perRow);
      var inRow = Math.min(perRow, count - row * perRow);
      var col = i - row * perRow;
      var rowW = inRow * size + (inRow - 1) * gap;
      node.style.width = size + 'px';
      node.style.height = size + 'px';
      node.style.left = ((FIELD.w - rowW) / 2 + col * (size + gap)) + 'px';
      node.style.top = (top + row * rowH) + 'px';
      void node.offsetWidth;
    });
  }

  function makeFieldItem(kind) {
    var node = el('div', 'l3-item');
    node.style.color = COLOR[kind] || '#8C7A66';
    node.innerHTML = ART[kind] ? ART[kind]() : '';
    return node;
  }

  function makeReplay(story, voiceKey) {
    var replay = el('button', 'q-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Play the question again');
    replay.innerHTML = ICONS.speaker;
    replay.addEventListener('click', function () {
      Engine.sfx.tap();
      ctx.audio.play('lv03/' + voiceKey);
    });
    story.appendChild(replay);
    return replay;
  }

  function sentenceText(a, op, b, r) {
    return a + ' ' + (op === '-' ? '−' : op) + ' ' + b + ' = ' + r;
  }

  /** 三种句型：正确句 + 两个「数学上成立但不匹配画面」的干扰句 */
  function sentenceOptions(q) {
    var r = q.op === '+' ? q.a + q.b : q.a - q.b;
    var right = sentenceText(q.a, q.op, q.b, r);
    var d1 = q.op === '+'
      ? sentenceText(q.a > q.b ? q.a : q.b, '−', q.a > q.b ? q.b : q.a, Math.abs(q.a - q.b))
      : sentenceText(q.a, '+', q.b, q.a + q.b);
    var d2 = q.op === '+'
      ? sentenceText(r, '−', q.b, q.a)
      : sentenceText(q.b, '+', r, q.a);

    var cards = [
      { text: right, right: true },
      { text: d1, right: false },
      { text: d2, right: false }
    ];
    return Engine.quiz.shuffle(cards);
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

    function correct(node, extra) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);

      var solved = session.answer(true);
      ctx.step(Math.min(session.index, TOTAL));

      if (typeof extra === 'function') {
        extra(solved);
      } else if (solved.done) {
        later(function () { finish(solved.star); }, 620);
      } else {
        later(function () { askQuestion(root); }, 680);
      }
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
      shake(node);
    }

    if (q.type === 'sign') buildSignQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'sentence') buildSentenceQuestion(q, story, tray, state, correct, wrong);
    else buildNumberQuestion(q, story, tray, state, correct, wrong);

    ctx.audio.play('lv03/' + q.voice);
  }

  /* ---- 情境画面（题型 A / B 共用） ---- */

  /**
   * 先摆 a 个，1.2 秒后「再来 b 个」或「走掉 b 个」。
   * 位置按最终数量一次算好：后来的只占空格位，离场的只隐藏自身（§5.7）。
   */
  function buildSituation(q, story) {
    var field = el('div', 'l3-field');
    story.appendChild(field);

    var total = q.op === '+' ? q.a + q.b : q.a;
    var size = total <= 6 ? 66 : 56;
    var nodes = [];
    var i;
    for (i = 0; i < total; i += 1) {
      var node = makeFieldItem(q.object);
      field.appendChild(node);
      nodes.push(node);
    }
    layoutField(field, nodes, size);

    nodes.forEach(function (item, idx) {
      if (idx < q.a) popIn(item, idx * 60);
      else item.style.opacity = '0';
    });

    later(function () {
      if (!alive) return;
      if (q.op === '+') {
        nodes.slice(q.a).forEach(function (item, k) {
          item.style.opacity = '';
          animate(item, [
            { transform: 'translateX(140px) scale(.7)', opacity: 0 },
            { transform: 'translateX(24px) scale(.95)', opacity: 1, offset: 0.55 },
            { transform: 'translateX(0) scale(1)', opacity: 1 }
          ], { duration: 620, delay: k * 120, easing: 'cubic-bezier(.3,.7,.4,1)' });
        });
      } else {
        nodes.slice(q.a - q.b).forEach(function (item, k) {
          flyOut(item, [
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: 'translate(-20px,-40px) rotate(-10deg)', opacity: 1, offset: 0.4 },
            { transform: 'translate(-120px,-120px) rotate(-20deg)', opacity: 0 }
          ], { duration: 760, delay: k * 140, easing: 'cubic-bezier(.3,.7,.4,1)' });
        });
      }
    }, 1100);

    return { field: field, nodes: nodes };
  }

  /* ---- 题型 A：听情境 → 点 + / − ---- */

  function buildSignQuestion(q, story, tray, state, correct, wrong) {
    buildSituation(q, story);

    // 两个选项也要随机起手，否则孩子会记「总是点左边」
    var options = Engine.quiz.shuffle(['+', '−']);
    var right = q.op === '+' ? '+' : '−';

    function paint() {
      tray.innerHTML = '';
      options.forEach(function (sym, i) {
        var kind = sym === '+' ? 'plus' : 'minus';
        var btn = el('button', 'signkey signkey--' + kind);
        btn.type = 'button';
        btn.dataset.value = sym;
        btn.setAttribute('aria-label', sym === '+' ? 'Add' : 'Take away');
        btn.appendChild(el('span', 'signkey-glyph', sym));
        btn.addEventListener('click', function () { pick(sym, btn); });
        popIn(btn, i * 50);
        tray.appendChild(btn);
      });
    }

    function pick(sym, btn) {
      if (state.locked) return;
      if (sym !== right) {
        wrong(btn);
        later(function () {
          Engine.quiz.reshuffle(options, right);
          paint();
        }, 320);
        return;
      }
      // 点对后播算式语音（教学内容，不是夸奖人声），播完再进下一题
      correct(btn, function (solved) {
        ctx.audio.play('lv03/' + q.answerVoice).then(function () {
          if (!alive) return;
          if (solved.done) finish(solved.star);
          else askQuestion(currentRoot);
        });
      });
    }

    paint();
  }

  /* ---- 题型 B：看动画 → 点算式卡 ---- */

  function buildSentenceQuestion(q, story, tray, state, correct, wrong) {
    buildSituation(q, story);

    var cards = sentenceOptions(q);
    var answer = cards.filter(function (card) { return card.right; })[0];

    function paint() {
      tray.innerHTML = '';
      cards.forEach(function (card, i) {
        var btn = el('button', 'sentence-card');
        btn.type = 'button';
        btn.setAttribute('aria-label', card.text);
        btn.appendChild(el('span', 'sentence-text', card.text));
        btn.addEventListener('click', function () { pick(card, btn); });
        popIn(btn, i * 60);
        tray.appendChild(btn);
      });
    }

    function pick(card, btn) {
      if (state.locked) return;
      if (card === answer) {
        correct(btn);
        return;
      }
      wrong(btn);
      later(function () {
        Engine.quiz.reshuffle(cards, answer, function (item) { return item.text; });
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：听情境 → 点结果数字 ---- */

  function buildNumberQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.op === '+' ? q.a + q.b : q.a - q.b;
    var orchard = buildOrchard(story);

    var nodes = [];
    var i;
    for (i = 0; i < q.a; i += 1) {
      var node = addApple(orchard, i);
      nodes.push(node);
      popIn(node, i * 60);
    }
    // 加法：只在空着的格位上「长」出新苹果，已有苹果不动
    var grow = [];
    if (q.op === '+') {
      for (i = 0; i < q.b; i += 1) grow.push(addApple(orchard, q.a + i));
    }

    later(function () {
      if (!alive) return;
      if (q.op === '+') {
        grow.forEach(function (apple, k) { popIn(apple, k * 130); });
      } else {
        nodes.slice(q.a - q.b).forEach(function (apple, k) { dropApple(apple, k * 140); });
      }
    }, 1200);

    var options = Engine.quiz.optionsFor(answer, { min: 1, max: 10, count: 3 });

    function paint() {
      tray.innerHTML = '';
      options.forEach(function (value, i) {
        var key = el('button', 'numkey');
        key.type = 'button';
        key.dataset.value = String(value);
        key.setAttribute('aria-label', String(value));
        key.appendChild(el('span', 'numkey-digit', String(value)));
        key.addEventListener('click', function () { pick(value, key); });
        popIn(key, i * 60);
        tray.appendChild(key);
      });
    }

    function pick(value, key) {
      if (state.locked) return;
      if (value === answer) {
        correct(key);
        return;
      }
      wrong(key);
      later(function () {
        Engine.quiz.reshuffle(options, answer);
        paint();
      }, 320);
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
  global.LEVELS[3] = {
    mount: mount,
    // 只读：给验收脚本用，返回当前题目的数据（不参与任何判定）
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
