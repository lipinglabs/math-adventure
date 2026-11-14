#!/usr/bin/env node
/* ============================================================
   smoke-levels.js · 48 关逐关冒烟（零第三方依赖）
   ------------------------------------------------------------
   自包含：起本地静态服务 → 启动 Edge headless → CDP 注入验收脚本 → 出报告。
   检查项：每关动态模块能加载、素材读条放行、关卡 DOM 挂上、能退回地图、
           零 JS 错误、零「语音未预载」告警、音频池不泄漏、SW 已注册。

   用法：node tools/smoke-levels.js [--levels=48]
   产出：.shots/smoke-report.json
   ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.SMOKE_PORT || 8765);
const CDP_PORT = Number(process.env.SMOKE_CDP || 9333);
const PROFILE = path.join(ROOT, 'tmp', '.smoke-profile');
const SHOTS = path.join(ROOT, '.shots');
const argLevels = process.argv.find((a) => a.indexOf('--levels=') === 0);
const LIMIT = argLevels ? Math.max(1, Math.min(48, Number(argLevels.split('=')[1]) || 48)) : 48;
// --url=https://... 时直接验收线上站点，不再起本地服务
const argUrl = process.argv.find((a) => a.indexOf('--url=') === 0);
const TARGET = argUrl ? argUrl.slice(6).trim() : null;

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/microsoft-edge'
].find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png',
  '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8'
};

if (!EDGE) { console.error('未找到 Edge，无法运行冒烟测试'); process.exit(1); }
fs.mkdirSync(PROFILE, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });

const server = http.createServer((req, res) => {
  let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (rel === '/') rel = '/index.html';
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(abs, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

const DRIVER = `(async function () {
  var out = { levels: [], errors: [], warns: [], startedAt: Date.now() };
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  window.addEventListener('error', function (e) { out.errors.push(String(e.message || e)); });
  window.addEventListener('unhandledrejection', function (e) { out.errors.push('rejection:' + String(e.reason)); });
  var origWarn = console.warn;
  console.warn = function () {
    var s = Array.prototype.slice.call(arguments).join(' ');
    if (s.indexOf('voice not preloaded') >= 0) out.warns.push(s);
    origWarn.apply(console, arguments);
  };
  var mf = window.ASSET_MANIFEST;
  out.manifest = { rev: mf && mf.rev, codeRev: mf && mf.codeRev,
                   files: mf && mf.files ? Object.keys(mf.files).length : 0 };
  out.firstLoadScripts = document.querySelectorAll('script[src]').length;

  if (!window.App || !window.Engine) { out.errors.push('App / Engine missing'); return out; }
  /* 回归专用：关掉休息画面与计时压力，保证逐关进出不被 20s 休息画面打断 */
  try {
    if (window.Wellbeing) window.Wellbeing.__skipRest = true;
    window.Engine.settings.set({ noTimer: false, challengeTimers: { 9: false, 12: false } });
  } catch (e) { out.settingsError = 'preset:' + String((e && e.message) || e); }
  for (var id = 1; id <= ${LIMIT}; id++) {
    var rec = { id: id };
    try {
      await window.App.openLevel(id);
      await wait(140);
      rec.enterOk = document.getElementById('screen-level').classList.contains('is-active');
      rec.mounted = document.getElementById('stage').children.length > 0;
      rec.title = document.getElementById('level-name').textContent;
      rec.loaderHidden = document.getElementById('loader').hidden;
      window.App.exitLevel();
      await wait(40);
      rec.backOk = document.getElementById('screen-map').classList.contains('is-active');
    } catch (e) { rec.error = String((e && e.message) || e); }
    out.levels.push(rec);
  }
  out.poolSize = window.Engine.audio.poolSize();

  // 素材缓存：条目应带内容 hash，且 pruneAssetCache 之后不能把有效条目误删
  try {
    var c = await caches.open(window.Engine.audio.cacheName);
    var keys1 = await c.keys();
    out.cacheBefore = keys1.length;
    out.cacheVersioned = keys1.filter(function (r) {
      try { return !!new URL(r.url).searchParams.get('v'); } catch (e) { return false; }
    }).length;
    await window.Engine.audio.init();
    out.cacheAfterPrune = (await c.keys()).length;
  } catch (e) { out.cacheError = String((e && e.message) || e); }

  // 外壳离线回落：index.html 必须已在 SW 缓存里
  try {
    out.shellCached = !!(await caches.match(new Request('./index.html')));
  } catch (e) { out.shellCached = false; }

  // 重播按钮：进 L1 后教学语音会把按钮点亮，点击不应抛错
  try {
    await window.App.openLevel(1);
    await wait(700);
    var rb = document.getElementById('btn-replay');
    out.replayExists = !!rb;
    out.replayEnabled = !!rb && !rb.disabled;
    if (rb && !rb.disabled) { rb.click(); out.replayClickOk = true; }
    window.App.exitLevel();
  } catch (e) { out.replayError = String((e && e.message) || e); }

  // 家长设置 + 旧存档兼容性（测完恢复，避免污染临时 profile）
  try {
    out.flashDefault = window.Engine.settings.flashMs();
    window.Engine.settings.set({ noTimer: true });
    out.flashOff = window.Engine.settings.flashMs();
    window.Engine.settings.set({ noTimer: false });
    out.flashOn = window.Engine.settings.flashMs();
    /* C1：L21 等取消限时 → 0；L9 家长开挑战 → 15s（默认关）。 */
    out.flashCancel = window.Engine.settings.timer.windowMs(21);
    window.Engine.settings.timer.setChallenge(9, true);
    out.flashChallenge = window.Engine.settings.timer.windowMs(9);
    window.Engine.settings.timer.setChallenge(9, false);
    out.flashChallengeOff = window.Engine.settings.timer.windowMs(9);

    window.Progress.recordMistake(1, 3);
    window.Progress.recordMistake(1, 3);
    out.mistake = window.Progress.read().levelMistakes['1'];
    var legacy = { version: 1, unlockedLevel: 5, stars: { '1': 'gold' }, cleared: [1], updatedAt: 1 };
    out.mergeLegacy = window.Progress.merge(legacy, window.Progress.read()).unlockedLevel;
    window.Progress.reset();
  } catch (e) { out.settingsError = String((e && e.message) || e); }

  try {
    var reg = await navigator.serviceWorker.getRegistration();
    out.sw = reg && reg.active ? reg.active.scriptURL : null;
  } catch (e) { out.sw = null; }
  out.ms = Date.now() - out.startedAt;
  return out;
})()`;

function cdpEval(wsUrl, expression, timeoutMs) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
    const timer = setTimeout(() => { try { ws.close(); } catch (e) {} reject(new Error('CDP 超时')); }, timeoutMs);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        id: 1, method: 'Runtime.evaluate',
        params: { expression, returnByValue: true, awaitPromise: true, userGesture: true }
      }));
    });
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id !== 1) return;
      clearTimeout(timer);
      try { ws.close(); } catch (e) {}
      if (msg.error) return reject(new Error(msg.error.message));
      if (msg.result && msg.result.exceptionDetails) {
        return reject(new Error(JSON.stringify(msg.result.exceptionDetails).slice(0, 500)));
      }
      resolve(msg.result && msg.result.result ? msg.result.result.value : null);
    });
    ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket 失败')); });
  });
}

async function waitForTarget() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json`);
      const list = await res.json();
      const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl && /^https?:/.test(t.url));
      if (page) return page.webSocketDebuggerUrl;
    } catch (e) { /* 还没起来 */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Edge CDP 未就绪');
}

(async function main() {
  if (!TARGET) await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const edge = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${PROFILE}`, '--window-size=390,844',
    TARGET || `http://127.0.0.1:${PORT}/index.html?smoke=1`
  ], { stdio: 'ignore' });

  let report = null;
  let fatal = null;
  try {
    const wsUrl = await waitForTarget();
    // 等 boot 真正完成再注入：线上首次访问还要装 SW，固定 sleep 不够稳
    for (let i = 0; i < 60; i += 1) {
      const ready = await cdpEval(wsUrl,
        '!!(window.App && window.Engine && window.ASSET_MANIFEST)', 10000);
      if (ready) break;
      await new Promise((r) => setTimeout(r, 300));
    }
    report = await cdpEval(wsUrl, DRIVER, 300000);
  } catch (e) {
    fatal = String((e && e.message) || e);
  } finally {
    try { edge.kill(); } catch (e) {}
    if (!TARGET) server.close();
  }

  if (fatal || !report) {
    console.error('冒烟测试失败：' + (fatal || '无返回值'));
    process.exit(2);
  }

  const enterOk = report.levels.filter((r) => r.enterOk).length;
  const mounted = report.levels.filter((r) => r.mounted).length;
  const backOk = report.levels.filter((r) => r.backOk).length;
  const bad = report.levels.filter((r) => !r.enterOk || !r.mounted || !r.backOk || r.error);

  fs.writeFileSync(path.join(SHOTS, 'smoke-report.json'), JSON.stringify(report, null, 2));
  console.log('manifest:', JSON.stringify(report.manifest));
  console.log('首屏 <script src> 数量:', report.firstLoadScripts);
  console.log(`ENTER_OK=${enterOk}/${LIMIT}  MOUNTED=${mounted}/${LIMIT}  BACK_OK=${backOk}/${LIMIT}`);
  console.log('JS_ERRORS=' + report.errors.length, 'VOICE_FALLBACK_WARNS=' + report.warns.length,
    'AUDIO_POOL_AFTER=' + report.poolSize, 'SW=' + (report.sw ? 'registered' : 'none'),
    'ms=' + report.ms);
  console.log('CACHE=' + report.cacheBefore + ' -> after prune ' + report.cacheAfterPrune +
    ' (versioned ' + report.cacheVersioned + ')  SHELL_CACHED=' + report.shellCached);
  console.log('REPLAY exists=' + report.replayExists + ' enabled=' + report.replayEnabled +
    ' clickOk=' + !!report.replayClickOk);
  console.log('FLASH default=' + report.flashDefault + ' off=' + report.flashOff + ' on=' + report.flashOn +
    ' cancel(21)=' + report.flashCancel + ' challenge(9)=' + report.flashChallenge +
    ' challengeOff=' + report.flashChallengeOff +
    '  MISTAKE=' + JSON.stringify(report.mistake) + '  MERGE_LEGACY=' + report.mergeLegacy);
  if (report.cacheError) console.log('cacheError:', report.cacheError);
  if (report.settingsError) console.log('settingsError:', report.settingsError);
  if (report.replayError) console.log('replayError:', report.replayError);
  if (report.errors.length) console.log('errors:', report.errors.slice(0, 8));
  if (report.warns.length) console.log('warns:', report.warns.slice(0, 8));
  if (bad.length) console.log('failed levels:', bad.slice(0, 10));

  const deepOk = report.cacheVersioned > 0 &&
    report.cacheAfterPrune === report.cacheBefore &&
    report.shellCached === true &&
    report.replayExists === true &&
    report.flashDefault === 60000 && report.flashOff === 0 && report.flashOn === 60000 &&
    report.flashCancel === 0 && report.flashChallenge === 15000 && report.flashChallengeOff === 60000 &&
    report.mistake && report.mistake.length === 1 &&
    report.mistake[0].q === 3 && report.mistake[0].n === 2 &&
    report.mergeLegacy >= 1;
  const pass = enterOk === LIMIT && mounted === LIMIT && backOk === LIMIT &&
    report.errors.length === 0 && report.warns.length === 0 && report.poolSize <= 40 && deepOk;
  console.log(pass ? 'SMOKE_PASS' : 'SMOKE_FAIL');
  process.exit(pass ? 0 : 1);
})();
