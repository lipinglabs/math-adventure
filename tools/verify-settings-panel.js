#!/usr/bin/env node
/* verify-settings-panel.js — 家长设置面板体检：不得再有开关，说明与统计仍要在
 * 用法: node tools/verify-settings-panel.js [url]
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const BASE = process.argv[2] || 'http://127.0.0.1:8799/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.panel-' + Date.now());
const PORT = 9611;
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
  const errs = [];
  cdp.on(m => {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; errs.push(((d.exception && d.exception.description) || d.text || '').slice(0, 200)); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 200));
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) } : r.result.value; };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4200);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`));

  // 绕过家长门（只测面板内容，不测门）
  await ev(`(function(){ if(window.Wellbeing) window.Wellbeing.parentGate = function(h,cb){ if(typeof cb==='function') cb(); };
    var b=document.getElementById('btn-save'); if(b) b.click(); return 'clicked'; })()`);
  await sleep(1200);

  const r = await ev(`(function(){
    var modal = document.querySelector('.modal, .sheet, .overlay') || document.body;
    var boxes = [].slice.call(modal.querySelectorAll('input[type=checkbox]'));
    var labels = [].slice.call(modal.querySelectorAll('.setting-row'));
    var txt = (modal.innerText || '');
    return {
      checkboxCount: boxes.length,
      settingRowCount: labels.length,
      checkboxIds: boxes.map(function(b){return b.id;}),
      hasParentOptionsLabel: /Parent options/i.test(txt),
      hasProgressLabel: /\\bProgress\\b/.test(txt),
      hasStarRule: /Silver = finished/.test(txt) && /Gold = every answer correct/.test(txt),
      hasPracticeStat: /Questions needing practice:/.test(txt),
      hasToday: /Today together/i.test(txt),
      hasHook: !!document.getElementById('wb-parent-leaf'),
      title: (document.querySelector('.modal-title, h2, h3') || {}).textContent || ''
    };
  })()`);
  console.log('面板体检:', JSON.stringify(r, null, 1));
  console.log('页面异常:', errs.length, errs.slice(0, 3));

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'panel-no-switches.png'), Buffer.from(shot.data, 'base64'));

  const ok = r && r.checkboxCount === 0 && r.settingRowCount === 0 &&
    r.hasStarRule && r.hasPracticeStat && r.hasToday && r.hasHook && !r.hasParentOptionsLabel;
  console.log(ok ? '✅ 面板已无任何家长开关，说明/统计/看板保留' : '❌ 面板仍有开关或内容缺失');
  cdp.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
