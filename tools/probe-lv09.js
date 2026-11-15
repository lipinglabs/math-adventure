#!/usr/bin/env node
/* probe-lv09.js — 第9关「找错句」题型渲染体检
 * 自动过教学、逐题定位 wrong 题，导出 DOM 结构 / 布局盒 / 计算样式 / 截图。
 * 用法: node tools/probe-lv09.js [url]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TARGET = process.argv[2] || 'http://127.0.0.1:8777/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.lv09-' + Date.now());
const PORT = 9555;
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe']
  .find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!EDGE) { console.error('Edge not found'); process.exit(1); }
fs.mkdirSync(PROFILE, { recursive: true });

spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const j = await (await fetch('http://127.0.0.1:' + PORT + '/json/list')).json();
      const p = j.find(t => t.type === 'page');
      if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl;
    } catch (e) { /* 等就绪 */ }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

function conn(u) {
  return new Promise((res, rej) => {
    const w = new WebSocket(u, { perMessageDeflate: false });
    let id = 0; const pend = new Map(); const hs = [];
    w.addEventListener('open', () => res({
      send(m, p) { const i = ++id; w.send(JSON.stringify({ id: i, method: m, params: p || {} })); return new Promise((a, b) => pend.set(i, { a, b })); },
      on(f) { hs.push(f); },
      close() { try { w.close(); } catch (e) { } }
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
  const cdp = await conn(await wsUrl());
  const exc = [];
  cdp.on(m => {
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      exc.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 400));
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      exc.push('CONSOLE ' + (m.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 300));
    }
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const ev = async e => {
    const r = await cdp.send('Runtime.evaluate', {
      expression: e, returnByValue: true, awaitPromise: true, userGesture: true
    });
    if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 400) };
    return r.result.value;
  };

  await cdp.send('Page.navigate', { url: TARGET + '?cb=' + Date.now() });
  await sleep(4500);

  const ready = await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  console.log('App/Engine 就绪:', ready);
  if (ready !== 'ok') { cdp.close(); process.exit(1); }

  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);

  const report = await ev(`(async function(){
    var out = { steps: [], questions: [] };
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function tapDoc(){ document.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true, cancelable:true})); }
    function qNodes(){ return document.querySelector('.l9-key, .l9-card'); }

    window.App.openLevel(9);

    // 过教学：一直点到出现题目控件为止
    for (var t = 0; t < 120; t++) {
      if (qNodes()) break;
      tapDoc();
      await wait(700);
    }
    out.steps.push('题目控件出现: ' + !!qNodes());

    function box(n){
      if (!n) return null;
      var r = n.getBoundingClientRect();
      var cs = getComputedStyle(n);
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        display: cs.display, visibility: cs.visibility,
        opacity: cs.opacity, position: cs.position,
        overflow: cs.overflow, zIndex: cs.zIndex,
        transform: cs.transform === 'none' ? '' : cs.transform.slice(0, 40),
        text: (n.textContent || '').trim().slice(0, 40)
      };
    }

    for (var k = 0; k < 14; k++) {
      for (var w = 0; w < 60 && !qNodes(); w++) await wait(250);
      if (!qNodes()) {
        var st = document.getElementById('stage');
        var cur = null;
        try { cur = window.LEVELS[9].current(); } catch(e) { cur = 'ERR:' + e.message; }
        out.fail = {
          at: k,
          curType: cur && cur.type,
          curKeys: cur ? Object.keys(cur) : null,
          rootExists: !!document.querySelector('.lv-root'),
          stageHTML: st ? st.innerHTML.slice(0, 700) : '(no stage)',
          stageKids: st ? st.children.length : -1,
          sessionIdx: null
        };
        out.steps.push('第 ' + k + ' 题无控件');
        break;
      }

      var cards = [].slice.call(document.querySelectorAll('.l9-card'));
      var rec = { idx: k, kind: cards.length ? 'wrong' : 'keys' };

      if (cards.length) {
        await wait(700);   // 等 popIn 动画收尾
        var board = document.querySelector('.l9-sents');
        var story = document.querySelector('.lv-story');
        var tray  = document.querySelector('.lv-tray');
        var stage = document.getElementById('stage');
        rec.dump = {
          board: box(board), story: box(story), tray: box(tray), stage: box(stage),
          stageScroll: stage ? { sh: stage.scrollHeight, ch: stage.clientHeight } : null,
          cardCount: cards.length,
          cards: cards.map(box),
          digits: [].slice.call(document.querySelectorAll('.l9-sent .l9-digit')).slice(0,6).map(box),
          boardHTML: board ? board.innerHTML.slice(0, 260) : '(no board)'
        };
        rec.cardKeys = cards.map(function(c){ return c.dataset.key; });
        if (k === 0 || !out.firstWrongShot) out.firstWrongShot = true;
      } else {
        rec.keys = [].slice.call(document.querySelectorAll('.l9-key')).map(function(x){ return x.dataset.value; });
      }

      // 作答
      var answered = false;
      if (cards.length) {
        var bad = cards.filter(function(c){
          var m = String(c.dataset.key || '').match(/^(\\d+)\\+(\\d+)=(\\d+)$/);
          return m && (Number(m[1]) + Number(m[2]) !== Number(m[3]));
        })[0];
        if (bad) { bad.click(); answered = true; }
      } else {
        var q = null;
        try { q = window.LEVELS[9].current(); } catch(e) {}
        var ans = q ? (q.a + q.b) : null;
        var keys = [].slice.call(document.querySelectorAll('.l9-key'));
        var hit = keys.filter(function(kk){ return Number(kk.dataset.value) === ans; })[0];
        if (hit) { hit.click(); answered = true; }
        rec.ans = ans;
      }
      rec.answered = answered;
      out.questions.push(rec);
      await wait(1200);
      if (document.querySelector('.result, .lv-result, .result-card, .res-card')) { out.steps.push('已结算'); break; }
    }
    return out;
  })()`);

  console.log('\n=== 报告 ===');
  console.log('步骤:', JSON.stringify(report.steps));
  (report.questions || []).forEach(function (r) {
    if (r.kind === 'wrong') {
      var d = r.dump || {};
      var cards = (d.cards || []).map(function (c) { return c ? (c.w + 'x' + c.h + '@' + c.y + ' op=' + c.opacity) : 'null'; });
      console.log('  #' + r.idx + ' wrong  卡片=' + d.cardCount + ' 板=' + (d.board ? d.board.w + 'x' + d.board.h : '-') +
        ' 盒=[' + cards.join(', ') + '] 答对=' + r.answered);
    } else {
      console.log('  #' + r.idx + ' keys   选项=' + JSON.stringify(r.keys) + ' 答案=' + r.ans + ' 答对=' + r.answered);
    }
  });
  if (report.fail) console.log('失败现场:', JSON.stringify(report.fail).slice(0, 400));
  console.log('\n=== 页面异常 (' + exc.length + ') ===');
  [...new Set(exc)].slice(0, 10).forEach(e => console.log('  ' + e));

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'lv09-wrong.png'), Buffer.from(shot.data, 'base64'));

  cdp.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
