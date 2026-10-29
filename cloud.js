/* ============================================================
   cloud.js · Gist 云存档
   ------------------------------------------------------------
   规则（PROJECT_MATH_RULES §7）：
     · 令牌只存本机 localStorage，绝不入库、绝不进页面源码
     · 任何同步都先「拉取 → 合并 → 回写」，禁止直接覆盖
     · 合并策略：最高关卡覆盖、每关最高星级覆盖、通关记录取并集
     · 失败只做有限次退避（15/30/60/120 秒），不空转重试
     · 沙盒模式下六个入口全部静默短路，绝不污染云端

   浏览器要求：ES2017（近三年移动端浏览器均满足）
   ============================================================ */

window.Cloud = (function () {
  'use strict';

  var LS_KEY = 'math-adventure.cloud.v1';
  var API = 'https://api.github.com';
  var FILE = 'math-adventure-save.json';
  var DESC = 'math-adventure-save';
  var BACKOFF = [15000, 30000, 60000, 120000];

  var token = '';
  var gistId = '';
  var login = '';
  var status = 'idle';       // idle | connecting | syncing | ok | error
  var message = '';
  var lastSync = 0;
  var failures = 0;
  var pushTimer = null;
  var backoffTimer = null;

  function sandboxed() {
    return !!(window.Sandbox && window.Sandbox.active && window.Sandbox.active());
  }

  function emit() {
    document.dispatchEvent(new CustomEvent('cloud:change', { detail: info() }));
  }

  function setStatus(next, msg) {
    status = next;
    message = msg || '';
    emit();
  }

  function info() {
    return {
      connected: !!token,
      login: login,
      gistId: gistId,
      status: status,
      message: message,
      lastSync: lastSync
    };
  }

  function loadCredentials() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      token = data.token || '';
      gistId = data.gistId || '';
      login = data.login || '';
    } catch (e) { /* 损坏则当作未连接 */ }
  }

  function saveCredentials() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ token: token, gistId: gistId, login: login }));
    } catch (e) { /* 隐私模式忽略 */ }
  }

  async function api(path, options) {
    options = options || {};
    if (!token) throw new Error('尚未连接云端');

    var headers = {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (options.body) headers['Content-Type'] = 'application/json';

    var res = await fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error('令牌无效或权限不足（需要 gist 权限）');
    }
    if (!res.ok) {
      var text = await res.text();
      throw new Error('HTTP ' + res.status + '：' + text.slice(0, 120));
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /** 找到本项目存档 Gist；没有就新建一个私密 Gist */
  async function ensureGist() {
    if (gistId) return gistId;

    var list = await api('/gists?per_page=100');
    var hit = (list || []).filter(function (g) {
      return g.description === DESC && g.files && g.files[FILE];
    })[0];

    if (hit) {
      gistId = hit.id;
      saveCredentials();
      return gistId;
    }

    var created = await api('/gists', {
      method: 'POST',
      body: {
        description: DESC,
        public: false,
        files: (function () {
          var files = {};
          files[FILE] = { content: JSON.stringify(Progress.read(), null, 2) };
          return files;
        })()
      }
    });
    gistId = created.id;
    saveCredentials();
    return gistId;
  }

  async function readRemote(id) {
    var gist = await api('/gists/' + id);
    var file = gist.files && gist.files[FILE];
    if (!file) return null;

    // 单文件超过 1MB 时 GitHub 会截断，需要走 raw_url
    if (file.truncated && file.raw_url) {
      var res = await fetch(file.raw_url, { cache: 'no-store' });
      if (!res.ok) throw new Error('读取云存档失败');
      return JSON.parse(await res.text());
    }
    if (!file.content) return null;
    return JSON.parse(file.content);
  }

  async function writeRemote(id, progress) {
    await api('/gists/' + id, {
      method: 'PATCH',
      body: {
        description: DESC,
        files: (function () {
          var files = {};
          files[FILE] = { content: JSON.stringify(progress, null, 2) };
          return files;
        })()
      }
    });
  }

  /** 拉取并合并；本地与云端都更新为「最高进度」 */
  async function pull() {
    if (!token || sandboxed()) return Progress.read();
    var id = await ensureGist();
    var remote = await readRemote(id);
    var local = Progress.read();
    if (!remote) return local;

    var merged = Progress.merge(local, remote);
    if (!same(merged, local)) Progress.save(merged);
    if (!same(merged, remote)) await writeRemote(id, merged);

    lastSync = Date.now();
    failures = 0;
    return merged;
  }

  /** 推送：先合并再写，绝不允许低进度覆盖高进度 */
  async function push() {
    if (!token || sandboxed()) return Progress.read();
    var id = await ensureGist();
    var remote = await readRemote(id);
    var local = Progress.read();
    var merged = remote ? Progress.merge(local, remote) : local;

    if (!same(merged, local)) Progress.save(merged);
    if (!same(merged, remote)) await writeRemote(id, merged);

    lastSync = Date.now();
    failures = 0;
    return merged;
  }

  async function syncNow() {
    if (!token || sandboxed()) return;
    setStatus('syncing', '正在同步…');
    try {
      await pull();
      await push();
      setStatus('ok', '已同步');
    } catch (err) {
      setStatus('error', String(err.message || err));
      scheduleRetry();
    }
  }

  function scheduleRetry() {
    if (sandboxed()) return;
    if (failures >= BACKOFF.length) return;   // 四次之后静默等待下次触发
    var delay = BACKOFF[failures];
    failures += 1;
    clearTimeout(backoffTimer);
    backoffTimer = setTimeout(function () { syncNow(); }, delay);
  }

  async function connect(nextToken, nextGistId) {
    var clean = String(nextToken || '').trim();
    if (!clean) throw new Error('请先填写令牌');

    token = clean;
    status = 'connecting';
    emit();

    try {
      var me = await api('/user');
      login = me.login || '';
      gistId = String(nextGistId || '').trim();
      saveCredentials();
      await pull();
      await push();
      setStatus('ok', '已连接 ' + login);
      return info();
    } catch (err) {
      token = '';
      login = '';
      saveCredentials();
      setStatus('error', String(err.message || err));
      throw err;
    }
  }

  function disconnect() {
    token = '';
    gistId = '';
    login = '';
    failures = 0;
    clearTimeout(pushTimer);
    clearTimeout(backoffTimer);
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
    setStatus('idle', '已断开');
  }

  /** 通关后调用：合并写云端，500ms 防抖 */
  function schedulePush() {
    if (!token || sandboxed()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().then(function () {
        setStatus('ok', '已同步');
      }).catch(function (err) {
        setStatus('error', String(err.message || err));
        scheduleRetry();
      });
    }, 500);
  }

  function init() {
    loadCredentials();
    if (token) {
      setStatus('idle', '待同步');
      syncNow();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && token && !sandboxed()) {
        pull().catch(function () { /* 静默 */ });
      }
    });
    window.addEventListener('online', function () {
      if (token && !sandboxed()) pull().catch(function () { /* 静默 */ });
    });
  }

  return {
    FILE: FILE,
    init: init,
    connect: connect,
    disconnect: disconnect,
    pull: pull,
    push: push,
    syncNow: syncNow,
    schedulePush: schedulePush,
    info: info
  };
})();
