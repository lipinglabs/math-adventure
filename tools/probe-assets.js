#!/usr/bin/env node
/* probe-assets.js — 线上素材体检（零第三方依赖，Edge + CDP）
 * 订阅 Network 域，抓所有 4xx/5xx 与 loadingFailed，并驱动进关卡触发素材下载。
 * 用法: node tools/probe-assets.js [url] [关卡数]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TARGET = process.argv[2] || 'https://lipinglabs.github.io/math-adventure/?probe=' + Date.now();
const NLEVELS = parseInt(process.argv[3] || '6', 10);
const ROOT = path.resolve(__dirname, '..');
const PROFILE = path.join(ROOT, 'tmp', '.probe-profile');
const CDP_PORT = 9455;
const EDGE = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
].find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
if (!EDGE) { console.error('Edge not found'); process.exit(1); }
fs.mkdirSync(PROFILE, { recursive: true });

const args = [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + PROFILE,
  '--window-size=414,896', '--hide-scrollbars', 'about:blank'
];
const proc = spawn(EDGE, args, { stdio: 'ignore', detached: false });

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list');
      const list = await r.json();
      const pg = list.find(t => t.type === 'page');
      if (pg && pg.webSocketDebuggerUrl) return pg.webSocketDebuggerUrl;
    } catch (e) { /* 等 */ }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { perMessageDeflate: false });
    let id = 0;
    const pending = new Map();
    const handlers = [];
    ws.addEventListener('open', () => resolve({
      send(method, params) {
        const mid = ++id;
        ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
        return new Promise((res, rej) => pending.set(mid, { res, rej }));
      },
      on(fn) { handlers.push(fn); },
      close() { try { ws.close(); } catch (e) {} }
    }));
    ws.addEventListener('error', reject);
    ws.addEventListener('message', ev => {
      let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
      if (m.id && pending.has(m.id)) {
        const p = pending.get(m.id); pending.delete(m.id);
        if (m.error) p.rej(new Error(JSON.stringify(m.error)));
        else p.res(m.result);
      } else if (m.method) handlers.forEach(h => h(m));
    });
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const cdp = await connect(wsUrl);

  const bad = [];
  const okList = [];
  const failures = [];
  const consoleErrs = [];

  cdp.on(msg => {
    if (msg.method === 'Network.responseReceived') {
      const { response, type } = msg.params;
      if (!response.url.includes('github.io')) return;
      if (response.status >= 400) bad.push(response.status + ' [' + type + '] ' + response.url);
      else okList.push(response.url);
    } else if (msg.method === 'Network.loadingFailed') {
      const p = msg.params;
      failures.push((p.errorText || '?') + ' ' + (p.blockedReason || '') + ' type=' + p.type);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrs.push((msg.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 250));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      consoleErrs.push('EXC: ' + (d.exception && d.exception.description || d.text || '').slice(0, 250));
    }
  });

  await cdp.send('Network.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  await cdp.send('Page.navigate', { url: TARGET });
  await sleep(9000);

  // 驱动进关卡（正确入口：window.App.openLevel / window.Engine）
  const driver = `(async function(){
    var out = {errs: [], levels: [], bgOk: 0, bgFail: 0};
    function wait(ms){return new Promise(function(r){setTimeout(r,ms);});}
    for (var w=0; w<150 && !(window.App && window.Engine); w++) await wait(100);
    if (!(window.App && window.Engine)) { out.errs.push('App/Engine missing'); return out; }
    var App = window.App;
    out.view0 = App.snapshot ? App.snapshot().view : 'n/a';
    var ids = [];
    try {
      var raw = window.LEVELS || window.LEVEL_DATA || [];
      raw.forEach(function(l){ if (l && l.id != null) ids.push(l.id); });
    } catch(e){}
    if (!ids.length) { for (var i=1;i<=48;i++) ids.push(i); }
    out.totalIds = ids.length;
    var pick = ids.slice(0, ${NLEVELS});
    for (var k=0;k<pick.length;k++){
      var id = pick[k], rec = {id:id};
      try {
        await App.openLevel(id);
        await wait(2200);
        var probe = document.querySelector('#level');
        var bi = probe ? (getComputedStyle(probe).backgroundImage || '') : '';
        var m = bi.match(/url\\(["']?([^"')]+)["']?\\)/);
        rec.bgUrl = m ? m[1].split('/').pop() : '(none)';
        // 用 Image 对象实测该 URL 能否解码
        if (m) {
          var ok = await new Promise(function(res){
            var im = new Image();
            im.onload = function(){ res(im.naturalWidth>0 ? im.naturalWidth+'x'+im.naturalHeight : 'zero'); };
            im.onerror = function(){ res('ERROR'); };
            im.src = m[1];
            setTimeout(function(){ res('TIMEOUT'); }, 8000);
          });
          rec.bgDecode = ok;
          if (ok === 'ERROR' || ok === 'TIMEOUT' || ok === 'zero') out.bgFail++; else out.bgOk++;
        }
        rec.imgCount = document.querySelectorAll('img').length;
        App.exitLevel ? App.exitLevel() : null;
        await wait(350);
      } catch(e){ rec.err = String(e.message||e); out.levels.push(rec); continue; }
      out.levels.push(rec);
    }
    try { out.cacheKeys = await caches.keys(); } catch(e){}
    try {
      var c = await caches.open('math-adventure-assets-v1');
      var ks = await c.keys();
      out.cacheEntries = ks.length;
      out.cacheSample = ks.slice(0,3).map(function(q){return q.url.split('/').pop();});
    } catch(e){ out.cacheErr = String(e.message||e); }
    return out;
  })()`;

  const r = await cdp.send('Runtime.evaluate', {
    expression: driver, returnByValue: true, awaitPromise: true, userGesture: true
  });

  await sleep(1500);

  console.log('=== 结果 ===');
  console.log(JSON.stringify(r.result && r.result.value, null, 1).slice(0, 4000));
  console.log('\n=== 成功请求数 ===', okList.length);
  console.log('=== 失败状态码 (' + bad.length + ') ===');
  [...new Set(bad)].slice(0, 60).forEach(b => console.log('  ' + b));
  console.log('=== 网络失败 (' + failures.length + ') ===');
  [...new Set(failures)].slice(0, 30).forEach(b => console.log('  ' + b));
  console.log('=== JS 错误 (' + consoleErrs.length + ') ===');
  [...new Set(consoleErrs)].slice(0, 20).forEach(b => console.log('  ' + b));
  // 唯一 bg 请求
  const bgs = okList.filter(u => u.includes('assets/bg/'));
  console.log('\n=== 已加载背景图 ' + bgs.length + ' 张 ===');
  bgs.slice(0, 60).forEach(u => console.log('  ' + u.replace(/^https?:\/\/[^/]+\//, '')));

  cdp.close();
  try { proc.kill(); } catch (e) {}
  process.exit(0);
})().catch(e => { console.error('FATAL', e.message); try { proc.kill(); } catch (x) {} process.exit(1); });
