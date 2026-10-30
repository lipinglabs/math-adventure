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
        if (DATA.levels[id]) ids.push(id);
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

  function goTo(index, animate) {
    if (!view.pages.length) return;
    view.index = Math.max(0, Math.min(view.pages.length - 1, index));
    paintTrack(0, animate !== false);
    paintStageMeta();
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
          return Engine.audio.play(key + '.mp3', { base: DATA.meta.audioBase });
        }
      },
      sfx: Engine.sfx,
      anim: Engine.anim,
      step: setStep,
      complete: function (star) {
        Progress.record(level.id, star);
        Cloud.schedulePush();
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
    probe.onerror = function () {
      if (seq !== bgSeq) return;
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

  function enterLevel(id) {
    if (entering) return;
    var level = DATA.levels[id];
    if (!level) return;

    entering = true;
    var demo = demoMode();
    var options = {};

    if (demo === 'loader' || demo === 'fail') options.simulate = 12;
    if (demo === 'fail') options.simulateFail = true;

    options.onRetry = function () {
      entering = false;
      enterLevel(id);
    };

    Engine.loadLevel(level, options).then(function (result) {
      entering = false;
      if (!result.ok) {
        Engine.toast('Could not load the sounds. Try again?');
        return;
      }
      currentLevel = level;
      showScreen('level');
      mountLevel(level);
    });
  }

  function exitLevel() {
    unmountCurrent();
    clearLevelBackground();
    Engine.audio.releaseLevel();
    Engine.anim.clear(document);
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

  function openSavePanel() {
    var info = Cloud.info();
    var summary = Progress.summary();

    var body = info.connected
      ? '<div class="field-label">Account</div><p style="font-size:15px;font-weight:700">' + info.login + '</p>' +
        '<div class="field-label" style="margin-top:14px">Status</div>' +
        '<p style="font-size:13px;color:var(--ink-soft)">' + (info.message || 'Waiting') +
        ' · last ' + formatTime(info.lastSync) + '</p>' +
        '<p style="margin-top:12px;font-size:13px;color:var(--ink-soft)">' +
        'Gold ' + summary.gold + ' · Silver ' + summary.silver +
        ' · unlocked to Level ' + summary.unlockedLevel + '</p>'
      : '<p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">' +
        'Sync progress across devices. The token stays on this device only.</p>' +
        '<label class="field-label" style="margin-top:14px" for="cloud-token">Access token</label>' +
        '<input id="cloud-token" class="field" type="password" autocomplete="off" placeholder="ghp_… or github_pat_…" />' +
        '<label class="field-label" style="margin-top:12px" for="cloud-gist">Save ID (optional)</label>' +
        '<input id="cloud-gist" class="field" type="text" autocomplete="off" placeholder="Leave empty to create one" />' +
        '<p id="cloud-msg" style="margin-top:12px;font-size:12px;color:#c2593f;min-height:16px"></p>';

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
      title: 'Cloud save',
      text: info.connected ? '' : 'An internet connection is required.',
      bodyHTML: body,
      actions: actions
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
