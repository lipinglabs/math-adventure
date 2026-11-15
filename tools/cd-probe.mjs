/**
 * tools/cd-probe.mjs · 乘除段单关真机验收（仅本地）
 * 用法：node tools/cd-probe.mjs <关卡号> [秒数] [宽] [高] [--no-audio-stub]
 *
 * 做四件事：
 *   1. 起 Edge headless（独立 profile，禁缓存）打开本地页面
 *   2. 进关后自动「点该点的」：主按钮 / 选项卡 / T5 扫格 / T7c 二选一
 *   3. 每 2 秒截一张图到 .shots/cd/lvNN/
 *   4. 收集 console 异常、页面异常、404、以及每幕的 DOM 状态
 *
 * 自动点选「正确项」：读 CD_DATA[level].slots 的 answer，按顺序消费。
 * 语音默认打桩（立即返回），只为结构验收提速；--no-audio-stub 走真音频。
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);
const LEVEL = num(args[0], 28);
const SECONDS = num(args[1], 90);
const VW = num(args[2], 390);
const VH = num(args[3], 844);
const AUDIO_STUB = !args.includes('--no-audio-stub');
const TWICE = args.includes('--twice');
const PORT = Number(process.env.CD_PORT || 9261);
const SRV = process.env.CD_SRV || 'http://127.0.0.1:8123';

const ROOT = path.resolve(import.meta.dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.cd-probe-profile');
const SHOTS = path.join(ROOT, '.shots', 'cd', 'lv' + LEVEL);
mkdirSync(PROFILE, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p));

const child = spawn(EDGE, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=' + VW + ',' + VH, '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-proxy-server',
  '--disable-features=Translate,MediaRouter',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function pageWs() {
  for (let i = 0; i < 100; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const p = list.find((t) => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch (e) { /* 还没起来 */ }
    await sleep(200);
  }
  throw new Error('CDP 未就绪');
}

const wsUrl = await pageWs();
const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
let seq = 0;
const pending = new Map();
const errors = [];
const fails = [];
const logs = [];
const state = [];
const slow = [];
const reqStart = new Map();

const CALLS = new Map();
function send(method, params = {}) {
  seq += 1;
  const id = seq;
  CALLS.set(id, method);
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

ws.addEventListener('message', (ev) => {
  let m;
  try { m = JSON.parse(String(ev.data)); } catch (e) { return; }
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id);
    pending.delete(m.id);
    if (m.error) p.reject(new Error((CALLS.get(m.id) || '?') + ' → ' + m.error.message));
    else p.resolve(m.result);
    return;
  }
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    errors.push('[exception] ' + (d.exception?.description || d.text));
  }
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    const text = (m.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
    logs.push('[' + m.params.type + '] ' + text);
  }
  if (m.method === 'Network.loadingFailed') {
    fails.push('[net] ' + (m.params.errorText || '') + ' ' + (m.params.requestId || ''));
  }
  if (m.method === 'Network.requestWillBeSent') {
    reqStart.set(m.params.requestId, { url: m.params.request.url, t: Date.now() });
  }
  if (m.method === 'Network.loadingFinished') {
    const r = reqStart.get(m.params.requestId);
    if (r) {
      reqStart.delete(m.params.requestId);
      const ms = Date.now() - r.t;
      if (ms > 400) slow.push(ms + 'ms ' + r.url.replace(/^https?:\/\/[^/]+/, ''));
    }
  }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.status >= 400) fails.push('[http ' + r.status + '] ' + r.url);
  }
});

await new Promise((res) => ws.addEventListener('open', res, { once: true }));
await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');
await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', {
  width: VW, height: VH, deviceScaleFactor: 2, mobile: true,
});

async function ev(expr) {
  const r = await send('Runtime.evaluate', {
    expression: expr, awaitPromise: true, returnByValue: true, userGesture: true,
  });
  if (r.exceptionDetails) {
    return { __err: r.exceptionDetails.exception?.description || r.exceptionDetails.text };
  }
  return r.result?.value;
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(r.data, 'base64'));
}

await send('Page.navigate', { url: `${SRV}/index.html?cdcheck=1` });
await sleep(1200);

// 等外壳就绪
let ready = false;
for (let i = 0; i < 60; i += 1) {
  ready = await ev('!!(window.App && window.CDKit && window.CD_DATA)');
  if (ready === true) break;
  await sleep(300);
}
if (!ready) {
  console.log('外壳未就绪，页面报错：');
  errors.forEach((e) => console.log('  ' + e));
  logs.forEach((e) => console.log('  ' + e));
  ws.close();
  child.kill();
  process.exit(1);
}

// 数据自检（构建期断言在页面里再跑一遍）
const dataCheck = await ev('JSON.stringify((function(){var r=CD_DATA.validate({});return {p:r.problems,w:r.warnings};})())');
console.log('页面内数据校验: ' + dataCheck);

// 语音打桩
if (AUDIO_STUB) {
  await ev(`(function(){
    if (!window.Engine || !Engine.audio) return 'no-engine';
    Engine.audio.play = function () { return Promise.resolve(); };
    return 'stubbed';
  })()`);
}

// 记录所有要「点对」的答案，按槽序消费
await ev(`(function(){
  var spec = CD_DATA[${LEVEL}];
  window.__cdAns = spec.slots.map(function(s){ return (s && s.answer != null) ? s.answer : 0; });
  window.__cdClickLog = [];
  window.__cdPickedSlot = -1;
  return 'ok';
})()`);

await ev('App.openLevel(' + LEVEL + ', true)');

const clickScript = `(function(){
  var L = ${LEVEL};
  function pick(el, label){
    if (!el) return false;
    el.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true, view:window}));
    (window.__cdClickLog = window.__cdClickLog || []).push(label);
    return true;
  }
  var dots = document.querySelectorAll('#level-dots i');
  var now = -1;
  for (var i=0;i<dots.length;i++) if (dots[i].classList.contains('is-now')) now = i;
  var slot = (CD_DATA[L] && CD_DATA[L].slots[now]) || {};

  // T4b：发完后问「剩下这 1 个给谁」——正解是「不给」，按钮宽版只有一个
  var wide = document.querySelector('.cd-main--wide:not(.is-off)');
  if (wide) return pick(wide, 'leave@s' + now) ? 'leave' : '';

  // T4d：手里那 1 个该放进「最少的那盘」
  var choosable = document.querySelectorAll('.cd-box.is-choosable');
  if (choosable.length) {
    var idx = slot.minIndex;
    if (idx == null && slot.dist) {
      idx = 0;
      for (var d=0; d<slot.dist.length; d++) if (slot.dist[d] < slot.dist[idx]) idx = d;
    }
    idx = idx || 0;
    return pick(choosable[idx] || choosable[0], 'box' + idx + '@s' + now) ? 'box' : '';
  }

  // 三选一 / 两选一卡片
  var cards = document.querySelectorAll('.cd-card:not(.is-try):not(.is-off)');
  if (cards.length) {
    var want = (slot.answer != null) ? slot.answer : 0;
    var target = document.querySelector('.cd-card[data-opt="' + want + '"]');
    if (!target) target = cards[0];
    return pick(target, 'card#' + want + '@s' + now) ? 'card' : '';
  }

  // T7c：两个按钮，按 slot.same 选
  var choices = document.querySelectorAll('.cd-choice:not(.is-off)');
  if (choices.length) {
    var ci = slot.same ? 0 : 1;
    return pick(choices[ci] || choices[0], 'choice' + ci + '@s' + now) ? 'choice' : '';
  }

  // T4b：发完后问「这 1 个给谁」——选「不给」
  var leave = document.querySelector('.cd-main--leaveout:not(.is-off), .cd-leave:not(.is-off)');
  if (leave) return pick(leave, 'leave@s' + now) ? 'leave' : '';

  var mains = document.querySelectorAll('.cd-main:not(.is-off)');
  if (mains.length) {
    var b = mains[0];
    var r = b.getBoundingClientRect();
    if (r.width > 0) return pick(b, 'main@s' + now) ? 'main' : '';
  }
  return '';
})()`;

let shotIdx = 0;
let lastSig = '';
let phaseName = 'run1';
/* 出场动画残留计数：fill:'both' 的动画结束后仍占着 transform，
   会让「算好了位置」的物体留在原地 —— 归零才算画面与数据一致。 */
let stuckMax = 0;

async function playPhase(label, ms) {
  phaseName = label;
  const t0 = Date.now();
  const limit = ms;

  while (Date.now() - t0 < limit) {
    await ev(clickScript);
    const sig = await ev(`(function(){
      var dots = document.querySelectorAll('#level-dots i');
      var now = -1;
      for (var i=0;i<dots.length;i++) if (dots[i].classList.contains('is-now')) now = i;
      var res = document.querySelector('.result, .result-star, .level-result');
      var slot = (CD_DATA[${LEVEL}].slots[now] || {});
      return JSON.stringify({
        now: now, type: slot.type || '',
        dots: dots.length,
        board: (document.querySelector('.cd-board')||{}).className || '',
        cards: document.querySelectorAll('.cd-card').length,
        mains: document.querySelectorAll('.cd-main').length,
        mainOff: document.querySelectorAll('.cd-main.is-off').length,
        result: !!res,
        hd: (document.querySelector('#level-index')||{}).textContent || '',
        stuck: Array.from(document.querySelectorAll('.cd-layer .cd-token')).filter(function(el){
          return el.getAnimations && el.getAnimations().some(function(a){
            if (a.playState !== 'finished' || a.startTime == null || !a.effect) return false;
            var t = a.effect.getComputedTiming();
            var endAt = a.startTime + (t.activeDuration || t.duration || 0);
            // 刚结束的那一帧不算：popIn 会在 finished 回调里立刻 cancel()
            return (document.timeline.currentTime - endAt) > 250;
          });
        }).length
      });
    })()`);
    if (sig) {
      try { const o = JSON.parse(sig); if (o.stuck > stuckMax) stuckMax = o.stuck; } catch (e) { }
    }
    if (sig && sig !== lastSig) {
      lastSig = sig;
      state.push(label + ' ' + (Math.round((Date.now() - t0) / 100) / 10) + 's ' + sig);
    }
    if (process.env.CD_DUMP && Date.now() - t0 > Number(process.env.CD_DUMP)) {
      const html = await ev(`(function(){
        var b = document.querySelector('.cd-board');
        return b ? b.innerHTML.replace(/\s+/g,' ').slice(0,4000) : 'no-board';
      })()`);
      console.log('DUMP ' + label + ': ' + html);
    }
    if (Date.now() - t0 > shotIdx * 1200) {
      await shot(label + '-' + String(shotIdx).padStart(2, '0'));
      shotIdx += 1;
    }
    const finished = await ev(`!!document.querySelector('.result, .result-star, .level-result')`);
    if (finished) {
      await sleep(700);
      await shot(label + '-result');
      return true;
    }
    await sleep(320);
  }
  await shot(label + '-timeout');
  return false;
}

const ok1 = await playPhase('run1', SECONDS * 1000);

if (TWICE) {
  await ev('(function(){ try { App.exitLevel(); } catch(e) {} return 1; })()');
  await sleep(900);
  await ev('App.openLevel(' + LEVEL + ', true)');
  await sleep(1500);
  shotIdx = 0;
  lastSig = '';
  await playPhase('run2', SECONDS * 1000);
}

const summary = await ev(`JSON.stringify({
  rec: (CD_DATA[${LEVEL}] && CD_DATA[${LEVEL}].__lastRecord) || null,
  active: (CD_DATA[${LEVEL}] && CD_DATA[${LEVEL}].__activeCount) || 0,
  clicks: (window.__cdClickLog||[]).slice(-24),
  star: (window.Progress && Progress.starOf(${LEVEL})) || ''
})`);

console.log('\n=== DOM 轨迹 ===');
state.forEach((s) => console.log('  ' + s));
console.log('\n=== 结算 ===');
console.log('  ' + summary);
console.log('\n=== 错误 ===');
console.log('  exceptions: ' + errors.length);
errors.slice(0, 12).forEach((e) => console.log('    ' + e));
console.log('  动画残留(stuck): ' + stuckMax + (stuckMax ? '  ← 有物体被出场动画钉住' : ''));
console.log('  console warn/err: ' + logs.length);
logs.slice(0, 12).forEach((e) => console.log('    ' + e));
console.log('  网络: ' + fails.length);
fails.slice(0, 12).forEach((e) => console.log('    ' + e));
console.log('  慢请求(>400ms): ' + slow.length);
slow.slice(0, 12).forEach((e) => console.log('    ' + e));
console.log('\n截图：' + SHOTS);

ws.close();
child.kill();
process.exit(0);
