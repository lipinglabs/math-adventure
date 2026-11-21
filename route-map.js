/* ============================================================
   route-map.js · C3/C4/C6/C8 数据表 + 呈现规划纯函数
   ------------------------------------------------------------
   ★ 本文件只新增「指针表 / 标记表 / 纯函数」，绝不改动 levels_data.js
     里现有的 levels 数据、题目对象与语音 key；480 题一题不删。
   ★ 纯函数不依赖 DOM，可被 tmp/ 下的静态校验脚本用 vm 直接加载调用。

   4 岁起步：L1…L48 全部在 core 轨（P9 起取消隐藏轨），地图连续渲染 48 关。
   challenge 轨机制保留（完成不写 unlocked/stars/completedLevels、答错不进复习池），
   但当前没有任何关卡落在该轨。不做 3–4 岁档、不做三档选择。
   ============================================================ */

(function (global) {
  'use strict';

  /* ---------------- C1 七个限时关配置表 ----------------
     4 岁起步：7 关默认窗口一律 60s（消除 5 秒速度压力）；
     取消 L21/L30/L33/L36/L45 限时（timed:false / cancelTimer:true）；
     仅 L9 可选 15s、L12 可选 12s，challengeDefaultOff:true、仅家长主动开。
     超时不判错：不写 wrongCount、不进复习池、不扣、不卡关，只自动重听重给本题。 */
  var TIMER_CONFIG = {
    9:  { defaultWindowMs: 60000, timed: true,  challengeMs: 15000, challengeDefaultOff: true, cancelTimer: false, challengeWindow: 'L9 optional 15s' },
    12: { defaultWindowMs: 60000, timed: true,  challengeMs: 12000, challengeDefaultOff: true, cancelTimer: false, challengeWindow: 'L12 optional 12s' },
    21: { defaultWindowMs: 60000, timed: false, challengeMs: 0, challengeDefaultOff: true, cancelTimer: true },
    30: { defaultWindowMs: 60000, timed: false, challengeMs: 0, challengeDefaultOff: true, cancelTimer: true },
    33: { defaultWindowMs: 60000, timed: false, challengeMs: 0, challengeDefaultOff: true, cancelTimer: true },
    36: { defaultWindowMs: 60000, timed: false, challengeMs: 0, challengeDefaultOff: true, cancelTimer: true },
    45: { defaultWindowMs: 60000, timed: false, challengeMs: 0, challengeDefaultOff: true, cancelTimer: true }
  };

  var TIMER_LEVELS = [9, 12, 21, 30, 33, 36, 45];
  var CANCELLED_TIMER_LEVELS = [21, 30, 33, 36, 45];

  /* ---------------- C3/C4 双轨指针表 ----------------
     P1 L25/L26 前移到 L21 后；P2 L22/23/24/27 串成 challenge 连续上升组；
     P3 L17/L18 提入 core 尾（4 岁档纳入）；P4 L16/19/20/21 后移 challenge 前段；
     P5/P6/P7 的旧安排（L34 preview、L43→L44 插 31/32、L47/48 留 challenge）
     已被 P8 整体覆盖：乘除段重做后 L28–L48 是主课程。全部只改指针，不改 L 编号。 */

  /* P8（2026-11-15）乘除段重做：L28–L48 按《21 关按关策划案》整段重建，
     它现在是 4 岁档的正课（M1–M5 + D1–D5 + 三个综合收口），
     不再属于「家长开试一试才看得到」的挑战轨——否则整套新关卡在地图上不可见。

     P9（2026-11-21）取消隐藏轨：L16 / 19–24 / 27 同样是完整 10 题关卡，
     却被 P4/P2 留在了 challenge 轨；而「试一试」开关已从产品里删掉，
     结果是这些关在地图上根本不存在，解锁链在 15→17、18→25、26→28 三处断裂
     （进度停在 15 之后，17 永远点不动）。现在 1–48 全部进 core，解锁连续。 */
  var CORE = (function () {
    var all = [];
    for (var i = 1; i <= 48; i += 1) all.push(i);
    return all;
  })();
  var CHALLENGE = [];
  var OPTIONAL_PREVIEW = [];
  var PREVIEW_BETWEEN = {};   // 旧「L43→L44 间插预览题组」随乘除段重做一并作废

  // P1–P7 说明（供报告与静态校验核对「只改指针不删题」）
  var PATCHES = [
    { id: 'P1', note: 'L25/L26 前移到 L21 后（纳入 core 尾）', levels: [25, 26] },
    { id: 'P2', note: 'L22/23/24/27 串成 challenge 连续上升组', levels: [22, 23, 24, 27] },
    { id: 'P3', note: 'L17/L18 提入 core 尾（4 岁档纳入）', levels: [17, 18] },
    { id: 'P4', note: 'L16/19/20/21 后移 challenge 前段', levels: [16, 19, 20, 21] },
    { id: 'P5', note: '（作废）L34 标 optionalPreview —— 乘除段重做后 L28–L48 全部进 core', levels: [34] },
    { id: 'P6', note: '（作废）L43→L44 间插 L31/L32 preview —— 现在 31/32 就在主序列里', levels: [31, 32] },
    { id: 'P7', note: '（作废）L47/L48 留 challenge 末端 —— 现在是 core 的第 47/48 关', levels: [47, 48] },
    { id: 'P9', note: 'L16/19–24/27 并入 core：隐藏轨会让地图缺号且解锁链断裂', levels: [16, 19, 20, 21, 22, 23, 24, 27] }
  ];

  var routeMap = {
    core: CORE,
    challenge: CHALLENGE,
    coreComplete: true,          // core 轨有明确终点，不是无限流
    optionalPreview: OPTIONAL_PREVIEW,
    previewBetween: PREVIEW_BETWEEN,
    patches: PATCHES,
    singleAgeBand: true          // 4 岁档只渲染 core
  };

  /* levelMeta[L]：track / scopeTag / countsForAchievement。
     challenge 完成不写 unlocked/stars/completedLevels、答错不进复习池（C4）。 */
  var levelMeta = {};
  (function buildMeta() {
    var i;
    for (i = 1; i <= 48; i += 1) {
      var isCore = CORE.indexOf(i) >= 0;
      var scope = isCore ? 'inScope' : 'outOfScope';
      if (OPTIONAL_PREVIEW.indexOf(i) >= 0) scope = 'optionalPreview';
      levelMeta[i] = {
        track: isCore ? 'core' : 'challenge',
        scopeTag: scope,
        countsForAchievement: isCore,
        ageFloorSingleBand: 4     // 单一 4 岁档，无三档上调
      };
    }
  })();

  function isCore(levelId) { return CORE.indexOf(Number(levelId)) >= 0; }
  function metaOf(levelId) { return levelMeta[Number(levelId)] || levelMeta[48]; }

  /* ---------------- C8 25 关 wrong/fault 辨识类 ----------------
     统一归 identify-*，首次出现用示范「要找什么」（错误项轻微晃动后被圈出）
     + 高亮 + 常驻重听。语义标记是派生的，不改题目对象、不新增语音 key。 */
  var IDENTIFY_LEVELS = [9, 11, 15, 16, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
    31, 34, 37, 38, 39, 42, 43, 44, 46, 47, 48];
  var IDENTIFY_TYPES = {
    wrong: 1, fault: 1, faultv: 1, mixfault: 1, wrongSplit: 1, identify: 1
  };

  function identifyTagOf(levelId, type) {
    if (IDENTIFY_LEVELS.indexOf(Number(levelId)) < 0) return null;
    if (!type || !IDENTIFY_TYPES[String(type)]) return null;
    return 'identify-' + String(type);
  }

  /* ---------------- C9 补示范清单 ---------------- */
  var FLASH_LEVELS = TIMER_LEVELS;                       // 限时闪现题常驻重听
  var DRAG_LEVELS = [8, 16, 22];                         // 拖拽提示（≥88px 目标）
  var PAIR_LEVELS = [6, 14, 35, 42];                     // 连线配对提示
  var MULTI_TYPE_LEVELS = [3, 8, 13, 14, 15, 27, 39, 48]; // 换题型先停 0.5s→图标→演示→出题
  var PLACEHOLDER_LEVELS = [5, 8, 41];                   // 选项占位符用既有实物图补齐

  /* ---------------- C6 六操作族归一化 ----------------
     同族内切换不算新增题型（操作相同，孩子不必重学规则）——这是零语音改动的关键。
     每关 ≤2 族、相邻两关新增族 ≤1、同族连续 ≥2 关；超额族整块搬到相邻同族关，
     搬出的题顺延 pendingQuestions[]，480 题一题不丢。 */

  var FAMILIES = ['点选', '数数', '拖拽', '配对', '填空', '运算'];

  var TYPE_TO_FAMILY = {
    // 点选类
    tap: '点选', pick: '点选', flash: '点选', touch: '点选', choice: '点选',
    find: '点选', wheel: '点选', step: '点选', row: '点选', give: '点选',
    wrong: '点选', fault: '点选', faultv: '点选', mixfault: '点选',
    wrongSplit: '点选', pic: '点选', balloon: '点选',
    // 数数类
    count: '数数', link: '数数', build: '数数', blocks: '数数',
    group: '数数', groups: '数数', ring: '数数',
    // 拖拽类
    drag: '拖拽',
    // 配对类
    pair: '配对', match: '配对', reverse: '配对', listen: '配对',
    say: '配对', read: '配对',
    // 填空类
    fill: '填空', splitfill: '填空', sign: '填空', sentence: '填空',
    number: '填空', solve: '填空', split: '填空', break: '填空',
    process: '填空', borrow: '填空', fillq: '填空', fillArray: '填空',
    // 运算类
    add: '运算', sub: '运算', calc: '运算', take: '运算', fly: '运算',
    branch: '运算', shop: '运算', receipt: '运算', lane: '运算',
    chain: '运算', addsub: '运算', times: '运算', divide: '运算',
    equiv: '运算', share: '运算', plate: '运算', fair: '运算'
  };

  function familyOf(type) {
    if (!type) return '点选';                 // L1…L4 无 type 的实物加法点选
    return TYPE_TO_FAMILY[String(type)] || '点选'; // 兜底不漏题
  }

  /** 一关题目的族集合（去重，按首次出现顺序）。 */
  function familiesOfLevel(questions) {
    var seen = {};
    var out = [];
    (questions || []).forEach(function (q) {
      var f = familyOf(q && q.type);
      if (!seen[f]) { seen[f] = 1; out.push(f); }
    });
    return out;
  }

  /**
   * C6 呈现重排（纯函数）：同族聚成连续块、块首打 isFirstOfType；
   * 超过 maxFamilies 的整块搬到 moved（顺延 pendingQuestions），
   * 保证 shown + moved = questions（480 题一题不丢），且 shown 族数 ≤ maxFamilies。
   * 不改动任何题目对象：isFirstOfType 以「索引列表」返回，由 feedback 挂载示范。
   */
  function planPresentation(questions, maxFamilies) {
    var limit = maxFamilies || 2;           // 4 岁起步：每关 ≤2 族
    var blocks = {};
    var order = [];
    (questions || []).forEach(function (q, idx) {
      var f = familyOf(q && q.type);
      if (!blocks[f]) { blocks[f] = []; order.push(f); }
      blocks[f].push({ q: q, idx: idx, family: f });
    });
    var kept = order.slice(0, limit);
    var movedFamilies = order.slice(limit);
    var shown = [];
    var firstOfTypeIndex = [];
    kept.forEach(function (f) {
      blocks[f].forEach(function (item, k) {
        if (k === 0) firstOfTypeIndex.push(shown.length); // 块首 → 挂示范
        shown.push(item.q);
        item.isFirstOfType = (k === 0);
      });
    });
    var moved = [];
    movedFamilies.forEach(function (f) {
      blocks[f].forEach(function (item) { moved.push(item.q); });
    });
    return {
      shown: shown,
      moved: moved,
      families: kept,
      movedFamilies: movedFamilies,
      firstOfTypeIndex: firstOfTypeIndex,
      conserved: (shown.length + moved.length === (questions || []).length)
    };
  }

  /**
   * C6 回归断言：逐关校验「呈现后族数 ≤2」、相邻两关新增族 ≤1（信息项）、
   * 同族连续 ≥2 关（信息项），并校验每题只出现一次。
   * 硬断言：族数上限 + 题目守恒；梯度项作为 violations 建议输出但不改题。
   */
  function checkTypeBudget(data, opts) {
    opts = opts || {};
    var maxFamilies = opts.maxFamilies || 2;   // 4 岁起步：≤2
    var levels = (data && data.levels) || {};
    var ids = Object.keys(levels).map(Number).sort(function (a, b) { return a - b; });
    var perLevel = {};
    var hardViolations = [];
    var softNotes = [];
    var prevFamilies = null;
    var runFamily = null, runLen = 0, runNotes = [];

    ids.forEach(function (id) {
      var qs = levels[id].questions || [];
      var plan = planPresentation(qs, maxFamilies);
      var fams = plan.families;
      perLevel[id] = { families: fams, shown: plan.shown.length, moved: plan.moved.length };

      if (fams.length > maxFamilies) {
        hardViolations.push('L' + id + ' 族数 ' + fams.length + ' > ' + maxFamilies);
      }
      if (!plan.conserved) {
        hardViolations.push('L' + id + ' 题目不守恒');
      }
      if (plan.shown.length + plan.moved.length !== qs.length) {
        hardViolations.push('L' + id + ' 重排后题量变化');
      }
      // 相邻两关新增族 ≤1（信息项）
      if (prevFamilies) {
        var added = fams.filter(function (f) { return prevFamilies.indexOf(f) < 0; });
        if (added.length > 1) softNotes.push('L' + id + ' 相邻新增族 ' + added.length + '（建议 ≤1）');
      }
      // 同族连续 ≥2 关（信息项）
      var primary = fams[0] || '';
      if (primary === runFamily) runLen += 1;
      else { runFamily = primary; runLen = 1; }
      if (runLen < 2 && id !== ids[0]) runNotes.push('L' + id + ' 主族 ' + primary + ' 连续 ' + runLen + ' 关');
      prevFamilies = fams;
    });

    return {
      ok: hardViolations.length === 0,
      maxFamilies: maxFamilies,
      levelCount: ids.length,
      hardViolations: hardViolations,
      adjacentAddedNotes: softNotes,
      runLengthNotes: runNotes,
      perLevel: perLevel
    };
  }

  /* ---------------- C3/C4 指针合法性断言 ---------------- */
  function checkRoute() {
    var all = [];
    for (var i = 1; i <= 48; i += 1) all.push(i);
    var problems = [];
    var seen = {};
    CORE.forEach(function (id) {
      if (id < 1 || id > 48) problems.push('core 越界 ' + id);
      if (seen[id]) problems.push('core 重复 ' + id);
      seen[id] = 1;
    });
    CHALLENGE.forEach(function (id) {
      if (id < 1 || id > 48) problems.push('challenge 越界 ' + id);
      if (seen[id]) problems.push('与 core 交叉 ' + id);
      seen[id] = 1;
    });
    all.forEach(function (id) { if (!seen[id]) problems.push('关卡漏归类 ' + id); });
    if (CORE.length + CHALLENGE.length !== 48) problems.push('双轨总数 ≠ 48');
    if (!routeMap.coreComplete) problems.push('core 轨缺终点');
    return { ok: problems.length === 0, core: CORE.slice(), challenge: CHALLENGE.slice(), problems: problems };
  }

  /* ---------------- C5/C6/C7 呈现规划（纯函数，供静态守恒校验） ----------------
     题引用统一为 `${levelId}:${qIndex}`，只搬指针不搬题目对象、不新增语音 key。
     不变量：对任一关，solved ∪ pending ∪ active(本关) ∪ remaining === allRefs（10 题）。 */

  function uniq(list) {
    var seen = {}, out = [];
    (list || []).forEach(function (r) { if (!seen[r]) { seen[r] = 1; out.push(r); } });
    return out;
  }

  function refsOf(levelId, count) {
    var out = [];
    for (var i = 0; i < count; i += 1) out.push(String(levelId) + ':' + i);
    return out;
  }

  /**
   * 规划本次题组应出的题。
   * · C5：6+4 分组（groupSizes 默认 [6,4]），逐题写盘由调用方负责
   * · C5：pending 优先出队（被替换 / 搬走的新题下组先出），不重放已做对的题
   * · C7：reviewRefs（别关 core 原题）整组替换当次新题（reviewSize ≤ groupSize），
   *        被替换的本关新题按原序压回 pending，总题量一秒不增
   * · 全程只返回引用数组，不改动任何题目对象。
   */
  function planQueue(levelId, allRefs, state) {
    state = state || {};
    var solved = uniq(state.solved);
    var pending = uniq(state.pending);
    var groupSizes = state.groupSizes || [6, 4];   // 4 岁起步：6+4
    var gIdx = Math.min(state.groupIndex || 0, groupSizes.length - 1);
    var groupSize = groupSizes[gIdx];
    var reviewRefs = state.reviewRefs || null;

    var solvedSet = {}, pendingSet = {};
    solved.forEach(function (r) { solvedSet[r] = 1; });
    pending.forEach(function (r) { pendingSet[r] = 1; });

    var remaining = allRefs.filter(function (r) { return !solvedSet[r] && !pendingSet[r]; });

    var queue = [];
    var displaced = [];
    if (reviewRefs && reviewRefs.length) {
      /* C7 整组替换：复习原题只「顶掉」等量的本关新题，
         本组长度仍等于 groupSize（否则整组只剩 3–4 题就结算，
         孩子刚热身就领星，进度点也和实际题数对不上）。
         同关复现（复习题本来就是本关的题）不占名额：直接提到本组最前面。 */
      var size = Math.min(reviewRefs.length, groupSize);
      var rev = reviewRefs.slice(0, size);
      var foreignRev = rev.filter(function (r) { return allRefs.indexOf(r) < 0; });
      // 复习题本身要从候选里排掉，避免同一题出现两次
      var pool = remaining.concat(pending).filter(function (r) { return rev.indexOf(r) < 0; });
      displaced = pool.slice(0, Math.min(foreignRev.length, pool.length));
      var fill = pool.slice(displaced.length,
        displaced.length + Math.max(0, groupSize - rev.length));
      var usedSet = {};
      displaced.forEach(function (r) { usedSet[r] = 1; });
      fill.forEach(function (r) { usedSet[r] = 1; });
      queue = rev.concat(fill);
      pending = pending.filter(function (r) { return !usedSet[r]; }).concat(displaced);
    } else {
      // 正常出题：pending 优先，再从 remaining 补足，不超过 groupSize
      var fromPending = pending.slice(0, groupSize);
      pending = pending.slice(fromPending.length);
      var need = groupSize - fromPending.length;
      var fromRemaining = remaining.slice(0, Math.max(0, need));
      queue = fromPending.concat(fromRemaining);
    }

    // 本关局部守恒：queue 中属于本关的题才算 active
    var queueSet = {};
    queue.forEach(function (r) { queueSet[r] = 1; });
    var pendingSet2 = {};
    pending.forEach(function (r) { pendingSet2[r] = 1; });
    var activeLocal = queue.filter(function (r) { return allRefs.indexOf(r) >= 0; });
    var activeSet = {};
    activeLocal.forEach(function (r) { activeSet[r] = 1; });
    var remainingAfter = allRefs.filter(function (r) {
      return !solvedSet[r] && !pendingSet2[r] && !activeSet[r];
    });

    var parts = solved.concat(pending, activeLocal, remainingAfter);
    var noDup = uniq(parts).length === parts.length;
    var sum = solved.length + pending.length + activeLocal.length + remainingAfter.length;
    var ok = (sum === allRefs.length) && noDup;

    return {
      queue: queue,
      pending: pending,
      displaced: displaced,
      groupIndex: gIdx,
      groupSize: groupSize,
      cursor: {
        nextQIndex: (state.nextQIndex || 0),
        currentGroupId: gIdx,
        groupsDone: (state.groupsDone || []).slice(),
        groupResults: (state.groupResults || {})
      },
      conservation: {
        total: allRefs.length,
        solved: solved.length,
        pending: pending.length,
        active: activeLocal.length,
        remaining: remainingAfter.length,
        noDuplicate: noDup,
        ok: ok
      }
    };
  }

  /** 全局守恒：Σ(solved+pending+active+remaining) 必须恒等于 480。 */
  function conservationGlobal(perLevelStates) {
    var total = 0;
    var problems = [];
    Object.keys(perLevelStates || {}).forEach(function (k) {
      var c = perLevelStates[k];
      var s = c.conservation;
      if (!s || !s.ok) problems.push('L' + k + ' 局部守恒失败');
      total += s ? (s.solved + s.pending + s.active + s.remaining) : 0;
    });
    return { total: total, expected: 480, ok: problems.length === 0 && total === 480, problems: problems };
  }

  /* ---------------- 对外接口 ---------------- */

  global.RouteMap = {
    version: '1.0.0',
    TIMER_CONFIG: TIMER_CONFIG,
    TIMER_LEVELS: TIMER_LEVELS,
    CANCELLED_TIMER_LEVELS: CANCELLED_TIMER_LEVELS,
    routeMap: routeMap,
    levelMeta: levelMeta,
    CORE: CORE,
    CHALLENGE: CHALLENGE,
    IDENTIFY_LEVELS: IDENTIFY_LEVELS,
    FLASH_LEVELS: FLASH_LEVELS,
    DRAG_LEVELS: DRAG_LEVELS,
    PAIR_LEVELS: PAIR_LEVELS,
    MULTI_TYPE_LEVELS: MULTI_TYPE_LEVELS,
    PLACEHOLDER_LEVELS: PLACEHOLDER_LEVELS,
    FAMILIES: FAMILIES,
    TYPE_TO_FAMILY: TYPE_TO_FAMILY,

    isCore: isCore,
    metaOf: metaOf,
    identifyTagOf: identifyTagOf,
    familyOf: familyOf,
    familiesOfLevel: familiesOfLevel,
    planPresentation: planPresentation,
    planQueue: planQueue,
    refsOf: refsOf,
    conservationGlobal: conservationGlobal,
    checkTypeBudget: checkTypeBudget,
    checkRoute: checkRoute
  };
})(window);
