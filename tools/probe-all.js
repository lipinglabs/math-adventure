#!/usr/bin/env node
/* probe-all.js — 48 关全扫：跳过休息画面，逐关验证背景与内容渲染 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/';
const FROM = parseInt(process.argv[3] || '1', 10);
const TO = parseInt(process.argv[4] || '48', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.all-' + Date.now());
const PORT = 9488;
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
  const fails = [];
  cdp.on(m => { if (m.method === 'Network.responseReceived' && m.params.response.status >= 400 && m.params.response.url.includes('github.io')) fails.push(m.params.response.status + ' ' + m.params.response.url); });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable'); await cdp.send('Network.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value; };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(6000);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return'ok';await new Promise(r=>setTimeout(r,100));}return'missing';})()`));
  // 关掉休息画面与计时干扰
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);
  console.log('skipRest 已设:', await ev(`window.Wellbeing && window.Wellbeing.__skipRest`));

  const rows = [];
  for (let id = FROM; id <= TO; id++) {
    const t0 = Date.now();
    await ev(`window.App.openLevel(${id})`);      // awaitPromise 会等到 enterLevel 完成
    const ms = Date.now() - t0;
    const r = await ev(`(function(){
      var layers=[].slice.call(document.querySelectorAll('.level-bg-img'));
      var stage=document.getElementById('stage');
      var on=layers.filter(function(l){return l.classList.contains('is-on');});
      var bi = on.length ? (on[0].style.backgroundImage||'') : '';
      return {
        bgOn: on.length,
        bgUrl: bi ? bi.replace(/^url\\("?/,'').replace(/"?\\)$/,'').split('/').pop().slice(0,28) : '',
        stageKids: stage ? stage.children.length : -1,
        stageLen: stage ? stage.innerHTML.length : -1,
        loaderOpen: !document.getElementById('loader').hidden,
        svg: document.querySelectorAll('#stage svg, #stage canvas, #stage img').length
      };
    })()`);
    rows.push({ id, ms, ...r });
    const bad = (r.bgOn === 0) || (r.stageKids < 1);
    console.log((bad ? '❌' : '  ') + ' 关' + String(id).padStart(2, '0') + ' ' + String(ms).padStart(6) + 'ms  bg=' + r.bgUrl + ' kids=' + r.stageKids + ' svg/img=' + r.svg + (r.loaderOpen ? ' LOADER' : ''));
    await ev(`window.App.exitLevel()`);
    await sleep(600);
  }
  const bads = rows.filter(r => r.bgOn === 0 || r.stageKids < 1);
  console.log('\n=== 汇总 ===');
  console.log('扫描关卡数:', rows.length, '异常:', bads.length);
  console.log('耗时 min/avg/max:', Math.min(...rows.map(r => r.ms)), Math.round(rows.reduce((a, r) => a + r.ms, 0) / rows.length), Math.max(...rows.map(r => r.ms)));
  if (bads.length) console.log('异常清单:', JSON.stringify(bads, null, 1));
  console.log('失败请求:', fails.length, [...new Set(fails)].slice(0, 10));
  cdp.close(); process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
