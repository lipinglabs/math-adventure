#!/usr/bin/env node
/* probe-prefetch.js — 验证「玩第N关时预取第N+1关」是否生效 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.pf-' + Date.now());
const PORT = 9511;
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
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value; };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(6000);
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);
  const count = `(async()=>{const c=await caches.open('math-adventure-assets-v1');const ks=await c.keys();
    return {total:ks.length, lv01:ks.filter(r=>/lv01/.test(r.url)).length, lv02:ks.filter(r=>/lv02/.test(r.url)).length, webp:ks.filter(r=>/\\.webp/.test(r.url)).length};})()`;

  console.log('初始缓存:', JSON.stringify(await ev(count)));
  let t = Date.now();
  await ev(`window.App.openLevel(1)`);
  console.log('第1关进关耗时:', Date.now() - t, 'ms');
  console.log('第1关后缓存:', JSON.stringify(await ev(count)));

  console.log('等待 9 秒让预取（延迟 6s）跑起来...');
  await sleep(9000);
  const c2 = await ev(count);
  console.log('预取后缓存:', JSON.stringify(c2));

  await ev(`window.App.exitLevel()`); await sleep(800);
  t = Date.now();
  await ev(`window.App.openLevel(2)`);
  const ms2 = Date.now() - t;
  console.log('第2关进关耗时:', ms2, 'ms  ← 若明显 < 第1关，说明预取生效');
  console.log('第2关后缓存:', JSON.stringify(await ev(count)));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
