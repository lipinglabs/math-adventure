/* ============================================================
   wellbeing.js · A 组：护眼时长 / 休息 / 每日累计 / 独立本地分区
   ------------------------------------------------------------
   本文件在 engine.js 之前加载，只依赖原生 localStorage / CustomEvent，
   不依赖 Engine / Progress / Cloud，也不访问 DOM 的顶层（便于离线与静态校验）。

   硬前提（用户 2026-11-14 裁定）：孩子刚满 4 周岁、私人自用、单一 4 岁档，
   不做 3–4 岁档、不做 ageBand 三档选择 UI、不按年龄上调档位。

   ★ 关键：本文件管理的 settings / usage / daily / levelCursor /
     pendingQuestions / wrongTags / reviewPool 全部落在独立 localStorage
     分区 'math-adventure.local.v1'，绝不写进 Progress.read() 的返回值，
     因此 Gist payload 的字段 / 结构 / 版本号完全不变、不跨设备同步（A6 / E3）。
   ============================================================ */

(function (global) {
  'use strict';

  /* 全局事件名常量：所有模块（wellbeing / engine / review / feedback / app）
     共用这些字符串，解耦加载顺序。等价于专家清单里的 EVT_* 事件。 */
  var EVT = {
    TICK: 'wb:tick',                     // EVT_TICK 双口径计时共用
    LEVEL_ENTER: 'wb:levelEnter',        // EVT_LEVEL_ENTER（惰性重置比对点）
    QUESTION_ENTER: 'wb:questionEnter',  // EVT_QUESTION_ENTER（限时窗口求值点）
    LEVEL_COMPLETE: 'wb:levelComplete',  // EVT_LEVEL_COMPLETE（完成即解锁）
    SETTINGS_CHANGED: 'wb:settingsChanged', // EVT_SETTINGS_CHANGED（timer.rebase）
    UNDO: 'wb:undo',                     // EVT_UNDO（撤销不写数据）
    TAP: 'wb:tap',                       // EVT_TAP（进入 S_CONFIRM）
    CONFIRM: 'wb:confirm',
    ADVANCE: 'wb:advance',               // onAdvance 唯一拦截点
    GROUP_DONE: 'wb:groupDone',
    DAILY_CAP: 'wb:dailyCap',
    REST_SHOWN: 'wb:restShown',
    WRONG: 'quiz:wrong'                  // 兼容 engine 旧错题事件名
  };
  global.EVT = EVT;

  /* ---------------- 4 岁起步硬参数 ----------------
     取值理由（专家表「4–5 岁」列 + 用户裁定单一 4 岁档）：
       · 单局 600s / 每日 1200s：4 岁持续注意约 10–12 分钟、每日屏幕 20 分钟
       · SESSION_CAP_MAX 900 / DAILY_CAP_MAX 1800：绝对上限，任何情况不得突破
       · 休息画面 20s；REST_GAP_MS 180000 仅作「两次休息之间的去抖窗口」，
         不能用来绕过「连续两局至少一次休息」这条硬要求
       · 题组切 6+4（GROUP_SIZE=6）；达标线 8/6 仅作内部软统计（不进孩子界面）
       · 防误触确认 0.4s、单题停留上限 3：4 岁误触率高、需单点确认与三级放行 */
  var CAP = {
    SESSION_CAP_SEC: 600,
    DAILY_CAP_SEC: 1200,
    SESSION_CAP_MAX: 900,
    DAILY_CAP_MAX: 1800,
    REST_SCENE_SEC: 20,
    REST_GAP_MS: 180000,
    GROUP_SIZE: 6,
    GROUP_SPLIT: [6, 4],
    CONFIRM_MS: 400,
    MAX_DWELL: 3,
    PASS_COMPLETED: 8,     // 达标线（内部软统计，不 gate 任何反馈）
    PASS_CORRECT: 6,
    SINGLE_AGE_BAND: true  // 明确：无 3–4 岁档、无三档选择 UI、不上调档位
  };
  global.WB_CAP = CAP;

  var LS_KEY = 'math-adventure.local.v1';
  global.WB_LOCAL_KEY = LS_KEY;

  var _cache = null;

  function emit(name, detail) {
    if (typeof document === 'undefined' || !document.dispatchEvent) return;
    try {
      document.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
    } catch (e) {
      try { document.dispatchEvent(new CustomEvent(name)); } catch (e2) { /* noop */ }
    }
  }

  /* ---------------- 独立分区（不进云同步白名单） ---------------- */

  function blankState() {
    return {
      settings: {
        // 家长开关已删除：以下全部为固定值，不再由 UI 修改（载入时由 pinFixedSettings 压回默认）
        noTimer: false,            // 核心关保留 60 秒宽松计时；超时只重听、不判错
        challengeTimers: { 9: false, 12: false }, // 9/12 限时挑战关闭
        showChallenge: false       // 「试一试」挑战关不作为入口显示
      },
      usage: {
        growthPoints: 0,           // 等量成长点（答对/到点收尾都给，不惩罚）
        growthLeaves: 0,           // 成长树叶片（家长按「听到啦」+1 叶）
        challengePlayed: [],       // C4 只记 challenge 轨玩过哪些关
        challengeTimeout: {}       // C1 挑战超时统计，仅家长可见、不计达成
      },
      daily: {},                   // A1 只留最近 1 天
      levelCursor: {},             // C5 逐题写盘
      pendingQuestions: [],        // C5/C6/C7 顺延题，下组优先出队（480 题一题不丢）
      wrongTags: {},               // B7 wrongTag（needListen / needHint / concept）
      reviewPool: {}               // C7 再玩一次池 `${levelId}:${qIndex}`
    };
  }

  function shallowFill(target, src) {
    if (!src || typeof src !== 'object') return target;
    Object.keys(src).forEach(function (k) {
      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) &&
          target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) {
        shallowFill(target[k], src[k]);
      } else {
        target[k] = src[k];
      }
    });
    return target;
  }

  /* 家长开关已删除 → 以下值固定，不再随存档变化，保证行为唯一：
     核心关保留 60 秒宽松计时（超时只重听、不判错）、不显示「试一试」关卡、
     9/12 限时挑战关闭、金星徽章废弃。旧存档里家长曾勾选过的值在此压回默认，
     避免同一版本在不同设备上表现不一致。 */
  function pinFixedSettings(s) {
    var st = s.settings || (s.settings = {});
    st.noTimer = false;
    st.showChallenge = false;
    st.challengeTimers = { 9: false, 12: false };
    return s;
  }

  function load() {
    if (_cache) return _cache;
    var raw = null;
    try { raw = global.localStorage && global.localStorage.getItem(LS_KEY); } catch (e) { /* 隐私模式 */ }
    var parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    var base = blankState();
    if (parsed && typeof parsed === 'object') shallowFill(base, parsed);
    _cache = pinFixedSettings(base);
    return _cache;
  }

  function save() {
    var s = load();
    try { global.localStorage && global.localStorage.setItem(LS_KEY, JSON.stringify(s)); }
    catch (e) { /* 隐私模式 / 配额满：静默降级为内存态 */ }
    return s;
  }

  function patch(mutator) {
    var s = load();
    if (typeof mutator === 'function') mutator(s);
    return save();
  }

  /* ---------------- A6 设置 / usage 分区 ---------------- */

  function settings() { return load().settings; }

  function setSettings(patchObj) {
    var s = load();
    Object.keys(patchObj || {}).forEach(function (k) { s.settings[k] = patchObj[k]; });
    save();
    emit(EVT.SETTINGS_CHANGED, { settings: s.settings });
    return s.settings;
  }

  function usage() { return load().usage; }

  function addGrowthPoints(n) {
    return patch(function (s) { s.usage.growthPoints += (n == null ? 1 : n); }).usage.growthPoints;
  }

  function addLeaf() {
    return patch(function (s) { s.usage.growthLeaves += 1; }).usage.growthLeaves;
  }

  function addChallengePlayed(levelId) {
    patch(function (s) {
      if (s.usage.challengePlayed.indexOf(levelId) < 0) s.usage.challengePlayed.push(levelId);
    });
  }

  function addChallengeTimeout(levelId) {
    patch(function (s) {
      var k = String(levelId);
      s.usage.challengeTimeout[k] = (s.usage.challengeTimeout[k] || 0) + 1;
    });
  }

  /* ---------------- A1 每日记录 + 惰性重置 ----------------
     只在 EVT_LEVEL_ENTER 比对设备本地自然日 todayKey，不一致则新建当日空记录；
     无需定时任务，跨天 / 多日不玩都能正确重置；旧记录只留最近 1 天。 */

  function todayKey(d) {
    var t = d || new Date();
    var p = function (n) { return n < 10 ? '0' + n : String(n); };
    return t.getFullYear() + '-' + p(t.getMonth() + 1) + '-' + p(t.getDate());
  }

  function ensureDaily() {
    var key = todayKey();
    return patch(function (s) {
      var d = s.daily;
      if (!d[key]) {
        // 只留最近 1 天：丢弃所有非今天的记录
        Object.keys(d).forEach(function (k) { if (k !== key) delete d[k]; });
        d[key] = {
          accumSec: 0, sessionCount: 0, restCount: 0,
          capped: false, lastDate: key, crossedHalf: false, lastRestAt: 0
        };
      }
      d[key].lastDate = key;
    }).daily[key];
  }

  function daily() { return ensureDaily(); }

  function onLevelEnter(levelId) {
    ensureDaily();
    emit(EVT.LEVEL_ENTER, { levelId: levelId, todayKey: todayKey() });
    // A1 attemptCount 语义「进入该关次数」由 progress.recordAttempt 在 app.enterLevel 处理
    return daily();
  }

  function bumpSession() {
    return patch(function (s) {
      var d = ensureDailyRef(s);
      d.sessionCount += 1;
    }).daily[todayKey()];
  }

  // 内部版：避免 patch 里再调 ensureDaily 造成重入
  function ensureDailyRef(s) {
    var key = todayKey();
    if (!s.daily[key]) {
      Object.keys(s.daily).forEach(function (k) { if (k !== key) delete s.daily[k]; });
      s.daily[key] = {
        accumSec: 0, sessionCount: 0, restCount: 0,
        capped: false, lastDate: key, crossedHalf: false, lastRestAt: 0
      };
    }
    return s.daily[key];
  }

  function bumpRest() {
    return patch(function (s) {
      var d = ensureDailyRef(s);
      d.restCount += 1;
      d.lastRestAt = Date.now();
    }).daily[todayKey()];
  }

  /* ---------------- A2 两套计时口径（共用 EVT_TICK 分别累加） ----------------
     · sessionAccumSec：有效互动时长；重听 / 休息 / 结算 / 切后台 / 加载一律暂停不计
     · daily.accumSec：真实屏幕占用，含题干播放、示范动画、休息画面
     两者在同一个 onSecond 里分别 +1，绝不互相覆盖。 */

  var clock = {
    intervalId: null,
    interactive: false,   // 是否处于有效互动（暂停时不计 sessionAccumSec）
    screenOn: false,      // 屏幕是否占用（休息/题干播放也算）
    sessionAccumSec: 0,
    timeUpPending: false, // A3 DRAINING 标志
    resolved: true,       // 本题是否已 resolved
    draining: false
  };

  function onSecond() {
    var s = load();
    var d = ensureDailyRef(s);
    var deltaSession = 0;
    var deltaDaily = 0;

    if (clock.interactive && !clock.draining) {
      clock.sessionAccumSec += 1;
      deltaSession = 1;
    }
    // 屏幕占用：只要没锁屏就计入（含休息画面、题干播放、示范动画）
    if (clock.screenOn) {
      d.accumSec += 1;
      deltaDaily = 1;
    }

    // 每日累计首次越过 50% → A4 触发一次休息判断（只置标志，不在此打断）
    var half = CAP.DAILY_CAP_SEC * 0.5;
    if (!d.crossedHalf && d.accumSec >= half && d.accumSec - deltaDaily < half) {
      d.crossedHalf = true;
    }

    // 到单局上限：只置 timeUpPending，不弹窗不警告不倒计时不强制退出（A3）
    if (!clock.timeUpPending && clock.sessionAccumSec >= Math.min(CAP.SESSION_CAP_SEC, CAP.SESSION_CAP_MAX)) {
      clock.timeUpPending = true;
    }
    // 每日上限：只置 capped，DayCompleteScene 可返回可继续不锁死（A5）
    if (!d.capped && d.accumSec >= Math.min(CAP.DAILY_CAP_SEC, CAP.DAILY_CAP_MAX)) {
      d.capped = true;
      emit(EVT.DAILY_CAP, { accumSec: d.accumSec });
    }

    save();
    emit(EVT.TICK, {
      sessionAccumSec: clock.sessionAccumSec,   // 口径一：有效互动
      dailyAccumSec: d.accumSec,                // 口径二：真实屏幕占用
      deltaSession: deltaSession,
      deltaDaily: deltaDaily,
      timeUpPending: clock.timeUpPending,
      capped: d.capped
    });
  }

  function startClock() {
    if (clock.intervalId) return;
    clock.screenOn = true;
    clock.intervalId = setInterval(onSecond, 1000);
  }

  function stopClock() {
    if (clock.intervalId) clearInterval(clock.intervalId);
    clock.intervalId = null;
    clock.screenOn = false;
    clock.interactive = false;
  }

  /** 暂停有效互动口径，但屏幕仍占用（重听/休息/结算/切后台/加载）。 */
  function setInteractive(on) { clock.interactive = !!on; }
  function setScreen(on) { clock.screenOn = !!on; }
  function pauseFor() { clock.interactive = false; }   // 屏幕仍计入 daily
  function resumeInteractive() { clock.interactive = true; }

  function startSession() {
    clock.sessionAccumSec = 0;
    clock.timeUpPending = false;
    clock.resolved = true;
    clock.draining = false;
    clock.interactive = true;
    clock.screenOn = true;
    bumpSession();
    startClock();
  }

  /* ---------------- A3 DRAINING 到点不打扰收尾 ----------------
     timeUpPending 只在「本题 resolved 之后、下一题 enter 之前」才真正收尾；
     deadlineReached 只影响「是否加载下一题」，不影响本题判定 / 解锁 / 存档。
     不弹窗、不警告、不倒计时、不强制退出、不惩罚；收尾照样给等量成长点。 */

  function beginQuestion() {
    clock.resolved = false;
    emit(EVT.QUESTION_ENTER, { index: clock.sessionAccumSec });
  }

  function resolveQuestion() {
    clock.resolved = true;
  }

  /** onAdvance 的唯一拦截点：返回 true 表示应进入收尾而不是加载下一题。 */
  function beforeAdvance() {
    if (!clock.timeUpPending) { emit(EVT.ADVANCE, { drained: false }); return false; }
    if (!clock.resolved) return false;        // 本题还没判完，绝不半途打断
    clock.draining = true;
    clock.interactive = false;
    addGrowthPoints(1);                       // 收尾照样给等量成长点
    emit(EVT.ADVANCE, { drained: true });
    return true;
  }

  function drainDone() {
    clock.draining = false;
    clock.timeUpPending = false;
    clock.sessionAccumSec = 0;
  }

  /* ---------------- A4 连续两局至少一次休息 ----------------
     shouldInsertRest()：sessionCountToday >= 2 或 当日累计首次越过 50%；
     REST_GAP_MS 仅作两次休息间「去抖窗口」，不能用来绕过硬要求；
     第 2 局强制插入一次兜底。 */

  function shouldInsertRest() {
    // 仅自动化回归使用：?smoke=1 时置位，跳过硬插入的休息画面，避免 20s 画面拖慢冒烟。
    if (global.Wellbeing && global.Wellbeing.__skipRest === true) return false;
    var d = ensureDaily();
    var now = Date.now();
    // 去抖：距离上次休息不足 REST_GAP_MS 时不重复弹（但不能因此跳过第 2 局兜底）
    var gapOk = !d.lastRestAt || (now - d.lastRestAt) >= CAP.REST_GAP_MS;
    var bySessions = d.sessionCount >= 2;
    var byHalf = !!d.crossedHalf;
    var forcedSecond = d.sessionCount >= 2 && d.restCount === 0; // 第 2 局强制兜底
    return forcedSecond || ((bySessions || byHalf) && gapOk);
  }

  function markRestShown() {
    bumpRest();
    emit(EVT.REST_SHOWN, { count: ensureDaily().restCount });
  }

  /* ---------------- A5 RestScene / DayCompleteScene ----------------
     内联 SVG 角色打哈欠 / 伸展 / 看远处，20 秒，无文字无语音；
     prefers-reduced-motion 时降级为静态柔和画面（时长不变，不闪）。 */

  function svgCharacter() {
    return '<svg class="wb-scene-svg" viewBox="0 0 200 200" aria-hidden="true">' +
      '<g class="wb-char">' +
      '<ellipse cx="100" cy="176" rx="46" ry="8" fill="rgba(0,0,0,.06)"/>' +
      '<circle class="wb-head" cx="100" cy="92" r="40" fill="#F7D9A8" stroke="#E9BE86" stroke-width="2"/>' +
      '<circle cx="84" cy="88" r="4.5" fill="#5B4636"/>' +
      '<circle cx="116" cy="88" r="4.5" fill="#5B4636"/>' +
      '<ellipse class="wb-mouth" cx="100" cy="106" rx="7" ry="9" fill="#C98B6B"/>' +
      '<path class="wb-arm wb-arm--l" d="M62 120 q-26 6 -34 -18" fill="none" stroke="#E9BE86" stroke-width="9" stroke-linecap="round"/>' +
      '<path class="wb-arm wb-arm--r" d="M138 120 q26 6 34 -18" fill="none" stroke="#E9BE86" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M78 128 q22 16 44 0" fill="none" stroke="#E9BE86" stroke-width="7" stroke-linecap="round"/>' +
      '</g>' +
      '<g class="wb-zzz" fill="#8FB8E8">' +
      '<text x="150" y="52" font-size="16">z</text>' +
      '<text x="162" y="40" font-size="12">z</text>' +
      '<text x="172" y="30" font-size="9">z</text>' +
      '</g></svg>';
  }

  function injectHostStyle(host) {
    if (!host) return;
    host.classList.add('wb-scene-host');
  }

  /** 20 秒柔和休息画面，无文字、无语音、不弹窗不强制退出。 */
  function showRestScene(host, onDone) {
    if (!host) { if (onDone) onDone(); return; }
    injectHostStyle(host);
    host.innerHTML = '<div class="wb-scene wb-scene--rest">' + svgCharacter() + '</div>';
    markRestShown();
    var ms = CAP.REST_SCENE_SEC * 1000;
    setTimeout(function () {
      if (host.firstChild) host.innerHTML = '';
      host.classList.remove('wb-scene-host');
      if (typeof onDone === 'function') onDone();
    }, ms);
  }

  /** 每日上限后收尾：可返回、可继续、不锁死。 */
  function showDayCompleteScene(host, onBack, onContinue) {
    if (!host) return;
    injectHostStyle(host);
    host.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'wb-scene wb-scene--day';
    box.innerHTML = svgCharacter() +
      '<div class="wb-day-actions">' +
      '<button type="button" class="wb-day-btn" data-act="back">Home</button>' +
      '<button type="button" class="wb-day-btn wb-day-btn--main" data-act="continue">Keep playing</button>' +
      '</div>';
    host.appendChild(box);
    box.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (!b) return;
      host.innerHTML = '';
      host.classList.remove('wb-scene-host');
      if (b.getAttribute('data-act') === 'back') { if (onBack) onBack(); }
      else { if (onContinue) onContinue(); }
    });
  }

  /* ---------------- E1/E2 成长树 + 家长陪玩钩子数据 ---------------- */

  function growthTreeSVG(leaves) {
    var n = Math.max(0, Math.min(leaves, 24));
    var dots = '';
    for (var i = 0; i < n; i += 1) {
      var a = (i * 2.399);
      var x = 100 + Math.cos(a) * (18 + i * 2.4);
      var y = 76 + Math.sin(a) * (14 + i * 1.7);
      dots += '<ellipse cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) +
        '" rx="7" ry="4.5" fill="#7FC8A9" transform="rotate(' +
        (a * 57).toFixed(0) + ' ' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"/>';
    }
    return '<svg class="wb-tree" viewBox="0 0 200 200" aria-hidden="true">' +
      '<path d="M100 176 V96" stroke="#B08A5E" stroke-width="10" stroke-linecap="round"/>' +
      '<path d="M100 130 q-34 -6 -48 -34 M100 118 q34 -8 50 -36" fill="none" stroke="#B08A5E" stroke-width="6" stroke-linecap="round"/>' +
      '<circle cx="100" cy="86" r="52" fill="#EAF3E2"/>' +
      '<circle cx="70" cy="70" r="30" fill="#DCEBD1"/>' +
      '<circle cx="132" cy="76" r="30" fill="#DCEBD1"/>' +
      dots + '</svg>';
  }

  function growthTreeHTML() {
    var u = usage();
    return '<div class="wb-tree-wrap">' + growthTreeSVG(u.growthLeaves) +
      '<div class="wb-tree-meta"><span class="wb-tree-label">My little tree</span>' +
      '<span class="wb-tree-count">' + u.growthLeaves + ' leaves · ' + u.growthPoints + ' points</span></div></div>';
  }

  function addParentLeaf() { return addLeaf(); }

  /* ---------------- A6 ParentGate 图形验证（仅防孩子误改设置） ----------------
     不是能力测试、不采集任何信息；只让家长点中指定图形，孩子乱点一般过不了。 */

  function parentGate(host, onPass) {
    if (!host) { if (onPass) onPass(); return; }
    host.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'wb-gate';
    card.innerHTML =
      '<p class="wb-gate-title">Grown-ups only</p>' +
      '<p class="wb-gate-hint">Tap the circle</p>' +
      '<div class="wb-gate-shapes">' +
      '<button type="button" class="wb-shape wb-shape--square" data-ok="0" aria-label="Square"></button>' +
      '<button type="button" class="wb-shape wb-shape--triangle" data-ok="0" aria-label="Triangle"></button>' +
      '<button type="button" class="wb-shape wb-shape--circle" data-ok="1" aria-label="Circle"></button>' +
      '</div>' +
      '<button type="button" class="wb-gate-cancel" data-act="cancel">Cancel</button>';
    host.appendChild(card);
    card.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      if (t.getAttribute('data-act') === 'cancel') { host.innerHTML = ''; return; }
      if (t.getAttribute('data-ok') === '1') {
        host.innerHTML = '';
        if (typeof onPass === 'function') onPass();
      } else {
        card.classList.remove('is-nudge');
        void card.offsetWidth;
        card.classList.add('is-nudge');
      }
    });
  }

  /* ---------------- A7 / E3 家长看板数据 ----------------
     只给「今日参与度」、错题分布、challengePlayed、challengeTimeout；
     不显示达标 / 未达标、不与他人比较、不进孩子界面。 */

  function dashboard(mistakesByLevel) {
    var d = ensureDaily();
    var u = usage();
    return {
      todayKey: todayKey(),
      participation: {
        minutes: Math.round(d.accumSec / 60 * 10) / 10,
        sessions: d.sessionCount,
        rests: d.restCount,
        growthPoints: u.growthPoints,
        growthLeaves: u.growthLeaves
      },
      wrongDistribution: (mistakesByLevel && mistakesByLevel.dist) || {},
      challengePlayed: u.challengePlayed.slice(),
      challengeTimeout: u.challengeTimeout,
      // 达标线 8/6 仅作内部软统计，不返回「达标 / 未达标」结论
      softPass: { completed: CAP.PASS_COMPLETED, correct: CAP.PASS_CORRECT, visibleToChild: false }
    };
  }

  /* ---------------- store：供 engine / review / progress 使用的本地态读写 ----------------
     注意：这些方法全部只操作独立分区，绝不碰 Progress 的存档对象。 */

  var store = {
    key: LS_KEY,
    raw: load,
    save: save,
    patch: patch,

    getCursor: function (levelId) { return load().levelCursor[String(levelId)] || null; },
    setCursor: function (levelId, cursor) {
      patch(function (s) { s.levelCursor[String(levelId)] = cursor; });
      return cursor;
    },
    clearCursor: function (levelId) {
      patch(function (s) { delete s.levelCursor[String(levelId)]; });
    },

    // pendingQuestions：被搬走 / 被「再玩一次」替换的新题，下组优先出队
    pushPending: function (items) {
      patch(function (s) {
        (items || []).forEach(function (it) { s.pendingQuestions.push(it); });
      });
      return load().pendingQuestions.length;
    },
    shiftPending: function (n) {
      var out = [];
      patch(function (s) {
        var count = Math.min(n == null ? s.pendingQuestions.length : n, s.pendingQuestions.length);
        for (var i = 0; i < count; i += 1) out.push(s.pendingQuestions.shift());
      });
      return out;
    },
    pendingCount: function () { return load().pendingQuestions.length; },
    pendingAll: function () { return load().pendingQuestions.slice(); },

    addWrongTag: function (key, tag) {
      patch(function (s) { s.wrongTags[String(key)] = tag; });
    },
    wrongTags: function () { return load().wrongTags; },

    reviewPool: function () { return load().reviewPool; },
    setReviewPool: function (pool) {
      patch(function (s) { s.reviewPool = pool || {}; });
    },

    addChallengePlayed: addChallengePlayed,
    addChallengeTimeout: addChallengeTimeout,
    addGrowthPoints: addGrowthPoints,
    addLeaf: addLeaf
  };

  /* ---------------- 对外接口 ---------------- */

  global.Wellbeing = {
    version: '1.0.0',
    CAP: CAP,
    EVT: EVT,
    store: store,
    emit: emit,

    // A6 设置
    settings: settings,
    setSettings: setSettings,
    usage: usage,
    addGrowthPoints: addGrowthPoints,
    addLeaf: addLeaf,
    parentGate: parentGate,

    // A1 / A2 时长
    todayKey: todayKey,
    ensureDaily: ensureDaily,
    daily: daily,
    onLevelEnter: onLevelEnter,
    startSession: startSession,
    startClock: startClock,
    stopClock: stopClock,
    setInteractive: setInteractive,
    setScreen: setScreen,
    pauseFor: pauseFor,
    resumeInteractive: resumeInteractive,
    bumpSession: bumpSession,
    bumpRest: bumpRest,
    clockState: function () {
      return {
        sessionAccumSec: clock.sessionAccumSec,
        timeUpPending: clock.timeUpPending,
        draining: clock.draining,
        resolved: clock.resolved
      };
    },

    // A3 DRAINING
    beginQuestion: beginQuestion,
    resolveQuestion: resolveQuestion,
    beforeAdvance: beforeAdvance,
    drainDone: drainDone,

    // A4 / A5
    shouldInsertRest: shouldInsertRest,
    markRestShown: markRestShown,
    showRestScene: showRestScene,
    showDayCompleteScene: showDayCompleteScene,

    // E1 / E2 / A7
    growthTreeHTML: growthTreeHTML,
    addParentLeaf: addParentLeaf,
    dashboard: dashboard,

    /* 静态校验辅助：供 tmp/ 下的脚本模拟 EVT_TICK 与 pending 出队守恒。
       不依赖 DOM，可在 Node vm 中直接调用。 */
    _test: {
      onSecond: onSecond,
      resetClock: function () {
        clock.sessionAccumSec = 0; clock.timeUpPending = false;
        clock.interactive = false; clock.screenOn = false; clock.draining = false; clock.resolved = true;
      },
      setInteractive: function (v) { clock.interactive = !!v; },
      setScreen: function (v) { clock.screenOn = !!v; },
      snapshot: function () {
        return { sessionAccumSec: clock.sessionAccumSec, dailyAccumSec: ensureDaily().accumSec };
      }
    }
  };
})(window);
