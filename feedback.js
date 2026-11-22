/* ============================================================
   feedback.js · B9/B10/B11 过程性视觉反馈 + C9/C10 示范动画
   ------------------------------------------------------------
   ★ 零语音改动：只复用既有表扬语音 key（PRAISE_KEYS），不新增任何 key；
     所有反馈走界面图标 / 内联 SVG / CSS / WAAPI，不引 CDN、不引外部依赖。
   ★ 三轨时序（专家附录 A 裁决 5）：判定瞬间 feedbackBus.cancelProcess()
     → 复用 PRAISE_* 起播 → 集星动效等语音 ended 后才起；答错无表扬无星。
   ★ 明确禁止（B11）：红叉 / 哭脸 / 失败音效 / 强闪 / 倒计时红环 /
     抽奖盲盒 / 连击倍率 / 连续签到 / 体力值 / 自动连播 —— assertNoBanned() 自检。
   ★ 4 岁起步：反馈 <1s、具体到题/选项、暖黄 #FFC94A 描边、非目标仅降饱和约
     30% 轻轻退后（不消失不打叉不变灰）、触控 ≥64px、间距 ≥24px、拖放区 ≥96px。
   ============================================================ */

(function (global) {
  'use strict';

  var SPEC = {
    warmYellow: '#FFC94A',   // 聚焦描边
    warmGold: '#FFD76E',     // 完成
    softGreen: '#7FC8A9',    // 逐格点亮
    softBlue: '#8FB8E8',     // 再听
    cream: '#F7F3EA',        // 底
    highlightMs: 300,        // 0.3s 淡入
    popScale: 1.08,          // 放大 1.08 回弹
    desaturate: 0.3,         // 非目标降饱和约 30%
    feedbackMaxMs: 1000,     // 反馈 <1s
    touchMin: 64,            // 触控目标 ≥64×64 CSS px
    gapMin: 24,              // 间距 ≥24px
    dropMin: 96,             // 拖放区 ≥96px（拖拽 ≥88px）
    demoShotMs: [700, 850, 850, 900], // C10 四镜每镜 0.6–0.9s
    demoTotalMs: 3500,       // 总 ≤3.5s
    revealHoldMs: 1500       // B5 第 3 次正确项放大停留 1.5s
  };
  global.FB_SPEC = SPEC;

  // 复用既有表扬/中性语音 key（零新增）。common/* 与各关 lvNN/* 全是既有资源。
  var PRAISE_KEYS = ['common/gold', 'common/silver', 'common/ready', 'common/try_again'];

  // B11 禁止项（界面语汇 / 音效 / 机制），assertNoBanned 用它做全局自检。
  var BANNED = [
    'red-cross', 'cry-face', 'sad-face', 'fail-sfx', 'white-flash',
    'countdown-red-ring', 'gacha', 'blind-box', 'combo-multiplier',
    'daily-streak', 'energy-bar', 'auto-play', 'try_again_sad', 'shake-head'
  ];

  /* ---------------- 自注入样式（避免改动 506KB 的 style.css 主表） ----------------
     含 prefers-reduced-motion 降级；无 >3Hz 频闪、无全屏白闪。 */
  var CSS = [
    '.fb-root{position:relative}',
    '.fb-hl{outline:3px solid ' + SPEC.warmYellow + ';outline-offset:3px;',
    '  border-radius:18px;animation:fbFadeIn .3s ease-out both;}',
    '@keyframes fbFadeIn{from{opacity:.4;transform:scale(1)}to{opacity:1;transform:scale(' + SPEC.popScale + ')}}',
    '.fb-pop{animation:fbPop .3s cubic-bezier(.34,1.56,.64,1) both}',
    '@keyframes fbPop{0%{transform:scale(1)}60%{transform:scale(' + SPEC.popScale + ')}100%{transform:scale(1)}}',
    '.fb-dim{filter:saturate(' + (1 - SPEC.desaturate) + ');transform:translateY(4px) scale(.98);',
    '  transition:filter .3s ease,transform .3s ease;opacity:1}',
    '.fb-target{min-width:' + SPEC.touchMin + 'px;min-height:' + SPEC.touchMin + 'px}',
    '.fb-gap{gap:' + SPEC.gapMin + 'px}',
    '.fb-drop{min-width:' + SPEC.dropMin + 'px;min-height:' + SPEC.dropMin + 'px}',
    '.fb-drag-target{min-width:88px;min-height:88px}',
    '.fb-near{display:flex;gap:6px;align-items:center;justify-content:center;',
    '  animation:fbNear .4s ease-out both}',
    '.fb-near i{width:8px;height:8px;border-radius:50%;background:' + SPEC.softBlue + ';',
    '  animation:fbNearDot .4s ease-out both}',
    '@keyframes fbNear{from{opacity:0}to{opacity:1}}',
    '@keyframes fbNearDot{from{transform:scale(.2)}to{transform:scale(1)}}',
    '.fb-demo{display:flex;flex-direction:column;align-items:center;justify-content:center;',
    '  gap:12px;padding:16px;color:' + SPEC.cream + '}',
    '.fb-demo-shot{font-size:0}',
    '.fb-demo-svg{width:180px;height:180px}',
    '.fb-spot{stroke:' + SPEC.warmYellow + ';stroke-width:4;fill:none;',
    '  stroke-dasharray:8 6;animation:fbFadeIn .3s ease-out both}',
    '.fb-sticker{display:inline-block;animation:fbPop .4s ease-out both}',
    '.fb-switch{animation:fbFadeIn .3s ease-out both}',
    '.fb-replay{display:inline-flex;align-items:center;justify-content:center;',
    '  min-width:' + SPEC.touchMin + 'px;min-height:' + SPEC.touchMin + 'px;',
    '  color:' + SPEC.softBlue + '}',
    '@media (prefers-reduced-motion: reduce){',
    '  .fb-hl,.fb-pop,.fb-near,.fb-near i,.fb-sticker,.fb-switch,.fb-spot{animation:none !important;transition:none !important}',
    '  .fb-hl{outline:3px solid ' + SPEC.warmYellow + '}',
    '}'
  ].join('');

  var styleInjected = false;
  function injectStyle() {
    if (styleInjected || typeof document === 'undefined') return;
    var s = document.createElement('style');
    s.setAttribute('data-fb', '1');
    s.appendChild(document.createTextNode(CSS));
    (document.head || document.body).appendChild(s);
    styleInjected = true;
  }

  function reduced() {
    return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------------- 三轨互斥时序（B9） ----------------
     过程轨 / 结果语音轨 / 结算视觉轨三轨互斥：
       · 判定瞬间 cancelProcess() 清掉所有过程动效（避免「抖动 + 表扬」叠帧）
       · 复用 PRAISE_* 起播
       · 集星 / 贴纸等视觉动效等语音 ended 后才起
       · 答错：无表扬语音、无星星 */
  var feedbackBus = {
    processNodes: [],      // 自己创建的浮层：取消时整块移除
    borrowedNodes: [],     // 借来打高亮的关卡容器/选项：取消时只摘类名，绝不删除
    trackProcess: function (node, opts) {
      if (!node) return node;
      if (opts && opts.borrowed) feedbackBus.borrowedNodes.push(node);
      else feedbackBus.processNodes.push(node);
      return node;
    },
    cancelProcess: function () {
      feedbackBus.processNodes.forEach(function (n) {
        if (n && n.parentNode) n.parentNode.removeChild(n);
      });
      feedbackBus.processNodes = [];
      /* 关键：F3 高亮的是关卡的 .lv-story（关卡自己创建的容器）。
         旧实现把它当浮层一起 removeChild，于是「同一题答错两次 → 题面被整块删掉」。
         借用的节点只摘掉过程动效的类名，节点本身必须留在 DOM 里。 */
      feedbackBus.borrowedNodes.forEach(function (n) {
        if (n && n.classList) n.classList.remove('fb-hl', 'fb-pop', 'fb-dim');
      });
      feedbackBus.borrowedNodes = [];
    },
    /** 答对：返回 true 表示已按三轨时序排好；onEnded 由调用方在语音 ended 时触发集星。 */
    correct: function (opts) {
      opts = opts || {};
      feedbackBus.cancelProcess();
      var praiseKey = opts.praiseKey || PRAISE_KEYS[0];   // 复用既有 key，零新增
      if (typeof opts.playPraise === 'function') opts.playPraise(praiseKey);
      // 集星 / 贴纸等动效必须等语音 ended 后才起（由调用方挂 ended 回调）
      if (typeof opts.onPraiseEnded === 'function') {
        feedbackBus._pendingStar = opts.onPraiseEnded;
      }
      return { praiseKey: praiseKey, starDeferred: true };
    },
    praiseEnded: function () {
      var fn = feedbackBus._pendingStar;
      feedbackBus._pendingStar = null;
      if (typeof fn === 'function') fn();
    },
    /** 答错：无表扬语音、无星；只允许过程性视觉提示。 */
    wrong: function (opts) {
      feedbackBus.cancelProcess();
      return { praised: false, starred: false };
    }
  };

  /* ---------------- F1–F10 过程性视觉反馈（B9/B10） ---------------- */

  var F = {
    // F1 轮到你了：题干播完、尚未作答 → 选项区整体轻亮 + 各框依次浮起
    F1_yourTurn: function (host) {
      injectStyle();
      if (!host) return null;
      var n = el('div', 'fb-hl fb-root');
      host.appendChild(n);
      return feedbackBus.trackProcess(n);
    },
    // F2 再听一次：小海螺放大 + 柔蓝波纹（眼睛 + 小海螺图标，禁用闪电/沙漏/秒表）
    F2_replay: function (host) {
      injectStyle();
      if (!host) return null;
      var n = el('div', 'fb-replay fb-pop', replayIconSVG());
      host.appendChild(n);
      return feedbackBus.trackProcess(n);
    },
    // F3 再试一次（答错 1）：正确区域暖黄描边高亮 + 暖光呼吸 1 下
    F3_tryAgain: function (node) {
      injectStyle();
      if (!node) return null;
      node.classList.add('fb-hl', 'fb-pop');
      // borrowed：这个节点属于关卡，取消动效时只能摘类名，不能删节点
      return feedbackBus.trackProcess(node, { borrowed: true });
    },
    // F4 差一点（near）：所选框与目标框间浮出 2–3 小圆点，不判定对错、不消失选项
    F4_near: function (host) {
      injectStyle();
      if (!host) return null;
      var n = el('div', 'fb-near', '<i></i><i></i><i></i>');
      host.appendChild(n);
      return feedbackBus.trackProcess(n);
    },
    // F5 再数一遍：实物逐个重新点亮（≤2000ms）
    F5_recount: function (nodes) {
      injectStyle();
      (nodes || []).forEach(function (node, i) {
        setTimeout(function () {
          if (!node) return;
          node.style.filter = 'none';
          node.classList.add('fb-pop');
        }, Math.min(250 * i, 2000));
      });
    },
    // F6 我们一起做（答错 2 降级）：非目标退后只留 2 个、正确项放大前移
    F6_fade: function (nonTargets, keepNode) {
      injectStyle();
      (nonTargets || []).forEach(function (n) { if (n) n.classList.add('fb-dim'); });
      if (keepNode) keepNode.classList.add('fb-hl', 'fb-pop');
    },
    // F7 看，是这个（答错 3 放行）：正确项亮起 + 放大停留 1.5s + 自动前进
    F7_reveal: function (node, onDone) {
      injectStyle();
      if (node) node.classList.add('fb-hl', 'fb-pop');
      setTimeout(function () { if (typeof onDone === 'function') onDone(); }, SPEC.revealHoldMs);
    },
    // F8 做到了（单次答对）：所选框弹一下 + 小光点飞向图鉴
    F8_spark: function (node) {
      injectStyle();
      if (node) node.classList.add('fb-pop');
    },
    // F9 这一局完成：贴纸飞进图鉴（星星仅可选徽章、不作门槛）
    F9_groupDone: function (host) {
      injectStyle();
      if (!host) return null;
      var n = el('span', 'fb-sticker', stickerSVG());
      host.appendChild(n);
      return feedbackBus.trackProcess(n);
    },
    // F10 歇一下：交给 wellbeing.showRestScene（点点打哈欠伸懒腰，无文字无语音）
    F10_rest: function (host, onDone) {
      if (global.Wellbeing && global.Wellbeing.showRestScene) {
        global.Wellbeing.showRestScene(host, onDone);
      } else if (typeof onDone === 'function') onDone();
    }
  };

  /* ---------------- 内联 SVG 图标（不引 CDN、不新增语音 key） ---------------- */

  function replayIconSVG() {
    // 眼睛 + 小海螺：明确禁用闪电/沙漏/秒表/倒计时红环（B8/B11）
    return '<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">' +
      '<path d="M8 24s6-9 16-9 16 9 16 9-6 9-16 9S8 24 8 24z" fill="none" stroke="currentColor" stroke-width="2.6"/>' +
      '<circle cx="24" cy="24" r="4.5" fill="currentColor"/>' +
      '<path d="M36 30c4 0 7-3 7-6s-3-6-7-6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>' +
      '</svg>';
  }

  function stickerSVG() {
    return '<svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">' +
      '<path d="M24 4l5 10 11 1.6-8 7.8 2 11L24 29l-10 5.4 2-11-8-7.8L19 14z" fill="' +
      SPEC.warmGold + '"/></svg>';
  }

  // C10 示范动画 4 镜母版：听 → 轮到手 → 让开 → 可重演
  // 只演「怎么做」，绝不演答案；每镜 0.6–0.9s，总 ≤3.5s；纯内联 SVG + WAAPI。
  function demoShotSVG(shot) {
    var ear = '<path d="M14 22a5 5 0 0 1 10 0v6a5 5 0 0 1-10 0z" fill="' + SPEC.softBlue + '"/>';
    var hand = '<path d="M30 34c-2-6 2-10 6-12M30 34c0-5 4-8 8-8" fill="none" stroke="' +
      SPEC.warmYellow + '" stroke-width="4" stroke-linecap="round"/>';
    var dot = '<circle cx="24" cy="40" r="6" fill="' + SPEC.warmGold + '" opacity=".5"/>';
    var body = {
      0: ear + '<path d="M20 30v8" stroke="' + SPEC.softBlue + '" stroke-width="3" stroke-linecap="round"/>',
      1: ear + hand + dot,
      2: dot + '<circle cx="24" cy="40" r="14" fill="none" stroke="' + SPEC.warmYellow + '" stroke-width="2" stroke-dasharray="4 4"/>',
      3: ear + hand + '<path d="M34 16a8 8 0 1 1-2-11" fill="none" stroke="' + SPEC.softGreen + '" stroke-width="3" stroke-linecap="round"/><path d="M34 16l-4-1m4 1 1-4" fill="none" stroke="' + SPEC.softGreen + '" stroke-width="3" stroke-linecap="round"/>'
    }[shot] || ear;
    return '<svg class="fb-demo-svg" viewBox="0 0 48 56" aria-hidden="true">' + body + '</svg>';
  }

  /**
   * C10 播放 4 镜示范（总 ≤3.5s）。reduced-motion 时只静态显示首镜、不逐镜动画。
   * @param host 容器
   * @param onDone 结束回调（用于「再出题」）
   */
  function playDemo(host, onDone) {
    injectStyle();
    if (!host) { if (onDone) onDone(); return; }
    var box = el('div', 'fb-demo');
    host.appendChild(box);
    feedbackBus.trackProcess(box);
    var shots = SPEC.demoShotMs.slice();
    var i = 0;
    function step() {
      if (i >= shots.length) {
        if (box.parentNode) box.parentNode.removeChild(box);
        if (typeof onDone === 'function') onDone();
        return;
      }
      box.innerHTML = '<div class="fb-demo-shot">' + demoShotSVG(i) + '</div>';
      var shotNode = box.firstChild;
      if (!reduced() && shotNode && shotNode.animate) {
        try {
          shotNode.animate([
            { opacity: 0, transform: 'scale(.9)' },
            { opacity: 1, transform: 'scale(1)' }
          ], { duration: 300, easing: 'ease-out', fill: 'both' });
        } catch (e) { /* 老浏览器忽略 */ }
      }
      i += 1;
      setTimeout(step, shots[i - 1]);
    }
    step();
  }

  /* ---------------- C8 / C9 首题与题型切换示范 ---------------- */

  /** C8 identify-* 首题：示范「要找什么」（错误项轻微晃动后被圈出），不演答案。 */
  function identifyDemo(host, onDone) {
    injectStyle();
    if (!host) { if (onDone) onDone(); return; }
    var box = el('div', 'fb-demo');
    box.innerHTML =
      '<svg class="fb-demo-svg" viewBox="0 0 120 60" aria-hidden="true">' +
      '<rect class="fb-id-a" x="6" y="16" width="30" height="28" rx="8" fill="' + SPEC.cream + '"/>' +
      '<rect class="fb-id-b" x="45" y="16" width="30" height="28" rx="8" fill="' + SPEC.cream + '"/>' +
      '<rect class="fb-id-c" x="84" y="16" width="30" height="28" rx="8" fill="' + SPEC.cream + '"/>' +
      '<ellipse class="fb-spot fb-id-ring" cx="99" cy="30" rx="20" ry="17"/>' +
      '</svg>';
    host.appendChild(box);
    feedbackBus.trackProcess(box);
    if (!reduced()) {
      try {
        var b = box.querySelector('.fb-id-b');
        if (b && b.animate) b.animate([
          { transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
          { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }
        ], { duration: 700, easing: 'ease-in-out' });
      } catch (e) { /* noop */ }
    }
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      if (typeof onDone === 'function') onDone();
    }, 900);
  }

  /** C9 拖拽提示：≥88px 目标 + 路径高亮 + 可撤销（不演答案）。 */
  function dragHint(host, onDone) {
    injectStyle();
    if (!host) { if (onDone) onDone(); return; }
    var box = el('div', 'fb-demo');
    box.innerHTML = '<svg class="fb-demo-svg" viewBox="0 0 160 60" aria-hidden="true">' +
      '<rect class="fb-drag-target" x="6" y="10" width="44" height="40" rx="10" fill="' + SPEC.softBlue + '"/>' +
      '<path d="M56 30 Q100 8 130 30" fill="none" stroke="' + SPEC.warmYellow +
      '" stroke-width="3" stroke-dasharray="6 6"/>' +
      '<rect class="fb-drag-target" x="110" y="10" width="44" height="40" rx="10" fill="none" stroke="' +
      SPEC.warmYellow + '" stroke-width="3" stroke-dasharray="6 6"/></svg>';
    host.appendChild(box);
    feedbackBus.trackProcess(box);
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      if (typeof onDone === 'function') onDone();
    }, 800);
  }

  /** C9 连线配对提示：两端同时高亮 + 连线预览 + 可撤销。 */
  function pairHint(host, onDone) {
    injectStyle();
    if (!host) { if (onDone) onDone(); return; }
    var box = el('div', 'fb-demo');
    box.innerHTML = '<svg class="fb-demo-svg" viewBox="0 0 160 70" aria-hidden="true">' +
      '<circle cx="24" cy="18" r="12" class="fb-hl" fill="' + SPEC.softGreen + '"/>' +
      '<circle cx="136" cy="18" r="12" fill="' + SPEC.cream + '"/>' +
      '<circle cx="24" cy="52" r="12" fill="' + SPEC.cream + '"/>' +
      '<circle cx="136" cy="52" r="12" class="fb-hl" fill="' + SPEC.softGreen + '"/>' +
      '<path class="fb-spot" d="M30 18 Q80 40 130 52"/></svg>';
    host.appendChild(box);
    feedbackBus.trackProcess(box);
    setTimeout(function () {
      if (box.parentNode) box.parentNode.removeChild(box);
      if (typeof onDone === 'function') onDone();
    }, 800);
  }

  /** C9 一关多题型切换：先停 0.5s → 图标更换放大 → 演示 → 再出题。 */
  function typeSwitch(host, onDone) {
    injectStyle();
    if (!host) { if (onDone) onDone(); return; }
    setTimeout(function () {
      var box = el('div', 'fb-demo fb-switch');
      box.innerHTML = '<svg class="fb-demo-svg" viewBox="0 0 48 48" aria-hidden="true">' +
        '<circle cx="24" cy="24" r="14" fill="none" stroke="' + SPEC.warmYellow + '" stroke-width="3"/>' +
        '<path d="M18 24h12M24 18v12" stroke="' + SPEC.warmYellow + '" stroke-width="3" stroke-linecap="round"/></svg>';
      host.appendChild(box);
      feedbackBus.trackProcess(box);
      setTimeout(function () {
        if (box.parentNode) box.parentNode.removeChild(box);
        playDemo(host, onDone);
      }, 320);
    }, 500);
  }

  /** 按 levelId 派生应挂哪类首题示范（C8/C9）；返回演示函数名供 engine 调用。 */
  function firstSeenKind(levelId, qType) {
    var R = global.RouteMap;
    if (!R) return null;
    var id = Number(levelId);
    if (R.IDENTIFY_LEVELS.indexOf(id) >= 0 && R.identifyTagOf(id, qType)) return 'identify';
    if (R.FLASH_LEVELS.indexOf(id) >= 0) return 'replay';
    if (R.DRAG_LEVELS.indexOf(id) >= 0) return 'drag';
    if (R.PAIR_LEVELS.indexOf(id) >= 0) return 'pair';
    if (R.MULTI_TYPE_LEVELS.indexOf(id) >= 0) return 'typeSwitch';
    return 'demo';
  }

  function mountFirstSeen(host, kind, onDone) {
    if (kind === 'identify') return identifyDemo(host, onDone);
    if (kind === 'replay') { F.F2_replay(host); if (onDone) onDone(); return; }
    if (kind === 'drag') return dragHint(host, onDone);
    if (kind === 'pair') return pairHint(host, onDone);
    if (kind === 'typeSwitch') return typeSwitch(host, onDone);
    return playDemo(host, onDone);
  }

  /* ---------------- B10 视觉规格 + 触控目标 ---------------- */

  function highlight(node) { F.F3_tryAgain(node); }
  function dimNonTargets(nodes) {
    injectStyle();
    (nodes || []).forEach(function (n) { if (n) n.classList.add('fb-dim'); });
  }
  function ensureTouchTargets(root) {
    injectStyle();
    if (!root) return;
    Array.prototype.slice.call(root.querySelectorAll('button,[role="button"]')).forEach(function (n) {
      n.classList.add('fb-target');
    });
    var tray = root.querySelector && root.querySelector('.lv-tray, .fb-gap');
    if (tray) tray.classList.add('fb-gap');
  }

  /* ---------------- B11 全局自检 ---------------- */

  function assertNoBanned(extra) {
    // extra 允许调用方传入自己的样式/组件名一并自检
    var extraText = String(extra || '').toLowerCase();
    var found = [];
    var tokens = {
      'red-cross': '红叉', 'cry-face': '哭脸', 'sad-face': '哭脸',
      'fail-sfx': '失败音效', 'white-flash': '强闪白光',
      'countdown-red-ring': '倒计时红环', 'gacha': '抽奖', 'blind-box': '盲盒',
      'combo-multiplier': '连击倍率', 'daily-streak': '连续签到',
      'energy-bar': '体力值', 'auto-play': '自动连播'
    };
    // 检查注入 CSS 里是否真的出现了禁止项（BANNED 只是词表，不应出现在样式里）
    Object.keys(tokens).forEach(function (k) {
      if (CSS.toLowerCase().indexOf(k) >= 0 || extraText.indexOf(k) >= 0) found.push(tokens[k]);
    });
    return {
      ok: found.length === 0,
      found: found,
      reducedMotionDegrade: true,
      noHighFreqFlash: true,
      praiseReusedOnly: PRAISE_KEYS.slice(),
      spec: {
        warmYellow: SPEC.warmYellow, fadeMs: SPEC.highlightMs, popScale: SPEC.popScale,
        desaturate: SPEC.desaturate, touchMin: SPEC.touchMin, gapMin: SPEC.gapMin,
        dropMin: SPEC.dropMin, demoTotalMs: SPEC.demoTotalMs
      }
    };
  }

  /* ---------------- 对外接口 ---------------- */

  global.Feedback = {
    version: '1.0.0',
    SPEC: SPEC,
    PRAISE_KEYS: PRAISE_KEYS,
    BANNED: BANNED,
    bus: feedbackBus,
    F: F,
    injectStyle: injectStyle,
    reduced: reduced,
    replayIconSVG: replayIconSVG,
    playDemo: playDemo,
    identifyDemo: identifyDemo,
    dragHint: dragHint,
    pairHint: pairHint,
    typeSwitch: typeSwitch,
    firstSeenKind: firstSeenKind,
    mountFirstSeen: mountFirstSeen,
    highlight: highlight,
    dimNonTargets: dimNonTargets,
    ensureTouchTargets: ensureTouchTargets,
    assertNoBanned: assertNoBanned
  };
})(window);
