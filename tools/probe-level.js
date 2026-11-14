#!/usr/bin/env node
/* probe-level.js — 单关深度体检：清缓存→进关→等读条→查缓存→截图→再进一次验证命中 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/';
const LEVEL = parseInt(process.argv[3] || '1', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.lvl-profile');
const CDP_PORT = 9466;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
fs.mkdirSync(PROFILE, { recursive: true });

spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function ws() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list');
      const j = await r.json();
      const p = j.find(t => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch (e) { }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

function connect(url) {
  return new Promise((res, rej) => {
    const w = new WebSocket(url, { perMessageDeflate: false });
    let id = 0; const pend = new Map(); const hs = [];
    w.addEventListener('open', () => res({
      send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); },
      on(f) { hs.push(f); }, close() { try { w.close(); } catch (e) { } }
    }));
    w.addEventListener('error', rej);
    w.addEventListener('message', e => {
      let m; try { m = JSON.parse(e.data); } catch (x) { return; }
      if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.b(m.error) : p.a(m.result); }
      else if (m.method) hs.forEach(h => h(m));
    });
  });
}

(async () => {
  const cdp = await connect(await ws());
  const bad = [], bgs = [];
  cdp.on(m => {
    if (m.method === 'Network.responseReceived') {
      const r = m.params.response;
      if (!r.url.includes('github.io')) return;
      if (r.status >= 400) bad.push(r.status + ' ' + r.url);
      if (r.url.includes('assets/bg/')) bgs.push(r.url.split('/').pop());
    }
  });
  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const ev = async (expr) => {
    const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true, userGesture: true });
    if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) };
    return r.result.value;
  };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(5000);

  // 就绪等待
  const ready = await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(r=>setTimeout(r,100));}return 'missing';})()`);
  console.log('App/Engine 就绪:', ready);

  // 清空全部缓存，模拟全新设备
  console.log('清缓存前:', JSON.stringify(await ev(`(async()=>{const k=await caches.keys();return k;})()`)));
  await ev(`(async()=>{const k=await caches.keys();await Promise.all(k.map(x=>caches.delete(x)));return true;})()`);
  console.log('清缓存后:', JSON.stringify(await ev(`(async()=>{return await caches.keys();})()`)));

  // 第一次进关
  const t0 = Date.now();
  await ev(`window.App.openLevel(${LEVEL})`);
  const st1 = await ev(`(async()=>{
    const t0=Date.now(); let seen=[], last='';
    for(let i=0;i<200;i++){
      const lr=document.getElementById('loader');
      const vis = lr && !lr.hidden;
      const pct = document.getElementById('loader-percent');
      const det = document.getElementById('loader-detail');
      const cur = (vis?'OPEN':'closed')+' '+(pct?pct.textContent:'')+' '+(det?det.textContent:'');
      if(cur!==last){seen.push(cur);last=cur;}
      const s = window.App.snapshot?window.App.snapshot():{};
      if(!vis && s.view==='level') break;
      await new Promise(r=>setTimeout(r,150));
    }
    const s = window.App.snapshot?window.App.snapshot():{};
    const layers=[].slice.call(document.querySelectorAll('.level-bg-img'));
    return {
      ms: Date.now()-t0, view:s.view, loaderSeen:seen.slice(0,12),
      bgLayers: layers.map(l=>({on:l.classList.contains('is-on'), bg:(l.style.backgroundImage||'').slice(0,60)})),
      cacheKeys: await caches.keys()
    };
  })()`);
  console.log('=== 首次进关 ===');
  console.log(JSON.stringify(st1, null, 1));

  const cacheStat = await ev(`(async()=>{
    const out={};
    for(const name of await caches.keys()){
      const c=await caches.open(name); const k=await c.keys();
      out[name]=k.length;
    }
    const ac=await caches.open('math-adventure-assets-v1');
    const ks=await ac.keys();
    out.webp=ks.filter(r=>/\\.webp/.test(r.url)).length;
    out.mp3=ks.filter(r=>/\\.mp3/.test(r.url)).length;
    return out;
  })()`);
  console.log('缓存统计:', JSON.stringify(cacheStat));

  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'level-first.png'), Buffer.from(shot1.data, 'base64'));

  // 退关再进（第二次，应命中缓存）
  await ev(`window.App.exitLevel()`);
  await sleep(1500);
  const t1 = Date.now();
  await ev(`window.App.openLevel(${LEVEL})`);
  const st2 = await ev(`(async()=>{
    const t0=Date.now(); let loaderOpened=false;
    for(let i=0;i<120;i++){
      const lr=document.getElementById('loader');
      if(lr && !lr.hidden) loaderOpened=true;
      const s = window.App.snapshot?window.App.snapshot():{};
      if(!(lr&&!lr.hidden) && s.view==='level') break;
      await new Promise(r=>setTimeout(r,150));
    }
    const layers=[].slice.call(document.querySelectorAll('.level-bg-img'));
    return {ms:Date.now()-t0, loaderOpened,
      bgLayers: layers.map(l=>({on:l.classList.contains('is-on'), bg:(l.style.backgroundImage||'').slice(0,60)}))};
  })()`);
  console.log('=== 二次进关（应命中缓存、无读条）===');
  console.log(JSON.stringify(st2, null, 1));

  const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'level-second.png'), Buffer.from(shot2.data, 'base64'));

  console.log('=== 失败状态码 ===', bad.length, bad.slice(0, 8));
  console.log('=== 背景请求次数 ===', bgs.length, JSON.stringify(bgs));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
