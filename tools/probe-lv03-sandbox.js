#!/usr/bin/env node
/* probe-lv03-sandbox.js — 沙盒下真实界面打第 3 关两局，记录每局结果页星级与游标
 * 用法: node tools/probe-lv03-sandbox.js [url] [levelId]
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const BASE = process.argv[2] || 'http://127.0.0.1:8799/index.html';
const LV = parseInt(process.argv[3] || '3', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.sb-' + Date.now());
const PORT = 9655;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
fs.mkdirSync(PROFILE, { recursive: true });
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() { for (let i = 0; i < 80; i++) { try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); const p = j.find(t => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch (e) { } await sleep(250); } throw new Error('no cdp'); }
function conn(u) { return new Promise((res, rej) => { const w = new WebSocket(u, { perMessageDeflate: false }); let id = 0; const pend = new Map(); const hs = []; w.addEventListener('open', () => res({ send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); }, on(f) { hs.push(f); }, close() { try { w.close(); } catch (e) { } } })); w.addEventListener('error', rej); w.addEventListener('message', e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.b(m.error) : p.a(m.result); } else if (m.method) hs.forEach(h => h(m)); }); }); }

const playOneRound = lv => `(async function(){
  var out = { answered: 0, wrongClicks: 0, types: [], star: '', stars: [] };
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function resultEl(){ return document.querySelector('.result, .lv-result, .result-card'); }
  function resultStar(){
    var n = document.querySelector('.result-star--gold, .result-star--silver');
    if (!n) return '';
    return n.className.indexOf('--gold') >= 0 ? 'gold' : 'silver';
  }
  function q(){ try { return window.LEVELS[${lv}].current(); } catch(e){ return null; } }

  await window.App.openLevel(${lv});

  for (var step = 0; step < 14; step++) {
    // 等本题控件出现
    for (var w = 0; w < 120; w++) {
      if (resultEl()) break;
      if (document.querySelector('.signkey, .sentence-card, .numkey')) break;
      await wait(120);
    }
    if (resultEl()) break;

    var cur = q();
    if (!cur) { out.err = 'no current question'; break; }
    out.types.push(cur.type);

    var clicked = false;
    if (document.querySelector('.signkey')) {
      var want = (cur.op === '+' || cur.op === '+') ? '+' : '\\u2212';
      var btnS = [].slice.call(document.querySelectorAll('.signkey')).filter(function(b){ return b.dataset.value === want; })[0];
      if (btnS) { btnS.click(); clicked = true; }
    } else if (document.querySelector('.numkey')) {
      var ans = cur.op === '+' ? cur.a + cur.b : cur.a - cur.b;
      var btnN = [].slice.call(document.querySelectorAll('.numkey')).filter(function(b){ return Number(b.dataset.value) === ans; })[0];
      if (btnN) { btnN.click(); clicked = true; }
    } else if (document.querySelector('.sentence-card')) {
      var r = cur.op === '+' ? cur.a + cur.b : cur.a - cur.b;
      var txt = cur.a + ' ' + (cur.op === '-' ? '\\u2212' : cur.op) + ' ' + cur.b + ' = ' + r;
      var btnC = [].slice.call(document.querySelectorAll('.sentence-card')).filter(function(b){
        return (b.textContent || '').replace(/\\s+/g, ' ').trim() === txt;
      })[0];
      if (btnC) { btnC.click(); clicked = true; }
      else out.txtMiss = (out.txtMiss || []).concat([txt]);
    }
    if (!clicked) { out.err = 'no clickable for type ' + cur.type; break; }
    out.answered += 1;

    // 等下一题或结果页
    for (var k = 0; k < 120; k++) {
      if (resultEl()) break;
      await wait(120);
    }
    if (resultEl()) break;
  }

  out.star = resultStar();
  try { out.cursor = window.Wellbeing.store.getCursor(${lv}) || null; } catch(e) { out.cursor = 'err'; }
  try { out.progressStar = window.Progress.starOf(${lv}); } catch(e) {}
  try { out.sandbox = !!(window.Sandbox && window.Sandbox.active && window.Sandbox.active()); } catch(e) {}
  return out;
})()`;

(async () => {
  const cdp = await conn(await wsUrl());
  const exc = [];
  cdp.on(m => { if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exc.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 250)); } });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) } : r.result.value; };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4500);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine&&window.Progress)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`));
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); localStorage.clear(); 'ok'`);

  // 模拟用户：进沙盒（等价于左上角连点 5 次 + 口令 123）
  console.log('进沙盒:', await ev(`(function(){ try { window.Progress.enterSandbox(); return !!(window.Sandbox && window.Sandbox.active && window.Sandbox.active()); } catch(e){ return 'ERR:' + e.message; } })()`));

  console.log('\\n--- 第 1 局 ---');
  const r1 = await ev(playOneRound(LV));
  console.log(JSON.stringify(r1, null, 1));
  try {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ROOT, 'tmp', 'lv' + LV + '-sandbox-result.png'), Buffer.from(shot.data, 'base64'));
  } catch (e) {}
  await ev(`window.App.exitLevel()`); await sleep(1200);

  console.log('\\n--- 第 2 局 ---');
  const r2 = await ev(playOneRound(LV));
  console.log(JSON.stringify(r2, null, 1));
  await ev(`window.App.exitLevel()`); await sleep(800);

  console.log('\\n结果页星:', 'R1=' + (r1 && r1.star), 'R2=' + (r2 && r2.star));
  console.log('Progress.starOf:', r1 && r1.progressStar, '→', r2 && r2.progressStar);
  console.log('页面异常:', exc.length, [...new Set(exc)].slice(0, 3));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
