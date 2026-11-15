#!/usr/bin/env node
/* verify-fixed-settings.js — 旧存档里的家长勾选值必须在重载后被压回固定值
 * 用法: node tools/verify-fixed-settings.js [url]
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const BASE = process.argv[2] || 'http://127.0.0.1:8799/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.fixed-' + Date.now());
const PORT = 9633;
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
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value; };
  const ready = `(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`;

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4200);
  console.log('首载就绪:', await ev(ready));

  // 模拟「旧存档里家长开过全部开关」
  console.log('写入旧值:', await ev(`(function(){
    window.Wellbeing.setSettings({ noTimer: true, showChallenge: true, challengeTimers: { 9: true, 12: true } });
    return JSON.stringify(window.Wellbeing.settings());
  })()`));

  // 重载 → 载入时应被压回固定值
  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + (Date.now() + 1) });
  await sleep(4200);
  console.log('重载就绪:', await ev(ready));

  const r = await ev(`(function(){
    var S = window.Engine.settings;
    return {
      noTimer: S.noTimer(),
      showChallenge: S.showChallenge(),
      challenge9: S.timer.challengeEnabled(9),
      challenge12: S.timer.challengeEnabled(12),
      flashCore: S.flashMs(1),
      stored: JSON.stringify(window.Wellbeing.settings())
    };
  })()`);
  console.log('重载后:', JSON.stringify(r, null, 1));

  const ok = r && r.noTimer === false && r.showChallenge === false &&
    r.challenge9 === false && r.challenge12 === false && r.flashCore === 60000;
  console.log(ok ? '✅ 旧勾选已被压回固定值（核心关 60s、挑战关不显示、9/12 限时关闭）' : '❌ 固定值未生效');
  cdp.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
