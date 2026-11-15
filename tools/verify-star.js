#!/usr/bin/env node
/* verify-star.js — 星级规则端到端验证（一关一局 · 全对即金）
 * 段一：引擎会话直驱，验证整关全对/有错/断点续做的判定
 * 段二：真实界面跑第 9 关一次到底，验证最终落盘金星
 * 用法: node tools/verify-star.js [url]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://127.0.0.1:8799/index.html';
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.star-' + Date.now());
const PORT = 9577;
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
    } catch (e) { /* 等 */ }
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
      exc.push(((d.exception && (d.exception.description || d.exception.value)) || d.text || '').slice(0, 300));
    }
  });
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const ev = async e => {
    const r = await cdp.send('Runtime.evaluate', {
      expression: e, returnByValue: true, awaitPromise: true, userGesture: true
    });
    if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 500) };
    return r.result.value;
  };

  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4000);
  const ready = await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine&&window.Progress)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  console.log('就绪:', ready);
  if (ready !== 'ok') process.exit(1);

  /* ---------- 段一：引擎会话直驱 ---------- */
  const unit = await ev(`(function(){
    localStorage.clear();
    var W = window.Wellbeing;
    var out = { cases: [] };
    var L = 3;

    function refs(lv, from, to) {
      var a = []; for (var i = from; i < to; i++) a.push(lv + ':' + i); return a;
    }
    function reset(roundClean) {
      if (W.store.clearCursor) W.store.clearCursor(L);
      W.store.setCursor(L, { nextQIndex: 0, currentGroupId: 0, groupsDone: [], groupResults: {},
        solved: [], total: 0, roundClean: roundClean !== false, roundTotal: 10 });
    }
    // 跑一段：solved0 = 之前已做对的题；wrongAt = 本段第几题答错
    function run(total, solved0, startAt, wrongAt) {
      var s = Engine.session({ total: total, levelId: L });
      var localRefs = refs(L, startAt, startAt + total);
      s.setRoundTotal(10);
      s.setQueue(null, [], solved0, localRefs);
      s.setTotal(total);
      var last = null;
      for (var i = 0; i < total; i++) {
        if (i === wrongAt) { last = s.answer(false); last = s.answer(true); }
        else { last = s.answer(true); }
      }
      return last;
    }

    // A 一关一局 10 题全对 → 金
    reset(true);
    var a = run(10, [], 0, -1);
    out.cases.push({ name: 'A 整关全对', star: a && a.star, lastGroup: a && a.lastGroupOnly, expect: 'gold' });
    var cA = W.store.getCursor(L) || {};
    out.cases.push({ name: 'A 收尾后游标已清空', star: ((cA.solved||[]).length === 0 && cA.roundClean !== false) ? 'gold' : 'silver', expect: 'gold' });

    // B 第 3 题错一次 → 银
    reset(true);
    var b = run(10, [], 0, 3);
    out.cases.push({ name: 'B 中途答错一次', star: b && b.star, expect: 'silver' });

    // C 断点续做：先做 6 题全对退出，再进做 4 题全对 → 金
    reset(true);
    W.store.setCursor(L, { solved: refs(L, 0, 6), roundClean: true, roundTotal: 10, currentGroupId: 0 });
    var c = run(4, refs(L, 0, 6), 6, -1);
    out.cases.push({ name: 'C 断点续做全对', star: c && c.star, expect: 'gold' });

    // D 断点续做但第一段有错 → 银
    reset(true);
    W.store.setCursor(L, { solved: refs(L, 0, 6), roundClean: false, roundTotal: 10, currentGroupId: 0 });
    var d = run(4, refs(L, 0, 6), 6, -1);
    out.cases.push({ name: 'D 续做但前段有错', star: d && d.star, expect: 'silver' });

    // E 答错后重来一轮全对 → 金（新一轮不受上一轮影响）
    reset(true);
    var e1 = run(10, [], 0, 2);
    var e2 = run(10, [], 0, -1);
    out.cases.push({ name: 'E 上一轮有错、本轮全对', star: e2 && e2.star, first: e1 && e1.star, expect: 'gold' });

    // F Progress 落星
    reset(true);
    Progress.record(L, 'gold', { gold: true });
    out.recordGold = Progress.starOf(L);
    Progress.record(L, 'silver', { gold: false });
    out.recordKeep = Progress.starOf(L);
    return out;
  })()`);

  console.log('\n=== 段一：星判规则（一关一局）===');
  if (unit.__err) console.log('ERR', unit.__err);
  else {
    (unit.cases || []).forEach(c => {
      console.log('  ' + (c.star === c.expect ? '✅' : '❌') + ' ' + c.name +
        ' → ' + c.star + ' (期望 ' + c.expect + ')' + (c.first ? ' 首轮=' + c.first : ''));
    });
    console.log('  record(gold) →', unit.recordGold, ' 再 record(silver) →', unit.recordKeep);
  }

  /* ---------- 段二：真实界面第 9 关（一次到底）---------- */
  await ev(`localStorage.clear(); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4000);
  await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);

  const playLv9 = `(async function(){
    var out = { renders: 0, answered: 0, wrongSeen: 0 };
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function result(){ return document.querySelector('.result'); }
    function controls(){ return document.querySelectorAll('.l9-key, .l9-card'); }

    await window.App.openLevel(9);
    var mod = window.LEVELS[9];
    if (!mod) { out.err = 'LEVELS[9] missing after openLevel'; return out; }
    var lastRender = mod.render ? mod.render() : -1;

    for (var n = 0; n < 14; n++) {
      for (var w = 0; w < 240; w++) {
        if (result()) break;
        var now = mod.render ? mod.render() : 0;
        if (now !== lastRender && controls().length) break;
        await wait(100);
      }
      if (result()) break;
      lastRender = mod.render ? mod.render() : 0;
      out.renders += 1;
      await wait(320);

      var cards = [].slice.call(document.querySelectorAll('.l9-card'));
      var keys  = [].slice.call(document.querySelectorAll('.l9-key'));
      var q = null;
      try { q = mod.current(); } catch (e) {}

      if (cards.length) {
        out.wrongSeen += 1;
        var bad = cards.filter(function (c) {
          var p1 = String(c.dataset.key || '').split('+');
          if (p1.length !== 2) return false;
          var p2 = p1[1].split('=');
          if (p2.length !== 2) return false;
          return Number(p1[0]) + Number(p2[0]) !== Number(p2[1]);
        })[0];
        if (bad) { bad.click(); out.answered += 1; }
      } else if (keys.length && q) {
        var ans = q.a + q.b;
        var hit = keys.filter(function (k) { return Number(k.dataset.value) === ans; })[0];
        if (hit) { hit.click(); out.answered += 1; }
      }
      await wait(900);
    }
    var starEl = document.querySelector('.result-star--gold, .result-star--silver');
    out.resultStar = starEl ? (starEl.className.indexOf('--gold') >= 0 ? 'gold' : 'silver') : '';
    out.star = window.Progress.starOf(9);
    out.result = !!result();
    return out;
  })()`;

  console.log('\n=== 段二：第 9 关真实界面，一次到底全对 ===');
  const r1 = await ev(playLv9);
  console.log(JSON.stringify(r1));
  console.log('结果页星:', r1 && r1.resultStar, r1 && r1.resultStar === 'gold' ? '✅' : '❌');
  console.log('落盘星:', r1 && r1.star, r1 && r1.star === 'gold' ? '✅' : '❌');

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'lv09-final.png'), Buffer.from(shot.data, 'base64'));

  console.log('\n页面异常:', exc.length, [...new Set(exc)].slice(0, 5));
  const bad = (unit.cases || []).filter(c => c.star !== c.expect).length +
    ((r1 && r1.resultStar === 'gold' && r1.star === 'gold') ? 0 : 1);
  console.log(bad === 0 ? '\nSTAR_PASS' : '\nSTAR_FAIL(' + bad + ')');
  cdp.close();
  process.exit(bad === 0 ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
