/* ============================================================
   cd-type-give.js · 「发」家族
   ------------------------------------------------------------
   T4a 发一轮     点一下，每个容器同时 +1；资源耗尽自动停
   T4b 发到发不动  同上，末轮不够发全时按钮变灰，剩 1 个停到桌角小碟
   T4d 补一个     系统已发好但故意不匀，手里剩 1 个，点容器移过去

   三条不能违反的：
   · 发一轮是「每盘同时 +1」，不是「逐个点实物」——步数 = 轮数
   · 建模型槽没有数字键、没有确认键、没有对错反馈
   · T4d 点错不判错：停在半路 + 盘轻亮，可以再点
   ============================================================ */

(function (global) {
  'use strict';

  var K = global.CDKit;
  if (!K) return;
  var U = K.api;
  var A = U.art;

  function inSize(per) {
    if (per <= 3) return 28;
    if (per === 4) return 25;
    return 22;
  }

  function pileSize(total) {
    if (total <= 8) return 30;
    if (total <= 12) return 27;
    if (total <= 16) return 24;
    return 20;
  }

  /** 建舞台：上方散堆 + 下方容器。返回可复用的句柄。 */
  function stage(slot, opts) {
    opts = opts || {};
    var board = U.board();
    var f = new U.Field(board);
    U.state.field = f;

    var n = slot.a;
    var per = slot.b;
    var total = slot.total == null ? n * per : slot.total;
    var size = Math.min(pileSize(total), inSize(per));
    var lay = U.layoutBoxes(n, slot.container || 'plate', board);

    var boxes = lay.seats.map(function (s) {
      return f.box(slot.container || 'plate', s.x, s.y, s.w, s.h);
    });
    // 发下去的东西要装得进盘子/盒子：尺寸按容器内腔收
    size = f.fitSize(0, per, size);

    // 堆只紧贴容器上方一条带（不铺满整块板），否则食物会飘到标题栏下面
    var plateTop = lay.seats[0] ? lay.seats[0].y : (board.clientHeight || 300) * 0.52;
    var cols0 = total <= 4 ? total : (total <= 8 ? 4 : (total <= 12 ? 5 : 6));
    var rows0 = Math.max(1, Math.ceil(total / Math.max(1, cols0)));
    var bandH = Math.min(plateTop - 12, rows0 * size + (rows0 - 1) * 8 + 14);
    var pileArea = {
      x: 0,
      y: Math.max(4, plateTop - bandH - 26),
      w: board.clientWidth || 354,
      h: bandH
    };

    var tokens = [];
    for (var i = 0; i < total; i += 1) {
      var t = f.token(slot.item || 'bun', size);
      var p = f.scatter(i, total, size, pileArea);
      f.place(t, p.x, p.y);
      t.el.style.opacity = '0';
      U.popIn(t.el, t.el.style.transform, { from: .6, dur: 300, delay: i * 26 });
      tokens.push(t);
    }

    if (lay.rail) U.countRail(board, n, 0);

    return {
      field: f, boxes: boxes, tokens: tokens, lay: lay,
      total: total, per: per, size: size
    };
  }

  /* ---------------- T4a ---------------- */

  function T4a(slot) {
    var st = stage(slot);
    var board = U.board();
    var dock = U.dock();
    var per = st.per;
    var n = slot.a;
    var round = 0;
    var used = 0;              // 已从堆里取走的个数
    var done = false;
    var btn = null;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });

    /** 发满就结束：判定点 = 动作在什么时候停止，不需要确认键 */
    function finish() {
      if (!doneResolve) return;
      var r = doneResolve;
      doneResolve = null;
      r();
    }

    var tag = U.el('div', 'cd-hint cd-hint--round');
    tag.innerHTML = '<span class="cd-hint-ico">' + A.button('round') + '</span>';
    board.appendChild(tag);

    function paintBoxes() {
      // 每盘里已有几个：由 token 的 box 归属决定
      st.boxes.forEach(function (b, bi) {
        var cnt = st.tokens.filter(function (t) { return t.box === bi; }).length;
        b.el.classList.toggle('is-filled', cnt > 0);
        b.el.classList.toggle('is-full', cnt >= per);
      });
    }

    function giveRound() {
      if (done) return Promise.resolve();
      var jobs = [];
      var k = round;
      for (var bi = 0; bi < n; bi += 1) {
        var t = st.tokens[used + bi];
        if (!t) continue;
        t.box = bi;
        var pos = st.field.inBox(bi, k, per, st.size);
        jobs.push(st.field.fly(t, pos.x, pos.y, 400, 28));
        t.el.classList.add('is-seated');
      }
      used += n;
      round += 1;
      U.sfx('pop');
      paintBoxes();
      if (st.lay.rail) U.countRail(board, n, round);
      if (round >= per || used >= st.total) {
        done = true;
        if (btn) btn.classList.add('is-off');
        return Promise.all(jobs).then(function () {
          return sleep(180);
        }).then(function () { finish(); });
      }
      return Promise.all(jobs);
    }

    function sleep(ms) { return U.sleep(ms); }

    if (slot.demo) {
      // 幕 2 示范：按节奏自动发到底，每轮前播一句
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var r = 0; r < per; r += 1) {
          (function (r) {
            chain = chain.then(function () {
              return U.say(lines[r] || slot.q);
            }).then(function () {
              return giveRound();
            }).then(function () { return sleep(360); });
          })(r);
        }
        return chain.then(function () {
          st.boxes.forEach(function (b) { b.el.classList.add('is-settled'); });
          return sleep(300);
        });
      })();
    }

    // 正式：先按「一起做」的轮数代劳，再交给孩子
    var hand = slot.hand || 0;
    btn = U.mainButton('round', 'Give one to each', function () { return giveRound(); });
    dock.appendChild(btn);

    var handLines = slot.handLines || [];
    var chain = Promise.resolve();
    for (var h = 0; h < hand; h += 1) {
      (function (h) {
        chain = chain.then(function () {
          if (handLines[h]) return U.say(handLines[h]);
          return null;
        }).then(function () { return giveRound(); }).then(function () { return sleep(320); });
      })(h);
    }

    return chain.then(function () {
      if (done) finish();
      return donePromise;
    }).then(function () {
      U.recBuilt({ type: 'T4a', rounds: round, perContainer: per });
      return null;
    });
  }

  /* ---------------- T4b ---------------- */

  function T4b(slot) {
    var st = stage(slot);
    var board = U.board();
    var dock = U.dock();
    var per = st.per;
    var n = slot.a;
    var round = 0;
    var used = 0;
    var done = false;
    var btn = null;
    var chosen = null;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });

    function finish() {
      if (!doneResolve) return;
      var r = doneResolve;
      doneResolve = null;
      r();
    }

    var tag = U.el('div', 'cd-hint cd-hint--round');
    tag.innerHTML = '<span class="cd-hint-ico">' + A.button('round') + '</span>';
    board.appendChild(tag);

    // 桌角小碟（剩余物的归处）
    var saucerSeat = (function () {
      var W = board.clientWidth || 354;
      var H = board.clientHeight || 300;
      // 桌角小碟：右下角留 18px 边距，别被工作板圆角切掉、也别贴到底部按钮
      var s = { x: W - 84 - 18, y: H - 56 - 34, w: 84, h: 56 };
      return s;
    })();
    var saucer = st.field.box('saucer', saucerSeat.x, saucerSeat.y, saucerSeat.w, saucerSeat.h);
    saucer.el.classList.add('cd-saucer');
    var leftover = null;

    function paint() {
      st.boxes.forEach(function (b, bi) {
        var cnt = st.tokens.filter(function (t) { return t.box === bi; }).length;
        b.el.classList.toggle('is-filled', cnt > 0);
      });
    }

    function giveRound() {
      if (done) return Promise.resolve();
      var jobs = [];
      var k = round;
      for (var bi = 0; bi < n; bi += 1) {
        var t = st.tokens[used + bi];
        if (!t) continue;
        t.box = bi;
        var pos = st.field.inBox(bi, k, per, st.size);
        jobs.push(st.field.fly(t, pos.x, pos.y, 400, 28));
        t.el.classList.add('is-seated');
      }
      used += n;
      round += 1;
      U.sfx('pop');
      paint();
      if (st.tokens[used] && round >= per) {
        done = true;
        leftover = st.tokens[used];
        leftover.box = -2;
        var lp = { x: saucerSeat.x + (saucerSeat.w - st.size) / 2, y: saucerSeat.y + 8 };
        jobs.push(st.field.fly(leftover, lp.x, lp.y, 520, 36).then(function () {
          leftover.el.classList.add('is-leftover');
          U.sfx('thud');
        }));
        saucer.el.classList.add('has-leftover');
        if (btn) btn.classList.add('is-off');
        return Promise.all(jobs).then(function () {
          return U.sleep(260);
        }).then(function () { finish(); });
      }
      return Promise.all(jobs).then(function () { return U.sleep(160); });
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var r = 0; r < per; r += 1) {
          (function (r) {
            chain = chain.then(function () { return U.say(lines[r] || slot.q); })
              .then(function () { return giveRound(); })
              .then(function () { return U.sleep(r === per - 1 ? 900 : 340); });
          })(r);
        }
        return chain;
      })();
    }

    btn = U.mainButton('round', 'Give one to each', function () { return giveRound(); });
    dock.appendChild(btn);

    var hand = slot.hand || 0;

    return (function () {
      var chain = Promise.resolve();
      for (var h = 0; h < hand; h += 1) {
        chain = chain.then(function () { return giveRound(); }).then(function () { return U.sleep(300); });
      }
      return chain;
    })().then(function () {
      if (done) finish();
      return donePromise;
    }).then(function () {
      if (!slot.askLeftover) {
        U.recBuilt({ type: 'T4b', rounds: round, perContainer: per, leftover: 1 });
        return null;
      }
      return askLeftover();
    });

    /** 发完之后：这 1 个给谁？（L41 S6 是全段最强的一槽） */
    function askLeftover() {
      dock.innerHTML = '';
      var leaveout = U.mainButton('leaveout', 'Not to anyone', function () {
        return choose('leaveout');
      });
      leaveout.classList.add('cd-main--wide');
      dock.appendChild(leaveout);

      st.boxes.forEach(function (b, bi) {
        b.el.classList.add('is-choosable');
        b.el.addEventListener('click', function () {
          if (chosen) return;
          choose(bi);
        });
      });
      if (saucer.el) {
        saucer.el.classList.add('is-choosable');
        saucer.el.addEventListener('click', function () {
          if (chosen) return;
          choose('leaveout');
        });
      }

      if (slot.q2) U.say(slot.q2);

      return new Promise(function (resolve) {
        var tries = 0;
        (function wait() {
          if (!U.alive() || chosen) { resolve(); return; }
          tries += 1;
          if (tries > 600) { resolve(); return; }
          U.later(wait, 100);
        })();
      });

      function choose(v) {
        chosen = v;
        U.sfx('tap');
        st.boxes.forEach(function (b) { b.el.classList.remove('is-choosable'); });
        if (saucer.el) saucer.el.classList.remove('is-choosable');
        if (v === 'leaveout') {
          if (saucer.el) saucer.el.classList.add('is-chosen');
          if (slot.judgeLeftover === false) {
            U.recBuilt({ type: 'T4b', rounds: round, perContainer: per, leftoverChoice: 'leaveout' });
          } else {
            U.recJudged({ chosen: 'leaveout', leftover: 1 }, true);
          }
          U.sfx('chime');
          return U.sleep(520);
        }
        // 硬塞：那 1 个真的移过去（孩子要看见有人多一个）
        var bi = Number(v);
        if (leftover) {
          var pos = st.field.inBox(bi, per, per + 1, st.size);
          st.field.fly(leftover, pos.x, pos.y, 420, 26);
          leftover.el.classList.remove('is-leftover');
          leftover.el.classList.add('is-forced');
          st.boxes[bi].el.classList.add('is-over');
        }
        if (slot.judgeLeftover === false) {
          U.recBuilt({ type: 'T4b', rounds: round, perContainer: per, leftoverChoice: 'plate' + (bi + 1) });
        } else {
          U.recJudged({ chosen: 'plate' + (bi + 1), leftover: 1 }, false);
        }
        return U.sleep(560);      }
    }
  }

  /* ---------------- T4d ---------------- */

  function T4d(slot) {
    var board = U.board();
    var dock = U.dock();
    var f = new U.Field(board);
    U.state.field = f;

    var dist = slot.dist.slice();
    var per = Math.max.apply(null, dist);
    var size = inSize(per);
    var lay = U.layoutBoxes(dist.length, slot.container || 'plate', board);
    var boxes = lay.seats.map(function (s) {
      return f.box(slot.container || 'plate', s.x, s.y, s.w, s.h);
    });
    size = f.fitSize(0, per, size);   // 按容器内腔收，别顶到盘沿

    // 先把「已经发好的」摆进去
    var tokens = [];
    dist.forEach(function (cnt, bi) {
      for (var k = 0; k < cnt; k += 1) {
        var t = f.token(slot.item || 'bun', size);
        var pos = f.inBox(bi, k, per, size);
        f.place(t, pos.x, pos.y);
        t.box = bi;
        t.el.classList.add('is-seated');
        tokens.push(t);
      }
      if (cnt > 0) boxes[bi].el.classList.add('is-filled');
    });

    // 手里那 1 个：单独悬在下方中央，明显不属于任何一个盘子
    var hand = f.token(slot.item || 'bun', size + 3);
    var handHome = {
      x: ((board.clientWidth || 354) - (size + 3)) / 2,
      y: (board.clientHeight || 300) - (size + 3) - 8
    };
    f.place(hand, handHome.x, handHome.y);
    hand.el.classList.add('is-inhand');

    var minIdx = slot.minIndex;
    if (minIdx == null) {
      minIdx = 0;
      dist.forEach(function (v, i) { if (v < dist[minIdx]) minIdx = i; });
    }

    var attempts = [];
    var solved = false;
    var solvedResolve = null;
    var solvedPromise = new Promise(function (res) { solvedResolve = res; });

    boxes.forEach(function (b, bi) {
      b.el.classList.add('is-choosable');
      b.el.addEventListener('click', function () {
        if (solved) return;
        tryPlace(bi);
      });
    });

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        return U.say(lines[0] || slot.q).then(function () {
          return sleep(600);
        }).then(function () {
          var pos = f.inBox(minIdx, dist[minIdx], per + 1, size + 3);
          return f.fly(hand, pos.x, pos.y, 520, 40);
        }).then(function () {
          hand.el.classList.remove('is-inhand');
          boxes[minIdx].el.classList.add('is-settled');
          return U.say(lines[1] || '');
        }).then(function () { return sleep(300); });
      })();
    }

    function sleep(ms) { return U.sleep(ms); }

    function tryPlace(bi) {
      var ok = bi === minIdx;
      attempts.push(bi + 1);
      U.sfx('tap');

      if (ok) {
        solved = true;
        boxes.forEach(function (b) { b.el.classList.remove('is-choosable'); });
        var pos = f.inBox(bi, dist[bi], per + 1, size + 3);
        f.fly(hand, pos.x, pos.y, 460, 36).then(function () {
          hand.el.classList.remove('is-inhand');
          boxes[bi].el.classList.add('is-settled');
        });
        U.recJudged({
          chosen: 'plate' + (bi + 1),
          attempts: attempts.length,
          wanted: 'plate' + (minIdx + 1)
        }, true);
        U.sfx('chime');
        U.later(function () { if (solvedResolve) { var r = solvedResolve; solvedResolve = null; r(); } }, 560);
        return;
      }

      // 点错：停在半路 + 那个盘子轻亮一次，不判错、不消失，可以再点
      var target = f.inBox(bi, dist[bi], per + 1, size + 3);
      var half = {
        x: handHome.x + (target.x - handHome.x) * 0.46,
        y: handHome.y + (target.y - handHome.y) * 0.46 - 12
      };
      f.fly(hand, half.x, half.y, 260, 18).then(function () {
        boxes[bi].el.classList.add('is-bump');
        U.sfx('bump');
        return sleep(180);
      }).then(function () {
        return f.fly(hand, handHome.x, handHome.y, 300, 14);
      }).then(function () {
        boxes[bi].el.classList.remove('is-bump');
      });
    }

    if (solved) return solvedPromise;
    return solvedPromise;
  }

  K.reg('T4a', T4a);
  K.reg('T4b', T4b);
  K.reg('T4d', T4d);
})(window);
