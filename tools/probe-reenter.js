#!/usr/bin/env node
/* probe-reenter.js — 复现「二次进关空白」并抓异常堆栈（全新 profile，不清 cache） */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/';
const LV = parseInt(process.argv[3] || '1', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.reenter-' + Date.now());
const PORT = 9477;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
fs.mkdirSync(PROFILE, { recursive: true });
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 80; i++) { try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); const p = j.find(t => t.type === 'page'); if (p) return p.webSocketDebuggerUrl; } catch (e) { } await sleep(250); }
  throw new Error('no cdp');
}
function conn(u) {
  return new Promise((res, rej) => {
    const w = new WebSocket(u, { perMessageDeflate: false }); let id = 0; const pend = new Map(); const hs = [];
    w.addEventListener('open', () => res({ send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); }, on(f) { hs.push(f); }, close() { try { w.close(); } catch (e) { } } }));
    w.addEventListener('error', rej);
    w.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.b(m.error) : p.a(m.result); } else if (m.method) hs.forEach(h => h(m)); });
  });
}
(async () => {
  const cdp = await conn(await wsUrl());
  const errs = [];
  cdp.on(m => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push('EXC: ' + ((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 700));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      errs.push('CONSOLE: ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 400));
    }
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Network.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) } : r.result.value; };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(6000);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return'ok';await new Promise(r=>setTimeout(r,100));}return'missing';})()`));

  const snap = `(async()=>{
    const s = window.App.snapshot?window.App.snapshot():{};
    const stage = document.getElementById('stage');
    const mod = window.LEVELS && window.LEVELS[${LV}];
    return {
      view: s.view, phase: s.phase,
      stageLen: stage ? stage.innerHTML.length : -1,
      stageText: stage ? stage.innerText.slice(0,80) : '',
      modLoaded: !!mod, modMount: mod ? typeof mod.mount : 'none',
      cursor: (window.Progress && Progress.getLevelCursor) ? Progress.getLevelCursor(${LV}) : 'n/a',
      bg: [].slice.call(document.querySelectorAll('.level-bg-img')).map(l=>({on:l.classList.contains('is-on'), len:(l.style.backgroundImage||'').length}))
    };
  })()`;

  console.log('\n--- 第 1 次进关 ---');
  await ev(`window.App.openLevel(${LV})`);
  await sleep(2000);
  for (let i = 0; i < 80; i++) { const s = await ev(snap); if (s.view === 'level') break; await sleep(300); }
  console.log(JSON.stringify(await ev(snap), null, 1));

  console.log('\n--- 退关 ---');
  await ev(`window.App.exitLevel()`);
  await sleep(2000);
  console.log('退出后 view:', JSON.stringify(await ev(`(window.App.snapshot?window.App.snapshot().view:'?')`)));

  errs.length = 0;
  console.log('\n--- 第 2 次进关（同一关）---');
  await ev(`window.App.openLevel(${LV})`);
  await sleep(2500);
  for (let i = 0; i < 80; i++) { const s = await ev(snap); if (s.view === 'level' && s.stageLen > 50) break; await sleep(300); }
  console.log(JSON.stringify(await ev(snap), null, 1));
  console.log('\n捕获到的错误:');
  errs.forEach(e => console.log('  ' + e));

  const s2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'reenter2.png'), Buffer.from(s2.data, 'base64'));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
