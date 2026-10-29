/* ============================================================
   level-lv15.js · Final Challenge（二阶结业挑战）
   ------------------------------------------------------------
   2 幕收官教学（三连回顾 / 亮出二阶奖杯）+ 10 题混合大考（顺序全随机）：
     tap    听音点选：算式卡 + 三个数字键
     blocks 看图拖拽：一捆十块 + n 块零散 → 拖到正确的数字卡
     wrong  找错误算式：三句里恰好一句错，点对后把错的结果翻成正确答案
   铁律：全英文、点按推进、教学问句 1 秒后自答、答题绝不补答；
         拖拽按 §5.9 / §5.14，找错句按 §6.11；
         金星后追加二阶结业仪式（彩带 + 奖杯 + 专属语音，§6.13）。
   ============================================================ */

(function (global) {
  'use strict';

  var TOTAL = 10;
  var HIT_PAD = 14;              // §5.9 落点热区外扩
  var TAP_SLOP = 8;              // 小于 8px 视为轻点
  var NEXT_MS = 700;             // 答对到下一题
  var FIX_HOLD = 1500;           // 找错句答对后定格演示改正（§6.11）
  var CONFETTI = 24;             // 结业彩带条数

  /* ---------------- 图标 / 奖杯 ---------------- */

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
    bird:
      '<svg viewBox="0 0 40 34" aria-hidden="true">' +
      '<path d="M6 20c6-11 18-14 24-8 2 2 2 6 0 8-5 5-16 6-24 0z" fill="#7FC0E8"/>' +
      '<path d="M14 18c5-3 11-2 15 2-5 4-11 4-15-2z" fill="#BFE4F7"/>' +
      '<path d="M30 14l6-3-4 6z" fill="#F2A93B"/>' +
      '<circle cx="29" cy="12" r="1.6" fill="#2C4A5C"/>' +
      '</svg>'
  };

  /**
   * 二阶奖杯（纯 SVG，无外部图片）。
   * uid 用来隔离渐变 id，同一页面里可以同时存在「预览」和「结业」两只。
   */
  function trophySVG(uid) {
    var g = 'l15gold-' + uid;
    var d = 'l15goldDark-' + uid;
    var s = 'l15shine-' + uid;
    return '' +
      '<svg class="l15-cup" viewBox="0 0 120 140" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + g + '" x1="0" y1="0" x2="0.9" y2="1">' +
      '<stop offset="0%" stop-color="#FFF0B8"/>' +
      '<stop offset="34%" stop-color="#FFD24F"/>' +
      '<stop offset="72%" stop-color="#EDA514"/>' +
      '<stop offset="100%" stop-color="#B8720A"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + d + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="#FFE9A6"/>' +
      '<stop offset="100%" stop-color="#D98C0E"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + s + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.92"/>' +
      '<stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>' +
      '</linearGradient>' +
      '</defs>' +

      // 两个把手
      '<path d="M30 26H17c-3 20 7 32 20 36" fill="none" stroke="url(#' + d + ')" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M90 26h13c3 20-7 32-20 36" fill="none" stroke="url(#' + d + ')" stroke-width="8" stroke-linecap="round"/>' +

      // 杯身
      '<path d="M27 14h66v32c0 24-15 41-33 41S27 70 27 46z" fill="url(#' + g + ')" ' +
      'stroke="rgba(255,248,214,.9)" stroke-width="1.6"/>' +
      // 高光
      '<path d="M38 22c-2 20 3 36 14 46-12-3-20-16-20-34z" fill="url(#' + s + ')"/>' +

      // 杯身上的小星
      '<path d="M60 38l4.4 9.3 10.1 1.2-7.5 7 2 10-9-5.3-9 5.3 2-10-7.5-7 10.1-1.2z" ' +
      'fill="#FFF7DA" opacity=".92"/>' +

      // 杯柄与底座
      '<path d="M54 86h12v16H54z" fill="url(#' + d + ')"/>' +
      '<rect x="42" y="100" width="36" height="12" rx="6" fill="url(#' + d + ')"/>' +
      '<rect x="32" y="112" width="56" height="15" rx="7" fill="url(#' + g + ')" ' +
      'stroke="rgba(255,248,214,.85)" stroke-width="1.4"/>' +
      '<rect x="38" y="116" width="44" height="3.4" rx="1.7" fill="rgba(255,255,255,.45)"/>' +
      '</svg>';
  }

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
      { opacity: 0, transform: 'scale(.7)' },
      { opacity: 1, transform: 'scale(1.06)', offset: 0.66 },
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
      { transform: 'scale(1.14,.82)' },
      { transform: 'scale(.94,1.08)', offset: 0.55 },
      { transform: 'scale(1)' }
    ], { duration: 240, easing: 'cubic-bezier(.34,1.56,.64,1)' });
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
        ctx.audio.play('lv15/' + key).then(step, step);
      }
      step();
    });
  }

  /* ---------------- 回顾用积木 / 鸟 ---------------- */

  function cube(size) {
    var node = el('span', 'l15-cube');
    if (size) node.style.setProperty('--c', size + 'px');
    return node;
  }

  function packTen(size) {
    var node = el('div', 'l15-pack');
    node.style.setProperty('--c', size + 'px');
    for (var i = 0; i < 10; i += 1) node.appendChild(cube());
    return node;
  }

  function slotGrid(total, cols, size, filled) {
    var grid = el('div', 'l15-slots');
    grid.style.setProperty('--c', size + 'px');
    grid.style.setProperty('--cols', String(cols));
    var rows = Math.ceil(total / cols);
    var slots = [];
    var cubes = [];
    for (var i = 0; i < total; i += 1) {
      var slot = el('span', 'l15-slot');
      slot.style.gridRow = String(rows - Math.floor(i / cols));
      slot.style.gridColumn = String((i % cols) + 1);
      if (i < filled) {
        var c = cube(size);
        slot.appendChild(c);
        cubes.push(c);
      }
      grid.appendChild(slot);
      slots.push(slot);
    }
    return { node: grid, slots: slots, cubes: cubes };
  }

  function tenFrame(cell, filled) {
    var box = el('div', 'tenframe');
    box.style.setProperty('--cell', cell + 'px');
    for (var i = 0; i < 10; i += 1) {
      var c = el('div', 'tf-cell');
      if (i < filled) {
        c.classList.add('is-on');
        c.appendChild(cube(Math.round(cell * 0.74)));
      }
      box.appendChild(c);
    }
    return box;
  }

  /* ---------------- 教学第一幕：三连回顾 ---------------- */

  function flashTen() {
    var box = el('div', 'l15-flash');
    var frame = tenFrame(30, 10);
    var ones = slotGrid(6, 3, 24, 6);
    box.appendChild(frame);
    box.appendChild(ones.node);
    return { node: box, play: function () { frame.classList.add('is-full'); } };
  }

  function flashAdd() {
    var box = el('div', 'l15-flash');
    var pile = el('div', 'l15-pile');
    pile.appendChild(packTen(14));
    var ones = slotGrid(5, 3, 17, 2);
    pile.appendChild(ones.node);
    box.appendChild(pile);

    return {
      node: box,
      play: function () {
        for (var i = 0; i < 3; i += 1) {
          var c = cube(17);
          ones.slots[2 + i].appendChild(c);
          animate(c, [
            { transform: 'translate(40px,-34px) scale(.6)', opacity: 0 },
            { transform: 'translate(0,0) scale(1.16,.74)', opacity: 1, offset: 0.7 },
            { transform: 'translate(0,0) scale(1)', opacity: 1 }
          ], { duration: 420, delay: i * 110, easing: 'cubic-bezier(.3,.72,.36,1)' });
        }
      }
    };
  }

  function flashSub() {
    var box = el('div', 'l15-flash');
    var pile = el('div', 'l15-pile');
    pile.appendChild(packTen(14));

    // 8 只鸟按「底行先排」摆好，飞走最后 5 只后剩下的 3 只仍贴着底线
    var flock = el('div', 'l15-flock');
    var rows = 2;
    var cols = 4;
    var birds = [];
    for (var i = 0; i < 8; i += 1) {
      var slot = el('span', 'l15-fslot');
      slot.style.gridRow = String(rows - Math.floor(i / cols));
      slot.style.gridColumn = String((i % cols) + 1);
      var b = el('span', 'l15-bird');
      b.innerHTML = ICONS.bird;
      slot.appendChild(b);
      flock.appendChild(slot);
      birds.push(b);
    }
    pile.appendChild(flock);
    box.appendChild(pile);

    return {
      node: box,
      play: function () {
        for (var k = 0; k < 5; k += 1) {
          var b = birds[3 + k];
          animate(b, [
            { transform: 'translate(0,0) scale(1)', opacity: 1 },
            { transform: 'translate(' + (-8 + k * 7) + 'px,-26px) scale(1.06)', opacity: 1, offset: 0.45 },
            { transform: 'translate(' + (-16 + k * 12) + 'px,-58px) scale(.6)', opacity: 0 }
          ], { duration: 460, delay: k * 70, easing: 'cubic-bezier(.32,.06,.62,1)' })
            .then(function () { b.style.visibility = 'hidden'; });
        }
      }
    };
  }

  async function sceneOne(host) {
    host.innerHTML = '';

    var stageBox = el('div', 'l15-recap');
    var flashes = [flashTen(), flashAdd(), flashSub()];
    flashes.forEach(function (f) {
      f.node.classList.add('is-hidden');
      stageBox.appendChild(f.node);
    });
    host.appendChild(stageBox);

    // You have learned so much! Tens and ones, adding, and taking away.
    var voice = saySeq(['t1_a']);

    for (var i = 0; i < flashes.length; i += 1) {
      if (!alive) return;
      flashes[i].node.classList.remove('is-hidden', 'is-out');
      popIn(flashes[i].node);
      flashes[i].play();
      await sleep(1500);
      if (!alive) return;
      if (i < flashes.length - 1) {
        flashes[i].node.classList.add('is-out');
        await sleep(220);
        flashes[i].node.classList.add('is-hidden');
      }
    }

    await voice;
    if (!alive) return;

    await sleep(1000);                      // 教学节拍：停 1 秒
    if (!alive) return;

    // Are you ready for the final challenge of this stage?
    await saySeq(['t1_b']);
    if (!alive) return;

    await sleep(1000);                      // 问句后停 1 秒再自答（§6.1）
    if (!alive) return;

    // Yes! Let's go!
    var go = saySeq(['t1_c']);
    flashes[2].node.classList.add('is-go');
    await go;
    if (!alive) return;

    await sleep(300);
  }

  /* ---------------- 教学第二幕：二阶奖杯 ---------------- */

  async function sceneTwo(host) {
    host.innerHTML = '';

    var box = el('div', 'l15-prize');
    var art = el('div', 'l15-trophy l15-trophy--preview');
    art.innerHTML = trophySVG('pv');
    var ribbon = el('div', 'l15-ribbon', 'STAGE 2');
    box.appendChild(art);
    box.appendChild(ribbon);
    host.appendChild(box);

    popIn(art);
    popIn(ribbon, 160);
    await sleep(560);
    if (!alive) return;

    // This is the stage two trophy.
    await saySeq(['t2_a']);
    if (!alive) return;

    await sleep(260);
    // Get all ten right, and it is yours!
    await saySeq(['t2_b']);
    if (!alive) return;

    await sleep(320);
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

  function keysRow(tray, options, onPick) {
    tray.innerHTML = '';
    options.forEach(function (value, i) {
      var key = el('button', 'l15-key');
      key.type = 'button';
      key.dataset.value = String(value);
      key.setAttribute('aria-label', String(value));
      key.appendChild(el('span', 'l15-key-digit', String(value)));
      key.addEventListener('click', function () { onPick(value, key); });
      popIn(key, i * 50);
      tray.appendChild(key);
    });
  }

  function opText(op) {
    return op === '+' ? '+' : '\u2212';
  }

  function valueOf(a, b, op) {
    return op === '+' ? a + b : a - b;
  }

  /* ---------------- 题型 1：听音点选 ---------------- */

  function buildTap(q, story, tray, state, correct, wrong) {
    var answer = valueOf(q.a, q.b, q.op);

    var row = el('div', 'l15-eq');
    row.appendChild(el('span', 'l15-tile', String(q.a)));
    row.appendChild(el('span', 'l15-op', opText(q.op)));
    row.appendChild(el('span', 'l15-tile', String(q.b)));
    row.appendChild(el('span', 'l15-op', '='));
    var res = el('span', 'l15-tile l15-tile--q', '?');
    row.appendChild(res);
    story.appendChild(row);
    popIn(row);

    var options = Engine.quiz.shuffle(q.options.slice());

    function paint() {
      keysRow(tray, options, function (value, key) {
        if (state.locked || state.busy) return;
        if (value === answer) {
          res.textContent = String(answer);
          res.classList.remove('l15-tile--q');
          res.classList.add('is-filled');
          correct(key);
          return;
        }
        wrong(key);
        later(function () {
          Engine.quiz.reshuffle(options, answer);
          state.busy = false;
          paint();
        }, 320);
      });
    }

    paint();
  }

  /* ---------------- 题型 2：看图拖拽（一捆十块 + n 块） ---------------- */

  function blockCard(ones) {
    var card = el('div', 'l15-blockcard');
    card.dataset.value = String(10 + ones);
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'one ten and ' + ones + ' ones');
    var pile = el('div', 'l15-pile');
    pile.appendChild(packTen(13));
    var grid = slotGrid(ones, ones > 4 ? 4 : 3, 16, ones);
    pile.appendChild(grid.node);
    card.appendChild(pile);
    return card;
  }

  function bindPair(source, targets, opts) {
    var ghost = null;
    var start = { x: 0, y: 0 };
    var origin = { x: 0, y: 0 };
    var moved = false;
    var detach = null;

    function onMove(e) {
      if (!moved) {
        if (Math.abs(e.clientX - start.x) <= TAP_SLOP && Math.abs(e.clientY - start.y) <= TAP_SLOP) return;
        moved = true;
        var r = source.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        ghost = source.cloneNode(true);
        ghost.classList.add('l15-ghost');
        ghost.style.left = e.clientX + 'px';
        ghost.style.top = e.clientY + 'px';
        document.body.appendChild(ghost);
        source.classList.add('is-dragging');
      }
      ghost.style.left = e.clientX + 'px';
      ghost.style.top = e.clientY + 'px';
    }

    function onUp(e) {
      if (detach) { detach(); detach = null; }
      if (!moved) {
        source.classList.toggle('is-armed');
        Engine.sfx.tap();
        return;
      }
      source.classList.remove('is-dragging');
      var hit = null;
      targets.forEach(function (t) {
        var b = t.getBoundingClientRect();
        if (!hit && e.clientX >= b.left - HIT_PAD && e.clientX <= b.right + HIT_PAD &&
            e.clientY >= b.top - HIT_PAD && e.clientY <= b.bottom + HIT_PAD) hit = t;
      });
      if (hit) {
        opts.resolve(hit, ghost, origin);
        ghost = null;
        return;
      }
      if (ghost) {
        var gb = ghost.getBoundingClientRect();
        var dx = origin.x - (gb.left + gb.width / 2);
        var dy = origin.y - (gb.top + gb.height / 2);
        var back = ghost.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + (dx * 0.55) + 'px,' + (dy * 0.55) + 'px) scale(.86)', opacity: 0.85, offset: 0.62 },
          { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.55)', opacity: 0 }
        ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' });
        back.finished.then(function () { remove(ghost); }, function () { remove(ghost); });
        ghost = null;
      }
      source.classList.remove('is-armed');
    }

    source.addEventListener('pointerdown', function (e) {
      if (!alive || opts.locked()) return;
      if (e.button != null && e.button !== 0) return;
      e.preventDefault();
      start = { x: e.clientX, y: e.clientY };
      moved = false;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
      detach = function () {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
      };
    });

    // 轻点兜底：先点积木（呼吸环）→ 再点数字卡
    targets.forEach(function (t) {
      t.addEventListener('pointerdown', function () {
        if (!alive || opts.locked()) return;
        if (!source.classList.contains('is-armed')) return;
        source.classList.remove('is-armed');
        opts.resolve(t, null, null);
      });
    });

    return function () {
      if (detach) { detach(); detach = null; }
      if (ghost) { remove(ghost); ghost = null; }
    };
  }

  function buildBlocks(q, story, tray, state, correct, wrong) {
    var answer = 10 + q.ones;

    var board = el('div', 'l15-board');
    var leftCol = el('div', 'l15-col l15-col--single');
    var card = blockCard(q.ones);
    leftCol.appendChild(card);
    board.appendChild(leftCol);

    var rightCol = el('div', 'l15-col');
    var nums = Engine.quiz.shuffle(q.options.slice());
    var targets = [];
    nums.forEach(function (v) {
      var t = el('div', 'l15-numcard');
      t.dataset.value = String(v);
      t.setAttribute('role', 'button');
      t.setAttribute('aria-label', String(v));
      t.appendChild(el('span', 'l15-num', String(v)));
      rightCol.appendChild(t);
      targets.push(t);
    });
    board.appendChild(rightCol);
    story.appendChild(board);
    popIn(board);

    function resolve(target, ghost, origin) {
      var ok = Number(target.dataset.value) === answer;

      if (ok) {
        state.done = true;                 // 挡住二次拖拽；真正的锁定交给 correct()
        Engine.audio.stop();
        if (ghost) {
          var gb = ghost.getBoundingClientRect();
          var tb = target.getBoundingClientRect();
          var dx = (tb.left + tb.width / 2) - (gb.left + gb.width / 2);
          var dy = (tb.top + tb.height / 2) - (gb.top + gb.height / 2);
          ghost.animate([
            { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
            { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.9)', opacity: 1 }
          ], { duration: 170, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' }).finished.then(function () {
            Engine.sfx.tap();
            snapPop(target);
            markDone(card, target);
            ghost.animate([
              { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.9)', opacity: 1 },
              { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(1.16,.84)', opacity: 1, offset: 0.45 },
              { transform: 'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.7)', opacity: 0 }
            ], { duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' })
              .finished.then(function () { remove(ghost); }, function () { remove(ghost); });
          }, function () { remove(ghost); });
        } else {
          Engine.sfx.tap();
          snapPop(target);
          markDone(card, target);
        }
        later(function () {
          Engine.sfx.correct();
          later(function () { Engine.sfx.star(); }, 90);
          burst(target);
        }, 120);
        correct(null);
        return;
      }

      if (state.busy) { if (ghost) remove(ghost); return; }
      state.busy = true;
      state.errors += 1;
      session.answer(false);
      Engine.sfx.wrong();
      shake(card);
      shake(target);
      target.classList.add('is-bad');
      later(function () { target.classList.remove('is-bad'); }, 560);
      if (ghost && origin) {
        var b = ghost.getBoundingClientRect();
        var bx = origin.x - (b.left + b.width / 2);
        var by = origin.y - (b.top + b.height / 2);
        ghost.animate([
          { transform: 'translate(-50%,-50%) translate(0,0) scale(1)', opacity: 1 },
          { transform: 'translate(-50%,-50%) translate(' + (bx * 0.55) + 'px,' + (by * 0.55) + 'px) scale(.86)', opacity: 0.85, offset: 0.62 },
          { transform: 'translate(-50%,-50%) translate(' + bx + 'px,' + by + 'px) scale(.55)', opacity: 0 }
        ], { duration: 320, easing: 'cubic-bezier(.34,1.1,.5,1)', fill: 'both' })
          .finished.then(function () { remove(ghost); }, function () { remove(ghost); });
      } else if (ghost) {
        remove(ghost);
      }
      if (state.errors === 1) {
        Engine.audio.stop();
        later(function () { ctx.audio.play('common/try_again'); }, 260);
      }
      later(function () { state.busy = false; }, 460);
    }

    bindPair(card, targets, {
      resolve: resolve,
      locked: function () { return state.locked || state.done; }
    });
  }

  function markDone(card, target) {
    card.classList.add('is-used');
    target.classList.add('is-matched');
    var badge = el('span', 'l15-check');
    badge.innerHTML = ICONS.check;
    target.appendChild(badge);
    popIn(badge, 40);
  }

  /* ---------------- 题型 3：找错误算式 ---------------- */

  function sentenceRow(entry) {
    var row = el('div', 'l15-sent');
    row.appendChild(el('span', 'l15-stile', String(entry.a)));
    row.appendChild(el('span', 'l15-sop', opText(entry.op)));
    row.appendChild(el('span', 'l15-stile', String(entry.b)));
    row.appendChild(el('span', 'l15-sop', '='));
    var res = el('span', 'l15-stile l15-stile--res', String(entry.shown));
    row.appendChild(res);
    return { node: row, res: res };
  }

  function buildWrong(q, story, tray, state, correct, wrong) {
    var board = el('div', 'l15-sents');
    story.appendChild(board);

    var list = Engine.quiz.shuffle(q.sentences.map(function (s) {
      return { a: s.a, b: s.b, op: s.op, shown: s.shown };
    }));
    var keyOf = function (s) { return s.a + s.op + s.b + '=' + s.shown; };
    var bad = null;
    list.forEach(function (s) {
      if (valueOf(s.a, s.b, s.op) !== s.shown) bad = s;
    });

    function paint() {
      board.innerHTML = '';
      list.forEach(function (entry, i) {
        var card = el('button', 'l15-scard');
        card.type = 'button';
        card.dataset.key = keyOf(entry);
        card.setAttribute('aria-label',
          entry.a + (entry.op === '+' ? ' plus ' : ' minus ') + entry.b + ' equals ' + entry.shown);
        var s = sentenceRow(entry);
        card.appendChild(s.node);
        card._res = s.res;
        card.addEventListener('click', function () { pick(entry, card); });
        popIn(card, i * 70);
        board.appendChild(card);
      });
    }

    // 答对后把错的结果翻成正确答案（§6.11）
    function showFix(card, entry) {
      var trueVal = valueOf(entry.a, entry.b, entry.op);
      var res = card._res;
      res.classList.add('is-flip');
      later(function () {
        res.textContent = String(trueVal);
        res.classList.remove('is-flip');
        res.classList.add('is-fixed');
        var mark = el('span', 'l15-tick');
        mark.innerHTML = ICONS.check;
        card.appendChild(mark);
        popIn(mark);
        bounce(res);
      }, 260);
    }

    function pick(entry, card) {
      if (state.locked || state.busy) return;
      if (entry === bad) {
        correct(card, FIX_HOLD);
        showFix(card, entry);
        return;
      }
      wrong(card);
      later(function () {
        Engine.quiz.reshuffle(list, bad, keyOf);
        paint();
      }, 320);
    }

    paint();
  }

  /* ---------------- 答题 ---------------- */

  function askQuestion(root) {
    if (!alive) return;
    Engine.audio.stop();

    var q = queue[session.index];
    if (!q) return;

    root.innerHTML = '';
    Array.prototype.slice.call(document.querySelectorAll('.l15-ghost'))
      .forEach(function (n) { remove(n); });
    renderId += 1;

    var wrap = el('div', 'lv');
    var story = el('div', 'lv-story');
    var tray = el('div', 'lv-tray');
    wrap.appendChild(story);
    wrap.appendChild(tray);
    root.appendChild(wrap);

    makeReplay(story, q.voice);

    var state = { locked: false, busy: false, errors: 0 };

    function correct(node, holdMs) {
      if (state.locked) return;
      state.locked = true;
      Engine.audio.stop();
      if (node) node.classList.add('is-right');
      Engine.sfx.correct();
      later(function () { Engine.sfx.star(); }, 90);
      burst(story);

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
    else if (q.type === 'blocks') buildBlocks(q, story, tray, state, correct, wrong);
    else buildWrong(q, story, tray, state, correct, wrong);

    saySeq(q.voice);
  }

  /* ---------------- 二阶结业仪式（§6.13） ---------------- */

  var CONFETTI_COLORS = ['#F58FA0', '#FFC94F', '#7FC7E8', '#8FDCC4', '#C9A6F0', '#FF9E6B'];

  function confettiPiece(i) {
    var piece = el('i', 'l15-confetti-piece');
    var w = 6 + (i % 4) * 3;
    piece.style.setProperty('--x', (4 + (i * 37) % 92) + '%');
    piece.style.setProperty('--w', w + 'px');
    piece.style.setProperty('--h', (10 + (i % 3) * 5) + 'px');
    piece.style.setProperty('--c', CONFETTI_COLORS[i % CONFETTI_COLORS.length]);
    piece.style.setProperty('--dx', ((i % 7) - 3) * 22 + 'px');
    piece.style.setProperty('--spin', ((i % 5) - 2) * 220 + 'deg');
    piece.style.setProperty('--t', (2300 + (i % 6) * 260) + 'ms');
    piece.style.setProperty('--d', ((i % 9) * 90) + 'ms');
    return piece;
  }

  function ceremony(starVoice) {
    if (!alive || !currentRoot) return;
    var layer = el('div', 'l15-ceremony');

    var rays = el('div', 'l15-rays');
    var halo = el('div', 'l15-halo');
    var confetti = el('div', 'l15-confetti');
    for (var i = 0; i < CONFETTI; i += 1) confetti.appendChild(confettiPiece(i));

    var trophy = el('div', 'l15-trophy l15-trophy--final');
    trophy.innerHTML = trophySVG('fin');

    var ribbon = el('div', 'l15-ribbon l15-ribbon--final', 'STAGE 2');

    var sparkles = el('div', 'l15-sparkles');
    for (var k = 0; k < 6; k += 1) sparkles.appendChild(el('i', 'l15-spark l15-spark--' + k));

    var rings = el('div', 'l15-rings');
    rings.appendChild(el('span', 'l15-ring'));
    rings.appendChild(el('span', 'l15-ring l15-ring--b'));

    layer.appendChild(rays);
    layer.appendChild(halo);
    layer.appendChild(rings);
    layer.appendChild(confetti);
    layer.appendChild(trophy);
    layer.appendChild(sparkles);
    layer.appendChild(ribbon);
    document.body.appendChild(layer);

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      Engine.audio.stop();
      layer.classList.add('is-out');
      later(function () {
        remove(layer);
        addGradBadge();
      }, 420);
    }

    layer.addEventListener('pointerdown', function () {
      if (Date.now() - born < 1200) return;
      dismiss();
    });

    var born = Date.now();

    // 金句播完再报「结业」这一句，两句不叠（§6.7）
    Promise.resolve(starVoice).then(function () {
      if (!alive || dismissed) return null;
      return ctx.audio.play('lv15/win');
    }).then(function () {
      if (!alive || dismissed) return;
      later(dismiss, 900);
    }, function () { /* 忽略 */ });
  }

  function addGradBadge() {
    if (!currentRoot) return;
    var result = currentRoot.querySelector('.result');
    if (!result) return;
    if (result.querySelector('.l15-grad')) return;
    var badge = el('div', 'l15-grad');
    var icon = el('span', 'l15-grad-cup');
    icon.innerHTML = trophySVG('badge');
    badge.appendChild(icon);
    badge.appendChild(el('span', 'l15-grad-text', 'STAGE 2'));
    var actions = result.querySelector('.result-actions');
    if (actions) result.insertBefore(badge, actions);
    else result.appendChild(badge);
    popIn(badge);
  }

  /* ---------------- 结算 ---------------- */

  function finish(star) {
    Engine.audio.stop();
    ctx.complete(star);
    if (!currentRoot) return;

    var starVoice = null;
    LevelKit.showResult(currentRoot, star, {
      onReplay: function () { ctx.restart(); },
      onHome: function () { ctx.exit(); },
      play: function (key) { starVoice = ctx.audio.play(key); }
    });

    if (star === 'gold') {
      later(function () { ceremony(starVoice); }, 520);
    }
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
    Array.prototype.slice
      .call(document.querySelectorAll('.l15-ghost, .l15-ceremony'))
      .forEach(function (n) { remove(n); });
    if (stage) stage.innerHTML = '';
    stage = null;
    ctx = null;
    currentRoot = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[15] = {
    mount: mount,
    current: function () { return session && queue[session.index] ? queue[session.index] : null; },
    render: function () { return renderId; }
  };
})(window);
