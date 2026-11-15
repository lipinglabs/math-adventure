/* ============================================================
   cd-type-judge.js · 判断家族 + 串联槽
   ------------------------------------------------------------
   T5  两种数法   横着点一遍、竖着点一遍，两遍都报累计
   T6  试摆一下   选完系统真摆一遍；答错不判错，只是「再看一次」
   T7a 哪一堆是我  三选一，认符合题干的那一堆
   T7b 同数不同角色 三选一，同一数字在两句问话里角色不同
   T7c 一样多吗    两选一；只记录，不判对错
   T8  盖住一份    布盖住答案位，问被盖住的；掀布验证
   serial 串联    摆→打散→分 / 分→合并→摆；节点数不增不减

   判断型槽的铁律：选项必须是「真画出来的数量」，
   不得用数字字形，不得靠颜色或花纹区分（§2.9）。
   ============================================================ */

(function (global) {
  'use strict';

  var K = global.CDKit;
  if (!K) return;
  var U = K.api;
  var A = U.art;

  function numKey(v) {
    var s = v < 10 ? '0' + v : String(v);
    return 'common/num_' + s;
  }

  /* ---------------- 选项卡：真数量 ---------------- */

  /**
   * @param opt { groups:[3,2] }  若干个堆，每堆几个
   *        { containers:4, kind:'box_m' }  n 个容器
   *        { rows:4, per:3 }  方阵
   */
  function optionCard(opt) {
    var card = U.el('div', 'cd-card');
    var body = U.el('div', 'cd-card-body');

    if (opt.containers) {
      var row = U.el('div', 'cd-card-boxes');
      for (var i = 0; i < opt.containers; i += 1) {
        row.appendChild(A.node(opt.kind || 'box_m', { size: opt.containers > 4 ? 26 : 32 }));
      }
      body.appendChild(row);
    } else if (opt.rows) {
      var grid = U.el('div', 'cd-card-grid');
      for (var r = 0; r < opt.rows; r += 1) {
        var line = U.el('div', 'cd-card-line');
        for (var c = 0; c < opt.per; c += 1) {
          line.appendChild(A.node(opt.item || 'bun', { size: 17 }));
        }
        grid.appendChild(line);
      }
      body.appendChild(grid);
    } else {
      var groups = opt.groups || [opt.n || 1];
      var wrap = U.el('div', 'cd-card-groups');
      groups.forEach(function (n) {
        var pile = U.el('div', 'cd-card-pile');
        var cols = n <= 3 ? n : (n === 4 ? 2 : 5);
        var rows = Math.ceil(n / cols);
        var sz = n <= 4 ? 26 : (n <= 6 ? 22 : (n <= 9 ? 18 : 14));
        pile.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
        for (var k = 0; k < n; k += 1) {
          pile.appendChild(A.node(opt.item || 'bun', { size: sz }));
        }
        wrap.appendChild(pile);
      });
      body.appendChild(wrap);
    }

    card.appendChild(body);
    return card;
  }

  /**
   * 三选一（或两选一）。第一次点击即记录 chosen；
   * 答错允许再选，但 correct 以第一次为准（诊断价值在第一次判断）。
   */
  function pickOne(opts) {
    var board = U.board();
    var wrap = U.el('div', 'cd-cards' + (opts.options.length <= 2 ? ' cd-cards--two' : ''));
    board.appendChild(wrap);

    var cards = opts.options.map(function (opt, i) {
      var c = optionCard(opt);
      c.setAttribute('data-opt', String(i));
      c.addEventListener('click', function () { onPick(i); });
      wrap.appendChild(c);
      return c;
    });

    var first = null;
    var locked = false;
    var resolve = null;
    var promise = new Promise(function (res) { resolve = res; });

    function onPick(i) {
      if (locked) return;
      if (first == null) first = i;
      U.sfx('tap');
      if (i === opts.answer) {
        locked = true;
        cards.forEach(function (c, k) {
          c.classList.remove('is-try');
          c.classList.toggle('is-right', k === i);
        });
        U.sfx('chime');
        U.later(function () { resolve(first); }, 520);
        return;
      }
      // 答错：轻摇 + 记一次尝试，不锁死，可以再选
      var c = cards[i];
      c.classList.add('is-try');
      c.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-6px)' },
        { transform: 'translateX(5px)' },
        { transform: 'translateX(0)' }
      ], { duration: 320, easing: 'ease-in-out' });
      if (opts.onWrong) opts.onWrong(i);
    }

    if (opts.demo) {
      locked = true;
      U.later(function () {
        cards.forEach(function (c, k) {
          c.classList.toggle('is-right', k === opts.answer);
        });
        U.sfx('chime');
        U.later(function () { resolve(opts.answer); }, 700);
      }, 500);
    }

    return { promise: promise, cards: cards, wrap: wrap, firstOf: function () { return first; } };
  }

  /* ---------------- T5 两种数法 ---------------- */

  function T5(slot) {
    var board = U.board();
    var dock = U.dock();
    var rows = slot.a;
    var per = slot.b;
    var item = slot.item || 'bun';

    var wrap = U.el('div', 'cd-sweep');
    board.appendChild(wrap);
    var grid = U.el('div', 'cd-sweep-grid');
    grid.style.gridTemplateColumns = 'repeat(' + per + ', auto)';
    wrap.appendChild(grid);

    var cells = [];
    var rowEls = [], colEls = [];
    var i, j;

    // 格宽按可用宽度算满：4 列时 ≈76，5 列时 ≈60；不要固定小尺寸，否则整块缩在中间
    var boardW = board.clientWidth || 354;
    var cellW = Math.max(44, Math.min(76, Math.floor((boardW - 30 - 6 * (per - 1)) / per)));
    var bunSize = Math.max(26, cellW - 18);

    for (i = 0; i < rows; i += 1) {
      rowEls.push([]);
      for (j = 0; j < per; j += 1) {
        var cell = U.el('div', 'cd-sweep-cell');
        cell.style.width = cellW + 'px';
        cell.style.height = cellW + 'px';
        cell.appendChild(A.node(item, { size: bunSize }));
        grid.appendChild(cell);
        cells.push(cell);
        rowEls[i].push(cell);
      }
    }
    for (j = 0; j < per; j += 1) {
      colEls.push([]);
      for (i = 0; i < rows; i += 1) colEls[j].push(rowEls[i][j]);
    }

    var phase = 'row';       // row → col
    var step = 0;
    var announced = 0;
    var rowTaps = 0, colTaps = 0, rowLast = 0, colLast = 0;
    var finished = false;
    var resolve = null;
    var promise = new Promise(function (res) { resolve = res; });
    var btn = null;

    var guide = U.el('div', 'cd-sweep-guide');
    guide.innerHTML = '<span class="cd-guide-bar is-row"></span>';
    wrap.appendChild(guide);

    function finishAll() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      U.recBuilt2({
        type: 'T5',
        rowsTapped: rowTaps,
        colsTapped: colTaps,
        rowLast: rowLast,
        colLast: colLast,
        rows: rows,
        perRow: per
      });
      resolve();
    }

    function tapNext() {
      if (finished) return Promise.resolve();
      var group = phase === 'row' ? rowEls : colEls;
      var idx = step;
      if (idx >= group.length) return Promise.resolve();

      group[idx].forEach(function (c) { c.classList.add('is-lit'); });
      step += 1;
      if (phase === 'row') { rowTaps = step; rowLast = step * per; announced = rowLast; }
      else { colTaps = step; colLast = step * rows; announced = colLast; }
      U.sfx('pop');
      U.say(numKey(announced));

      return U.sleep(360).then(function () {
        if (step >= group.length) {
          if (phase === 'row') {
            phase = 'col';
            step = 0;
            guide.innerHTML = '<span class="cd-guide-bar is-col"></span>';
            rowEls.forEach(function (line) { line.forEach(function (c) { c.classList.remove('is-lit'); }); });
            return U.sleep(420);
          }
          finishAll();
        }
        return null;
      });
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        // 横数 rows 次，竖数 per 次
        for (var n = 0; n < rows + per; n += 1) {
          (function (n) {
            chain = chain.then(function () {
              return U.say(lines[Math.min(n, lines.length - 1)] || slot.q);
            }).then(function () { return tapNext(); });
          })(n);
        }
        return chain.then(function () { return U.sleep(240); });
      })();
    }

    btn = U.mainButton('next', 'Count this way', function () { return tapNext(); });
    dock.appendChild(btn);

    return promise;
  }

  /* ---------------- T6 试摆一下 ---------------- */

  function T6(slot) {
    var board = U.board();
    var dock = U.dock();
    var item = slot.item || 'bun';
    var container = slot.container || 'box_m';

    var q = U.el('div', 'cd-question');
    q.innerHTML = '<span class="cd-q-mark">?</span>';
    board.appendChild(q);

    var picked = pickOne({
      options: slot.options,
      answer: slot.answer,
      demo: slot.demo
    });

    return picked.promise.then(function (chosen) {
      var chosenOpt = slot.options[chosen] || {};
      // 答错不判错：只说「再看一次」，然后真的摆一遍
      U.recJudged({ chosen: describe(chosenOpt), answerIndex: slot.answer }, null);
      return U.say(slot.after || '').then(function () {
        return showIt(chosenOpt);
      });
    });

    function describe(o) {
      if (o.containers) return o.containers + ' containers';
      if (o.rows) return o.rows + ' rows of ' + o.per;
      if (o.groups) return o.groups.join('+');
      return String(o.n || '');
    }

    /** 系统真摆/真装一遍（这是 T6 的全部意义） */
    function showIt(o) {
      U.clearBoard();
      var f = new U.Field(U.board());
      var n = o.containers || o.rows || (o.groups || []).length || 1;
      var per = o.per || (o.groups && o.groups[0]) || 2;
      var lay = U.layoutBoxes(n, container, U.board());
      var boxes = lay.seats.map(function (s) { return f.box(container, s.x, s.y, s.w, s.h); });
      var size = per >= 5 ? 18 : 22;
      var chain = Promise.resolve();
      for (var bi = 0; bi < n; bi += 1) {
        (function (bi) {
          chain = chain.then(function () {
            for (var k = 0; k < per; k += 1) {
              var t = f.token(item, size);
              var pos = f.inBox(bi, k, per, size);
              f.place(t, pos.x, pos.y - 50);
              t.el.style.opacity = '0';
              (function (t, pos, k) {
                U.later(function () {
                  t.el.style.opacity = '1';
                  f.fly(t, pos.x, pos.y, 340, 20);
                }, k * 40);
              })(t, pos, k);
            }
            boxes[bi].el.classList.remove('is-empty');
            U.sfx('pop');
            return U.sleep(340);
          });
        })(bi);
      }
      return chain.then(function () {
        boxes.forEach(function (b) { b.el.classList.add('is-settled'); });
        return U.sleep(420);
      });
    }
  }

  /* ---------------- T7a / T7b 三选一 ---------------- */

  function T7(slot) {
    var board = U.board();
    var q = U.el('div', 'cd-question');
    q.innerHTML = '<span class="cd-q-mark">?</span>';
    board.appendChild(q);

    var picked = pickOne({
      options: slot.options,
      answer: slot.answer,
      demo: slot.demo
    });

    return picked.promise.then(function () {
      // 示范幕（幕 2）不是孩子做的，不能进判定——否则示范一次就把星打成银的
      if (slot.demo) {
        U.recJudged({ chosen: 'demo', answerIndex: slot.answer, attempts: 1 }, null, true);
        return U.sleep(300);
      }
      var first = picked.firstOf();
      U.recJudged({
        chosen: first,
        chosenDesc: describe(slot.options[first]),
        answerIndex: slot.answer,
        attempts: first === slot.answer ? 1 : 2
      }, first === slot.answer);
      return U.sleep(360);
    });

    function describe(o) {
      if (!o) return '';
      if (o.containers) return o.containers + ' containers';
      if (o.groups) return o.groups.join('+');
      if (o.rows) return o.rows + 'x' + o.per;
      return String(o.n || '');
    }
  }

  /* ---------------- T7c 一样多吗 ---------------- */

  function T7c(slot) {
    var board = U.board();
    var dock = U.dock();
    var groups = slot.groups.slice();     // [3,3] / [4,2] / [3,4,3]
    var item = slot.item || 'bun';
    var same = !!slot.same;

    var wrap = U.el('div', 'cd-same');
    board.appendChild(wrap);

    var piles = groups.map(function (n) {
      var box = U.el('div', 'cd-same-pile');
      var inner = U.el('div', 'cd-same-inner');
      inner.style.gridTemplateColumns = 'repeat(' + (n <= 3 ? n : 3) + ', auto)';
      for (var k = 0; k < n; k += 1) inner.appendChild(A.node(item, { size: 28 }));
      box.appendChild(inner);
      if (slot.container) {
        var ring = U.el('div', 'cd-same-ring');
        ring.appendChild(A.node(slot.container, { size: 116 }));
        box.appendChild(ring);
      }
      wrap.appendChild(box);
      return box;
    });

    var lock = false;
    var resolve = null;
    var promise = new Promise(function (res) { resolve = res; });

    function answer(v) {
      if (lock) return;
      lock = true;
      U.sfx('tap');
      // 只记录、不判对错（T7c 的 correct 恒为 null）
      U.recJudged({ chosen: v ? 'same' : 'not-same', groups: groups }, null, true);
      piles.forEach(function (p) { p.classList.add('is-reveal'); });
      U.sfx('chime');
      U.later(function () { resolve(); }, 620);
    }

    var b1 = U.el('button', 'cd-choice');
    b1.type = 'button';
    b1.setAttribute('aria-label', 'Same on each');
    b1.innerHTML =
      '<svg viewBox="0 0 100 60" aria-hidden="true">' +
      '<circle cx="26" cy="20" r="8" fill="#8FC9A6"/><circle cx="26" cy="40" r="8" fill="#8FC9A6"/>' +
      '<circle cx="74" cy="20" r="8" fill="#8FC9A6"/><circle cx="74" cy="40" r="8" fill="#8FC9A6"/>' +
      '<path d="M34 30h32" stroke="#6FAE88" stroke-width="4" stroke-linecap="round" stroke-dasharray="6 6"/>' +
      '</svg>';
    b1.addEventListener('click', function () { answer(true); });

    var b2 = U.el('button', 'cd-choice');
    b2.type = 'button';
    b2.setAttribute('aria-label', 'Not the same');
    b2.innerHTML =
      '<svg viewBox="0 0 100 60" aria-hidden="true">' +
      '<circle cx="26" cy="20" r="8" fill="#E8A0A6"/><circle cx="26" cy="40" r="8" fill="#E8A0A6"/>' +
      '<circle cx="74" cy="30" r="8" fill="#E8A0A6"/>' +
      '<path d="M34 30h30" stroke="#C87F87" stroke-width="4" stroke-linecap="round"/>' +
      '</svg>';
    b2.addEventListener('click', function () { answer(false); });

    dock.appendChild(b1);
    dock.appendChild(b2);

    if (slot.demo) {
      return U.say(slot.demoLine || '').then(function () {
        piles.forEach(function (p) { p.classList.add('is-reveal'); });
        return U.sleep(600);
      }).then(function () {
        U.recJudged({ chosen: 'demo', groups: groups }, null, true);
        return null;
      });
    }

    return promise;
  }

  /* ---------------- T8 盖住一份 ---------------- */

  function T8(slot) {
    var board = U.board();
    var a = slot.a;                 // 组数 / 行数 / 盘数
    var per = slot.b;               // 每组数
    var item = slot.item || 'bun';
    var hide = slot.hide || 'total';
    var container = slot.container || 'plate';

    // 盖布槽专用排布：上面是证据（一堆堆），中间是被布盖住的答案位，下面是选项卡。
    // 不加这个类，选项卡会整块盖在证据上（inset:0 居中），孩子根本看不到几堆几个。
    board.classList.add('cd-board--hide');

    var wrap = U.el('div', 'cd-hide');
    board.appendChild(wrap);

    var stage = U.el('div', 'cd-hide-stage');
    wrap.appendChild(stage);

    // 依据区：一定要留下可数的东西，否则这题不可解
    if (hide === 'per') {
      // 顶部散放总数（可数）+ 下面 a 个容器（内容被布盖住）
      var totalPile = U.el('div', 'cd-hide-total');
      totalPile.style.gridTemplateColumns = 'repeat(' + (a * per <= 6 ? a * per : 5) + ', auto)';
      for (var i0 = 0; i0 < a * per; i0 += 1) totalPile.appendChild(A.node(item, { size: 15 }));
      stage.appendChild(totalPile);
    }

    var row = U.el('div', 'cd-hide-row');
    row.style.gridTemplateColumns = 'repeat(' + (a <= 3 ? a : Math.ceil(a / 2)) + ', auto)';
    stage.appendChild(row);

    var units = [];
    for (var i = 1; i <= a; i += 1) {
      var u = U.el('div', 'cd-hide-unit');
      var inner = U.el('div', 'cd-hide-inner');
      var cols = per <= 3 ? per : (per === 4 ? 2 : 3);
      inner.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
      for (var k = 0; k < per; k += 1) inner.appendChild(A.node(item, { size: per >= 5 ? 15 : 17 }));
      u.appendChild(inner);
      var ring = U.el('div', 'cd-hide-ring');
      ring.appendChild(A.node(container, { size: a >= 5 ? 62 : 74 }));
      u.appendChild(ring);
      row.appendChild(u);
      units.push(u);
    }

    // 布：盖在答案位（下方一条），落下时有「咚」声
    var cloth = U.el('div', 'cd-cloth');
    cloth.innerHTML = A.svg(
      '<path d="M6 22h88v40c-8 5-16-3-25 1s-17 4-25 0-16 4-24 1-10 2-14 1z" fill="#DC9A9A"/>' +
      '<path d="M6 22h88v9H6z" fill="#C98484"/>' +
      '<path d="M24 22v42M50 22v43M76 22v42M6 40h88M6 54h88" stroke="#F6E7E4" stroke-width="2" opacity=".8"/>'
    );
    wrap.appendChild(cloth);

    var q = U.el('div', 'cd-question');
    q.innerHTML = '<span class="cd-q-mark">?</span>';
    board.appendChild(q);

    return U.sleep(140).then(function () {
      cloth.classList.add('is-down');
      U.sfx('thud');
      return U.sleep(520);
    }).then(function () {
      var picked = pickOne({
        options: slot.options,
        answer: slot.answer,
        demo: slot.demo
      });
      return picked.promise.then(function () {
        var first = picked.firstOf();
        U.recJudged({
          chosen: first,
          hide: hide,
          answerIndex: slot.answer,
          attempts: first === slot.answer ? 1 : 2
        }, first === slot.answer);
        // 掀布验证：布抬起，露出这堆东西合并后的样子
        return reveal();
      });
    });

    function reveal() {
      cloth.classList.add('is-up');
      U.sfx('whoosh');
      if (hide === 'total') {
        var all = U.el('div', 'cd-hide-reveal');
        all.style.gridTemplateColumns = 'repeat(' + (a * per <= 5 ? a * per : 5) + ', auto)';
        for (var i = 0; i < a * per; i += 1) all.appendChild(A.node(item, { size: 13 }));
        stage.appendChild(all);
        U.popIn(all, '', { from: .9, dur: 420, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      } else {
        units.forEach(function (u) { u.classList.add('is-open'); });
      }
      return U.sleep(760);
    }
  }

  /* ---------------- 串联槽 ---------------- */

  function Serial(slot) {
    var board = U.board();
    var dock = U.dock();
    var a = slot.a;
    var per = slot.b;
    var total = a * per;
    var item = slot.item || 'bun';
    var container = slot.container || 'plate';
    var mode = slot.mode || 'T1->T4';       // 或 'T4->T1'
    var size = per >= 5 ? 19 : 22;

    var f = new U.Field(board);
    U.state.field = f;
    var W = board.clientWidth || 354;
    var H = board.clientHeight || 300;

    // 三套坐标：组位 / 中央堆 / 盘位
    var groupSeats = (function () {
      var seats = [];
      var cols = a <= 3 ? a : (a === 4 ? 2 : 3);
      var rows = Math.ceil(a / cols);
      var bw = Math.min(88, (W - (cols - 1) * 24) / cols);
      var gh = Math.min(72, H * 0.24);
      for (var i = 0; i < a; i += 1) {
        var r = Math.floor(i / cols), c = i % cols;
        var inRow = (r === rows - 1 && a % cols) ? (a % cols) : cols;
        var rowW = inRow * bw + (inRow - 1) * 24;
        seats.push({
          x: (W - rowW) / 2 + c * (bw + 24),
          y: H * 0.08 + r * (gh + 16),
          w: bw, h: gh
        });
      }
      return seats;
    })();

    var lay = U.layoutBoxes(a, container, board);
    var boxSeats = lay.seats;

    var midArea = { x: W * 0.08, y: H * 0.34, w: W * 0.84, h: H * 0.26 };

    // 组内第 k 个的坐标
    function groupPos(gi, k) {
      var s = groupSeats[gi];
      var cols = per <= 3 ? per : (per === 4 ? 2 : 3);
      var rows = Math.ceil(per / cols);
      var gap = per >= 5 ? 1 : 2;
      var sx = (s.w - cols * size - (cols - 1) * gap) / 2;
      var sy = (s.h - rows * size - (rows - 1) * gap) / 2;
      var r = Math.floor(k / cols), c = k % cols;
      return { x: s.x + sx + c * (size + gap), y: s.y + sy + r * (size + gap) };
    }

    function midPos(i) {
      return f.scatter(i, total, size, midArea);
    }

    // 建全部 token（从头到尾就这些，一个不多一个不少）
    var tokens = [];
    for (var i = 0; i < total; i += 1) {
      var t = f.token(item, size);
      tokens.push(t);
    }

    var boxes = [];
    var seg = 0;                 // 段内步数
    var phase = mode === 'T1->T4' ? 'build' : 'share';
    var built = 0;
    var shared = 0;
    var finished = false;
    var resolve = null;
    var promise = new Promise(function (res) { resolve = res; });
    var btn = null;

    function finish() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      U.recBuilt({
        type: 'serial',
        mode: mode,
        groups: a,
        per: per,
        steps: a + per
      });
      resolve();
    }

    function placeAllIdle() {
      // 初始状态
      if (mode === 'T1->T4') {
        tokens.forEach(function (t) {
          var p = midPos(tokens.indexOf(t));
          f.place(t, p.x, p.y);
          t.el.style.opacity = '0';
        });
        tokens.forEach(function (t, k2) {
          U.later(function () { t.el.style.opacity = '1'; }, k2 * 20);
        });
      } else {
        // 已经分好：a 盘各 b 个
        // 先把盒子建出来，再算 inBox —— 顺序反了会取到 undefined 的盒子，整关静默挂掉
        boxes = boxSeats.map(function (s) {
          var b = f.box(container, s.x, s.y, s.w, s.h);
          b.el.classList.add('is-filled');
          return b;
        });
        tokens.forEach(function (t, k2) {
          var bi = Math.floor(k2 / per);
          var pos = f.inBox(bi, k2 % per, per, size);
          f.place(t, pos.x, pos.y);
          t.el.style.opacity = '0';
        });
        tokens.forEach(function (t, k2) {
          U.later(function () { t.el.style.opacity = '1'; }, k2 * 18);
        });
        U.later(function () { U.sfx('pop'); }, 120);
      }
    }

    /** 1 秒打散/合并：同一批节点只改 transform，禁 fade */
    function scatterToMid() {
      var jobs = tokens.map(function (t, k2) {
        var p = midPos(k2);
        return f.fly(t, p.x, p.y, 1000, 18);
      });
      U.sfx('whoosh');
      boxes.forEach(function (b) { b.el.classList.add('is-empty'); });
      return Promise.all(jobs).then(function () { return U.sleep(120); });
    }

    function mergeToBoxes() {
      boxes = boxSeats.map(function (s) {
        var b = f.box(container, s.x, s.y, s.w, s.h);
        b.el.classList.add('is-empty');
        return b;
      });
      return U.sleep(80);
    }

    function buildStep() {
      if (built >= a) return Promise.resolve();
      var gi = built;
      var jobs = [];
      for (var k = 0; k < per; k += 1) {
        var t = tokens[gi * per + k];
        var pos = groupPos(gi, k);
        jobs.push(f.fly(t, pos.x, pos.y, 420, 20 + k * 3));
      }
      built += 1;
      U.sfx('pop');
      return Promise.all(jobs).then(function () { return U.sleep(140); });
    }

    function shareStep() {
      if (shared >= per) return Promise.resolve();
      var rd = shared;
      var jobs = [];
      for (var bi = 0; bi < a; bi += 1) {
        var t = tokens[rd * a + bi];
        if (!t) continue;
        var pos = f.inBox(bi, rd, per, size);
        jobs.push(f.fly(t, pos.x, pos.y, 420, 26));
      }
      shared += 1;
      U.sfx('pop');
      return Promise.all(jobs).then(function () { return U.sleep(160); });
    }

    function step() {
      if (phase === 'build') {
        return buildStep().then(function () {
          if (built >= a) {
            // 摆完：1 秒打散 → 进入分发
            return U.sleep(360).then(function () {
              U.say(slot.midLine || '');
              return scatterToMid();
            }).then(function () {
              return mergeToBoxes();
            }).then(function () {
              phase = 'share';
              seg = 0;
              setBtn('round');
              return U.sleep(260);
            });
          }
          return null;
        });
      }
      return shareStep().then(function () {
        if (shared >= per) finish();
        return null;
      });
    }

    function setBtn(kind) {
      if (!btn) return;
      btn.innerHTML = A.button(kind);
    }

    if (slot.demo) {
      return (function () {
        placeAllIdle();
        var lines = slot.lines || [];
        var chain = U.sleep(300);
        var n = 0;
        if (mode === 'T1->T4') {
          for (var b1 = 0; b1 < a; b1 += 1) {
            (function (b1) {
              chain = chain.then(function () { return U.say(lines[n++] || ''); })
                .then(function () { return buildStep(); });
            })(b1);
          }
          chain = chain.then(function () { return U.sleep(300); })
            .then(function () { return U.say(lines[n++] || ''); })
            .then(function () { return scatterToMid(); })
            .then(function () { return mergeToBoxes(); })
            .then(function () { phase = 'share'; return U.sleep(200); });
          for (var s1 = 0; s1 < per; s1 += 1) {
            (function (s1) {
              chain = chain.then(function () { return U.say(lines[n++] || ''); })
                .then(function () { return shareStep(); });
            })(s1);
          }
        } else {
          chain = chain.then(function () { return U.say(lines[n++] || ''); })
            .then(function () { return scatterToMid(); })
            .then(function () { return U.sleep(200); });
          for (var b2 = 0; b2 < a; b2 += 1) {
            (function (b2) {
              chain = chain.then(function () { return U.say(lines[n++] || ''); })
                .then(function () { return buildStep(); });
            })(b2);
          }
        }
        return chain.then(function () { return U.sleep(300); });
      })();
    }

    placeAllIdle();
    btn = U.mainButton(mode === 'T1->T4' ? 'grow' : 'round',
      mode === 'T1->T4' ? 'Make one more group' : 'Give one to each',
      function () { return step(); });
    dock.appendChild(btn);

    return promise;
  }

  K.reg('T5', T5);
  K.reg('T6', T6);
  K.reg('T7a', T7);
  K.reg('T7b', T7);
  K.reg('T7c', T7c);
  K.reg('T8', T8);
  K.reg('serial', Serial);
})(window);
