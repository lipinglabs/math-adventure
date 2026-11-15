#!/usr/bin/env node
/* verify-star.js — 星级规则端到端验证
 * 段一：直接驱动 Engine.session，验证 6+4 分组下的金星/银星判定（不依赖渲染时序）
 * 段二：真实界面跑第 9 关两局，验证最终落盘星级 + 「找错句」题面可见
 * 用法: node tools/verify-star.js [url]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE = process.argv[2] || 'http://127.0.0.1:8777/index.html';
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
    var W = window.Wellbeing, R = window.RouteMap;
    var out = { cases: [], coreLevel: null, nonCoreLevel: null };

    // 找一个 core 关、一个 challenge 关（challenge 不记星）
    for (var id = 1; id <= 48; id++) {
      if (out.coreLevel == null && R.isCore(id)) out.coreLevel = id;
      if (out.nonCoreLevel == null && !R.isCore(id)) out.nonCoreLevel = id;
    }

    function runGroup(levelId, groupIndex, total, wrongAt) {
      if (W.store.clearCursor && groupIndex === 0) W.store.clearCursor(levelId);
      var s = Engine.session({ total: total, levelId: levelId });
      s.setGroupIndex(groupIndex);
      s.setTotal(total);
      var last = null;
      for (var i = 0; i < total; i++) {
        if (wrongAt === i) { last = s.answer(false); last = s.answer(true); }
        else { last = s.answer(true); }
      }
      return last;
    }

    var L = out.coreLevel || 9;

    // A1 第 9 关第一局（6 题）全对 → 银（未到收尾局）
    var a1 = runGroup(L, 0, 6, -1);
    out.cases.push({ name: 'A1 首局全对', star: a1 && a1.star, last: a1 && a1.lastGroupOnly, expect: 'silver' });
    // A2 第二局（4 题）全对 → 金（两局都全对）
    var a2 = runGroup(L, 1, 4, -1);
    out.cases.push({ name: 'A2 次局全对', star: a2 && a2.star, last: a2 && a2.lastGroupOnly, expect: 'gold' });

    // B 另一关：首题答错，两局其余全对 → 银
    var L2 = (L + 1 <= 48 ? L + 1 : 1);
    if (!R.isCore(L2)) L2 = L;
    var b1 = runGroup(L2, 0, 6, 0);
    out.cases.push({ name: 'B1 首题答错', star: b1 && b1.star, expect: 'silver' });
    var b2 = runGroup(L2, 1, 4, -1);
    out.cases.push({ name: 'B2 次局全对但首局有错', star: b2 && b2.star, expect: 'silver' });

    // Progress.record 映射
    Progress.record(L, 'gold', { gold: true });
    out.recordGold = Progress.starOf(L);
    var L3 = (L + 2 <= 48 ? L + 2 : 2);
    Progress.record(L3, 'silver', { gold: false });
    out.recordSilver = Progress.starOf(L3);

    out.levelMistakes = Progress.read().levelMistakes ? 'present' : 'n/a';
    return out;
  })()`);
  console.log('\n=== 段一：星判规则 ===');
  if (unit.__err) { console.log('ERR', unit.__err); }
  else {
    console.log('core 关:', unit.coreLevel, ' 非 core 关:', unit.nonCoreLevel);
    (unit.cases || []).forEach(c => {
      console.log('  ' + (c.star === c.expect ? '✅' : '❌') + ' ' + c.name +
        ' → ' + c.star + ' (期望 ' + c.expect + ')' + (c.last === undefined ? '' : ' lastGroup=' + c.last));
    });
    console.log('  record(gold) →', unit.recordGold, ' record(silver) →', unit.recordSilver);
  }

  /* ---------- 段二：真实界面第 9 关 ---------- */
  await ev(`localStorage.clear(); 'ok'`);
  await cdp.send('Page.navigate', { url: BASE + '?quick=1&cb=' + Date.now() });
  await sleep(4000);
  await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  await ev(`window.Wellbeing && (window.Wellbeing.__skipRest = true); 'ok'`);

  const playLv9 = `(async function(){
    var out = { renders: 0, answered: 0, wrongSeen: 0, wrongCards: [] };
    function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    function result(){ return document.querySelector('.result'); }
    function controls(){ return document.querySelectorAll('.l9-key, .l9-card'); }

    await window.App.openLevel(9);
    var mod = window.LEVELS[9];
    if (!mod) { out.err = 'LEVELS[9] missing after openLevel'; return out; }
    var lastRender = mod.render ? mod.render() : -1;

    for (var n = 0; n < 12; n++) {
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
        var board = document.querySelector('.l9-sents');
        var rect = board ? board.getBoundingClientRect() : null;
        out.wrongCards.push({ n: cards.length, w: rect ? Math.round(rect.width) : 0, h: rect ? Math.round(rect.height) : 0,
          visible: cards.every(function (c) {
            var r = c.getBoundingClientRect();
            return r.width > 40 && r.height > 20 && getComputedStyle(c).opacity !== '0';
          }) });
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
    out.star = window.Progress.starOf(9);
    out.result = !!result();
    return out;
  })()`;

  console.log('\n=== 段二：第 9 关真实界面，两局全对 ===');
  const r1 = await ev(playLv9);
  console.log('第一局:', JSON.stringify(r1));
  await ev(`window.App.exitLevel()`);
  await sleep(1500);
  const r2 = await ev(playLv9);
  console.log('第二局:', JSON.stringify(r2));
  const starUI = await ev(`window.Progress.starOf(9)`);
  console.log('第 9 关最终星:', starUI, starUI === 'gold' ? '✅ 金星' : '❌ 期望 gold');

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ROOT, 'tmp', 'lv09-final.png'), Buffer.from(shot.data, 'base64'));

  console.log('\n页面异常:', exc.length, [...new Set(exc)].slice(0, 5));
  cdp.close();
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
