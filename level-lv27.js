/* ============================================================
   level-lv27.js · Stage 3 Finale（三阶结业挑战）
   ------------------------------------------------------------
   第三阶段最后一关：加减混合大考 + 结业仪式。
     教学 4 幕：① 9+5 与 14−8 并排同时演示（凑十 / 破十）
                ② 金色大奖杯升起
                ③ 奖杯定格、光芒与火花
                ④ 邀请进入最终挑战
     答题 10 题（完全混合打乱）：加法点选 3 / 减法点选 4 / 混合挑错 3
     结业：金星 → 常规结算 + 三阶专属语音 + 彩带 + 奖杯升起 + STAGE 3 徽章（§6.13）
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var NEXT_MS = 700;
  var WRONG_HOLD = 1500;
  var HIT_PAD = 14;
  var CONFETTI = 24;

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
    cup:
      '<svg viewBox="0 0 120 140" aria-hidden="true">' +
      '<defs><linearGradient id="l27gold" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#FFF0B8"/><stop offset="45%" stop-color="#F7C948"/>' +
      '<stop offset="100%" stop-color="#C8890B"/></linearGradient></defs>' +
      '<path d="M26 22h68v26c0 22-14 36-34 36S26 70 26 48z" fill="url(#l27gold)" ' +
      'stroke="#B77F08" stroke-width="2.5"/>' +
      '<path d="M26 30H14a12 12 0 0 0 12 20zM94 30h12a12 12 0 0 1-12 20z" fill="none" ' +
      'stroke="#E8B23C" stroke-width="6" stroke-linejoin="round"/>' +
      '<path d="M56 84h8v18h-8z" fill="#D9A21F"/>' +
      '<path d="M40 104h40l6 14H34z" fill="url(#l27gold)" stroke="#B77F08" stroke-width="2.5"/>' +
      '<rect x="30" y="118" width="60" height="12" rx="6" fill="url(#l27gold)" stroke="#B77F08" stroke-width="2.5"/>' +
      '<path d="M60 34l4.6 9.4 10.4 1.5-7.5 7.3 1.8 10.3L60 57.6l-9.3 4.9 1.8-10.3-7.5-7.3 10.4-1.5z" ' +
      'fill="#FFF6D8" opacity=".92"/></svg>'
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
  var ceremonyLayer = null;

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
        ctx.audio.play('lv27/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 教学 ---------------- */

  function miniAdd() {
    var box = el('div', 'l27-panel');
    var frame = el('div', 'l27-frame');
    var cells = [];
    for (var i = 0; i < 10; i += 1) {
      var cell = el('div', 'l27-cell');
      var a = el('span', 'l27-dot' + (i < 9 ? '' : ' is-hidden'));
      cell.appendChild(a);
      frame.appendChild(cell);
      cells.push(a);
    }
    box.appendChild(frame);
    var label = el('div', 'l27-panel-label', '9 + 5');
    box.appendChild(label);
    return { node: box, cells: cells, label: label };
  }

  function miniSub() {
    var box = el('div', 'l27-panel');
    var wrap = el('div', 'l27-sticks');
    var sticks = [];
    for (var i = 0; i < 4; i += 1) {
      var s = el('span', 'l27-stick');
      wrap.appendChild(s);
      sticks.push(s);
    }
    var bundle = el('div', 'l27-mini-bundle');
    for (var j = 0; j < 10; j += 1) bundle.appendChild(el('span', 'l27-stick'));
    wrap.appendChild(bundle);
    box.appendChild(wrap);
    var label = el('div', 'l27-panel-label', '14 − 8');
    box.appendChild(label);
    return { node: box, sticks: sticks, bundle: bundle, label: label };
  }

  async function sceneOne(host) {
    host.innerHTML = '';
    host.dataset.scene = 'one';

    var wrap = el('div', 'l27-teach');
    var pair = el('div', 'l27-pair');
    var add = miniAdd();
    var sub = miniSub();
    pair.appendChild(add.node);
    pair.appendChild(sub.node);
    wrap.appendChild(pair);
    host.appendChild(wrap);
    popIn(pair);

    var v = saySeq(['t1_a']);
    await sleep(700);
    if (!alive) return;
    // 加法：第 10 个点飞进来，凑满十
    add.cells[9].classList.remove('is-hidden');
    snapPop(add.cells[9]);
    Engine.sfx.tap();
    await sleep(900);
    if (!alive) return;
    // 减法：捆散开，最后四根留在地上
    sub.bundle.classList.add('is-open');
    Engine.sfx.tap();

    await v;
    if (!alive) return;
    await sleep(300);
  }

  function trophyNode() {
    var t = el('div', 'l27-cup');
    t.innerHTML = ICONS.cup;
    return t;
  }

  async function sceneTwo(host) {
    host.innerHTML = '';
    host.dataset.scene = 'two';

    var wrap = el('div', 'l27-teach');
    var cup = trophyNode();
    wrap.appendChild(cup);
    host.appendChild(wrap);

    await saySeq(['t1_b']);
    if (!alive) return;
    cup.classList.add('is-up');
    Engine.sfx.star();
    await sleep(700);
  }

  async function sceneThree(host) {
    host.innerHTML = '';
    host.dataset.scene = 'three';

    var wrap = el('div', 'l27-teach');
    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow');
    wrap.appendChild(cup);
    var ribbon = el('div', 'l27-ribbon', 'STAGE 3');
    wrap.appendChild(ribbon);
    host.appendChild(wrap);
    popIn(cup);

    await saySeq(['t1_c']);
    if (!alive) return;
    await sleep(260);
  }

  async function sceneFour(host) {
    host.innerHTML = '';
    host.dataset.scene = 'four';

    var wrap = el('div', 'l27-teach');
    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow');
    var ribbon = el('div', 'l27-ribbon', 'STAGE 3');
    var flag = el('div', 'l27-flag');
    flag.innerHTML = ICONS.star;
    wrap.appendChild(flag);
    wrap.appendChild(cup);
    wrap.appendChild(ribbon);
    host.appendChild(wrap);
    popIn(flag);

    await saySeq(['t1_d']);
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
      var key = el('button', 'l27-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l27-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 45);
      tray.appendChild(key);
    });
  }

  function equation(a, b, sign) {
    var box = el('div', 'l27-eq');
    box.appendChild(el('span', 'l27-tile', String(a)));
    box.appendChild(el('span', 'l27-op', sign));
    box.appendChild(el('span', 'l27-tile', String(b)));
    box.appendChild(el('span', 'l27-op', '='));
    var res = el('span', 'l27-tile l27-tile--q', '?');
    box.appendChild(res);
    return { node: box, res: res };
  }

  /* ---------------- 题型 A / B：点选（加 / 减） ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var sign = q.type === 'add' ? '+' : '−';
    var answer = q.type === 'add' ? q.a + q.b : q.a - q.b;
    var refs = equation(q.a, q.b, sign);
    story.appendChild(refs.node);
    popIn(refs.node);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          state.busy = true;
          refs.res.textContent = String(answer);
          refs.res.classList.remove('l27-tile--q');
          refs.res.classList.add('is-answer');
          snapPop(refs.res);
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

    tray.classList.add('l27-tray');
    paint();
    saySeq(q.voice);
  }

  /* ---------------- 题型 C：混合挑错 ---------------- */

  function buildWrong(q, story, tray, state, correct, wrong) {
    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      var copy = { a: s.a, b: s.b, sign: s.sign, shown: s.shown };
      copy.value = s.sign === '+' ? s.a + s.b : s.a - s.b;
      copy.bad = copy.value !== s.shown;
      return copy;
    }));

    var board = el('div', 'l27-cards');
    story.appendChild(board);

    function paint() {
      board.innerHTML = '';
      list.forEach(function (s, i) {
        var card = el('button', 'l27-card');
        card.type = 'button';
        card.dataset.key = s.a + s.sign + s.b + '=' + s.shown;
        card.setAttribute('aria-label', s.a + ' ' + s.sign + ' ' + s.b + ' equals ' + s.shown);
        var row = el('div', 'l27-eq l27-eq--small');
        row.appendChild(el('span', 'l27-tile l27-tile--sm', String(s.a)));
        row.appendChild(el('span', 'l27-op', s.sign));
        row.appendChild(el('span', 'l27-tile l27-tile--sm', String(s.b)));
        row.appendChild(el('span', 'l27-op', '='));
        var res = el('span', 'l27-tile l27-tile--sm l27-tile--ans', String(s.shown));
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
          Engine.quiz.reshuffle(list, list.filter(function (x) { return x.bad; })[0],
            function (x) { return x.a + x.sign + x.b + '=' + x.shown; });
          paint();
        }, 380);
        return;
      }

      state.busy = true;
      card.classList.add('is-right');
      var tick = el('span', 'l27-tick');
      tick.innerHTML = ICONS.check;
      card.appendChild(tick);
      popIn(tick, 40);
      snapPop(card);

      later(function () {
        res.classList.add('is-flip');
        later(function () {
          res.textContent = String(s.value);
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

  /* ---------------- 结业仪式（§6.13） ---------------- */

  function buildCeremony() {
    var layer = el('div', 'l27-ceremony');
    var confetti = el('div', 'l27-confetti');
    var colors = ['#F58FA0', '#7FC7E8', '#F7C063', '#8FD8C0', '#C7A6E8', '#F2A93B'];
    for (var i = 0; i < CONFETTI; i += 1) {
      var bit = el('i');
      bit.style.left = (4 + (i * 4) % 92) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.width = (5 + (i % 4) * 2) + 'px';
      bit.style.height = (10 + (i % 5) * 4) + 'px';
      bit.style.animationDelay = ((i % 8) * 0.16).toFixed(2) + 's';
      bit.style.animationDuration = (2.2 + (i % 5) * 0.35).toFixed(2) + 's';
      bit.style.setProperty('--spin', ((i % 2 ? 1 : -1) * (180 + i * 13)) + 'deg');
      confetti.appendChild(bit);
    }
    layer.appendChild(confetti);

    var cup = trophyNode();
    cup.classList.add('is-up', 'is-glow', 'l27-cup--big');
    layer.appendChild(cup);

    var ribbon = el('div', 'l27-ribbon l27-ribbon--big', 'STAGE 3');
    layer.appendChild(ribbon);

    var badge = el('span', 'l27-badge', 'STAGE 3');
    layer.appendChild(badge);

    return { node: layer, confetti: confetti };
  }

  function ceremony() {
    if (!alive || !currentRoot) return;
    if (document.querySelector('.l27-ceremony')) return;

    var c = buildCeremony();
    ceremonyLayer = c.node;
    currentRoot.appendChild(c.node);
    popIn(c.node);
    Engine.sfx.star();

    // 常规金星语音播完再播结业语音（§6.13.4 只允许一条在播）
    var waited = 0;
    var poll = setInterval(function () {
      if (!alive) { clearInterval(poll); return; }
      waited += 200;
      var playing = 0;
      var nodes = document.querySelectorAll('audio');
      for (var i = 0; i < nodes.length; i += 1) if (!nodes[i].paused) playing += 1;
      if (playing === 0 || waited > 4200) {
        clearInterval(poll);
        ctx.audio.play('lv27/t_gold');
      }
    }, 200);

    var done = false;
    function close() {
      if (done) return;
      done = true;
      clearInterval(poll);
      c.node.classList.add('is-out');
      later(function () {
        remove(c.node);
        if (ceremonyLayer === c.node) ceremonyLayer = null;
        var result = document.querySelector('.result');
        if (result && !result.querySelector('.l27-badge--sticky')) {
          var chip = el('span', 'l27-badge l27-badge--sticky', 'STAGE 3');
          result.appendChild(chip);
          popIn(chip);
        }
      }, 320);
    }

    // 1.2 秒后才允许点掉；未点击 4 秒自动收起
    later(function () {
      if (!alive || done) return;
      c.node.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        close();
      });
    }, 1200);
    later(close, 4000);
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

    if (q.type === 'wrong') buildWrong(q, story, tray, state, correct, wrong);
    else buildTap(q, story, tray, state, correct, wrong);
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

    if (star === 'gold') later(ceremony, 520);
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
    Array.prototype.slice.call(document.querySelectorAll('.l27-ceremony'))
      .forEach(function (n) { remove(n); });
    ceremonyLayer = null;
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[27] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
