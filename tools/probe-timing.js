#!/usr/bin/env node
/* probe-timing.js — 定位进关慢在哪：资源耗时 top + loader 状态 + 截图 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/';
const LV = parseInt(process.argv[3] || '1', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.tim-' + Date.now());
const PORT = 9499;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
fs.mkdirSync(PROFILE, { recursive: true });
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 80; i++) { try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); const p = j.find(t => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) { } await sleep(250); } throw new Error('no cdp'); }
function conn(u) { return new Promise((res, rej) => { const w = new WebSocket(u, { perMessageDeflate: false }); let id = 0; const pend = new Map(); const hs = []; w.addEventListener('open', () => res({ send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); }, on(f) { hs.push(f); }, close() { try { w.close(); } catch (e) { } } })); w.addEventListener('error', rej); w.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.b(m.error) : p.a(m.result); } else if (m.method) hs.forEach(h => h(m)); }); }); }
(async () => {
  const cdp = await conn(await wsUrl());
  const netFail = [];
  cdp.on(m => {
    if (m.method === 'Network.loadingFailed') netFail.push((m.params.errorText || '?') + ' ' + m.params.type + ' ' + (m.params.requestId || ''));
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; netFail.push('EXC ' + ((d.exception && d.exception.description) || d.text || '').slice(0, 200)); }
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Network.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value; };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(6000);
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);
  await ev(`performance.clearResourceTimings(); 'ok'`);

  const t0 = Date.now();
  const ret = await ev(`window.App.openLevel(${LV})`);
  const ms = Date.now() - t0;

  const info = await ev(`(function(){
    var rs = performance.getEntriesByType('resource').filter(function(r){return /voice|assets/.test(r.name);});
    rs.sort(function(a,b){return b.duration-a.duration;});
    var lr=document.getElementById('loader');
    return {
      loaderOpen: !lr.hidden,
      loaderTitle: (document.getElementById('loader-title')||{}).textContent,
      loaderHint: (document.getElementById('loader-hint')||{}).textContent,
      loaderDetail: (document.getElementById('loader-detail')||{}).textContent,
      retryVisible: !(document.getElementById('loader-retry')||{}).hidden,
      resCount: rs.length,
      slowest: rs.slice(0,10).map(function(r){return Math.round(r.duration)+'ms '+r.name.split('/').pop().slice(0,30);}),
      totalResMs: Math.round(rs.reduce(function(a,r){return a+r.duration;},0)),
      cacheEntries: 'pending'
    };
  })()`);
  info.openLevelMs = ms;
  info.returned = String(JSON.stringify(ret)).slice(0, 200);

  const cs = await ev(`(async()=>{const out={};for(const n of await caches.keys()){const c=await caches.open(n);const k=await c.keys();out[n]=k.length;}
    try{const ac=await caches.open('math-adventure-assets-v1');const ks=await ac.keys();out.webp=ks.filter(r=>/\\.webp/.test(r.url)).length;out.mp3=ks.filter(r=>/\\.mp3/.test(r.url)).length;}catch(e){out.err=String(e.message);}
    return out;})()`);
  info.caches = cs;
  console.log(JSON.stringify(info, null, 1));
  console.log('网络失败/异常:', netFail.length, [...new Set(netFail)].slice(0, 8));

  const s = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'timing.png'), Buffer.from(s.data, 'base64'));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
