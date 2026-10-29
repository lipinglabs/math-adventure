/* ============================================================
   app.js · 启动与路由
   ------------------------------------------------------------
   只做三件事：
     1. 把 levels_data.js 渲染成地图
     2. 地图 ↔ 关卡 的切换（进入前必须过加载闸门）
     3. 云存档面板的交互

   任何题面、判定、动画细节都不写在这里。
   ============================================================ */

(function (global) {
  'use strict';

  var DATA = global.MATH_DATA;
  var currentLevel = null;
  var entering = false;

  function byId(id) { return document.getElementById(id); }

  /* ---------------- 地图 ---------------- */

  var STAR_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z" ' +
    'fill="currentColor"/></svg>';

  var LOCK_SVG =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">' +
    '<rect x="5" y="10.5" width="14" height="9.5" rx="3" fill="currentColor"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round"/></svg>';

  function stateOf(level) {
    if (level.status === 'coming') return 'coming';
    if (!Progress.isUnlocked(level.id)) return 'locked';
    if (Progress.starOf(level.id) === 'gold') return 'gold';
    if (Progress.starOf(level.id) === 'silver') return 'silver';
    return 'open';
  }

  function renderMap() {
    var host = byId('map-nodes');
    if (!host) return;

    var viewBox = (DATA.map && DATA.map.viewBox) || { w: 390, h: 620 };
    var spots = (DATA.map && DATA.map.spots) || [];
    host.innerHTML = '';

    spots.forEach(function (spot) {
      var level = DATA.levels[spot.level];
      if (!level) return;

      var state = stateOf(level);
      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'node node--' + state;
      node.dataset.level = String(level.id);
      node.style.setProperty('--x', (spot.x / viewBox.w * 100).toFixed(3) + '%');
      node.style.setProperty('--y', (spot.y / viewBox.h * 100).toFixed(3) + '%');
      node.setAttribute('aria-label',
        '第 ' + level.id + ' 关 ' + level.name +
        (state === 'coming' ? '，尚未开放' : state === 'locked' ? '，未解锁' : ''));

      var disc = document.createElement('span');
      disc.className = 'node-disc';

      var num = document.createElement('span');
      num.className = 'node-num';
      num.textContent = String(level.id);
      disc.appendChild(num);

      var badge = document.createElement('span');
      badge.className = 'node-badge' + (state === 'locked' || state === 'coming' ? ' node-badge--lock' : '');
      badge.innerHTML = state === 'gold' || state === 'open' ? STAR_SVG
        : state === 'silver' ? STAR_SVG
        : LOCK_SVG;
      disc.appendChild(badge);

      var label = document.createElement('span');
      label.className = 'node-label';
      label.textContent = state === 'coming' ? '敬请期待' : level.name;

      node.appendChild(disc);
      node.appendChild(label);
      host.appendChild(node);
    });

    var gold = Progress.summary().gold;
    var note = byId('map-note');
    if (note) {
      note.textContent = gold > 0 ? '已收集 ' + gold + ' 颗金星' : '第一座岛正在建造中';
    }
  }

  /* ---------------- 屏幕切换 ---------------- */

  function showScreen(name) {
    var map = byId('screen-map');
    var level = byId('screen-level');
    if (!map || !level) return;
    map.classList.toggle('is-active', name === 'map');
    level.classList.toggle('is-active', name === 'level');
  }

  /* ---------------- 进入关卡 ---------------- */

  function demoMode() {
    var m = /[?&]demo=([\w-]+)/.exec(location.search);
    return m ? m[1] : '';
  }

  function enterLevel(id) {
    if (entering) return;
    var level = DATA.levels[id];
    if (!level) return;

    entering = true;
    var demo = demoMode();
    var options = {};

    if (demo === 'loader' && level.demoAssets) options.simulate = level.demoAssets;
    if (demo === 'fail' && level.demoAssets) {
      options.simulate = level.demoAssets;
      options.simulateFail = true;
    }

    options.onRetry = function () {
      entering = false;
      enterLevel(id);
    };

    Engine.loadLevel(level, options).then(function (result) {
      entering = false;
      if (!result.ok) {
        Engine.toast('素材没加载成功，请检查网络后重试');
        return;
      }
      currentLevel = level;
      showScreen('level');
      renderLevel(level, result);
    });
  }

  function renderLevel(level, result) {
    byId('level-index').textContent = '第 ' + level.id + ' 关';
    byId('level-name').textContent = level.name;

    // 星级
    var stars = byId('level-stars');
    stars.innerHTML = '';
    var star = Progress.starOf(level.id);
    if (star !== 'none') {
      var span = document.createElement('span');
      span.className = 'node-badge';
      span.style.position = 'static';
      span.style.boxShadow = 'none';
      span.innerHTML = STAR_SVG;
      span.style.color = star === 'gold' ? 'var(--gold)' : '#a9b4bd';
      stars.appendChild(span);
    }

    // 10 个进度点
    var dots = byId('level-dots');
    dots.innerHTML = '';
    for (var i = 0; i < 10; i += 1) dots.appendChild(document.createElement('i'));

    var stage = byId('stage');
    stage.innerHTML = '';

    // Three.js 扩展位：当前返回 null，说明走的是 DOM 渲染
    var canvasHost = document.createElement('div');
    canvasHost.className = 'stage-3d';
    canvasHost.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    stage.appendChild(canvasHost);
    Engine.three.mount(canvasHost);

    var card = document.createElement('div');
    card.className = 'wip';
    card.innerHTML =
      '<div class="wip-emoji">＋</div>' +
      '<h2>第 ' + level.id + ' 关 · ' + level.name + '</h2>' +
      '<p>关卡内容正在搭建。台词与动画方案确认后，这一屏会替换成教学幕和答题区。</p>';

    var meta = document.createElement('p');
    meta.style.cssText = 'margin-top:10px;font-size:12px;color:var(--ink-faint)';
    meta.textContent = '本次加载 ' + result.total + ' 个素材，耗时 ' + result.ms + ' 毫秒';
    card.appendChild(meta);

    var actions = document.createElement('div');
    actions.className = 'wip-actions';

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'btn btn--mint';
    back.textContent = '回到地图';
    back.addEventListener('click', exitLevel);
    actions.appendChild(back);

    var replay = document.createElement('button');
    replay.type = 'button';
    replay.className = 'btn btn--ghost';
    replay.textContent = '重看加载';
    replay.addEventListener('click', function () {
      enterLevel(level.id);
    });
    actions.appendChild(replay);

    card.appendChild(actions);
    stage.appendChild(card);
    Engine.anim.play(card, 'pop', 420);
  }

  function exitLevel() {
    Engine.audio.releaseLevel();
    Engine.anim.clear(document);
    currentLevel = null;
    showScreen('map');
    renderMap();
  }

  /* ---------------- 云存档面板 ---------------- */

  function formatTime(ts) {
    if (!ts) return '尚未同步';
    var d = new Date(ts);
    var p = function (n) { return n < 10 ? '0' + n : String(n); };
    return p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function openSavePanel() {
    var info = Cloud.info();
    var summary = Progress.summary();

    var body = info.connected
      ? '<div class="field-label">当前账号</div><p style="font-size:15px;font-weight:700">' + info.login + '</p>' +
        '<div class="field-label" style="margin-top:14px">同步状态</div>' +
        '<p style="font-size:13px;color:var(--ink-soft)">' + (info.message || '待同步') +
        ' · 上次 ' + formatTime(info.lastSync) + '</p>' +
        '<p style="margin-top:12px;font-size:13px;color:var(--ink-soft)">' +
        '金星 ' + summary.gold + ' 颗 · 银星 ' + summary.silver + ' 颗 · 已解锁到第 ' +
        summary.unlockedLevel + ' 关</p>'
      : '<p style="font-size:13px;line-height:1.7;color:var(--ink-soft)">' +
        '填入仅带 gist 权限的令牌后，进度会自动在设备之间同步。令牌只存在这台设备上。</p>' +
        '<label class="field-label" style="margin-top:14px" for="cloud-token">访问令牌</label>' +
        '<input id="cloud-token" class="field" type="password" autocomplete="off" placeholder="ghp_… 或 github_pat_…" />' +
        '<label class="field-label" style="margin-top:12px" for="cloud-gist">已有存档编号（可留空）</label>' +
        '<input id="cloud-gist" class="field" type="text" autocomplete="off" placeholder="留空则自动创建" />' +
        '<p id="cloud-msg" style="margin-top:12px;font-size:12px;color:#c2593f;min-height:16px"></p>';

    var actions = info.connected
      ? [
          { label: '关闭', kind: 'ghost' },
          {
            label: '立即同步',
            onClick: function (api) {
              Cloud.syncNow();
              api.close();
              Engine.toast('正在同步…');
            }
          },
          {
            label: '断开',
            onClick: function () {
              Cloud.disconnect();
              Engine.toast('已断开云存档');
            }
          }
        ]
      : [
          { label: '取消', kind: 'ghost' },
          {
            label: '连接',
            onClick: function (api) {
              var token = (byId('cloud-token') || {}).value || '';
              var gist = (byId('cloud-gist') || {}).value || '';
              var msg = byId('cloud-msg');
              if (msg) msg.textContent = '正在验证…';

              Cloud.connect(token, gist).then(function (res) {
                api.close();
                Engine.toast('已连接 ' + res.login);
              }).catch(function (err) {
                if (msg) msg.textContent = String(err.message || err);
                Engine.sfx.deny();
              });
              return false;   // 异步，保持弹层直到有结果
            }
          }
        ];

    Engine.modal({
      title: '云存档',
      text: info.connected ? '' : '跨设备同步需要联网。',
      bodyHTML: body,
      actions: actions
    });
  }

  function updateSaveButton() {
    var btn = byId('btn-save');
    if (!btn) return;
    var info = Cloud.info();
    btn.classList.toggle('is-linked', !!info.connected);
    btn.setAttribute('aria-label', info.connected ? '云存档已连接，点按管理' : '云存档未连接，点按设置');
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

    var nodes = byId('map-nodes');
    if (nodes) nodes.addEventListener('click', function (e) {
      var node = e.target.closest ? e.target.closest('.node') : null;
      if (!node) return;

      Engine.sfx.tap();
      var id = Number(node.dataset.level);
      var level = DATA.levels[id];
      if (!level) return;

      if (level.status === 'coming') {
        Engine.toast('这一关还在路上');
        return;
      }
      if (!Progress.isUnlocked(id)) {
        Engine.toast('先拿到上一关的金星吧');
        Engine.anim.play(node, 'shake', 420);
        return;
      }
      enterLevel(id);
    });

    document.addEventListener('progress:change', function () {
      renderMap();
      updateSaveButton();
    });

    document.addEventListener('cloud:change', function () {
      updateSaveButton();
    });
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    Progress.init();
    Engine.audio.armUnlock();
    renderMap();
    bind();
    Cloud.init();
    Sandbox.install();
    updateSaveButton();

    // 演示模式：方便验收进度条，不影响正常入口
    var demo = demoMode();
    if (demo === 'loader' || demo === 'fail') {
      setTimeout(function () { enterLevel(1); }, 500);
    }
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
