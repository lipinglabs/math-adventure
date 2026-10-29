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
      host.appendChild(node);
    });

    var gold = Progress.summary().gold;
    var note = byId('map-note');
    if (note) {
      note.textContent = gold > 0 ? 'Gold stars: ' + gold : 'Tap a level to play';
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

  function mountLevel(level) {
    var stage = byId('stage');
    stage.innerHTML = '';

    byId('level-index').textContent = 'Level ' + level.id;
    byId('level-name').textContent = level.name;
    renderStars(level);

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

    var nodes = byId('map-nodes');
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
