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
    return {
      version: 1, unlockedLevel: 1, stars: {}, cleared: [],
      levelMistakes: {}, attempts: {}, updatedAt: 0
    };
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

    // 旧存档 / 旧云端 Gist 没有这两个字段，必须补齐空壳再 merge，
    // 否则 Object.keys(undefined) 会把云同步异常误报成网络失败。
    if (raw.levelMistakes && typeof raw.levelMistakes === 'object') {
      Object.keys(raw.levelMistakes).forEach(function (key) {
        var list = raw.levelMistakes[key];
        if (!Array.isArray(list)) return;
        var clean = [];
        list.forEach(function (item) {
          var q = Math.floor(Number(item && item.q));
          var n = Math.floor(Number(item && item.n));
          if (q >= 0 && n > 0) clean.push({ q: q, n: n });
        });
        if (clean.length) p.levelMistakes[String(key)] = clean;
      });
    }

    if (raw.attempts && typeof raw.attempts === 'object') {
      Object.keys(raw.attempts).forEach(function (key) {
        var n = Math.floor(Number(raw.attempts[key]));
        if (n > 0) p.attempts[String(key)] = n;
      });
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

    // 错题按 (关卡, 题号) 累加次数
    var mistakes = {};
    [left, right].forEach(function (side) {
      Object.keys(side.levelMistakes).forEach(function (k) {
        if (!mistakes[k]) mistakes[k] = {};
        side.levelMistakes[k].forEach(function (item) {
          mistakes[k][item.q] = (mistakes[k][item.q] || 0) + item.n;
        });
      });
    });
    Object.keys(mistakes).forEach(function (k) {
      out.levelMistakes[k] = Object.keys(mistakes[k]).map(function (q) {
        return { q: Number(q), n: mistakes[k][q] };
      }).sort(function (a, b) { return a.q - b.q; });
    });

    // 尝试次数取较大值：同一份进度经常在 local 与 remote 各存一份，
    // 相加会虚高，取 max 更接近真实次数。
    var attemptIds = {};
    Object.keys(left.attempts).concat(Object.keys(right.attempts)).forEach(function (k) {
      attemptIds[k] = 1;
    });
    Object.keys(attemptIds).forEach(function (k) {
      out.attempts[k] = Math.max(left.attempts[k] || 0, right.attempts[k] || 0);
    });

    return out;
  }

  /** 记录一次答错。刻意不 emit：答题很密集，不能每错一次就重绘地图。 */
  function recordMistake(levelId, index) {
    var id = Math.floor(Number(levelId));
    var q = Math.floor(Number(index));
    if (!id || q < 0 || sandbox) return read();
    var p = normalize(cache || readStorage());
    var list = p.levelMistakes[String(id)] || [];
    var hit = null;
    for (var i = 0; i < list.length; i += 1) {
      if (list[i].q === q) { hit = list[i]; break; }
    }
    if (hit) hit.n += 1; else list.push({ q: q, n: 1 });
    p.levelMistakes[String(id)] = list;
    cache = p;
    writeStorage(p);
    return p;
  }

  /** 记录一次完整通关尝试（用于家长了解卡关次数） */
  function recordAttempt(levelId) {
    var id = Math.floor(Number(levelId));
    if (!id || sandbox) return read();
    var p = normalize(cache || readStorage());
    p.attempts[String(id)] = (p.attempts[String(id)] || 0) + 1;
    cache = p;
    writeStorage(p);
    return p;
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
    recordMistake: recordMistake,
    recordAttempt: recordAttempt,
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
