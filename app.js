/* ============================================================
   app.js · 启动与路由
   ------------------------------------------------------------
   只做三件事：
     1. 把 levels_data.js 渲染成地图
     2. 地图 ↔ 关卡 的切换（进入前必须过加载闸门），并把关卡模块挂上去
     3. 云存档面板的交互

   任何题面、判定、动画细节都不写在这里。
   语言：English only（PROJECT_MATH_RULES §5.5）
   ============================================================ */

(function (global) {
  'use strict';

  var DATA = global.MATH_DATA;
  var currentLevel = null;
  var currentModule = null;
  var entering = false;
  var lastVoiceKey = null;      // 全局重播按钮：最近一次播放的语音 key
  var modulePromises = {};      // id -> Promise，关卡模块的按需加载缓存

  function byId(id) { return document.getElementById(id); }

  /* ---------------- 地图（分阶段 + 左右滑动） ---------------- */

  var STAR_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" ' +
    'fill="currentColor"/></svg>';

  var LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<rect x="5" y="10.5" width="14" height="9.5" rx="3" fill="currentColor"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round"/></svg>';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // 分页状态。pages 是所有阶段摊平后的横向轨道，index 是当前页的全局序号。
  var view = { pages: [], stages: [], index: 0, ready: false, dx: 0, drag: null };

  /* ---------------- 4 岁起步接线（C3/C4/E1/E3） ----------------
     单一 4 岁档：地图只渲染 core 轨；challenge 轨默认不进解锁链，
     家长开「试一试」(showChallenge) 才作为可选入口显示（非语音、不新增 key）。 */

  function isCoreLevel(id) {
    var R = global.RouteMap;
    return (R && typeof R.isCore === 'function') ? !!R.isCore(id) : true;
  }

  function isLevelVisible(id) {
    if (isCoreLevel(id)) return true;
    var E = global.Engine;
    return !!(E && E.settings && E.settings.showChallenge && E.settings.showChallenge());
  }

  /* E1/E3 家长看板「今日参与度」：只描述一起玩了多久，不显示达标/未达标、不比较；
     附成长树、正向收尾文案与 2 条家长陪玩钩子之一（讲给爸爸妈妈听 → 长一片叶）。 */
  function parentHTML() {
    var W = global.Wellbeing;
    if (!W || !W.dashboard || !W.growthTreeHTML) return '';
    var p = W.dashboard().participation || {};
    return '<div class="field-label" style="margin-top:18px">Today together</div>' +
      '<p class="wb-dash">About ' + (p.minutes || 0) + ' min · ' +
        (p.sessions || 0) + ' sessions · ' + (p.rests || 0) + ' little rests</p>' +
      W.growthTreeHTML() +
      '<p class="wb-positive">A lovely place to stop for today.</p>' +
      '<button type="button" class="wb-hook-btn" id="wb-parent-leaf">' +
        'Tell a grown-up · I heard you</button>';
  }

  function stateOf(level) {
    if (level.status === 'coming') return 'coming';
    if (!Progress.isUnlocked(level.id)) return 'locked';
    if (Progress.starOf(level.id) === 'gold') return 'gold';
    if (Progress.starOf(level.id) === 'silver') return 'silver';
    return 'open';
  }

  function mapCfg() { return DATA.map || {}; }

  // 一页内 n 个节点：在 top..bottom 之间均分，x 左右交替，最下面的节点是这页最小的关卡。
  // 一页内 n 个节点：铺满 canvas 高度，但步长按「像素」封顶，
  // 这样大屏不会把 2–3 个节点拉得太散，小屏又不会挤在一起。
  function pageSpots(n, canvasH) {
    var layout = mapCfg().layout || {};
    var lo = layout.bottom != null ? layout.bottom : 620;
    var hi = layout.top != null ? layout.top : 0;
    var span = lo - hi;
    var xs = layout.x || [122, 214];
    var unit = canvasH > 0 ? canvasH / span : 1;         // 1 svg 单位 = 多少 px
    var maxStep = (layout.maxStepPx || 118) / unit;      // 像素上限换算成 svg 单位
    var out = [];
    var step = n > 1 ? Math.min(span / (n - 1), maxStep) : 0;
    var offset = Math.max(0, (span - step * (n - 1)) / 2);
    for (var i = 0; i < n; i += 1) {
      out.push({ x: xs[i % xs.length], y: Math.round(lo - offset - step * i) });
    }
    return out;
  }

  // 依节点坐标生成一条 S 形轨迹（贝塞尔），供每页的 svg 使用。
  function trailPath(spots) {
    if (!spots.length) return '';
    var d = 'M' + spots[0].x + ' ' + spots[0].y;
    for (var i = 1; i < spots.length; i += 1) {
      var a = spots[i - 1];
      var b = spots[i];
      var k = Math.min(58, Math.max(24, Math.abs(b.x - a.x) * 0.42));
      d += ' C ' + (a.x + k) + ' ' + a.y + ', ' + (b.x - k) + ' ' + b.y + ', ' + b.x + ' ' + b.y;
    }
    return d;
  }

  // 把 5 大阶段里「已经存在的关卡」切成若干页；每页节点数不超过 pageSize，且各页尽量均分。
  function buildPages() {
    var cfg = mapCfg();
    var vpEl = byId('map-viewport');
    var canvasH = 0;
    if (vpEl) {
      // canvas 在 CSS 里上方留 92px、下方留 140px（状态条 + 阶段导航）
      canvasH = Math.max(200, (vpEl.getBoundingClientRect().height || 0) - 232);
    }
    var stages = cfg.stages || [];
    var pageSize = cfg.pageSize || 6;
    var pages = [];
    var stageIds = [];

    stages.forEach(function (st) {
      var ids = [];
      for (var id = st.from; id <= st.to; id += 1) {
        // C3：4 岁档只渲染 core 轨；challenge 轨仅家长开「试一试」时才出现
        if (DATA.levels[id] && isLevelVisible(id)) ids.push(id);
      }
      if (!ids.length) return;
      stageIds.push(st.id);

      var count = Math.ceil(ids.length / pageSize);
      var per = Math.ceil(ids.length / count);
      var chunks = [];
      for (var p = 0; p < count; p += 1) {
        var chunk = ids.slice(p * per, p * per + per);
        if (chunk.length) chunks.push(chunk);
      }

      chunks.forEach(function (chunk, i) {
        var spots = pageSpots(chunk.length, canvasH);
        pages.push({
          stage: st.id,
          page: i,
          pages: chunks.length,
          items: chunk.map(function (lid, k) {
            return { level: DATA.levels[lid], spot: spots[k] };
          })
        });
      });
    });

    view.pages = pages;
    view.stages = stageIds;
  }

  function createNode(item) {
    var level = item.level;
    var state = stateOf(level);
    var node = document.createElement('button');
    node.type = 'button';
    node.className = 'node node--' + state;
    node.dataset.level = String(level.id);
    node.style.setProperty('--x', (item.spot.x / 390 * 100).toFixed(3) + '%');
    node.style.setProperty('--y', (item.spot.y / 620 * 100).toFixed(3) + '%');
    node.setAttribute('aria-label',
      'Level ' + level.id + ', ' + level.name +
      (state === 'coming' ? ', coming soon' : state === 'locked' ? ', locked' : ''));

    var disc = document.createElement('span');
    disc.className = 'node-disc';

    var num = document.createElement('span');
    num.className = 'node-num';
    num.textContent = String(level.id);
    disc.appendChild(num);

    var badge = document.createElement('span');
    badge.className = 'node-badge' + (state === 'locked' || state === 'coming' ? ' node-badge--lock' : '');
    badge.innerHTML = state === 'locked' || state === 'coming' ? LOCK_SVG : STAR_SVG;
    disc.appendChild(badge);

    var label = document.createElement('span');
    label.className = 'node-label';
    label.textContent = state === 'coming' ? 'Coming soon' : level.name;
    // C4「试一试」：challenge 轨用中性文字标注（非语音、不新增 key），家长可关
    if (isLevelVisible(level.id) && !isCoreLevel(level.id)) {
      node.classList.add('node--challenge');
      label.textContent = 'Try it · ' + level.name;
    }

    node.appendChild(disc);
    node.appendChild(label);
    return node;
  }

  function buildPageEl(page, index) {
    var pageEl = document.createElement('div');
    pageEl.className = 'map-page';
    pageEl.dataset.page = String(index);
    pageEl.dataset.stage = String(page.stage);

    // canvas：真正的「地图内容区」，上下留白由 CSS 负责，
    // 这样无论屏幕多高，节点都不会压到底部导航条。
    var canvas = document.createElement('div');
    canvas.className = 'map-canvas';

    var spots = page.items.map(function (it) { return it.spot; });
    var d = trailPath(spots);
    if (d) {
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('class', 'map-trail');
      svg.setAttribute('viewBox', '0 0 390 620');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.setAttribute('aria-hidden', 'true');
      ['trail-shadow', 'trail-dash'].forEach(function (cls) {
        var path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('class', cls);
        path.setAttribute('d', d);
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(path);
      });
      canvas.appendChild(svg);
    }

    var host = document.createElement('div');
    host.className = 'map-nodes';
    page.items.forEach(function (item) { host.appendChild(createNode(item)); });
    canvas.appendChild(host);

    pageEl.appendChild(canvas);
    return pageEl;
  }

  function paintTrack(dx, animate) {
    var track = byId('map-track');
    if (!track) return;
    var base = -view.index * 100;
    track.style.transition = animate ? 'transform 430ms cubic-bezier(.22,.61,.36,1)' : 'none';
    track.style.transform = 'translate3d(calc(' + base + '% + ' + (dx || 0) + 'px), 0, 0)';
  }

  function paintStageMeta() {
    var page = view.pages[view.index];
    var name = byId('stage-name');
    var dots = byId('stage-dots');
    var prev = byId('stage-prev');
    var next = byId('stage-next');
    if (!page) return;

    if (name) name.textContent = 'Stage ' + page.stage;

    if (dots) {
      dots.innerHTML = '';
      for (var i = 0; i < page.pages; i += 1) {
        var dot = document.createElement('i');
        if (i === page.page) dot.className = 'is-now';
        dots.appendChild(dot);
      }
    }

    var pos = view.stages.indexOf(page.stage);
    var atStart = pos <= 0;
    var atEnd = pos >= view.stages.length - 1;
    if (prev) { prev.disabled = atStart; prev.classList.toggle('is-off', atStart); }
    if (next) { next.disabled = atEnd; next.classList.toggle('is-off', atEnd); }
  }

  /**
   * 地图的阶段背景：五个 Stage 各一张照片（assets/bg/stage_1…5.webp），
   * 翻到哪个阶段就换哪张。只换不预载，首屏只请求当前阶段那一张。
   * 统一压到 12%：照片构图差异大，逐阶校准反而制造跳变，统一淡度最稳。
   */

  function paintMapBg(stage) {
    var node = byId('map-bg');
    if (!node || !stage) return;
    var url = Engine.assets.versionedUrl
      ? Engine.assets.versionedUrl('assets/bg/stage_' + stage + '.webp')
      : 'assets/bg/stage_' + stage + '.webp';
    if (node.dataset.bg === url) return;
    node.dataset.bg = url;
    node.style.backgroundImage = 'url("' + url + '")';
    node.classList.add('is-on');
  }

  function goTo(index, animate) {
    if (!view.pages.length) return;
    view.index = Math.max(0, Math.min(view.pages.length - 1, index));
    paintTrack(0, animate !== false);
    paintStageMeta();
    paintMapBg(view.pages[view.index].stage);
  }

  function stageJump(dir) {
    var page = view.pages[view.index];
    if (!page) return;
    var pos = view.stages.indexOf(page.stage);
    var want = view.stages[pos + dir];
    if (want == null) return;
    for (var i = 0; i < view.pages.length; i += 1) {
      if (view.pages[i].stage === want) { goTo(i); return; }
    }
  }

  // 首次进地图时停在哪一页：第一个还没拿金星的关卡所在页；全金星则停在最后一页。
  function focusIndex() {
    var ids = Object.keys(DATA.levels).map(Number).sort(function (a, b) { return a - b; });
    var target = ids.length ? ids[ids.length - 1] : 1;
    for (var i = 0; i < ids.length; i += 1) {
      if (Progress.starOf(ids[i]) !== 'gold') { target = ids[i]; break; }
    }
    for (var p = 0; p < view.pages.length; p += 1) {
      for (var k = 0; k < view.pages[p].items.length; k += 1) {
        if (view.pages[p].items[k].level.id === target) return p;
      }
    }
    return 0;
  }

  function renderMap() {
    var track = byId('map-track');
    if (!track) return;

    buildPages();
    track.innerHTML = '';
    view.pages.forEach(function (page, i) { track.appendChild(buildPageEl(page, i)); });

    // 节点缩尺：短屏时按可用高度整体缩小，保证一页最多 6 个节点时也不重叠。
    var canvasEl = track.querySelector('.map-canvas');
    var maxN = 0;
    view.pages.forEach(function (p) { maxN = Math.max(maxN, p.items.length); });
    if (canvasEl && maxN > 1) {
      var boxH = canvasEl.getBoundingClientRect().height || 0;
      var need = maxN * 80 + (maxN - 1) * 12;
      var scale = Math.max(0.7, Math.min(1, boxH / need));
      track.style.setProperty('--node-scale', scale.toFixed(3));
    }

    var focus = focusIndex();
    var wantStage = view.pages[focus] ? view.pages[focus].stage : null;
    var slide = false;

    if (!view.ready) {
      view.index = focus;
      view.ready = true;
    } else if (wantStage != null && view.focusStage != null && wantStage !== view.focusStage) {
      // 只有「下一个该打的关卡换了阶段」才自动翻页（打完 L3 → 自动滑到第二阶段）；
      // 重打旧关不会把玩家从当前页拽走。
      view.index = focus;
      slide = true;
    }
    view.focusStage = wantStage;
    view.index = Math.max(0, Math.min(view.pages.length - 1, view.index));

    paintTrack(0, slide);
    paintStageMeta();
    paintMapBg(view.pages[view.index] ? view.pages[view.index].stage : null);

    var gold = Progress.summary().gold;
    var note = byId('map-note');
    if (note) note.textContent = gold > 0 ? 'Gold stars: ' + gold : 'Tap a level to play';
  }

  /* ---------------- 滑动 ---------------- */

  function bindSwipe() {
    var vp = byId('map-viewport');
    if (!vp || vp.dataset.bound) return;
    vp.dataset.bound = '1';

    vp.addEventListener('pointerdown', function (e) {
      if (view.pages.length < 2) return;
      if (e.target.closest && e.target.closest('.node')) return;   // 按在节点上是要点关，不是翻页
      view.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, axis: '', t: Date.now() };
    });

    vp.addEventListener('pointermove', function (e) {
      var d = view.drag;
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.x0;
      var dy = e.clientY - d.y0;
      if (!d.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
        d.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : 'y';
        if (d.axis === 'x' && vp.setPointerCapture) {
          try { vp.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
        }
      }
      if (d.axis !== 'x') return;
      var edge = (view.index === 0 && dx > 0) || (view.index === view.pages.length - 1 && dx < 0);
      d.dx = edge ? dx * 0.3 : dx;             // 到头了只给一点点阻尼，翻不动
      paintTrack(d.dx, false);
    });

    function release(e) {
      var d = view.drag;
      view.drag = null;
      if (!d || e.pointerId !== d.id) return;
      if (d.axis !== 'x') return;

      var width = vp.getBoundingClientRect().width || 1;
      var speed = Math.abs(d.dx) / Math.max(1, Date.now() - d.t);
      var dist = Math.abs(d.dx);
      // 位移够远，或者「短促一甩」——但一甩也得超过 48px，避免手指抖一下就翻页
      var far = dist > Math.min(96, width * 0.22) || (dist > 48 && speed > 0.5);
      var step = d.dx < 0 ? 1 : -1;
      var can = step > 0 ? view.index < view.pages.length - 1 : view.index > 0;

      if (far && can) goTo(view.index + step);
      else goTo(view.index);                    // 未过阈值：平滑弹回
    }

    vp.addEventListener('pointerup', release);
    vp.addEventListener('pointercancel', release);
  }

  /* ---------------- 屏幕切换 ---------------- */

  function showScreen(name) {
    var map = byId('screen-map');
    var level = byId('screen-level');
    if (!map || !level) return;
    map.classList.toggle('is-active', name === 'map');
    level.classList.toggle('is-active', name === 'level');
  }

  /* ---------------- 关卡 ---------------- */

  /**
   * 关卡代码按需加载。旧版在 index.html 里同步挂 48 个 script（约 1.5MB），
   * 孩子一次只玩一关却要把全部关卡解析一遍。codeRev 由素材清单脚本从
   * 全部源码算出，任何代码改动都会自动换 URL，不会命中陈旧缓存。
   */
  function levelModuleUrl(id) {
    var rev = (global.ASSET_MANIFEST && global.ASSET_MANIFEST.codeRev) || 'dev';
    return 'level-lv' + String(id).padStart(2, '0') + '.js?v=' + rev;
  }

  function loadLevelModule(id) {
    if (global.LEVELS && global.LEVELS[id]) return Promise.resolve(global.LEVELS[id]);
    if (modulePromises[id]) return modulePromises[id];

    modulePromises[id] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = levelModuleUrl(id);
      s.async = true;
      s.onload = function () {
        var mod = global.LEVELS && global.LEVELS[id];
        if (mod && typeof mod.mount === 'function') resolve(mod);
        else reject(new Error('Level module ' + id + ' did not register'));
      };
      s.onerror = function () { reject(new Error('Could not load level ' + id)); };
      document.head.appendChild(s);
    }).catch(function (err) {
      delete modulePromises[id];       // 允许下次重试，不把失败永久缓存
      throw err;
    });
    return modulePromises[id];
  }

  /** 通关后空闲预取下一关代码，切关时几乎零等待；失败静默忽略 */
  function prefetchLevelModule(id) {
    if (!id || !DATA.levels[id] || (global.LEVELS && global.LEVELS[id])) return;
    if (document.querySelector('link[data-prefetch-level="' + id + '"]')) return;
    var link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'script';
    link.href = levelModuleUrl(id);
    link.setAttribute('data-prefetch-level', String(id));
    document.head.appendChild(link);
  }

  /**
   * 预取下一关的语音与背景（不只是关卡代码）。
   * 延迟 6 秒再动手：先把当前关的第一句语音和背景让出带宽，
   * 等孩子已经在答题、网络闲下来了，再偷偷把下一关备好。
   * 离线时直接跳过，免得白忙。
   */
  var prefetchAssetsTimer = null;
  function schedulePrefetchAssets(id) {
    var next = id && DATA.levels[id];
    if (!next || !Engine.prefetchLevel) return;
    clearTimeout(prefetchAssetsTimer);
    prefetchAssetsTimer = setTimeout(function () {
      if (navigator.onLine === false) return;
      if (typeof navigator.connection === 'object' && navigator.connection &&
          navigator.connection.saveData) return;   // 省流量模式就别偷跑
      Engine.prefetchLevel(next);
    }, 6000);
  }

  function demoMode() {
    var m = /[?&]demo=([\w-]+)/.exec(location.search);
    return m ? m[1] : '';
  }

  function renderStars(level) {
    var host = byId('level-stars');
    host.innerHTML = '';
    var star = Progress.starOf(level.id);
    if (star === 'none') return;

    var badge = document.createElement('span');
    badge.className = 'node-badge';
    badge.style.position = 'static';
    badge.style.boxShadow = 'none';
    badge.style.color = star === 'gold' ? 'var(--gold)' : '#a9b4bd';
    badge.innerHTML = STAR_SVG;
    host.appendChild(badge);
  }

  function renderDots(count) {
    var dots = byId('level-dots');
    dots.innerHTML = '';
    for (var i = 0; i < count; i += 1) dots.appendChild(document.createElement('i'));
  }

  function setStep(n) {
    var dots = byId('level-dots');
    if (!dots) return;
    Array.prototype.forEach.call(dots.children, function (dot, i) {
      dot.className = i < n ? 'is-done' : (i === n ? 'is-now' : '');
    });
  }

  function buildContext(level) {
    return {
      level: level,
      // 仅供验收：?quick=1 跳过三幕教学，直接进题
      quick: /[?&]quick=1/.test(location.search),
      audio: {
        play: function (key) {
          lastVoiceKey = key;
          var btn = byId('btn-replay');
          if (btn) btn.disabled = false;
          return Engine.audio.play(key + '.mp3', { base: DATA.meta.audioBase });
        }
      },
      sfx: Engine.sfx,
      anim: Engine.anim,
      step: setStep,
      complete: function (star) {
        // B1 完成即解锁、B4 银星完成即得（金星降为可选徽章）；
        // C4 challenge 轨完成不写 unlocked/stars/completedLevels，由 Progress.record 按 routeMap 判定。
        Progress.record(level.id, star, {
          badge: star === 'gold',
          track: isCoreLevel(level.id) ? 'core' : 'challenge'
        });
        Cloud.schedulePush();
        // E2「今天玩到这里」正向收尾由 Wellbeing 在会话层（休息/每日画面）给出，不在结算里叠加。
      },
      exit: exitLevel,
      restart: function () {
        unmountCurrent();
        mountLevel(level);
      }
    };
  }

  function unmountCurrent() {
    if (currentModule && typeof currentModule.unmount === 'function') {
      currentModule.unmount();
    }
    currentModule = null;
  }

  function renderWip(level) {
    var stage = byId('stage');
    var card = document.createElement('div');
    card.className = 'wip';
    card.innerHTML =
      '<div class="wip-emoji">+</div>' +
      '<h2>Level ' + level.id + ' · ' + level.name + '</h2>' +
      '<p>This level is still being built.</p>';

    var actions = document.createElement('div');
    actions.className = 'wip-actions';

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn btn--mint';
    back.textContent = 'Back to map';
    back.addEventListener('click', exitLevel);
    actions.appendChild(back);

    card.appendChild(actions);
    stage.appendChild(card);
    Engine.anim.play(card, 'pop', 420);
  }

  /* ---------------- 关卡背景（§5.16） ---------------- */

  /**
   * 背景图由 levels_data.js 的 level.background 驱动：
   * 素材加载时已经进过 Cache Storage，这里只把 blob URL 挂到 CSS 上。
   * 没有配 background 的关卡一律不显示背景层。
   */
  var bgSeq = 0;          // 防止慢加载把新图覆盖掉
  var bgSlot = 0;         // 两层图片轮流用

  function bgLayers() {
    var layer = byId('level-bg');
    if (!layer) return [];
    return Array.prototype.slice.call(layer.querySelectorAll('.level-bg-img'));
  }

  /**
   * 交叉淡入：新图写进空闲层 → 预解码 → 亮起新层、压暗旧层（§5.17.5）。
   * 只有一层时也能工作（新图直接替换）。
   */
  function applyLevelBackground(level) {
    var layers = bgLayers();
    if (!layers.length) return;

    var src = level && level.background;
    if (!src) {
      clearLevelBackground();
      return;
    }

    var url = Engine.assets && Engine.assets.imageUrl ? Engine.assets.imageUrl(src) : src;
    var seq = (bgSeq += 1);
    var next = layers[bgSlot % layers.length];
    var prev = layers[(bgSlot + 1) % layers.length] || next;
    bgSlot += 1;

    next.style.backgroundImage = 'url("' + url + '")';
    var probe = new Image();
    probe.onload = function () {
      if (seq !== bgSeq) return;
      next.classList.add('is-on');
      if (prev !== next) prev.classList.remove('is-on');
      setTimeout(function () {
        if (seq !== bgSeq || prev === next || prev.classList.contains('is-on')) return;
        prev.style.backgroundImage = '';
      }, 640);
    };
    var fellBack = false;
    probe.onerror = function () {
      if (seq !== bgSeq) return;
      /* blob 地址失效（退关时被 revoke、或本地副本损坏）时直接清空，
         整关背景就会凭空消失——这正是「关卡图片丢失」最直观的来源。
         先退回带内容 hash 的原始路径再试一次，仍失败才真正隐藏。 */
      if (!fellBack && /^blob:/.test(url) && Engine.assets && Engine.assets.versionedUrl) {
        fellBack = true;
        probe.src = Engine.assets.versionedUrl(src);
        return;
      }
      next.classList.remove('is-on');
      next.style.backgroundImage = '';
    };
    probe.src = url;
  }

  function clearLevelBackground() {
    var layers = bgLayers();
    if (!layers.length) return;
    var seq = (bgSeq += 1);
    layers.forEach(function (node) { node.classList.remove('is-on'); });
    setTimeout(function () {
      if (seq !== bgSeq) return;
      layers.forEach(function (node) {
        if (!node.classList.contains('is-on')) node.style.backgroundImage = '';
      });
    }, 640);
  }

  function mountLevel(level) {
    var stage = byId('stage');
    stage.innerHTML = '';

    byId('level-index').textContent = 'Level ' + level.id;
    byId('level-name').textContent = level.name;
    renderStars(level);
    applyLevelBackground(level);

    var total = (level.questions && level.questions.length) || 10;
    renderDots(Math.min(total, 10));
    setStep(0);

    var mod = global.LEVELS && global.LEVELS[level.id];
    if (!mod || typeof mod.mount !== 'function') {
      renderWip(level);
      return;
    }

    currentModule = mod.mount(stage, buildContext(level));
  }

  function enterLevel(id, skipSession) {
    if (entering) return;
    var level = DATA.levels[id];
    if (!level) return;

    var W = global.Wellbeing;
    // A1/A2/B7：每次进关记一「局」并开始双口径计时；attemptCount 语义 = 进入该关次数。
    // 休息画面后重进（skipSession）不重复计局、不重复记 attempt。
    if (!skipSession) {
      if (W && W.startSession) W.startSession();
      if (W && W.onLevelEnter) W.onLevelEnter(id);
      Progress.recordAttempt(id);
    }

    // A4/A5：连续两局或当日累计首越 50% → 先插入 20s 休息画面（无文字无语音）再进关；
    // showRestScene 内部 markRestShown，回调重进时 shouldInsertRest 已为 false，不会重复插入。
    if (!skipSession && W && W.shouldInsertRest && W.shouldInsertRest() && W.showRestScene) {
      var restHost = byId('stage');
      if (restHost) {
        entering = true;
        showScreen('level');
        W.showRestScene(restHost, function () {
          entering = false;
          enterLevel(id, true);
        });
        return;
      }
    }

    entering = true;
    var demo = demoMode();
    var options = {};

    if (demo === 'loader' || demo === 'fail') options.simulate = 12;
    if (demo === 'fail') options.simulateFail = true;

    options.onRetry = function () {
      entering = false;
      enterLevel(id);
    };

    // 关卡代码与素材并行准备，任一失败都给可点击的重试，绝不静默进关
    return Promise.all([
      loadLevelModule(id),
      Engine.loadLevel(level, options)
    ]).then(function (results) {
      entering = false;
      if (!results[1].ok) {
        Engine.toast('Could not load the sounds. Try again?');
        return;
      }
      currentLevel = level;
      showScreen('level');
      mountLevel(level);
      prefetchLevelModule(id + 1);
      schedulePrefetchAssets(id + 1);
    }).catch(function (err) {
      entering = false;
      if (global.console && console.error) console.error('[app] enterLevel', err);
      Engine.loader.open('Loading ' + level.name);
      Engine.loader.fail('Could not open this level', function () {
        Engine.loader.close();
        enterLevel(id);
      });
    });
  }

  function exitLevel() {
    // A2：离开关卡即停双口径计时（切后台/回地图不再累加屏幕占用）
    if (global.Wellbeing && Wellbeing.stopClock) Wellbeing.stopClock();
    unmountCurrent();
    clearLevelBackground();
    Engine.audio.releaseLevel();
    Engine.anim.clear(document);
    lastVoiceKey = null;
    var replay = byId('btn-replay');
    if (replay) replay.disabled = true;
    currentLevel = null;
    showScreen('map');
    renderMap();
  }

  /* ---------------- 云存档面板 ---------------- */

  function formatTime(ts) {
    if (!ts) return 'not synced yet';
    var d = new Date(ts);
    var p = function (n) { return n < 10 ? '0' + n : String(n); };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /** 家长设置区：错题干统计 + 是否取消 5 秒计时压力。全英文界面，文案保持简短。 */
  function settingsHTML() {
    var p = Progress.read();
    var count = 0, perLevel = 0;
    Object.keys(p.levelMistakes || {}).forEach(function (k) {
      var list = p.levelMistakes[k] || [];
      if (list.length) perLevel += 1;
      count += list.reduce(function (sum, item) { return sum + (item.n || 1); }, 0);
    });
    var E = Engine.settings;
    var T = E.timer;
    var cb = function (id, on, label) {
      return '<label class="setting-row">' +
        '<input id="' + id + '" type="checkbox" ' + (on ? 'checked' : '') + ' />' +
        '<span>' + label + '</span></label>';
    };
    return '<div class="field-label" style="margin-top:18px">Parent options</div>' +
      cb('setting-no-timer', E.noTimer(), 'No countdown pressure (4-year-old baseline)') +
      cb('setting-show-challenge', E.showChallenge(), 'Show optional "Try it" levels') +
      cb('setting-challenge-badge', E.challengeBadge(), 'Optional gold-star badge') +
      cb('setting-challenge-9', T.challengeEnabled(9), 'Level 9 optional 15s challenge') +
      cb('setting-challenge-12', T.challengeEnabled(12), 'Level 12 optional 12s challenge') +
      '<p style="margin-top:10px;font-size:12px;color:var(--ink-soft)">' +
        'Questions needing practice: ' + count + ' across ' + perLevel + ' levels</p>' +
      parentHTML();
  }

  function openSavePanel() {
    var W = global.Wellbeing;
    // A6 ParentGate：仅防孩子误改设置（不是能力测试、不采集信息）
    if (W && W.parentGate) {
      Engine.modal({
        title: 'Grown-ups only',
        bodyHTML: '<div id="wb-gate-host" class="wb-gate-host"></div>',
        actions: [{ label: 'Cancel', kind: 'ghost' }]
      });
      W.parentGate(byId('wb-gate-host'), function () { openSavePanelContent(); });
    } else {
      openSavePanelContent();
    }
  }

  function openSavePanelContent() {
    var info = Cloud.info();
    var summary = Progress.summary();

    var body = info.connected
      ? '<div class="field-label">Account</div><p style="font-size:15px;font-weight:700">' + info.login + '</p>' +
        '<div class="field-label" style="margin-top:14px">Status</div>' +
        '<p style="font-size:13px;color:var(--ink-soft)">' + (info.message || 'Waiting') +
        ' · last ' + formatTime(info.lastSync) + '</p>' +
        '<p style="margin-top:12px;font-size:13px;color:var(--ink-soft)">' +
        'Gold ' + summary.gold + ' · Silver ' + summary.silver +
        ' · unlocked to Level ' + summary.unlockedLevel + '</p>' +
        settingsHTML()
      : '<p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">' +
        'Sync progress across devices. The token stays on this device only.</p>' +
        '<label class="field-label" style="margin-top:14px" for="cloud-token">Access token</label>' +
        '<input id="cloud-token" class="field" type="password" autocomplete="off" placeholder="ghp_… or github_pat_…" />' +
        '<label class="field-label" style="margin-top:12px" for="cloud-gist">Save ID (optional)</label>' +
        '<input id="cloud-gist" class="field" type="text" autocomplete="off" placeholder="Leave empty to create one" />' +
        '<p id="cloud-msg" style="margin-top:12px;font-size:12px;color:#c2593f;min-height:16px"></p>' +
        settingsHTML();

    var actions = info.connected
      ? [
          { label: 'Close', kind: 'ghost' },
          {
            label: 'Sync now',
            onClick: function (api) {
              Cloud.syncNow();
              api.close();
              Engine.toast('Syncing…');
            }
          },
          {
            label: 'Disconnect',
            onClick: function () {
              Cloud.disconnect();
              Engine.toast('Disconnected');
            }
          }
        ]
      : [
          { label: 'Cancel', kind: 'ghost' },
          {
            label: 'Connect',
            onClick: function (api) {
              var token = (byId('cloud-token') || {}).value || '';
              var gist = (byId('cloud-gist') || {}).value || '';
              var msg = byId('cloud-msg');
              if (msg) msg.textContent = 'Checking…';

              Cloud.connect(token, gist).then(function (res) {
                api.close();
                Engine.toast('Connected as ' + res.login);
              }).catch(function (err) {
                if (msg) msg.textContent = String(err.message || err);
                Engine.sfx.deny();
              });
              return false;   // 异步，保持弹层直到有结果
            }
          }
        ];

    Engine.modal({
      title: 'Settings & cloud save',
      text: info.connected ? '' : 'An internet connection is required.',
      bodyHTML: body,
      actions: actions
    });

    // C2：限时窗口每题开始时求值 + EVT_SETTINGS_CHANGED 触发 timer.rebase()，不再需要重载页面。
    var E = Engine.settings, T = E.timer;
    var bindToggle = function (id, apply) {
      var el = byId(id);
      if (el) el.addEventListener('change', function () { apply(el.checked); });
    };
    bindToggle('setting-no-timer', function (on) {
      E.set({ noTimer: on });
      Engine.toast(on ? 'No countdown pressure' : 'Countdown pressure on');
    });
    bindToggle('setting-show-challenge', function (on) {
      E.setShowChallenge(on);
      renderMap();   // 立即反映 core-only / 试一试 显示变化
    });
    bindToggle('setting-challenge-badge', function (on) { E.setChallengeBadge(on); });
    bindToggle('setting-challenge-9', function (on) { T.setChallenge(9, on); });
    bindToggle('setting-challenge-12', function (on) { T.setChallenge(12, on); });
    // E1 陪玩钩子 1：讲给爸爸妈妈听 → 家长按「I heard you」成长树 +1 叶（不判对错、不录音、不强制）
    var leaf = byId('wb-parent-leaf');
    if (leaf) leaf.addEventListener('click', function () {
      if (global.Wellbeing && Wellbeing.addParentLeaf) Wellbeing.addParentLeaf();
      Engine.sfx.tap();
      Engine.toast('A new leaf on the little tree');
      openSavePanelContent();   // 刷新成长树计数
    });
  }

  function updateSaveButton() {
    var btn = byId('btn-save');
    if (!btn) return;
    var info = Cloud.info();
    btn.classList.toggle('is-linked', !!info.connected);
    btn.setAttribute('aria-label', info.connected ? 'Cloud save connected' : 'Cloud save not connected');
  }

  /* ---------------- 事件绑定 ---------------- */

  function bind() {
    var back = byId('btn-back');
    if (back) back.addEventListener('click', function () {
      Engine.sfx.tap();
      exitLevel();
    });

    var replay = byId('btn-replay');
    if (replay) replay.addEventListener('click', function () {
      if (!lastVoiceKey) return;
      Engine.sfx.tap();
      Engine.audio.play(lastVoiceKey + '.mp3', { base: DATA.meta.audioBase });
    });

    var save = byId('btn-save');
    if (save) save.addEventListener('click', function () {
      Engine.sfx.tap();
      openSavePanel();
    });

    var prev = byId('stage-prev');
    if (prev) prev.addEventListener('click', function () {
      Engine.sfx.tap();
      stageJump(-1);
    });

    var next = byId('stage-next');
    if (next) next.addEventListener('click', function () {
      Engine.sfx.tap();
      stageJump(1);
    });

    bindSwipe();

    var nodes = byId('map-track');
    if (nodes) nodes.addEventListener('click', function (e) {
      var node = e.target.closest ? e.target.closest('.node') : null;
      if (!node) return;

      Engine.sfx.tap();
      var id = Number(node.dataset.level);
      var level = DATA.levels[id];
      if (!level) return;

      if (level.status === 'coming') {
        Engine.toast('Coming soon');
        return;
      }
      if (!Progress.isUnlocked(id)) {
        Engine.toast('Finish the previous level first');
        Engine.anim.play(node, 'shake', 420);
        return;
      }
      enterLevel(id);
    });

    document.addEventListener('progress:change', function () {
      renderMap();
      updateSaveButton();
      if (currentLevel) renderStars(currentLevel);
    });

    document.addEventListener('cloud:change', function () {
      updateSaveButton();
    });
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    Progress.init();
    Engine.audio.armUnlock();
    Engine.audio.init();          // 清理旧版本素材缓存
    renderMap();
    bind();
    Cloud.init();
    Sandbox.install();
    updateSaveButton();

    // 关卡答错时由 Engine.session 派发，这里补上 levelId 后静默落盘。
    // 不 emit progress:change：地图不依赖错题数据，避免答题时反复重绘。
    document.addEventListener('quiz:wrong', function (e) {
      if (!currentLevel) return;
      var d = e.detail || {};
      // B7 错题收窄：撤销 / 超时 / near / 非真答错 / challenge 轨一律不写（由 Progress 判定）
      Progress.recordMistake(currentLevel.id, d.index || 0, d);
      // E2 陪玩钩子 2：第 1 次真答错自动重听时，给「和爸爸妈妈一起再听一遍」温和提示（非语音、不判错）
      if (d.attempt === 1 && d.realWrong !== false && !d.timeout && !d.undo && Engine.toast) {
        Engine.toast('Listen again together with a grown-up');
      }
    });
  }

  global.App = {
    refresh: renderMap,
    openLevel: enterLevel,
    exitLevel: exitLevel,
    openSavePanel: openSavePanel
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
