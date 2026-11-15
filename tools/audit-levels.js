#!/usr/bin/env node
/* audit-levels.js — 48 关 × 每题「有没有真的画出来」全量审计（零第三方依赖）
 *
 * 目的：抓「只有声音没有画面 / 题面空白 / 选项缺失」这类关卡级共性问题。
 * 做法：逐关进入，逐题快照题面与选项的可见性，再点选项推进（优先点与期望答案一致的项）。
 * 用法: node tools/audit-levels.js [from] [to] [url]
 *   例: node tools/audit-levels.js 1 16
 */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');

const FROM = parseInt(process.argv[2] || '1', 10);
const TO = parseInt(process.argv[3] || '48', 10);
const BASE = process.argv[4] || 'https://lipinglabs.github.io/math-adventure/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.audit-' + Date.now());
const PORT = 9677;
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

/* 页内：快照当前题面 + 尝试推进一题 */
const PROBE = `(function(){
  function visible(n){
    if (!n) return false;
    var r = n.getBoundingClientRect();
    var cs = getComputedStyle(n);
    return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && cs.opacity !== '0' && cs.display !== 'none';
  }
  function candidates(){
    var tray = document.querySelector('.lv-tray') || document.querySelector('.lv') || document.getElementById('stage');
    if (!tray) return [];
    var sel = 'button, [data-value], [role="button"], .card, [class*="key"], [class*="card"], [class*="chip"]';
    return [].slice.call(tray.querySelectorAll(sel)).filter(function(n){
      return visible(n) && !n.disabled;
    });
  }
  var stage = document.getElementById('stage');
  var story = document.querySelector('.lv-story') || document.querySelector('.lv');
  var tray = document.querySelector('.lv-tray');
  var emptyBoards = [];
  [].slice.call(document.querySelectorAll('[class*="sents"], [class*="board"], [class*="slot"], [class*="lanes"]')).forEach(function(b){
    if (!b.children.length) emptyBoards.push((b.className || '').toString().slice(0, 40));
  });
  return {
    stageKids: stage ? stage.children.length : -1,
    storyText: story ? (story.textContent || '').replace(/\\s+/g, ' ').trim().length : -1,
    visuals: story ? story.querySelectorAll('svg, img, canvas').length : -1,
    trayKids: tray ? tray.children.length : -1,
    cands: candidates().length,
    emptyBoards: emptyBoards.slice(0, 3),
    stageLen: stage ? stage.innerHTML.length : -1,
    html: stage ? stage.innerHTML.slice(0, 200) : ''
  };
})()`;

(async () => {
  const cdp = await conn(await wsUrl());
  const jsErrs = [];
  cdp.on(m => {
    if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; jsErrs.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 160)); }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') jsErrs.push((m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 160));
  });
  await cdp.send('Runtime.enable'); await cdp.send('Page.enable');
  const ev = async e => {
    const r = await cdp.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true, userGesture: true });
    return r.exceptionDetails ? { __err: JSON.stringify(r.exceptionDetails).slice(0, 300) } : r.result.value;
  };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4500);
  console.log('就绪:', await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`));
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); localStorage.clear(); 'ok'`);

  const bad = [];
  for (let id = FROM; id <= TO; id++) {
    const t0 = Date.now();
    await ev(`window.App.openLevel(${id})`);
    let q = 0, stuckAt = -1, problems = [], worst = null;

    for (let n = 0; n < 12; n++) {
      // 等本题渲染出控件
      let snap = null;
      for (let w = 0; w < 60; w++) {
        snap = await ev(PROBE);
        if (snap && snap.cands > 0) break;
        const res = await ev(`!!document.querySelector('.result, .lv-result, .result-card')`);
        if (res) break;
        await sleep(150);
      }
      const done = await ev(`!!document.querySelector('.result, .lv-result, .result-card')`);
      if (done) break;
      if (!snap || !snap.cands) { stuckAt = q; problems.push('无可见选项 @q' + q); break; }

      // 题面内容检查：文字或图形至少有一项
      const stats = await ev(`(function(){ return Engine.sessionState ? Engine.sessionState() : null; })()`);
      const idxBefore = stats && typeof stats.index === 'number' ? stats.index : q;
      if (!(snap.storyText > 0 || snap.visuals > 0)) problems.push('题面无内容 @q' + q);
      if (snap.emptyBoards && snap.emptyBoards.length) problems.push('空容器 ' + snap.emptyBoards.join('/') + ' @q' + q);
      if (snap.trayKids < 1) problems.push('选项区空 @q' + q);
      worst = snap;

      // 优先点「与期望答案一致」的选项，否则依次尝试
      const hint = stats ? stats.hint : null;
      let clicked = false;
      if (hint != null) {
        clicked = await ev(`(function(){
          var tray=document.querySelector('.lv-tray'); if(!tray) return false;
          var cands=[].slice.call(tray.querySelectorAll('[data-value]'));
          var hit=cands.filter(function(n){ return String(n.getAttribute('data-value')) === '${String(hint)}'; })[0];
          if (hit) { hit.click(); return true; }
          return false;
        })()`);
      }
      await sleep(clicked ? 700 : 0);

      // 未推进则依次点其它候选
      for (let a = 0; a < 6; a++) {
        const st = await ev(`Engine.sessionState ? Engine.sessionState() : null`);
        const nowIdx = st && typeof st.index === 'number' ? st.index : -1;
        const doneNow = await ev(`!!document.querySelector('.result, .lv-result, .result-card')`);
        if (doneNow || nowIdx > idxBefore) break;
        const ok = await ev(`(function(){
          var tray=document.querySelector('.lv-tray'); if(!tray) return false;
          var sel='button, [data-value], [role="button"], .card, [class*="key"], [class*="card"]';
          var cands=[].slice.call(tray.querySelectorAll(sel)).filter(function(n){
            var r=n.getBoundingClientRect(); var cs=getComputedStyle(n);
            return r.width>2 && r.height>2 && cs.visibility!=='hidden' && cs.opacity!=='0' && !n.disabled && !n.__tried;
          });
          if(!cands.length){ [].slice.call(tray.querySelectorAll(sel)).forEach(function(n){ n.__tried=false; }); return false; }
          cands[0].__tried = true; cands[0].click(); return true;
        })()`);
        if (!ok) { await sleep(300); continue; }
        await sleep(650);
      }

      const st2 = await ev(`Engine.sessionState ? Engine.sessionState() : null`);
      const idx2 = st2 && typeof st2.index === 'number' ? st2.index : -1;
      const done2 = await ev(`!!document.querySelector('.result, .lv-result, .result-card')`);
      if (!done2 && idx2 <= idxBefore) { stuckAt = q; problems.push('点不动 @q' + q); break; }
      q += 1;
    }

    const star = await ev(`(function(){ var n=document.querySelector('.result-star--gold, .result-star--silver'); return n ? (n.className.indexOf('--gold')>=0?'gold':'silver') : ''; })()`);
    const ms = Date.now() - t0;
    const okLevel = problems.length === 0 && stuckAt < 0;
    console.log((okLevel ? '  ' : '❌') + ' L' + String(id).padStart(2, '0') +
      '  题数=' + q + '  ' + String(ms).padStart(6) + 'ms' +
      '  trayKids=' + (worst ? worst.trayKids : '-') + ' cands=' + (worst ? worst.cands : '-') +
      (star ? '  结果页=' + star : '') +
      (problems.length ? '  ⚠ ' + problems.slice(0, 3).join(' | ') : ''));
    if (!okLevel) bad.push({ id: id, q: q, stuckAt: stuckAt, problems: problems.slice(0, 4), html: worst && worst.html });

    await ev(`window.App.exitLevel()`);
    await sleep(500);
  }

  console.log('\n=== 汇总 ' + FROM + '–' + TO + ' ===');
  console.log('异常关卡:', bad.length, bad.map(b => b.id).join(',') || '无');
  if (bad.length) console.log(JSON.stringify(bad.slice(0, 6), null, 1).slice(0, 2500));
  console.log('JS 错误:', jsErrs.length, [...new Set(jsErrs)].slice(0, 5));
  cdp.close();
  process.exit(bad.length === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
