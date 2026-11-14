/* ============================================================
   Math Adventure · Service Worker
   ------------------------------------------------------------
   职责边界（很重要，别和 engine.js 抢活）：
   · SW 只管「应用外壳」：index.html / JS / CSS / manifest / 图标 / 地图阶段图。
     一律 network-first，联网时永远拿最新，断网才回落缓存。
   · 按关素材（voice/*.mp3 与 assets/bg/bg_*.webp）由 engine.js 的
     Cache Storage 管道管理，URL 自带内容 hash。SW 对这些请求直接放行，
     否则同一份文件会被缓存两遍，白占 20MB 配额。

   这样即使不发新版，只要重新部署 index.html / engine.js，
   孩子设备下一次联网就会自动取到新代码；素材则按内容 hash 精确失效。
   ============================================================ */

var CACHE = 'math-adventure-shell-v3';   // v3：背景图改可选 + 提超时/重试 + 阶段图 cache-first

var SHELL = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './asset-manifest.js',
  './levels_data.js',
  './route-map.js',
  './wellbeing.js',
  './feedback.js',
  './review.js',
  './engine.js',
  './progress.js',
  './cloud.js',
  './sandbox.js',
  './level-kit.js',
  './app.js',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon-180.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      // 单个资源失败不能连累整个安装（例如某个图标尚未部署）
      return Promise.all(SHELL.map(function (u) {
        return c.add(new Request(u, { cache: 'reload' })).catch(function () { });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        // 只清理旧版本的外壳缓存；math-adventure-assets-* 是 engine 的素材库，
        // 里面装着孩子已经下好的语音，绝不能因为换版号被顺手删掉。
        return (k.indexOf('math-adventure-shell-') === 0 && k !== CACHE)
          ? caches.delete(k) : null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function engineManaged(pathname) {
  return /\.mp3$/i.test(pathname) || /\/assets\/bg\/bg_\d+\.webp$/i.test(pathname);
}

/* 带内容 hash 的静态图（地图五个阶段背景）：URL 变了才需要重新下载，
   所以可以放心 cache-first。原来跟着外壳走 network-first + cache:reload，
   等于每次打开首页都强制重下 87KB，弱网下白等一轮往返。 */
function hashStableAsset(pathname) {
  return /\/assets\/bg\/stage_\d+\.webp$/i.test(pathname);
}

function offlineFallback(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    var pathname = '';
    try { pathname = new URL(req.url).pathname; } catch (err) { /* noop */ }
    if (req.mode === 'navigate' || /(\/|\.html)$/i.test(pathname)) {
      return caches.match('./index.html');
    }
    // 代码文件离线又没缓存时，绝不能拿 index.html 冒充 JS
    return new Response('', { status: 503, statusText: 'Offline' });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  // 云存档走 api.github.com，一律放行，不缓存
  if (url.origin !== self.location.origin) return;
  if (engineManaged(url.pathname)) return;

  if (hashStableAsset(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match(req).then(function (hit) {
          if (hit) return hit;
          return fetch(new Request(req, { cache: 'reload' })).then(function (res) {
            if (res && res.status === 200) {
              var copy = res.clone();
              c.put(req, copy).catch(function () { });
            }
            return res;
          });
        });
      }).catch(function () { return offlineFallback(req); })
    );
    return;
  }

  e.respondWith(
    fetch(new Request(req, { cache: 'reload' })).then(function (res) {
      if (res && res.status === 200) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () { });
      }
      return res;
    }).catch(function () { return offlineFallback(req); })
  );
});
