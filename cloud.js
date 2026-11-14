/* ============================================================
   cloud.js · Gist 云存档
   ------------------------------------------------------------
   规则（PROJECT_MATH_RULES §7）：
     · 令牌只存本机 localStorage，绝不入库、绝不进页面源码
     · 任何同步都先「拉取 → 合并 → 回写」，禁止直接覆盖
     · 合并策略：最高关卡覆盖、每关最高星级覆盖、通关取并集、错题累加
     · 失败只做有限次退避（15/30/60/120 秒），不空转重试
     · 沙盒模式下所有入口静默短路，绝不污染云端

   并发安全（2026-11-14）：
     · visibilitychange / online / schedulePush 三处入口全部走 singleFlight
     · 写回用 If-Match + ETag 条件写；远端被别的设备改过时重新拉取再合并
     · 只有 401/403 才判定令牌失效；网络抖动保留凭据并后台退避重试

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
  var inFlight = null;

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
    if (!token) throw new Error('Not connected to cloud save');

    var headers = {
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token,
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (options.headers) {
      Object.keys(options.headers).forEach(function (k) { headers[k] = options.headers[k]; });
    }
    if (options.body) headers['Content-Type'] = 'application/json';

    var res = await fetch(API + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store'
    });

    if (res.status === 401 || res.status === 403) {
      var auth = new Error('Invalid token, or the token lacks gist permission');
      auth.authError = true;
      throw auth;
    }
    // 条件写失败：远端已被另一台设备更新，需要重新合并
    if (res.status === 412 || res.status === 409) {
      var conflict = new Error('Cloud save changed on another device');
      conflict.conflict = true;
      throw conflict;
    }
    if (!res.ok) {
      var text = await res.text();
      throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 120));
    }
    var data = res.status === 204 ? null : await res.json();
    return options.withMeta
      ? { data: data, etag: res.headers.get('etag') || '' }
      : data;
  }

  function same(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  /** 同一时刻只跑一次同步；三个触发源并发时复用同一个 Promise */
  function singleFlight(task) {
    if (inFlight) return inFlight;
    inFlight = Promise.resolve().then(task).then(function (v) {
      inFlight = null;
      return v;
    }, function (e) {
      inFlight = null;
      throw e;
    });
    return inFlight;
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

  /** 读取远端内容并保留 ETag，供条件写使用 */
  async function readRemoteWithEtag(id) {
    var snap = await api('/gists/' + id, { withMeta: true });
    var gist = snap.data;
    var file = gist.files && gist.files[FILE];
    if (!file) return { data: null, etag: snap.etag };

    // 单文件超过 1MB 时 GitHub 会截断，需要走 raw_url
    if (file.truncated && file.raw_url) {
      var res = await fetch(file.raw_url, { cache: 'no-store' });
      if (!res.ok) throw new Error('Could not read the cloud save');
      return { data: JSON.parse(await res.text()), etag: snap.etag };
    }
    if (!file.content) return { data: null, etag: snap.etag };
    return { data: JSON.parse(file.content), etag: snap.etag };
  }

  /** 返回 false 表示 ETag 冲突，调用方应重新拉取再合并 */
  async function writeRemote(id, progress, etag) {
    try {
      await api('/gists/' + id, {
        method: 'PATCH',
        headers: etag ? { 'If-Match': etag } : null,
        body: {
          description: DESC,
          files: (function () {
            var files = {};
            files[FILE] = { content: JSON.stringify(progress, null, 2) };
            return files;
          })()
        }
      });
      return true;
    } catch (err) {
      if (err && err.conflict) return false;
      throw err;
    }
  }

  /** 拉取 → 合并 → 条件写。冲突最多重试两轮，绝不拿旧快照覆盖新进度。 */
  function syncMerge() {
    return singleFlight(async function () {
      var id = await ensureGist();
      for (var attempt = 0; attempt < 3; attempt += 1) {
        var snap = await readRemoteWithEtag(id);
        var local = Progress.read();
        var merged = snap.data ? Progress.merge(local, snap.data) : local;

        if (!same(merged, local)) Progress.save(merged);
        if (same(merged, snap.data)) {
          lastSync = Date.now();
          failures = 0;
          return merged;
        }
        if (await writeRemote(id, merged, snap.etag)) {
          lastSync = Date.now();
          failures = 0;
          return merged;
        }
        // 412：远端刚被别的设备改过，下一轮用新快照重新合并
      }
      throw new Error('Cloud save kept changing, please try again');
    });
  }

  function pull() {
    if (!token || sandboxed()) return Promise.resolve(Progress.read());
    return syncMerge();
  }

  function push() {
    if (!token || sandboxed()) return Promise.resolve(Progress.read());
    return syncMerge();
  }

  async function syncNow() {
    if (!token || sandboxed()) return;
    setStatus('syncing', 'Syncing…');
    try {
      await syncMerge();
      setStatus('ok', 'Synced');
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
    if (!clean) throw new Error('Please enter a token');

    token = clean;
    status = 'connecting';
    emit();

    try {
      var me = await api('/user');
      login = me.login || '';
      gistId = String(nextGistId || '').trim();
      saveCredentials();
      await syncMerge();
      setStatus('ok', 'Connected as ' + login);
      return info();
    } catch (err) {
      // 旧实现无论什么错误都清空 token，网络抖一下就要重新粘贴令牌。
      // 现在只有鉴权失败才清；其余保留凭据并走后台退避重试。
      if (err && err.authError) {
        token = '';
        login = '';
        saveCredentials();
      } else {
        scheduleRetry();
      }
      setStatus('error', String(err.message || err));
      throw err;
    }
  }

  function disconnect() {
    token = '';
    gistId = '';
    login = '';
    failures = 0;
    inFlight = null;
    clearTimeout(pushTimer);
    clearTimeout(backoffTimer);
    try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
    setStatus('idle', 'Disconnected');
  }

  /** 通关后调用：合并写云端，500ms 防抖 */
  function schedulePush() {
    if (!token || sandboxed()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      push().then(function () {
        setStatus('ok', 'Synced');
      }).catch(function (err) {
        setStatus('error', String(err.message || err));
        scheduleRetry();
      });
    }, 500);
  }

  function init() {
    loadCredentials();
    if (token) {
      setStatus('idle', 'Waiting to sync');
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
