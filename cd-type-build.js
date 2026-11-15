/* ============================================================
   cd-type-build.js · 「建」家族
   ------------------------------------------------------------
   T1a 长一份   点一下，一整份（b 个）同时长出来并落进容器；步数 = 份数
   T1c 长一行   点一下，一整行（b 个）从左到右铺满一行；步数 = 行数
   T3a 装一盒   点一下，系统抓 b 个装进一个新盒；盒子留场不飞走
   T2  点着数   只有一个「下一组」按钮，点一下整组点亮、系统念累计数

   这四种都不判对错。屏幕上没有数字键、没有确认键、没有「对不对」，
   判定点只有一个：动作在什么时候停止。
   ============================================================ */

(function (global) {
  'use strict';

  var K = global.CDKit;
  if (!K) return;
  var U = K.api;
  var A = U.art;

  function perSize(per) {
    if (per <= 3) return 26;
    if (per === 4) return 24;
    if (per === 5) return 21;
    return 18;
  }

  /* ---------------- T1a 长一份 ---------------- */

  function T1a(slot) {
    var board = U.board();
    var dock = U.dock();
    var f = new U.Field(board);
    U.state.field = f;

    var a = slot.a;
    var per = slot.b;
    var size = perSize(per);
    var lay = U.layoutBoxes(a, slot.container || 'plate', board, { center: true });
    var boxes = lay.seats.map(function (s) {
      return f.box(slot.container || 'plate', s.x, s.y, s.w, s.h);
    });
    boxes.forEach(function (b) { b.el.classList.add('is-empty'); });
    // 一份长出来的东西要能装进盘/盒里，按内腔收一次尺寸
    size = f.fitSize(0, per, size);

    var created = 0;
    var tokens = [];
    var btn = null;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      if (doneResolve) { var r = doneResolve; doneResolve = null; r(); }
    }

    /** 一整份同时长出来，再落进第 gi 个容器 */
    function growGroup(gi) {
      if (gi >= a) return Promise.resolve();
      var jobs = [];
      for (var k = 0; k < per; k += 1) {
        var t = f.token(slot.item || 'bun', size);
        var pos = f.inBox(gi, k, per, size);
        var from = { x: pos.x, y: pos.y - 74 - (per > 3 ? 18 : 0) };
        // 起点在容器上方（贴在一起），先长出来
        f.place(t, from.x, from.y);
        t.el.style.opacity = '0';
        tokens.push(t);
        jobs.push(stagger(t, from, pos, k));
      }
      U.sfx('pop');
      boxes[gi].el.classList.remove('is-empty');
      boxes[gi].el.classList.add('is-filled');
      created += 1;
      return Promise.all(jobs).then(function () {
        // 整份长完一起落定（不是逐个落）
        boxes[gi].el.classList.add('is-settled');
        return U.sleep(120);
      });

      function stagger(t, from, to, k) {
        // 同一份内的个体几乎同时到位：错开 24ms 只为读得清，不构成「逐个点」
        return new Promise(function (resolve) {
          U.later(function () {
            t.el.style.opacity = '1';
            f.fly(t, to.x, to.y, 420, 22 + k).then(resolve);
          }, k * 24);
        });
      }
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var i = 0; i < a; i += 1) {
          (function (i) {
            chain = chain.then(function () { return U.say(lines[i] || slot.q); })
              .then(function () { return growGroup(i); })
              .then(function () { return U.sleep(300); });
          })(i);
        }
        return chain.then(function () { return U.sleep(240); });
      })();
    }

    btn = U.mainButton('grow', 'Make one more group', function () {
      if (created >= a) return Promise.resolve();
      return growGroup(created).then(function () {
        if (created >= a) finish();
      });
    });
    dock.appendChild(btn);

    var hand = slot.hand || 0;
    return (function () {
      var chain = Promise.resolve();
      for (var h = 0; h < hand; h += 1) {
        chain = chain.then(function () { return growGroup(created); })
          .then(function () { return U.sleep(320); });
      }
      return chain;
    })().then(function () {
      if (created >= a) finish();
      return donePromise;
    }).then(function () {
      U.recBuilt({ type: 'T1a', groups: a, perContainer: per });
      return null;
    });
  }

  /* ---------------- T1c 长一行 ---------------- */

  function T1c(slot) {
    var board = U.board();
    var dock = U.dock();
    var a = slot.a;              // 行数
    var per = slot.b;            // 每行几个
    var size = perSize(per);

    var wrap = U.el('div', 'cd-grid-wrap');
    board.appendChild(wrap);
    var g = A.gridtray(per, a);
    wrap.innerHTML = g;

    var W = board.clientWidth || 354;
    var H = board.clientHeight || 300;
    var gw = Math.min(W - 24, 320);
    var gh = Math.min(H - 24, gw * 0.92);
    wrap.style.width = gw + 'px';
    wrap.style.height = gh + 'px';

    // 网格内每个格心的位置（与 gridtray 的 14..86 / 18..84 对应）
    var padX = gw * 0.14, padY = gh * 0.18;
    var innerW = gw * 0.72, innerH = gh * 0.66;
    var cw = innerW / per, chh = innerH / a;

    var f = new U.Field(wrap);
    // Field 会用 wrap 的 clientWidth，此处已知尺寸，直接覆盖
    f.w = gw;
    f.h = gh;

    function cellPos(r, c) {
      return {
        x: padX + c * cw + (cw - size) / 2,
        y: padY + r * chh + (chh - size) / 2
      };
    }

    var created = 0;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });
    var finished = false;
    var btn = null;

    function finish() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      if (doneResolve) { var r = doneResolve; doneResolve = null; r(); }
    }

    function growRow(ri) {
      if (ri >= a) return Promise.resolve();
      var jobs = [];
      for (var c = 0; c < per; c += 1) {
        (function (c) {
          var t = f.token(slot.item || 'bun', size);
          var to = cellPos(ri, c);
          var from = { x: to.x, y: to.y - 60 };
          f.place(t, from.x, from.y);
          t.el.style.opacity = '0';
          jobs.push(new Promise(function (resolve) {
            U.later(function () {
              t.el.style.opacity = '1';
              f.fly(t, to.x, to.y, 380, 20 + c * 4).then(resolve);
            }, c * 55);
          }));
        })(c);
      }
      U.sfx('pop');
      created += 1;
      return Promise.all(jobs).then(function () { return U.sleep(120); });
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var i = 0; i < a; i += 1) {
          (function (i) {
            chain = chain.then(function () { return U.say(lines[i] || slot.q); })
              .then(function () { return growRow(i); })
              .then(function () { return U.sleep(280); });
          })(i);
        }
        return chain.then(function () { return U.sleep(200); });
      })();
    }

    btn = U.mainButton('grow', 'Make one more row', function () {
      if (created >= a) return Promise.resolve();
      return growRow(created).then(function () { if (created >= a) finish(); });
    });
    dock.appendChild(btn);

    var hand = slot.hand || 0;
    return (function () {
      var chain = Promise.resolve();
      for (var h = 0; h < hand; h += 1) {
        chain = chain.then(function () { return growRow(created); })
          .then(function () { return U.sleep(300); });
      }
      return chain;
    })().then(function () {
      if (created >= a) finish();
      return donePromise;
    }).then(function () {
      U.recBuilt({ type: 'T1c', rows: a, perRow: per });
      return null;
    });
  }

  /* ---------------- T3a 装一盒 ---------------- */

  function T3a(slot) {
    var board = U.board();
    var dock = U.dock();
    var f = new U.Field(board);
    U.state.field = f;

    var per = slot.b;                        // 每盒装几个
    var a = slot.total / per;                // 能装几盒
    var total = slot.total;
    var size = Math.min(perSize(per), total > 12 ? 20 : 24);

    var W = board.clientWidth || 354;
    var H = board.clientHeight || 300;
    var container = slot.container || 'box_m';

    // 盒子位：留场、侧边累积、不飞走。盒子先建，物体尺寸才能按盒内腔定。
    var lay = U.layoutBoxes(a, container, board);
    // 上方散堆占了 H*0.40，盒子区从 0.40 起
    var boxTop = H * 0.44;
    var rows = Math.ceil(a / (a <= 2 ? a : (a === 4 ? 2 : 3)));
    var cols = a <= 3 ? a : (a === 4 ? 2 : 3);
    var bw = Math.min(88, (W - (cols - 1) * 24) / cols);
    var bh = Math.min(container === 'bag' ? 64 : (container === 'box_s' ? 64 : 72), bw);
    var boxH = a >= 5 ? bh * 0.86 : bh;

    var seats = [];
    for (var bi = 0; bi < a; bi += 1) {
      var r = Math.floor(bi / cols);
      var c = bi % cols;
      var inRow = (r === rows - 1 && a % cols) ? (a % cols) : cols;
      var rowW = inRow * bw + (inRow - 1) * 24;
      seats.push({
        x: (W - rowW) / 2 + c * (bw + 24),
        y: boxTop + r * (boxH + 18),
        w: bw, h: boxH
      });
    }

    var boxes = seats.map(function (s) {
      var b = f.box(container, s.x, s.y, s.w, s.h);
      b.el.classList.add('is-empty');
      return b;
    });

    // 上方散放堆：物体尺寸收到「装进盒子也不顶到盒盖」
    size = f.fitSize(0, per, size);
    var pileArea = { x: 0, y: 0, w: W, h: Math.max(80, H * 0.40) };
    var tokens = [];
    for (var i = 0; i < total; i += 1) {
      var t = f.token(slot.item || 'bun', size);
      var p = f.scatter(i, total, size, pileArea);
      f.place(t, p.x, p.y);
      t.el.style.opacity = '0';
      U.popIn(t.el, 'translate3d(' + p.x + 'px,' + p.y + 'px,0)', { dur: 280, delay: i * 22 });
      tokens.push(t);
    }

    // 5 个盒子时底部要有 5 点计数轨（§2.5）：只做「装到第几个」的锚，不出数字
    if (lay.rail) U.countRail(board, a, 0);

    var filled = 0;
    var used = 0;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });
    var finished = false;
    var btn = null;

    function finish() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      if (doneResolve) { var r = doneResolve; doneResolve = null; r(); }
    }

    function fillOne() {
      if (filled >= a) return Promise.resolve();
      var bi = filled;
      var jobs = [];
      for (var k = 0; k < per; k += 1) {
        (function (k) {
          var t = tokens[used + k];
          var pos = f.inBox(bi, k, per, size);
          jobs.push(new Promise(function (resolve) {
            U.later(function () {
              f.fly(t, pos.x, pos.y, 460, 26 + k * 3).then(resolve);
            }, k * 45);
          }));
          t.el.classList.add('is-seated');
        })(k);
      }
      used += per;
      filled += 1;
      U.sfx('pop');
      boxes[bi].el.classList.remove('is-empty');
      boxes[bi].el.classList.add('is-filled');
      if (lay.rail) U.countRail(board, a, filled);
      return Promise.all(jobs).then(function () {
        boxes[bi].el.classList.add('is-closed');   // 盒盖合上一次
        U.sfx('click');
        return U.sleep(160);
      });
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var i2 = 0; i2 < a; i2 += 1) {
          (function (i2) {
            chain = chain.then(function () { return U.say(lines[i2] || slot.q); })
              .then(function () { return fillOne(); })
              .then(function () { return U.sleep(300); });
          })(i2);
        }
        return chain.then(function () { return U.sleep(240); });
      })();
    }

    btn = U.mainButton('grow', 'Fill one more', function () {
      if (filled >= a) return Promise.resolve();
      return fillOne().then(function () { if (filled >= a) finish(); });
    });
    dock.appendChild(btn);

    var hand = slot.hand || 0;
    return (function () {
      var chain = Promise.resolve();
      for (var h = 0; h < hand; h += 1) {
        chain = chain.then(function () { return fillOne(); })
          .then(function () { return U.sleep(320); });
      }
      return chain;
    })().then(function () {
      if (filled >= a) finish();
      return donePromise;
    }).then(function () {
      U.recBuilt({ type: 'T3a', boxes: a, perBox: per, total: total });
      return null;
    });
  }

  /* ---------------- T2 点着数 ---------------- */

  /** 累计数片段：只念数，不报积（§2.15 T2 三条通用纪律） */
  function numKey(v) {
    var s = v < 10 ? '0' + v : String(v);
    return 'common/num_' + s;
  }

  function T2(slot) {
    var board = U.board();
    var dock = U.dock();
    var a = slot.a;               // 组数
    var per = slot.b;             // 每组几个
    var compact = !!slot.compact; // L33：屏上同时最多 3 捆
    var item = slot.item || 'bun';

    var wrap = U.el('div', 'cd-count' + (compact ? ' cd-count--compact' : ''));
    board.appendChild(wrap);

    var band = null;
    if (compact) {
      band = U.el('div', 'cd-band');
      wrap.appendChild(band);
    }

    var track = U.el('div', 'cd-count-track');
    wrap.appendChild(track);

    var groups = [];
    var made = 0;

    /** 造一组：b 个物体成簇（不像散放，一眼能看出「这一组」） */
    function makeGroup(gi) {
      var g = U.el('div', 'cd-group');
      g.setAttribute('data-group', String(gi + 1));
      for (var k = 0; k < per; k += 1) {
        var n = A.node(item, { size: per >= 5 ? 18 : 22 });
        n.classList.add('cd-group-item');
        n.style.animationDelay = (k * 24) + 'ms';
        g.appendChild(n);
      }
      return g;
    }

    if (compact) {
      // 滚动窗口：始终只显示 3 组
      for (var w0 = 0; w0 < Math.min(3, a); w0 += 1) {
        var g0 = makeGroup(w0);
        track.appendChild(g0);
        groups.push(g0);
        made += 1;
      }
    } else {
      for (var gi = 0; gi < a; gi += 1) {
        var g = makeGroup(gi);
        track.appendChild(g);
        groups.push(g);
      }
      made = a;
    }

    var tapped = 0;
    var announced = 0;
    var btn = null;
    var doneResolve = null;
    var donePromise = new Promise(function (res) { doneResolve = res; });
    var finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (btn) btn.classList.add('is-off');
      if (doneResolve) { var r = doneResolve; doneResolve = null; r(); }
    }

    function tapNext() {
      if (tapped >= a) return Promise.resolve();
      var idx = tapped;
      var g = groups[idx];
      tapped += 1;
      announced = tapped * per;

      if (g) {
        g.classList.add('is-lit');
        U.sfx('pop');
      }
      // 系统念累计数——「点一次就是一整组，报出来的是累计的数」
      U.say(numKey(announced)).then(function () {
        if (g) g.classList.add('is-counted');
      });

      if (compact) {
        // 点过的化成小光点飞到右上角累成一条光带
        U.later(function () {
          if (band && g) {
            var dot = U.el('i', 'cd-band-dot');
            band.appendChild(dot);
            g.classList.add('is-gone');
          }
          // 滚入下一组
          if (made < a) {
            var ng = makeGroup(made);
            track.appendChild(ng);
            groups.push(ng);
            ng.classList.add('is-incoming');
            made += 1;
          }
        }, 220);
      }

      var wait = compact ? 420 : 360;
      return U.sleep(wait).then(function () {
        if (tapped >= a) finish();
      });
    }

    if (slot.demo) {
      return (function () {
        var lines = slot.lines || [];
        var chain = Promise.resolve();
        for (var i = 0; i < Math.min(a, lines.length || a); i += 1) {
          (function (i) {
            chain = chain.then(function () { return U.say(lines[i] || ''); })
              .then(function () { return tapNext(); })
              .then(function () { return U.sleep(220); });
          })(i);
        }
        return chain;
      })();
    }

    btn = U.mainButton('next', 'Next group', function () { return tapNext(); });
    dock.appendChild(btn);

    return donePromise.then(function () {
      U.recBuilt2({
        groupsTapped: tapped,
        maxAnnounced: announced,
        perGroup: per,
        totalGroups: a
      });
      return null;
    });
  }

  K.reg('T1a', T1a);
  K.reg('T1c', T1c);
  K.reg('T3a', T3a);
  K.reg('T2', T2);
})(window);
