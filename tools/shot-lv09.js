#!/usr/bin/env node
/* shot-lv09.js — 截取第9关「找出错的算式」题面实拍 */
'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const BASE=process.argv[2]||'https://lipinglabs.github.io/math-adventure/index.html';
const ROOT=path.resolve(__dirname,'..');
const PROFILE=path.join(ROOT,'tmp','.shot-'+Date.now());
const PORT=9588;
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
fs.mkdirSync(PROFILE,{recursive:true});
spawn(EDGE,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+PORT,'--user-data-dir='+PROFILE,'--window-size=414,896','--hide-scrollbars','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<80;i++){try{const j=await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();const p=j.find(t=>t.type==='page');if(p&&p.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch(e){}await sleep(250);}throw new Error('no cdp');}
function conn(u){return new Promise((res,rej)=>{const w=new WebSocket(u,{perMessageDeflate:false});let id=0;const pend=new Map();const hs=[];w.addEventListener('open',()=>res({send(m,p){const i=++id;w.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}));},on(f){hs.push(f);},close(){try{w.close();}catch(e){}}}));w.addEventListener('error',rej);w.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.b(m.error):p.a(m.result);}else if(m.method)hs.forEach(h=>h(m));});});}
(async()=>{
  const cdp=await conn(await wsUrl());
  await cdp.send('Runtime.enable');await cdp.send('Page.enable');await cdp.send('Network.enable');
  const ev=async e=>{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true,userGesture:true});return r.exceptionDetails?{__err:JSON.stringify(r.exceptionDetails).slice(0,300)}:r.result.value;};
  await cdp.send('Page.navigate',{url:BASE+'?quick=1&cb='+Date.now()});
  await sleep(4200);
  await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.Engine)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  await ev(`window.Wellbeing&&(window.Wellbeing.__skipRest=true);'ok'`);
  await ev(`window.App.openLevel(9)`);
  await sleep(1200);

  // 逐题作答，直到出现「找错句」题面
  for(let n=0;n<10;n++){
    const has=await ev(`document.querySelectorAll('.l9-card').length`);
    if(has>0){
      await sleep(700);
      const shot=await cdp.send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(ROOT,'tmp','lv09-wrong-sentence.png'),Buffer.from(shot.data,'base64'));
      console.log('已截取找错句题面，卡片数:',has);
      break;
    }
    await ev(`(async function(){
      var mod=window.LEVELS[9]; if(!mod) return 'no mod';
      var cards=[].slice.call(document.querySelectorAll('.l9-card'));
      if(cards.length){ return 'cards'; }
      var keys=[].slice.call(document.querySelectorAll('.l9-key'));
      var q=mod.current ? mod.current() : null;
      if(keys.length&&q){ var ans=q.a+q.b; var hit=keys.filter(function(k){return Number(k.dataset.value)===ans;})[0]; if(hit) hit.click(); return 'tap'; }
      return 'wait';
    })()`);
    await sleep(1500);
  }
  cdp.close();process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
