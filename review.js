/* ============================================================
   review.js · C7「再玩一次」间隔复现
   ------------------------------------------------------------
   ★ 零语音改动：只从已玩过的 core 轨原题取，直接引用 `${levelId}:${qIndex}`
     的原有题目对象与原有语音 key，题干 / 选项 / 表扬语音全部沿用；
     challenge 轨的题不进池（不把 42/96 这类数值带回低龄路径）。
   ★ 不叠加题量与时长：整组替换当次新题（reviewSize ≤ groupSize），
     被替换的新题按原序压入 pendingQuestions[]，下组优先出队，480 题一题不丢。
   ★ 4 岁起步：每 3 关（coreLevelsDone % 3 === 0）一组、3–4 题；
     确定性排序、无随机无盲盒；连续 2 次答对移出池；可跳过不惩罚、不计达成。
   ★ 界面命名用英文标签 'Play again'（非语音播报、不新增 key），
     禁用「错题 / 补考 / 复习 / 测验 / 重做」及其英文对应词。
   ============================================================ */

(function (global) {
  'use strict';

  var LABEL = 'Play again';
  var BANNED_LABELS = [
    '错题', '补考', '复习', '测验', '重做',
    'review', 'retest', 'quiz', 'redo', 'wrong', '补考', '考试', 'fail'
  ];
  var REVIEW_MIN = 3;
  var REVIEW_MAX = 4;
  var STREAK_TO_REMOVE = 2;   // 连续 2 次答对移出池

  // 只从已玩 core 轨原题取（L1–L15、L17、L18、L25、L26）
  var CORE_REPLAY_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 25, 26];

  // 阶段末综合关 / coreComplete 收尾局不插复习题
  var NO_REVIEW_LEVELS = [15, 27, 39, 48];

  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  function isCoreReplayLevel(levelId) {
    return CORE_REPLAY_LEVELS.indexOf(Number(levelId)) >= 0;
  }

  /* ---------------- 命名自检（C7 禁用词） ---------------- */

  function assertLabel(label) {
    var text = String(label == null ? LABEL : label).toLowerCase();
    var hits = BANNED_LABELS.filter(function (w) { return text.indexOf(String(w).toLowerCase()) >= 0; });
    return { ok: hits.length === 0, label: label == null ? LABEL : label, hits: hits };
  }

  /* ---------------- 触发间隔（每 3 关） ---------------- */

  /**
   * @param coreLevelsDone 已完成的 core 关数
   * @param opts { isFinale, isCoreComplete, groupSize, pool }
   * 返回 { insert, reason, reviewSize }
   */
  function shouldInsertReview(coreLevelsDone, opts) {
    opts = opts || {};
    var done = Math.max(0, Math.floor(Number(coreLevelsDone) || 0));
    if (done <= 0) return { insert: false, reason: 'no core level done yet', reviewSize: 0 };
    if (done % 3 !== 0) return { insert: false, reason: 'not a multiple of 3', reviewSize: 0 };
    if (opts.isCoreComplete) return { insert: false, reason: 'coreComplete 收尾局不插复习题', reviewSize: 0 };
    if (opts.isFinale) return { insert: false, reason: '阶段末综合关不插复习题', reviewSize: 0 };
    var pool = opts.pool || {};
    var available = Object.keys(pool).filter(function (k) { return (pool[k] && pool[k].count) >= 1; });
    if (!available.length) return { insert: false, reason: '池为空（无可复现原题）', reviewSize: 0 };
    var groupSize = opts.groupSize || 6;   // 4 岁起步 groupSize=6
    var size = Math.min(REVIEW_MAX, Math.max(REVIEW_MIN, Math.min(available.length, groupSize)));
    // reviewSize ≤ groupSize 硬约束
    size = Math.min(size, groupSize);
    return { insert: true, reason: '每 3 关一组', reviewSize: size, groupSize: groupSize };
  }

  /* ---------------- 确定性选题 ----------------
     filter(core && count>=1).sort(count DESC → lastWrongAt ASC → levelId ASC → qIndex ASC)
     禁止随机 / 盲盒。 */

  function parseRef(ref) {
    var parts = String(ref).split(':');
    return { levelId: Number(parts[0]), qIndex: Number(parts[1]) };
  }

  /* 题目「形状签名」：一关的渲染器只认得自己那几种形状。
     跨关原题若形状不同（例如 L8 的 drag 题混进 L9 的 tap/flash 题），
     关卡仍按自己的题型去画，q.a / q.b 取到 undefined，
     屏幕上就是 "undefined + undefined"、答案算成 NaN —— 孩子怎么点都不对。
     所以外来题必须在进队之前按形状筛一遍。 */
  function signatureOf(q) {
    if (!q || typeof q !== 'object') return '';
    var parts = [q.type || 'plain'];
    if (q.a != null && q.b != null) parts.push('ab');
    if (q.sentences) parts.push('sentences');
    if (q.eqs) parts.push('eqs');
    if (q.options) {
      var o = q.options[0];
      parts.push('opt:' + (o && typeof o === 'object' ? 'obj' : 'num'));
    }
    if (q.cards) parts.push('cards');
    if (q.combos) parts.push('combos');
    if (q.sums) parts.push('sums');
    if (q.groups) parts.push('groups');
    if (q.lists) parts.push('lists');
    if (q.routes) parts.push('routes');
    if (q.numbers) parts.push('numbers');
    if (q.nums) parts.push('nums');
    if (q.ones != null) parts.push('ones');
    if (q.add != null) parts.push('add');
    if (q.object) parts.push('object');
    if (q.animal) parts.push('animal');
    if (q.target != null) parts.push('target');
    return parts.join('|');
  }

  function selectReviewRefs(pool, size, accept) {
    pool = pool || {};
    var rows = Object.keys(pool).map(function (ref) {
      var p = parseRef(ref);
      return {
        ref: ref,
        levelId: p.levelId,
        qIndex: p.qIndex,
        count: Number(pool[ref] && pool[ref].count) || 0,
        lastWrongAt: Number(pool[ref] && pool[ref].lastWrongAt) || 0
      };
    }).filter(function (r) {
      if (!(r.count >= 1 && isCoreReplayLevel(r.levelId))) return false;
      // 形状不兼容的原题直接跳过（不占名额，后面的候选可以顶上来）
      return typeof accept === 'function' ? !!accept(r.ref) : true;
    });

    rows.sort(function (a, b) {
      if (b.count !== a.count) return b.count - a.count;             // count DESC
      if (a.lastWrongAt !== b.lastWrongAt) return a.lastWrongAt - b.lastWrongAt; // lastWrongAt ASC
      if (a.levelId !== b.levelId) return a.levelId - b.levelId;    // levelId ASC
      return a.qIndex - b.qIndex;                                    // qIndex ASC
    });

    var limit = Math.min(size == null ? REVIEW_MIN : size, REVIEW_MAX);
    return rows.slice(0, limit).map(function (r) { return r.ref; });
  }

  /* ---------------- 原题对象 + 原语音 key 解析 ----------------
     不改题目对象、不新增语音 key：返回的是 data.levels[levelId].questions[qIndex]
     的同一引用，以及它自带的 voice[0] 拼出的既有 key。 */

  function resolveRef(ref, data) {
    var p = parseRef(ref);
    var levels = data && data.levels;
    var lv = levels && levels[p.levelId];
    var q = lv && lv.questions && lv.questions[p.qIndex];
    if (!q) return null;
    var key = (q.voice && q.voice[0]) || ('q' + (p.qIndex + 1));
    return {
      ref: ref,
      levelId: p.levelId,
      qIndex: p.qIndex,
      question: q,                                   // 原对象（未改动）
      voiceKey: 'lv' + pad2(p.levelId) + '/' + key  // 原语音 key（既有）
    };
  }

  /* ---------------- 池维护（B7 wrongTag / C7 streak） ---------------- */

  function addWrong(pool, ref, tag, now) {
    pool = pool || {};
    var k = String(ref);
    if (!pool[k]) pool[k] = { count: 0, lastWrongAt: 0, streak: 0, wrongTag: tag || 'concept' };
    pool[k].count += 1;
    pool[k].lastWrongAt = now || Date.now();
    pool[k].streak = 0;                  // 答错打断连续答对
    pool[k].wrongTag = tag || pool[k].wrongTag;
    return pool;
  }

  /** 组内结果不计达成：只更新 streak，连续 2 次答对移出池；跳过不惩罚不记失败。 */
  function recordReviewResult(pool, ref, correct, skipped) {
    pool = pool || {};
    var k = String(ref);
    if (!pool[k]) return pool;
    if (skipped) return pool;            // 可跳过、不惩罚
    if (correct) {
      pool[k].streak = (pool[k].streak || 0) + 1;
      if (pool[k].streak >= STREAK_TO_REMOVE) delete pool[k];  // 连续 2 次答对移出池
    } else {
      pool[k].streak = 0;
      pool[k].lastWrongAt = Date.now();
    }
    return pool;
  }

  /* ---------------- 整组替换 + 守恒（对接 route-map.planQueue） ----------------
     整组替换当次新题；被替换的新题按原序压入 pendingQuestions[]，下组优先出队。
     返回纯数据，调用方（engine）负责写盘。 */

  function replaceGroup(newRefs, reviewRefs, groupSize) {
    var size = Math.min((reviewRefs || []).length, groupSize || 6);
    var queue = (reviewRefs || []).slice(0, size);   // 外来 core 原题进本组
    var displaced = (newRefs || []).slice(0, size);  // 等量本关新题被替换
    var pending = displaced.slice();                  // 压回 pending，下组优先
    return {
      queue: queue,
      pending: pending,
      displaced: displaced,
      reviewSize: size,
      // 守恒：本关新题一题不丢（被替换的进 pending，未替换的仍在 remaining）
      conserved: (queue.length <= (groupSize || 6)) &&
        (displaced.length === queue.length)
    };
  }

  /* ---------------- 与本地态分区对接（运行时，顶层不访问 DOM） ---------------- */

  function poolGet() {
    if (global.Wellbeing && global.Wellbeing.store) return global.Wellbeing.store.reviewPool();
    return (global.__reviewPool = global.__reviewPool || {});
  }

  function poolSet(pool) {
    if (global.Wellbeing && global.Wellbeing.store) {
      global.Wellbeing.store.setReviewPool(pool);
    } else {
      global.__reviewPool = pool;
    }
  }

  function recordWrong(levelId, qIndex, tag) {
    var pool = poolGet();
    pool = addWrong(pool, String(levelId) + ':' + qIndex, tag);
    poolSet(pool);
    if (global.Wellbeing && global.Wellbeing.store) {
      global.Wellbeing.store.addWrongTag(String(levelId) + ':' + qIndex, tag || 'concept');
    }
  }

  function buildReviewGroup(coreLevelsDone, data, opts) {
    var check = shouldInsertReview(coreLevelsDone, {
      isCoreComplete: opts && opts.isCoreComplete,
      isFinale: opts && opts.isFinale,
      groupSize: (opts && opts.groupSize) || 6,
      pool: poolGet()
    });
    if (!check.insert) return { insert: false, reason: check.reason };
    /* 本关能画哪些形状：调用方（engine）按本关题目算好传进来。
       没传就不筛（保持旧行为），传了就必须筛 —— 外来题型本关画不出来。
       另外只取「本关自己的旧题」：形状一样也不够，运算语义还会串
       （L9 的 11+7=18 到了 L11 会被画成 11−7=18）。 */
    var sigs = opts && opts.signatures;
    var selfId = opts && opts.levelId != null ? Number(opts.levelId) : null;
    var accept = null;
    if (sigs || selfId != null) {
      accept = function (ref) {
        if (selfId != null && parseRef(ref).levelId !== selfId) return false;
        if (!sigs) return true;
        var it = resolveRef(ref, data);
        return !!it && !!sigs[signatureOf(it.question)];
      };
    }
    var raw = selectReviewRefs(poolGet(), check.reviewSize, accept);
    /* 解析不出来的一律丢掉（重做过的关卡旧题号会失效），
       refs 也必须跟着过滤：调用方是按 refs.length 决定要不要插复习组的，
       留着死 ref 会插进一组查不到原题的空白题。 */
    var refs = [];
    var resolved = [];
    raw.forEach(function (r) {
      var it = resolveRef(r, data);
      if (!it) return;
      refs.push(r);
      resolved.push(it);
    });
    if (!refs.length) return { insert: false, reason: '池内没有本关画得出来的原题', reviewSize: 0 };
    return {
      insert: true,
      label: LABEL,
      reviewSize: resolved.length,
      refs: refs,
      items: resolved,           // {ref, levelId, qIndex, question, voiceKey}
      groupSize: check.groupSize
    };
  }

  /* ---------------- 对外接口 ---------------- */

  global.Review = {
    version: '1.0.0',
    LABEL: LABEL,
    BANNED_LABELS: BANNED_LABELS,
    CORE_REPLAY_LEVELS: CORE_REPLAY_LEVELS,
    NO_REVIEW_LEVELS: NO_REVIEW_LEVELS,
    REVIEW_MIN: REVIEW_MIN,
    REVIEW_MAX: REVIEW_MAX,
    STREAK_TO_REMOVE: STREAK_TO_REMOVE,
    assertLabel: assertLabel,
    isCoreReplayLevel: isCoreReplayLevel,
    shouldInsertReview: shouldInsertReview,
    parseRef: parseRef,
    signatureOf: signatureOf,
    selectReviewRefs: selectReviewRefs,
    resolveRef: resolveRef,
    addWrong: addWrong,
    recordReviewResult: recordReviewResult,
    replaceGroup: replaceGroup,
    poolGet: poolGet,
    poolSet: poolSet,
    recordWrong: recordWrong,
    buildReviewGroup: buildReviewGroup
  };
})(window);
