/* ============================================================
   progress.js · 进度、星级与解锁规则
   ------------------------------------------------------------
   存档结构（v1）：
     {
       version: 1,
       unlockedLevel: 3,          // 最高已解锁关卡序号（只在金星时前进）
       stars: { "1": "gold" },    // 每关历史最高星，none < silver < gold
       cleared: [1, 2],           // 已通关（银星也算通关，但不解锁下一关）
       updatedAt: 1730000000000
     }

   规则（PROJECT_MATH_RULES §6.2）：
     · 第一遍 10 题全对 → gold，解锁下一关
     · 中途错过 → 错题原地重做，通关给 silver，不解锁下一关
     · 星级只升不降；重打拿到 gold 会覆盖 silver 并解锁
     · 沙盒模式下内存全解锁，但绝不写 localStorage
   ============================================================ */

window.Progress = (function () {
  'use strict';

  var KEY = 'math-adventure.progress.v1';
  var RANK = { none: 0, silver: 1, gold: 2 };

  var cache = null;
  var sandbox = false;
  var sandboxBase = null;

  function blank() {
    return { version: 1, unlockedLevel: 1, stars: {}, cleared: [], updatedAt: 0 };
  }

  function normalize(raw) {
    var p = blank();
    if (!raw || typeof raw !== 'object') return p;

    p.unlockedLevel = Math.max(1, Math.floor(Number(raw.unlockedLevel) || 1));

    if (raw.stars && typeof raw.stars === 'object') {
      Object.keys(raw.stars).forEach(function (key) {
        var star = raw.stars[key];
        if (RANK[star] > 0) p.stars[String(key)] = star;
      });
    }

    if (Array.isArray(raw.cleared)) {
      p.cleared = raw.cleared
        .map(function (v) { return Math.floor(Number(v)); })
        .filter(function (v) { return v > 0; });
    }

    p.updatedAt = Number(raw.updatedAt) || 0;
    return p;
  }

  function readStorage() {
    try {
      var text = localStorage.getItem(KEY);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStorage(p) {
    try {
      localStorage.setItem(KEY, JSON.stringify(p));
      return true;
    } catch (e) {
      return false;   // 隐私模式 / 配额满，静默降级为内存态
    }
  }

  function emit() {
    var detail = { progress: read() };
    document.dispatchEvent(new CustomEvent('progress:change', { detail: detail }));
    return detail.progress;
  }

  function read() {
    if (sandbox) {
      var view = normalize(sandboxBase || cache || readStorage());
      view.unlockedLevel = 999;     // 内存全解锁，不落盘
      return view;
    }
    return normalize(cache || readStorage());
  }

  function save(p) {
    var next = normalize(p);
    if (sandbox) return next;       // 沙盒绝不写存档
    next.updatedAt = Date.now();
    cache = next;
    writeStorage(next);
    emit();
    return next;
  }

  function init() {
    cache = normalize(readStorage());
    return cache;
  }

  /** 记录一次通关。star = 'gold' | 'silver' */
  function record(levelId, star) {
    var id = Math.floor(Number(levelId));
    if (!id || !RANK[star]) return read();

    var next = normalize(read());
    var prev = next.stars[String(id)] || 'none';

    if (RANK[star] > RANK[prev]) next.stars[String(id)] = star;
    if (next.cleared.indexOf(id) < 0) next.cleared.push(id);

    // 只有金星才推进解锁线
    if (star === 'gold') {
      next.unlockedLevel = Math.max(next.unlockedLevel, id + 1);
    }
    return save(next);
  }

  function isUnlocked(levelId) {
    var p = read();
    var id = Number(levelId);
    return id <= p.unlockedLevel || !!p.stars[String(id)];
  }

  function starOf(levelId) {
    return read().stars[String(levelId)] || 'none';
  }

  /** 合并两份存档：最高关卡覆盖、最高星级覆盖、通关取并集 */
  function merge(a, b) {
    var left = normalize(a);
    var right = normalize(b);
    var out = blank();

    out.unlockedLevel = Math.max(left.unlockedLevel, right.unlockedLevel);
    out.updatedAt = Math.max(left.updatedAt, right.updatedAt);

    var ids = {};
    Object.keys(left.stars).concat(Object.keys(right.stars)).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (k) {
      var ls = left.stars[k] || 'none';
      var rs = right.stars[k] || 'none';
      out.stars[k] = RANK[ls] >= RANK[rs] ? ls : rs;
    });

    var seen = {};
    left.cleared.concat(right.cleared).forEach(function (id) {
      if (!seen[id]) { seen[id] = 1; out.cleared.push(id); }
    });
    out.cleared.sort(function (x, y) { return x - y; });

    return out;
  }

  function summary() {
    var p = read();
    var gold = 0;
    var silver = 0;
    Object.keys(p.stars).forEach(function (k) {
      if (p.stars[k] === 'gold') gold += 1;
      else if (p.stars[k] === 'silver') silver += 1;
    });
    return { gold: gold, silver: silver, unlockedLevel: p.unlockedLevel };
  }

  function enterSandbox() {
    sandboxBase = normalize(cache || readStorage());
    cache = sandboxBase;
    sandbox = true;
    emit();
  }

  function exitSandbox() {
    sandbox = false;
    sandboxBase = null;
    cache = normalize(readStorage());
    emit();
  }

  function reset() {
    if (sandbox) return read();
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
    cache = blank();
    emit();
    return cache;
  }

  return {
    KEY: KEY,
    init: init,
    read: read,
    save: save,
    record: record,
    isUnlocked: isUnlocked,
    starOf: starOf,
    merge: merge,
    summary: summary,
    snapshot: function () { return JSON.parse(JSON.stringify(read())); },
    enterSandbox: enterSandbox,
    exitSandbox: exitSandbox,
    isSandbox: function () { return sandbox; },
    reset: reset
  };
})();
