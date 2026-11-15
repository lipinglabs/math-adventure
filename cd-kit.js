/* ============================================================
   cd-kit.js · 乘除段（L28–L48）题型引擎 · 核心
   ------------------------------------------------------------
   这份文件不认识任何具体关卡。它只提供：
     1. 舞台外壳（题干听筒 / 工作板 / 底部主按钮区）
     2. 字段层 Field：所有实物与容器都在一个绝对定位层里，
        动画只改 transform ——「串联槽不新增物体」由此结构性成立
     3. 幕调度：幕 1 引入 → 幕 2 示范 → 幕 3 八槽 → 幕 4 收束
     4. 记录三类字段：built / built2 / judged（不混用一个 boolean）
     5. 建模型槽的硬约束：无数字键、无确认键、无对错反馈

   题型实现分散在同目录的 cd-type-*.js 里，通过 CDKit.reg 注册。
   加载顺序：cd-art.js → cd-kit.js → cd-type-give/build/judge.js
   ============================================================ */

(function (global) {
  'use strict';

  var A = global.CDArt;

  /* ---------------- 数值红线（§2.1） ---------------- */

  var LIMIT = {
    groups: 5,        // a 组数 ≤5
    per: 5,           // b 每组数 ≤5
    product: 20,      // a×b ≤20
    buildSteps: 5,    // 建模槽 ≤5 步
    t2Steps: 12,      // T2 ≤12 步（数数是教学目标，不是成本）
    serialSteps: 8    // 串联槽 ≤8 步
  };

  /**
   * 全段唯一硬约束。构建期与运行期共用同一个函数，
   * 但只有构建期会 throw（运行期宁可降级也不拦孩子）。
   */
  function valid(a, b, where, opts) {
    opts = opts || {};
    var tag = where || '';
    if (opts.m3) {
      // 例外①：M3 跳数——只报数到哪儿、不求积、组数 ≤10、每组 ≤10
      if (!(a >= 2 && a <= 10)) throw new Error('M3 组数越界 a=' + a + ' @' + tag);
      if (!(b >= 2 && b <= 10)) throw new Error('M3 每组数越界 b=' + b + ' @' + tag);
      return true;
    }
    if (opts.remainderOne) {
      // 例外②：D3 余 1——总数 = a×b+1，余数恒 1，只允许 L41 与 L47
      if (!(a >= 2 && a <= LIMIT.groups)) throw new Error('D3 组数越界 a=' + a + ' @' + tag);
      if (!(b >= 2 && b <= LIMIT.per)) throw new Error('D3 每组数越界 b=' + b + ' @' + tag);
      if (a * b > LIMIT.product) throw new Error('D3 积越界 ' + a + '×' + b + ' @' + tag);
      return true;
    }
    if (!(a >= 2 && a <= LIMIT.groups)) throw new Error('组数越界 a=' + a + ' @' + tag);
    if (!(b >= 2 && b <= LIMIT.per)) throw new Error('每组数越界 b=' + b + ' @' + tag);
    if (a * b > LIMIT.product) throw new Error('积越界 ' + a + 'x' + b + ' @' + tag);
    // D5 分级收紧（非对称：分人槽卡 a，装盒槽卡 b）
    if (opts.tier === 'D5') {
      if (opts.isShare && a > 4) throw new Error('D5 分人槽 a>4：' + a + 'x' + b + ' @' + tag);
      if (!opts.isShare && b > 4) throw new Error('D5 装盒槽 b>4：' + a + 'x' + b + ' @' + tag);
    }
    return true;
  }

  /* ---------------- 运行时状态 ---------------- */

  var K = {
    host: null, ctx: null, spec: null,
    alive: false,
    timers: [],
    sayToken: 0,
    rec: null,
    slotIndex: -1,
    replayKey: '',
    star: 'gold',
    board: null, dock: null,
    field: null,
    finished: false,
    slots: []
  };

  function blankRec() {
    return { built: [], built2: [], judged: [] };
  }

  /* ---------------- 微工具 ---------------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  /** 系统「减少动态效果」：物体直接落位，不做飞行/弹跳（CSS 侧另有一套 animation:none） */
  function reduced() {
    try {
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  function later(fn, ms) {
    var id = setTimeout(function () {
      if (K.alive) fn();
    }, ms);
    K.timers.push(id);
    return id;
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      var id = setTimeout(resolve, Math.max(0, ms));
      K.timers.push(id);
    });
  }

  function clearTimers() {
    K.timers.forEach(function (id) { clearTimeout(id); });
    K.timers = [];
  }

  function sfx(name) {
    if (!K.ctx || !K.ctx.sfx) return;
    var fn = K.ctx.sfx[name];
    if (typeof fn === 'function') {
      try { fn.call(K.ctx.sfx); } catch (e) { /* 音效失败不影响流程 */ }
    }
  }

  /** 播一条语音。语音失败/缺失都不能锁死流程（超时兜底 12s）。 */
  function say(key) {
    // 退关后不再起新语音：此时引擎已 releaseLevel()，再 play 会触发
    // 「voice not preloaded」并重新下载，属于无效网络请求。
    if (!key || !K.alive || !K.ctx || !K.ctx.audio) return Promise.resolve(false);
    var my = K.sayToken;
    K.replayKey = key;
    return new Promise(function (resolve) {
      var done = false;
      function fin(v) {
        if (done) return;
        done = true;
        resolve(v);
      }
      var guard = setTimeout(function () { fin(false); }, 12000);
      K.timers.push(guard);
      Promise.resolve(K.ctx.audio.play(key)).then(function () {
        clearTimeout(guard);
        if (my !== K.sayToken) { fin(false); return; }
        fin(true);
      }, function () {
        clearTimeout(guard);
        fin(false);
      });
    });
  }

  function saySeq(keys) {
    var list = (keys || []).filter(Boolean);
    var i = 0;
    function step() {
      if (!K.alive || i >= list.length) return Promise.resolve(false);
      var key = list[i];
      i += 1;
      return say(key).then(function () { return sleep(120); }).then(step);
    }
    return step();
  }

  /* ---------------- 字段层 ----------------
     所有实物与容器都在同一个绝对定位层里。位置由 JS 算出、
     用 translate3d 落地：移动 = 改 transform，节点数从头到尾不变。
     这是「串联槽不新增任何一颗面包」的实现基础（§6.2-4）。 */

  function gridSlots(per) {
    if (per <= 3) return [per, 1];
    if (per === 4) return [2, 2];
    return [3, 2];
  }

  function Field(board) {
    this.board = board;
    this.layer = el('div', 'cd-layer');
    board.appendChild(this.layer);
    this.tokens = [];
    this.boxes = [];
    this.w = board.clientWidth || 354;
    this.h = board.clientHeight || 300;
  }

  Field.prototype.token = function (kind, size) {
    var node = A.node(kind, { size: size });
    node.classList.add('cd-token');
    node.style.width = size + 'px';
    node.style.height = size + 'px';
    this.layer.appendChild(node);
    var t = { el: node, x: 0, y: 0, box: -1, k: 0, size: size, kind: kind };
    this.tokens.push(t);
    return t;
  };

  Field.prototype.box = function (kind, x, y, w, h) {
    var host = el('div', 'cd-box cd-box--' + kind);
    host.style.left = x + 'px';
    host.style.top = y + 'px';
    host.style.width = w + 'px';
    host.style.height = h + 'px';
    var art = A.node(kind, { size: Math.min(w, h) });
    art.classList.add('cd-box-art');
    host.appendChild(art);
    this.layer.appendChild(host);
    var b = {
      el: host, x: x, y: y, w: w, h: h, kind: kind, art: art,
      innerUnits: A.inner(kind),
      index: this.boxes.length
    };
    this.boxes.push(b);
    return b;
  };

  /**
   * 容器内腔在 field 坐标里的矩形（左上角 + 宽高）。
   * 用 SVG 的 getScreenCTM 把 viewBox 坐标直接映射到屏幕，
   * 不管容器被缩放到多大、被怎么放大缩小，落位都和画出来的盒身对齐。
   */
  Field.prototype.innerOf = function (bi) {
    var b = this.boxes[bi];
    if (!b) return null;
    if (b._inner) return b._inner;
    var out = { x: b.x, y: b.y, w: b.w, h: b.h };      // 兜底：按外框
    var svg = b.art && b.art.querySelector ? b.art.querySelector('svg') : null;
    var u = b.innerUnits;
    if (svg && svg.getScreenCTM && u) {
      try {
        var m = svg.getScreenCTM();
        var brd = this.board.getBoundingClientRect();
        var p1 = new DOMPoint(u[0], u[1]).matrixTransform(m);
        var p2 = new DOMPoint(u[2], u[3]).matrixTransform(m);
        var w = p2.x - p1.x;
        var h = p2.y - p1.y;
        if (w > 8 && h > 8) out = { x: p1.x - brd.x, y: p1.y - brd.y, w: w, h: h };
      } catch (e) { /* 老浏览器没有 DOMPoint：按外框兜底 */ }
    }
    b._inner = out;
    return out;
  };

  Field.prototype.place = function (t, x, y) {
    t.x = x;
    t.y = y;
    t.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    return t;
  };

  Field.prototype.fly = function (t, x, y, dur, arc) {
    // 先清掉已结束但还在占着 transform 的出场动画（见 popIn 注释）
    if (t.el.getAnimations) {
      t.el.getAnimations().forEach(function (a) {
        if (a.playState === 'finished') { try { a.cancel(); } catch (e) { /* noop */ } }
      });
    }
    var from = { x: t.x, y: t.y };
    t.x = x;
    t.y = y;
    var fin = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    if (!t.el.animate || !dur || reduced()) {
      t.el.style.transform = fin;
      return Promise.resolve();
    }
    var lift = arc == null ? 24 : arc;
    var mx = (from.x + x) / 2;
    var my = Math.min(from.y, y) - lift;
    var anim = t.el.animate([
      { transform: 'translate3d(' + from.x.toFixed(1) + 'px,' + from.y.toFixed(1) + 'px,0)' },
      { transform: 'translate3d(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px,0)', offset: 0.5 },
      { transform: fin }
    ], { duration: dur, easing: 'cubic-bezier(.32,.06,.36,1)', fill: 'forwards' });
    return anim.finished.then(function () {
      t.el.style.transform = fin;
      anim.cancel();
    }, function () {
      t.el.style.transform = fin;
    });
  };

  /**
   * 出场弹一下。关键在结尾 cancel()：
   * fill:'both' 的动画会永久占据 transform，之后 Field 再怎么改 translate3d
   * 都会被动画的填充值压住 —— 表现为物体明明算好了位置却还留在原地。
   * 所以动画一结束就把 transform 的所有权交回给 Field（清掉内联 opacity）。
   */
  function popIn(node, css, opts) {
    if (!node) return null;
    opts = opts || {};
    var cssStr = css || '';
    if (!node.animate || reduced()) { node.style.opacity = '1'; return null; }
    var anim = node.animate([
      { opacity: 0, transform: cssStr + ' translateY(' + (opts.rise || 0) + 'px) scale(' + (opts.from == null ? .62 : opts.from) + ')' },
      { opacity: 1, transform: cssStr + ' scale(1)' }
    ], {
      duration: opts.dur || 300,
      delay: opts.delay || 0,
      easing: opts.easing || 'ease-out',
      fill: 'both'
    });
    function fin() {
      try { anim.cancel(); } catch (e) { /* noop */ }
      node.style.opacity = '1';
    }
    anim.finished.then(fin, fin);
    return anim;
  }

  /** 内腔最多能放下多大的物体（每容器 per 个时）。建物体之前先问一次。 */
  Field.prototype.fitSize = function (bi, per, want) {
    var b = this.innerOf(bi);
    if (!b) return want;
    var g = gridSlots(per);
    var cols = g[0], rows = g[1];
    var gap = per >= 5 ? 1 : 2.5;
    var ms = Math.min(
      (b.w - (cols - 1) * gap) / cols,
      (b.h - (rows - 1) * gap) / rows
    );
    return ms > 4 ? Math.min(want, ms) : want;
  };

  /** 容器内第 k 个物体的左上角坐标（相对 board） */
  Field.prototype.inBox = function (bi, k, per, size) {
    var b = this.innerOf(bi);
    if (!b) return { x: 0, y: 0 };
    var g = gridSlots(per);
    var cols = g[0], rows = g[1];
    var gap = per >= 5 ? 1 : 2.5;
    // 内腔装不下就等比缩小，绝不把物体顶到盒盖外面
    var ms = Math.min(
      (b.w - (cols - 1) * gap) / cols,
      (b.h - (rows - 1) * gap) / rows
    );
    if (ms > 4) size = Math.min(size, ms);
    var sy = (b.h - rows * size - (rows - 1) * gap) / 2;
    var r = Math.floor(k / cols);
    var c = k % cols;
    var inRow = (r === rows - 1 && per % cols) ? (per % cols) : cols;
    var lx = (b.w - inRow * size - (inRow - 1) * gap) / 2;
    return {
      x: b.x + lx + c * (size + gap),
      y: b.y + sy + r * (size + gap)
    };
  };

  /** 散放区第 i 个（共 n 个）的位置：最多 6 个一行，铺得开一点 */
  Field.prototype.scatter = function (i, n, size, area) {
    area = area || { x: 0, y: 0, w: this.w, h: this.h * 0.34 };
    var cols = n <= 4 ? n : (n <= 8 ? 4 : (n <= 12 ? 5 : 6));
    cols = Math.max(1, Math.min(cols, 6));
    var rows = Math.ceil(n / cols);
    var gapX = Math.max(3, Math.min(9, (area.w - cols * size) / (cols + 1)));
    var gapY = rows > 1 ? Math.max(2, Math.min(8, (area.h - rows * size) / (rows + 1))) : 0;
    var totalW = cols * size + (cols - 1) * gapX;
    var r = Math.floor(i / cols);
    var c = i % cols;
    var inRow = (r === rows - 1 && n % cols) ? (n % cols) : cols;
    var rowW = inRow * size + (inRow - 1) * gapX;
    return {
      x: area.x + (area.w - rowW) / 2 + c * (size + gapX),
      y: area.y + (area.h - (rows * size + (rows - 1) * gapY)) / 2 + r * (size + gapY)
    };
  };

  /* ---------------- 容器排布（§2.5） ----------------
     2 个：一行 2；3 个：一行 3；4 个：2×2（不许 1×4）；
     5 个：3+2 交错 + 底部 5 点计数轨（不许 1×5，不许 2×2+居中）。 */

  var BOX_SIZE = {
    plate: { w: 96, h: 90 },
    box_s: { w: 96, h: 72 },
    box_m: { w: 92, h: 78 },
    box_l: { w: 88, h: 104 },
    bag: { w: 96, h: 72 },
    basket: { w: 100, h: 100 },
    tray: { w: 100, h: 64 }
  };

  /**
   * 算出 n 个容器的位置。
   * @returns { seats:[{x,y,w,h}], rail:bool }
   */
  function layoutBoxes(n, kind, board, opts) {
    opts = opts || {};
    var W = board.clientWidth || 354;
    var H = board.clientHeight || 300;
    var sz = BOX_SIZE[kind] || BOX_SIZE.plate;
    var w = Math.min(sz.w, n >= 5 ? 84 : sz.w);
    var h = Math.min(sz.h, n >= 5 ? 84 : sz.h);
    if (W < 330) { w = Math.min(w, 74); h = Math.min(h, 74); }   // 320 宽降级
    var gap = 24;                                                 // 格内间距恒 24，不压
    // center=true：没有「待发的堆」的槽（T1a/T1c/T3a），整组容器在板上居中。
    // 否则容器固定在偏下位置，上方留给堆（T4a/T4b）。
    var rowsH = n <= 3 ? h : (n === 4 ? 2 * h + gap : 2 * h + Math.round(gap * 0.55));
    var top = opts.center
      ? Math.max(14, Math.round((H - rowsH) / 2) - 8)
      : Math.round(H * 0.52);
    var seats = [];
    var i;

    if (n <= 2) {
      var totalW2 = n * w + (n - 1) * gap;
      for (i = 0; i < n; i += 1) {
        seats.push({ x: (W - totalW2) / 2 + i * (w + gap), y: top, w: w, h: h });
      }
      return { seats: seats, rail: false };
    }

    if (n === 3) {
      var totalW3 = 3 * w + 2 * gap;
      for (i = 0; i < 3; i += 1) {
        seats.push({ x: (W - totalW3) / 2 + i * (w + gap), y: top, w: w, h: h });
      }
      return { seats: seats, rail: false };
    }

    if (n === 4) {
      var totalW4 = 2 * w + gap;
      var totalH4 = 2 * h + gap;
      var y0 = Math.max(6, Math.min(top, H - totalH4 - 10));
      for (i = 0; i < 4; i += 1) {
        seats.push({
          x: (W - totalW4) / 2 + (i % 2) * (w + gap),
          y: y0 + Math.floor(i / 2) * (h + gap),
          w: w, h: h
        });
      }
      return { seats: seats, rail: false };
    }

    // 5 个：3 + 2 交错，底部 5 点计数轨（点 ⌀24 / 间距 40 / 总宽 280）
    var rowW = 3 * w + 2 * gap;
    var y1 = top - Math.round(h * 0.1);
    var y2 = y1 + h + Math.round(gap * 0.55);
    for (i = 0; i < 3; i += 1) {
      seats.push({ x: (W - rowW) / 2 + i * (w + gap), y: y1, w: w, h: h });
    }
    var row2W = 2 * w + gap;
    for (i = 0; i < 2; i += 1) {
      seats.push({ x: (W - row2W) / 2 + i * (w + gap), y: y2, w: w, h: h });
    }
    return { seats: seats, rail: true };
  }

  /** 底部 5 点计数轨：只做「装到第几个」的视觉锚，不显示数字 */
  function countRail(host, total, filled) {
    var rail = host.querySelector('.cd-rail');
    if (!rail) {
      rail = el('div', 'cd-rail');
      host.appendChild(rail);
    }
    rail.innerHTML = '';
    for (var i = 0; i < total; i += 1) {
      var d = el('i', i < filled ? 'is-on' : '');
      rail.appendChild(d);
    }
    return rail;
  }

  /* ---------------- 舞台外壳 ---------------- */

  var ICON_EAR =
    '<svg viewBox="0 0 100 100" aria-hidden="true">' +
    '<path d="M62 18c-17 0-30 13-30 28 0 6 2 11 6 15-4 4-6 9-6 15 0 6 4 10 10 10s10-4 12-9c3 1 5 2 7 2 15 0 27-13 27-28S79 18 62 18z" ' +
    'fill="#F6D9C8"/><path d="M60 34c-9 0-15 6-15 13 0 8 6 13 15 13s15-5 15-13c0-7-6-13-15-13z" ' +
    'fill="none" stroke="#C08A70" stroke-width="3.6"/></svg>';

  var ICON_REPLAY =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M4 9.5h3.5L13 5.5v13L7.5 14.5H4z" fill="currentColor"/>' +
    '<path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round"/></svg>';

  function buildShell() {
    K.host.innerHTML = '';
    var root = el('div', 'cd');
    root.setAttribute('data-level', String(K.spec.id));

    var stem = el('div', 'cd-stem');
    var ear = el('span', 'cd-stem-ear');
    ear.innerHTML = ICON_EAR;
    stem.appendChild(ear);

    var replay = el('button', 'cd-replay');
    replay.type = 'button';
    replay.setAttribute('aria-label', 'Listen again');
    replay.innerHTML = ICON_REPLAY;
    replay.addEventListener('click', function () {
      sfx('tap');
      if (K.replayKey) say(K.replayKey);
    });
    stem.appendChild(replay);
    root.appendChild(stem);

    K.board = el('div', 'cd-board');
    root.appendChild(K.board);

    K.dock = el('div', 'cd-dock');
    root.appendChild(K.dock);

    K.host.appendChild(root);
    K.root = root;
    return root;
  }

  function setReplay(key) {
    K.replayKey = key || '';
    var btn = K.root && K.root.querySelector('.cd-replay');
    if (btn) btn.classList.toggle('is-off', !key);
  }

  /* ---------------- 主按钮 ---------------- */

  function mainButton(kind, label, onTap) {
    var btn = el('button', 'cd-main');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = A.button(kind);
    var live = false;
    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-off') || live) return;
      live = true;
      sfx('tap');
      Promise.resolve(onTap()).then(function () { live = false; }, function () { live = false; });
    });
    return btn;
  }

  function clearDock() { if (K.dock) K.dock.innerHTML = ''; }
  function clearBoard() {
    if (K.board) K.board.innerHTML = '';
    K.field = null;
  }

  /** 每槽开头统一重置 */
  function resetStage() {
    clearBoard();
    clearDock();
    K.board.classList.remove('is-demo');
    K.board.classList.remove('cd-board--hide');
  }

  /* ---------------- 记录 ---------------- */

  function recBuilt(payload) {
    payload = payload || {};
    payload.slot = K.slotIndex + 1;
    payload.type = payload.type || (K.spec.slots[K.slotIndex] || {}).type;
    K.rec.built.push(payload);
  }

  function recBuilt2(payload) {
    payload = payload || {};
    payload.slot = K.slotIndex + 1;
    K.rec.built2.push(payload);
  }

  /**
   * @param correct    true / false / null（null = 只记录不判）
   * @param recordOnly 仅记录（T7c）
   */
  function recJudged(payload, correct, recordOnly) {
    payload = payload || {};
    payload.slot = K.slotIndex + 1;
    payload.type = payload.type || (K.spec.slots[K.slotIndex] || {}).type;
    payload.correct = correct === undefined ? null : correct;
    payload.recordOnly = !!recordOnly;
    K.rec.judged.push(payload);
    if (!recordOnly && correct === false) K.star = 'silver';
    return payload;
  }

  /* ---------------- 幕 ---------------- */

  function introScene() {
    var intro = K.spec.intro || {};
    var wrap = el('div', 'cd-intro');
    var well = el('div', 'cd-intro-well');
    var props = intro.props || ['cart', 'bo', 'plate'];
    // 道具多的时候要缩：5 个 84px 会顶出 354 宽的工作板
    var propSize = props.length >= 5 ? 64 : (props.length === 4 ? 72 : 84);
    props.forEach(function (name, i) {
      var n = A.node(name, { size: name === 'bo' ? propSize + 12 : propSize });
      n.classList.add('cd-intro-prop');
      n.style.animationDelay = (i * 120) + 'ms';
      well.appendChild(n);
    });
    wrap.appendChild(well);
    K.board.appendChild(wrap);
    return wrap;
  }

  function intro() {
    resetStage();
    var intro = K.spec.intro || {};
    introScene();
    setReplay(intro.lines && intro.lines[0]);
    [].forEach.call(K.root.querySelectorAll('.cd-intro-prop'), function (n) {
      popIn(n, '', {
        from: .8,
        rise: 14,
        dur: 520,
        delay: Number(n.style.animationDelay.replace('ms', '')) || 0,
        easing: 'cubic-bezier(.34,1.56,.64,1)'
      });
    });
    return saySeq(intro.lines || []).then(function () { return sleep(380); });
  }

  function demo() {
    var d = K.spec.demo;
    if (!d) return Promise.resolve();
    resetStage();
    K.board.classList.add('is-demo');
    var slot = {};
    Object.keys(d).forEach(function (k) { slot[k] = d[k]; });
    slot.demo = true;
    slot.q = (d.lines && d.lines[0]) || '';
    setReplay(slot.q);
    var fn = HANDLERS[slot.type];
    if (!fn) return Promise.resolve();
    return Promise.resolve(fn(slot)).then(function () { return sleep(320); });
  }

  function runSlot(slot, i) {
    resetStage();
    setReplay(slot.q);
    if (K.ctx.step) K.ctx.step(i);
    var fn = HANDLERS[slot.type];
    if (!fn) {
      recBuilt({ note: '未注册的题型 ' + slot.type });
      return say(slot.q).then(function () { return sleep(200); });
    }
    return say(slot.q).then(function () {
      return fn(slot);
    }).then(function () {
      return sleep(300);
    });
  }

  function outro() {
    resetStage();
    var o = K.spec.outro || {};
    var wrap = el('div', 'cd-outro cd-outro--' + (o.style || 'last'));
    K.board.appendChild(wrap);

    if (o.style === 'quad' && o.cells) {
      var grid = el('div', 'cd-quad');
      o.cells.forEach(function (cell) {
        var card = el('div', 'cd-quad-cell');
        var cap = el('div', 'cd-quad-cap');
        var inner = el('div', 'cd-quad-inner');
        (cell.marks || []).forEach(function (m) {
          inner.appendChild(A.node(m, { size: 30 }));
        });
        card.appendChild(inner);
        card.appendChild(cap);
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    } else if (o.style === 'ring') {
      var ring = el('div', 'cd-ring');
      ring.innerHTML =
        '<svg viewBox="0 0 240 240" aria-hidden="true">' +
        '<circle cx="120" cy="120" r="86" fill="none" stroke="#E3CB98" stroke-width="18"/>' +
        '<circle cx="120" cy="120" r="86" fill="none" stroke="#D2B27A" stroke-width="18" ' +
        'stroke-dasharray="18 12" stroke-linecap="round"/>' +
        '<path d="M120 20l10 20-20 0z" fill="#C89B6A"/>' +
        '<path d="M120 220l-10-20 20 0z" fill="#C89B6A"/>' +
        '</svg>';
      wrap.appendChild(ring);
    } else {
      var well = el('div', 'cd-outro-well');
      (o.marks || ['plate', 'bun']).forEach(function (m, i) {
        var n = A.node(m, { size: 52 });
        n.style.animationDelay = (i * 90) + 'ms';
        well.appendChild(n);
      });
      wrap.appendChild(well);
    }

    return saySeq(o.lines || []).then(function () {
      if (o.hold) return sleep(o.hold);
      return sleep(600);
    });
  }

  /* ---------------- 挂载 ---------------- */

  var HANDLERS = {};

  function reg(type, fn) { HANDLERS[type] = fn; }

  function activeSlots() {
    var spec = K.spec;
    if (spec.only8) return spec.slots.slice(0, 8);
    var done = false;
    try {
      done = !!(global.Progress && global.Progress.starOf(spec.id) !== 'none');
    } catch (e) { done = false; }
    return done ? spec.slots.slice(0, 8) : spec.slots.slice(0, 6);
  }

  function mount(host, ctx, spec) {
    K.host = host;
    K.ctx = ctx;
    K.spec = spec;
    K.alive = true;
    K.finished = false;
    K.sayToken = 0;
    K.rec = blankRec();
    K.slotIndex = -1;
    K.star = 'gold';
    K.timers = [];

    buildShell();
    K.slots = activeSlots();
    spec.__activeCount = K.slots.length;
    if (ctx.step) ctx.step(0);

    run().catch(function (err) {
      if (global.console) console.error('[cd] ' + (spec.id || '?') + ' 运行异常', err);
    });

    return { unmount: unmount };

    function run() {
      return Promise.resolve()
        .then(intro)
        .then(function () { return K.alive ? demo() : null; })
        .catch(function (err) {
          // 示范幕出错不能拖死整关：记一笔，继续进槽
          if (global.console) console.error('[cd] ' + K.spec.id + ' 幕 2 示范异常', err);
          return null;
        })
        .then(function () {
          if (!K.alive) return null;
          var chain = Promise.resolve();
          K.slots.forEach(function (slot, i) {
            chain = chain.then(function () {
              if (!K.alive) return null;
              K.slotIndex = i;
              // 单个槽抛错只废这一槽，后面的槽照常跑、照样结算
              return runSlot(slot, i).catch(function (err) {
                if (global.console) {
                  console.error('[cd] ' + K.spec.id + ' S' + (i + 1) + ' ' + slot.type + ' 异常', err);
                }
                recBuilt({ type: slot.type, note: 'exception', message: String(err && err.message || err) });
                return null;
              });
            });
          });
          return chain;
        })
        .then(function () {
          if (!K.alive) return null;
          K.slotIndex = -1;
          return outro();
        })
        .then(function () {
          if (!K.alive || K.finished) return null;
          K.finished = true;
          K.rec.star = K.star;
          K.spec.__lastRecord = K.rec;
          settle(K.star);
          return null;
        });
    }
  }

  /** 结算：先把星写进进度，再交给 LevelKit 画星（顺序不能反，否则星星不入档） */
  function settle(star) {
    if (K.ctx && K.ctx.complete) {
      try { K.ctx.complete(star); } catch (e) { /* 进度写入失败也不能挡住结算画面 */ }
    }
    if (!global.LevelKit || !global.LevelKit.showResult || !K.host) return;
    var host = K.host;
    if (K.ctx && K.ctx.audio && K.ctx.audio.stop) {
      try { K.ctx.audio.stop(); } catch (e) { /* noop */ }
    }
    global.LevelKit.showResult(host, star, {
      onReplay: function () { if (K.ctx && K.ctx.restart) K.ctx.restart(); },
      onHome: function () { if (K.ctx && K.ctx.exit) K.ctx.exit(); },
      play: function (key) { if (K.ctx && K.ctx.audio) K.ctx.audio.play(key); }
    });
  }

  function unmount() {
    K.alive = false;
    K.sayToken += 1;
    clearTimers();
    if (K.ctx && K.ctx.audio && K.ctx.audio.stop) {
      try { K.ctx.audio.stop(); } catch (e) { /* noop */ }
    }
    if (K.host) K.host.innerHTML = '';
    K.host = null;
    K.ctx = null;
    K.board = null;
    K.dock = null;
    K.field = null;
  }

  global.CDKit = {
    limits: LIMIT,
    valid: valid,
    reg: reg,
    mount: mount,
    // 供题型文件使用
    api: {
      el: el,
      art: A,
      clamp: clamp,
      popIn: popIn,
      sleep: sleep,
      later: later,
      sfx: sfx,
      say: say,
      saySeq: saySeq,
      setReplay: setReplay,
      mainButton: mainButton,
      clearDock: clearDock,
      clearBoard: clearBoard,
      resetStage: resetStage,
      layoutBoxes: layoutBoxes,
      countRail: countRail,
      Field: Field,
      gridSlots: gridSlots,
      recBuilt: recBuilt,
      recBuilt2: recBuilt2,
      recJudged: recJudged,
      state: K,
      board: function () { return K.board; },
      dock: function () { return K.dock; },
      ctx: function () { return K.ctx; },
      spec: function () { return K.spec; },
      slotIndex: function () { return K.slotIndex; },
      alive: function () { return K.alive; }
    }
  };
})(window);
