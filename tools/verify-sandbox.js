#!/usr/bin/env node
/* verify-sandbox.js — 沙盒语义：星在内存里可见，但绝不落盘、退出即还原
 * 用法: node tools/verify-sandbox.js [url]
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const BASE = process.argv[2] || 'http://127.0.0.1:8799/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.sbx-' + Date.now());
const PORT = 9666;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
fs.mkdirSync(PROFILE, { recursive: true });
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 80; i++) { try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); const p = j.find(t => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch (e) { } await sleep(250); } throw new Error('no cdp'); }
function conn(u) { return new Promise((res, rej) => { const w = new WebSocket(u, { perMessageDeflate: false }); let id = 0; const pend = new Map(); const hs = []; w.addEventListener('open', () => res({ send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); }, on(f) { hs.push(f); }, close() { try { w.close(); } catch (e) { } } })); w.addEventListener('error', rej); w.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.b(m.error) : p.a(m.result); } else if (m.method) hs.forEach(h => h(m)); }); }); }
(async () => {
  const cdp = await conn(await wsUrl());
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) } : r.result.value; };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4200);
  await ev(`(async()=>{for(var i=0;i<150;i++){if(window.Progress&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);

  const r = await ev(`(function(){
    localStorage.clear();
    var out = {};
    Progress.record(3, 'silver', { gold: false });
    out.before = Progress.starOf(3);                       // silver（真实存档）

    Progress.enterSandbox();
    Progress.record(3, 'gold', { gold: true });
    out.inSandbox = Progress.starOf(3);                    // 期望 gold（内存可见）
    var raw = localStorage.getItem(Progress.KEY) || '';
    out.storageHasGold = /"3":"gold"/.test(raw);           // 期望 false（没落盘）

    Progress.exitSandbox();
    out.afterExit = Progress.starOf(3);                    // 期望 silver（已还原）
    return out;
  })()`);
  console.log('沙盒语义:', JSON.stringify(r, null, 1));
  const ok = r && r.before === 'silver' && r.inSandbox === 'gold' && r.storageHasGold === false && r.afterExit === 'silver';
  console.log(ok ? '✅ 沙盒内星可见、不落盘、退出还原' : '❌ 沙盒语义异常');
  cdp.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
