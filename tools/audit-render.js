#!/usr/bin/env node
/* audit-render.js — 48 关 × 10 题「逐题渲染」全量审计
 *
 * 原理：把 levelCursor.solved 置为「除第 i 题以外的 9 题」，重新进关时
 *       planQueue 只会排出第 i 题 → 无需任何点击即可让该题真实渲染。
 *       逐题快照题面/选项的可见性，抓「只有声音没有画面 / 选项缺失 / 空容器」。
 *
 * 用法: node tools/audit-render.js [from] [to] [url]
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const FROM = parseInt(process.argv[2] || '1', 10);
const TO = parseInt(process.argv[3] || '10', 10);
const BASE = process.argv[4] || 'https://lipinglabs.github.io/math-adventure/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.ard-' + Date.now());
const PORT = 9699;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!EDGE) { console.error('Edge not found'); process.exit(1); }
fs.mkdirSync(PROFILE, { recursive: true });
spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try { const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json(); const p = j.find(t => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch (e) { }
    await sleep(250);
  }
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

const SNAP = `(function(){
  function vis(n){ var r=n.getBoundingClientRect(); var cs=getComputedStyle(n);
    return r.width>2 && r.height>2 && cs.visibility!=='hidden' && cs.opacity!=='0' && cs.display!=='none'; }
  var stage=document.getElementById('stage');
  var story=document.querySelector('.lv-story')||document.querySelector('.lv');
  var tray=document.querySelector('.lv-tray');
  // 交互项可能挂在选项区，也可能直接挂在题面上（数一数、点一组、拖一拖）
  var sel='button, [data-value], [role="button"], [draggable="true"], .card, [class*="key"], [class*="card"], [class*="slot"], [class*="chip"], [class*="apple"], [class*="item"]';
  var all = stage ? [].slice.call(stage.querySelectorAll(sel)).filter(function(n){
    return vis(n) && !(n.classList && n.classList.contains('q-replay'));
  }) : [];
  var empties=[];
  [].slice.call(document.querySelectorAll('[class*="sents"],[class*="board"],[class*="lanes"],[class*="slots"]')).forEach(function(b){
    if(!b.children.length) empties.push(String(b.className).slice(0,40));
  });
  return {
    stageKids: stage?stage.children.length:-1,
    storyText: story?(story.textContent||'').replace(/\\s+/g,' ').trim().length:-1,
    visuals: story?story.querySelectorAll('svg,img,canvas').length:-1,
    trayKids: tray?tray.children.length:-1,
    cands: all.length,
    empties: empties.slice(0,3),
    qType: (function(){ try { var m=window.LEVELS[window.Engine.activeLevelId()]; var q=m&&m.current?m.current():null; return q?(q.type||'?'):'n/a'; } catch(e){ return 'err'; } })(),
    html: stage?stage.innerHTML.slice(0,160):''
  };
})()`;

(async () => {
  const cdp = await conn(await wsUrl());
  const jsErrs = [];
  cdp.on(m => {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; jsErrs.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 140)); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') jsErrs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 140));
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => { const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true }); return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 260) } : r.result.value; };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4500);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`));
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); localStorage.clear(); 'ok'`);

  const bad = [];
  for (let id = FROM; id <= TO; id++) {
    const t0 = Date.now();
    const badQs = [];
    for (let q = 0; q < 10; q++) {
      // 只留第 q 题：其余 9 题标记为已做对
      const refs = [];
      for (let k = 0; k < 10; k++) if (k !== q) refs.push(id + ':' + k);
      await ev(`(function(){
        window.Wellbeing.store.setCursor(${id}, {
          nextQIndex: 0, currentGroupId: 0, groupsDone: [], groupResults: {},
          solved: ${JSON.stringify(refs)}, total: 0, roundClean: true, roundTotal: 10, planned: []
        });
        return true;
      })()`);
      await ev(`window.App.openLevel(${id})`);
      await sleep(650);
      // 等渲染（最多 ~2.5s）
      let snap = null;
      for (let w = 0; w < 12; w++) {
        snap = await ev(SNAP);
        if (snap && (snap.cands > 0 || snap.storyText > 0 || snap.visuals > 0)) break;
        await sleep(200);
      }
      const done = await ev(`!!document.querySelector('.result, .lv-result, .result-card')`);
      const probs = [];
      if (done) probs.push('直接进结算');
      if (!snap || snap.cands < 1) probs.push('无可交互项');
      if (snap && !(snap.storyText > 0 || snap.visuals > 0)) probs.push('题面无内容');
      if (snap && snap.empties && snap.empties.length) probs.push('空容器:' + snap.empties.join('/'));
      if (probs.length) badQs.push({ q: q, type: snap && snap.qType, probs: probs, html: snap && snap.html });
      await ev(`window.App.exitLevel()`);
      await sleep(260);
    }
    const ms = Date.now() - t0;
    console.log((badQs.length ? '❌' : '  ') + ' L' + String(id).padStart(2, '0') +
      '  10 题  ' + String(ms).padStart(6) + 'ms' +
      (badQs.length ? '  ⚠ q' + badQs.map(b => b.q).join(',') + '  ' + badQs[0].probs.join('/') : ''));
    if (badQs.length) bad.push({ id: id, qs: badQs.slice(0, 3) });
  }

  console.log('\n=== 汇总 ' + FROM + '–' + TO + ' ===');
  console.log('异常关卡:', bad.length, bad.map(b => b.id).join(',') || '无');
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 4), null, 1).slice(0, 2000));
  console.log('JS 错误:', jsErrs.length, [...new Set(jsErrs)].slice(0, 4));
  cdp.close();
  process.exit(bad.length === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
