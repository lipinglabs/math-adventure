/* ============================================================
   level-lv08.js · Car Garage（小汽车进车库 · 不进位加法 11–19）
   ------------------------------------------------------------
   3 幕教学 + 10 题（顺序每局打乱），三种题型：
     drag    车库停着 10 + n 辆，车道上有几辆新车 → 拖进个位车库 → 点总数
     pick    三张车库卡（10 + a 停放 + b 待进）→ 点出听到的那个算式
     touch   横式 14 + 3 = ▢ → 点三个数字键
   铁律：全英文、点按推进、教学无问句、拖拽热区外扩 HIT_PAD、
         未命中 320ms 三段平滑弹回；车辆入位带悬挂挤压（§5.11）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;               // 拖车落点热区：个位车库矩形四边各外扩 14px（§5.9）
  var CAR_W = 18;                 // 停放车辆宽（十位车库一排 10 辆要放得下）
  var CAR_H = 25;

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
      { opacity: 0, transform: 'scale(.55)' },
      { opacity: 1, transform: 'scale(1.12)', offset: 0.65 },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 380, delay: delay || 0 });
  }

  function bounce(node, delay) {
    return animate(node, [
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-7px) scale(1.07)', offset: 0.42 },
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

  /** 车库外开进来：从右侧滑入车道，带一点刹车点头 */
  function driveIn(node, delay) {
    return animate(node, [
      { transform: 'translateX(280px)', opacity: 0 },
      { transform: 'translateX(0)', opacity: 1, offset: 0.82 },
      { transform: 'translateX(0) scale(1.08, .9)', opacity: 1, offset: 0.9 },
      { transform: 'translateX(0) scale(1)', opacity: 1 }
    ], { duration: 560, delay: delay || 0, easing: 'cubic-bezier(.22,.8,.35,1)' });
  }

  /** 入位：从落点飞进车位，落地时悬挂压一下再回弹（§5.11） */
  function parkFrom(node, fromX, fromY) {
    var r = node.getBoundingClientRect();
    var dx = Math.round(fromX - (r.left + r.width / 2));
    var dy = Math.round(fromY - (r.top + r.height / 2));
    return animate(node, [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.44)', opacity: 0.35 },
      { transform: 'translate(0,0) scale(1.08, .9)', opacity: 1, offset: 0.74 },
      { transform: 'translate(0,0) scale(.97, 1.04)', opacity: 1, offset: 0.88 },
      { transform: 'translate(0,0) scale(1)', opacity: 1 }
    ], { duration: 400, easing: 'cubic-bezier(.3,.8,.4,1)' });
  }

  /* ---------------- 语音链（§6.7 独占） ---------------- */

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
        ctx.audio.play('lv08/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 小汽车 ---------------- */

  var CAR_SVG =
    '<svg viewBox="0 0 18 25" aria-hidden="true">' +
    '<rect x="0.7" y="0.7" width="16.6" height="23.6" rx="5.2" fill="currentColor"/>' +
    '<rect x="3.1" y="3.4" width="11.8" height="5.4" rx="2.5" fill="#EFF9FD" opacity=".92"/>' +
    '<rect x="3.1" y="15.2" width="11.8" height="4.8" rx="2.2" fill="#EFF9FD" opacity=".6"/>' +
    '<rect x="5.2" y="22" width="2.8" height="1.6" rx="0.8" fill="#FFF6E2" opacity=".95"/>' +
    '<rect x="10" y="22" width="2.8" height="1.6" rx="0.8" fill="#FFF6E2" opacity=".95"/>' +
    '</svg>';

  var TONES = ['mint', 'sky', 'butter', 'lilac'];

  function carNode(tone) {
    var car = el('span', 'l8-car l8-car--' + (tone || TONES[0]));
    car.innerHTML = CAR_SVG;
    return car;
  }

  /* ---------------- 车库 ---------------- */

  /**
   * 一座车库：左边十位车库（一排 10 辆），右边个位车库（capacity 个车位）。
   * 车位一开始就全部建好，之后只往里填车，坐标绝不变化（§5.7）。
   */
  function garage(cfg) {
    cfg = cfg || {};
    var cw = cfg.cw || CAR_W;
    var ch = cfg.ch || CAR_H;

    var node = el('div', 'l8-block' + (cfg.mini ? ' l8-block--mini' : ''));
    node.style.setProperty('--cw', cw + 'px');
    node.style.setProperty('--ch', ch + 'px');

    var bays = el('div', 'l8-bays');

    var ten = el('div', 'l8-bay l8-bay--ten');
    var tenLot = el('div', 'l8-lot l8-lot--ten');
    var tenCars = [];
    for (var i = 0; i < 10; i += 1) {
      var c = carNode(TONES[i % TONES.length]);
      tenLot.appendChild(c);
      tenCars.push(c);
    }
    ten.appendChild(tenLot);

    var ones = el('div', 'l8-bay l8-bay--ones');
    var onesLot = el('div', 'l8-lot l8-lot--ones');
    var slots = [];
    var cap = cfg.capacity == null ? 9 : cfg.capacity;
    for (var k = 0; k < cap; k += 1) {
      var s = el('span', 'l8-spot');
      onesLot.appendChild(s);
      slots.push(s);
    }
    ones.appendChild(onesLot);

    bays.appendChild(ten);
    bays.appendChild(ones);
    node.appendChild(bays);

    var filled = 0;

    function fill(tone) {
      var slot = slots[filled];
      if (!slot) return null;
      var car = carNode(tone);
      slot.appendChild(car);
      slot.classList.add('is-filled');
      filled += 1;
      return car;
    }

    return {
      node: node, ten: ten, tenLot: tenLot, tenCars: tenCars,
      ones: ones, onesLot: onesLot, slots: slots,
      fill: fill,
      count: function () { return filled; }
    };
  }

  /** 车道：待进车库的新车（比停放车辆大一圈，方便小手抓） */
  function lane(n, tone) {
    var box = el('div', 'l8-lane');
    var picks = [];
    for (var i = 0; i < n; i += 1) {
      var b = el('button', 'l8-pick');
      b.type = 'button';
      b.setAttribute('aria-label', 'New car');
      b.appendChild(carNode(tone || 'new'));
      box.appendChild(b);
      picks.push(b);
    }
    return { node: box, picks: picks };
  }

  function badge(host, text) {
    var tag = el('div', 'l8-badge');
    var chip = el('span', 'l8-badge-chip', text);
    tag.appendChild(chip);
    host.appendChild(tag);
    popIn(chip);
    return tag;
  }

  /* ---------------- 竖式（教学第三幕） ---------------- */

  function verticalForm(cfg) {
    var wrap = el('div', 'l8-vert');

    function row(cls) {
      var r = el('div', 'l8-vrow' + (cls ? ' ' + cls : ''));
      wrap.appendChild(r);
      return r;
    }

    function cell(text, cls) {
      return el('span', 'l8-vcell' + (cls ? ' ' + cls : ''), text == null ? '' : String(text));
    }

    var r1 = row();
    r1.appendChild(el('span', 'l8-vsign'));
    var tensA = cell(Math.floor(cfg.a / 10));
    var onesA = cell(cfg.a % 10);
    r1.appendChild(tensA);
    r1.appendChild(onesA);

    var r2 = row();
    r2.appendChild(el('span', 'l8-vsign', '+'));
    r2.appendChild(cell('', 'l8-vcell--blank'));
    var onesB = cell(cfg.b);
    r2.appendChild(onesB);

    var line = el('div', 'l8-vline');
    wrap.appendChild(line);

    var r3 = row('l8-vrow--sum is-hidden');
    r3.appendChild(el('span', 'l8-vsign'));
    var tensS = cell(Math.floor(cfg.sum / 10), 'l8-vcell--sum');
    var onesS = cell(cfg.sum % 10, 'l8-vcell--sum');
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

    var g = garage({ capacity: 5 });
    var laneBox = lane(3, 'new');
    var wrap = el('div', 'l8-scene');
    wrap.appendChild(g.node);
    wrap.appendChild(laneBox.node);
    host.appendChild(wrap);

    laneBox.node.style.visibility = 'hidden';      // 车还没来，先别露出一条空车道

    popIn(g.node);
    g.tenCars.forEach(function (c, i) { popIn(c, 40 + i * 26); });

    await saySeq(['t1_a']);                 // Look at the garage! Here is one full row of ten cars.
    if (!alive) return;

    var two = [g.fill('sky'), g.fill('sky')];
    two.forEach(function (c, i) { popIn(c, 90 + i * 90); });

    await saySeq(['t1_b']);                 // And two more cars. That's twelve cars.
    if (!alive) return;

    await sleep(1000);
    if (!alive) return;

    var saying = saySeq(['t1_c']);           // Now, three new cars are coming.
    laneBox.picks.forEach(function (p, i) {
      later(function () {
        laneBox.node.style.visibility = 'visible';
        p.style.visibility = 'visible';
        driveIn(p, 0);
      }, i * 240);
    });
    await saying;
    if (!alive) return;

    await sleep(360);
  }

  async function sceneTwo(host) {
    host.innerHTML = '';

    var g = garage({ capacity: 5 });
    var laneBox = lane(3, 'new');
    var wrap = el('div', 'l8-scene');
    wrap.appendChild(g.node);
    wrap.appendChild(laneBox.node);
    host.appendChild(wrap);

    g.fill('sky');
    g.fill('sky');

    await sleep(320);
    if (!alive) return;

    // 「We put the new cars in the ones garage.」——三辆车依次开进车位
    saySeq(['t2_a']);
    var parked = [];
    laneBox.picks.forEach(function (p, i) {
      later(function () {
        var r = p.getBoundingClientRect();
        p.classList.add('is-gone');
        var car = g.fill('new');
        if (!car) return;
        parked.push(car);
        parkFrom(car, r.left + r.width / 2, r.top + r.height / 2);
      }, 240 + i * 460);
    });

    await sleep(2600);
    if (!alive) return;

    // 车都进库了，收起空车道（只淡出，不挪动任何东西 §5.7）
    later(function () { laneBox.node.classList.add('is-clear'); }, 1500);

    // 「Two cars plus three cars equals five cars.」——先点两辆，再点三辆，最后五辆一起
    saySeq(['t2_b']);
    later(function () {
      g.slots.slice(0, 2).forEach(function (s, i) {
        if (s.firstChild) bounce(s.firstChild, i * 140);
      });
    }, 240);
    later(function () {
      parked.forEach(function (c, i) { bounce(c, i * 140); });
    }, 1500);
    later(function () {
      g.slots.slice(0, 5).forEach(function (s, i) {
        if (s.firstChild) bounce(s.firstChild, i * 60);
      });
      g.ones.classList.add('is-joined');
      badge(g.ones, '5');
    }, 3150);

    await sleep(5200);
    if (!alive) return;

    await saySeq(['t2_c']);                 // So, twelve plus three equals fifteen! One ten and five ones.
    if (!alive) return;

    await sleep(360);
  }

  async function sceneThree(host) {
    host.innerHTML = '';

    var g = garage({ capacity: 5, cw: 14, ch: 20 });
    g.fill('sky');
    g.fill('sky');
    g.fill('new');
    g.fill('new');
    g.fill('new');

    var vert = verticalForm({ a: 12, b: 3, sum: 15 });
    var wrap = el('div', 'l8-scene l8-scene--sum');
    wrap.appendChild(g.node);
    wrap.appendChild(vert.node);
    host.appendChild(wrap);

    popIn(g.node);
    popIn(vert.tens[0], 120);
    popIn(vert.ones[0], 180);
    popIn(vert.ones[1], 260);
    animate(vert.line, [
      { transform: 'scaleX(0)' },
      { transform: 'scaleX(1)' }
    ], { duration: 380, delay: 460, easing: 'cubic-bezier(.22,.61,.36,1)' });

    await sleep(880);
    if (!alive) return;

    // 「When we add, the ten garage stays the same.」
    saySeq(['t3_a']);
    g.ten.classList.add('is-ten-on');
    vert.tens.forEach(function (c, i) {
      c.classList.add('is-ten');
      bounce(c, i * 220);
    });

    await sleep(2600);
    if (!alive) return;

    // 「We only add the ones garage.」
    saySeq(['t3_b']);
    g.ones.classList.add('is-ones-on');
    vert.ones.forEach(function (c, i) {
      c.classList.add('is-ones');
      bounce(c, i * 180);
    });

    later(function () {
      vert.sumRow.classList.remove('is-hidden');
      vert.sumDigits.forEach(function (c, i) { popIn(c, i * 140); });
    }, 1400);

    await sleep(3800);
    if (!alive) return;

    await sleep(280);
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
    if (q.type === 'drag') built = buildDragQuestion(q, story, tray, state, correct, wrong);
    else if (q.type === 'pick') built = buildPickQuestion(q, story, tray, state, correct, wrong);
    else built = buildTouchQuestion(q, story, tray, state, correct, wrong);

    if (built && built.speak) built.speak();
    else saySeq(q.voice);
  }

  /* ---- 题型 A：拖车进个位车库，再点总数 ---- */

  function buildDragQuestion(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones + q.add;

    // 托盘先占好位：拖完车才出现数字键，若此时才撑高托盘，车库会被顶上去
    tray.classList.add('lv-tray--reserved');

    var g = garage({ capacity: q.ones + q.add });
    var laneBox = lane(q.add, 'new');
    var wrap = el('div', 'l8-scene');
    wrap.appendChild(g.node);
    wrap.appendChild(laneBox.node);
    story.appendChild(wrap);

    g.slots.slice(0, q.ones).forEach(function (slot, i) {
      var car = g.fill(TONES[i % TONES.length]);   // 必须走 fill()，否则车库的 filled 计数与 DOM 不同步
      if (car) popIn(car, i * 50);
    });

    var remaining = q.add;
    var phase2 = false;
    var dragging = null;

    function hitBay(x, y) {
      var r = g.ones.getBoundingClientRect();
      if (x >= r.left - HIT_PAD && x <= r.right + HIT_PAD &&
          y >= r.top - HIT_PAD && y <= r.bottom + HIT_PAD) return true;
      var node = document.elementFromPoint(x, y);
      return !!(node && node.closest && node.closest('.l8-bay--ones'));
    }

    function beginPhaseTwo() {
      if (phase2) return;
      phase2 = true;
      saySeq(['how_many']);
      paintKeys();
    }

    function place(pick, x, y) {
      if (!remaining || pick.dataset.done === '1') return;
      pick.dataset.done = '1';
      pick.classList.add('is-gone');
      remaining -= 1;

      var car = g.fill('new');
      if (car) parkFrom(car, x, y);
      Engine.sfx.tap();

      if (!remaining) later(beginPhaseTwo, 420);
    }

    var options = Engine.quiz.shuffle(q.options.slice());

    function paintKeys() {
      numKeys(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) { correct(key); return; }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paintKeys();
        }, 320);
      });
    }

    function clearGhost() {
      remove(dragging);
      dragging = null;
      laneBox.picks.forEach(function (p) { p.classList.remove('is-dragging'); });
      g.ones.classList.remove('is-near');
    }

    function bindPick(pick) {
      pick.addEventListener('pointerdown', function (e) {
        if (state.locked) return;
        if (pick.dataset.done === '1') return;
        if (e.button != null && e.button !== 0) return;
        e.preventDefault();

        var x0 = e.clientX;
        var y0 = e.clientY;
        var moved = false;
        var ghost = null;
        var home = pick.getBoundingClientRect();

        function onMove(ev) {
          if (!moved && (Math.abs(ev.clientX - x0) > 8 || Math.abs(ev.clientY - y0) > 8)) {
            moved = true;
            ghost = el('div', 'l8-ghost');
            ghost.appendChild(carNode('new'));
            document.body.appendChild(ghost);
            dragging = ghost;
            pick.classList.add('is-dragging');
          }
          if (!moved) return;
          ghost.style.left = ev.clientX + 'px';
          ghost.style.top = ev.clientY + 'px';
          g.ones.classList.toggle('is-near', hitBay(ev.clientX, ev.clientY));
        }

        function onUp(ev) {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);

          var hit = hitBay(ev.clientX, ev.clientY);
          var gx = ev.clientX;
          var gy = ev.clientY;

          if (!moved || hit) {
            clearGhost();
            place(pick, gx, gy);
            return;
          }

          // 未命中：320ms 三段平滑弹回，不落子、不算答错（§5.9.3）
          var dx = home.left + home.width / 2 - gx;
          var dy = home.top + home.height / 2 - gy;
          var gEl = ghost;
          ghost = null;
          dragging = null;
          pick.classList.remove('is-dragging');
          g.ones.classList.remove('is-near');
          if (!gEl) return;
          Engine.anim.track(gEl, 360);
          gEl.animate([
            { transform: 'translate(-50%,-50%) scale(1)' },
            { transform: 'translate(calc(-50% + ' + (dx * 0.55).toFixed(0) + 'px), calc(-50% + ' + (dy * 0.55).toFixed(0) + 'px)) scale(.82)', opacity: 0.8, offset: 0.55 },
            { transform: 'translate(calc(-50% + ' + dx.toFixed(0) + 'px), calc(-50% + ' + dy.toFixed(0) + 'px)) scale(.5)', opacity: 0, offset: 1 }
          ], { duration: 320, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' })
            .finished.then(function () { remove(gEl); }, function () { remove(gEl); });
        }

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      });
    }

    laneBox.picks.forEach(bindPick);

    async function speak() {
      await saySeq([q.voice[0]]);           // There are thirteen cars.
      if (!alive) return;
      await sleep(420);
      if (!alive) return;
      saySeq([q.voice[1]]);                 // Drag two more cars into the ones garage.
    }

    return { speak: speak };
  }

  /* ---- 题型 B：听算式，点对应的车库 ---- */

  function miniGarage(a, b) {
    var box = el('div', 'l8-mini');

    var chip = el('div', 'l8-ten-chip');
    chip.appendChild(el('span', 'l8-ten-num', '10'));
    box.appendChild(chip);

    var ones = el('div', 'l8-mini-lot l8-mini-lot--ones');
    for (var i = 0; i < a; i += 1) ones.appendChild(carNode(TONES[i % TONES.length]));
    box.appendChild(ones);

    box.appendChild(el('span', 'l8-plus', '+'));

    var incoming = el('div', 'l8-mini-lot l8-mini-lot--new');
    for (var k = 0; k < b; k += 1) incoming.appendChild(carNode('new'));
    box.appendChild(incoming);

    return box;
  }

  function buildPickQuestion(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l8-opts');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.options.map(function (o) {
      return { a: o.a, b: o.b };
    }));
    var keyOf = function (o) { return o.a + 'x' + o.b; };
    var target = null;
    list.forEach(function (o) { if (o.a === q.a && o.b === q.b) target = o; });

    function paint() {
      board.innerHTML = '';
      list.forEach(function (opt, i) {
        var card = el('button', 'l8-opt');
        card.type = 'button';
        card.dataset.key = keyOf(opt);
        card.setAttribute('aria-label', 'Ten and ' + opt.a + ' cars, plus ' + opt.b + ' cars');
        card.appendChild(miniGarage(opt.a, opt.b));
        card.addEventListener('click', function () { pick(opt, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    function pick(opt, card) {
      if (state.locked) return;
      if (opt.a === q.a && opt.b === q.b) { correct(card); return; }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, target, keyOf);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---- 题型 C：横式点数字 ---- */

  function buildTouchQuestion(q, story, tray, state, correct, wrong) {
    var answer = q.a + q.b;

    var eq = el('div', 'l8-eq');
    eq.appendChild(el('span', 'l8-eq-tile', String(q.a)));
    eq.appendChild(el('span', 'l8-eq-op', '+'));
    eq.appendChild(el('span', 'l8-eq-tile', String(q.b)));
    eq.appendChild(el('span', 'l8-eq-op', '='));
    var slot = el('div', 'l8-eq-slot', '?');
    eq.appendChild(slot);
    story.appendChild(eq);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      numKeys(tray, options, function (value, key) {
        if (state.locked) return;
        if (value === answer) {
          slot.classList.add('is-filled');
          slot.textContent = String(answer);
          popIn(slot);
          correct(key);
          return;
        }
        wrong(key);
        slot.classList.add('is-bad');
        later(function () { slot.classList.remove('is-bad'); }, 520);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          paint();
        }, 320);
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
    Array.prototype.forEach.call(document.querySelectorAll('.l8-ghost'), function (g) { remove(g); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[8] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
