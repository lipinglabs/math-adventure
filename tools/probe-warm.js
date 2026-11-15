#!/usr/bin/env node
/* probe-warm.js — 验证「首页空闲预热目标关卡」：不点任何关卡，缓存是否自己长起来 */
'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const TARGET=process.argv[2]||'https://lipinglabs.github.io/math-adventure/';
const ROOT=path.resolve(__dirname,'..');
const PROFILE=path.join(ROOT,'tmp','.warm-'+Date.now());
const PORT=9533;
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
fs.mkdirSync(PROFILE,{recursive:true});
spawn(EDGE,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+PORT,'--user-data-dir='+PROFILE,'--window-size=414,896','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<80;i++){try{const j=await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();const p=j.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl;}catch(e){}await sleep(250);}throw new Error('no cdp');}
function conn(u){return new Promise((res,rej)=>{const w=new WebSocket(u,{perMessageDeflate:false});let id=0;const pend=new Map();const hs=[];w.addEventListener('open',()=>res({send(m,p){const i=++id;w.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}));},on(f){hs.push(f);},close(){try{w.close();}catch(e){}}}));w.addEventListener('error',rej);w.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.b(m.error):p.a(m.result);}else if(m.method)hs.forEach(h=>h(m));});});}
(async()=>{
  const cdp=await conn(await wsUrl());
  await cdp.send('Runtime.enable');await cdp.send('Page.enable');
  const ev=async e=>{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true,userGesture:true});return r.exceptionDetails?{__err:JSON.stringify(r.exceptionDetails).slice(0,300)}:r.result.value;};
  const stat=`(async()=>{const c=await caches.open('math-adventure-assets-v1');const ks=await c.keys();
    return {total:ks.length,mp3:ks.filter(r=>/\\.mp3/.test(r.url)).length,webp:ks.filter(r=>/\\.webp/.test(r.url)).length};})()`;

  await cdp.send('Page.navigate',{url:TARGET+'?cb='+Date.now()});
  await sleep(3500);
  await ev(`window.Wellbeing&&(window.Wellbeing.__skipRest=true);'ok'`);
  console.log('打开首页后 3.5s 缓存:', JSON.stringify(await ev(stat)));
  console.log('预热目标:', await ev(`(function(){var ids=Object.keys(MATH_DATA.levels).map(Number).sort(function(a,b){return a-b;});
    for(var i=0;i<ids.length;i++){if(Progress.starOf(ids[i])==='none')return ids[i];}return ids[0];})()`));

  await sleep(12000);
  console.log('再等 12s 后缓存:', JSON.stringify(await ev(stat)), '  ← 未点关卡，应已自动填充');

  console.log('手动调 prefetchLevel:', await ev(`(async()=>{
    try{ if(!Engine.prefetchLevel) return 'NO_API';
      var r = await Engine.prefetchLevel(MATH_DATA.levels[1]); return 'ok:'+JSON.stringify(r); }
    catch(e){ return 'ERR:'+(e.message||e); }})()`));
  console.log('手动预取后缓存:', JSON.stringify(await ev(stat)));

  const t=Date.now();
  await ev(`window.App.openLevel(1)`);
  console.log('随后进第1关耗时:', Date.now()-t, 'ms');
  console.log('进关后缓存:', JSON.stringify(await ev(stat)));
  cdp.close();process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
