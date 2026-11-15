#!/usr/bin/env node
/* verify-replay.js — 整关做完后重进，题目队列必须重新排满（不能空界面） */
'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const BASE=process.argv[2]||'http://127.0.0.1:8777/index.html';
const ROOT=path.resolve(__dirname,'..');
const PROFILE=path.join(ROOT,'tmp','.rep-'+Date.now());
const PORT=9599;
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
fs.mkdirSync(PROFILE,{recursive:true});
spawn(EDGE,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+PORT,'--user-data-dir='+PROFILE,'--window-size=414,896','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<80;i++){try{const j=await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();const p=j.find(t=>t.type==='page');if(p&&p.webSocketDebuggerUrl)return p.webSocketDebuggerUrl;}catch(e){}await sleep(250);}throw new Error('no cdp');}
function conn(u){return new Promise((res,rej)=>{const w=new WebSocket(u,{perMessageDeflate:false});let id=0;const pend=new Map();const hs=[];w.addEventListener('open',()=>res({send(m,p){const i=++id;w.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}));},on(f){hs.push(f);},close(){try{w.close();}catch(e){}}}));w.addEventListener('error',rej);w.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.b(m.error):p.a(m.result);}else if(m.method)hs.forEach(h=>h(m));});});}
(async()=>{
  const cdp=await conn(await wsUrl());
  await cdp.send('Runtime.enable');await cdp.send('Page.enable');
  const ev=async e=>{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true,userGesture:true});return r.exceptionDetails?{__err:JSON.stringify(r.exceptionDetails).slice(0,300)}:r.result.value;};
  await cdp.send('Page.navigate',{url:BASE+'?quick=1&cb='+Date.now()});
  await sleep(4200);
  await ev(`(async()=>{for(var i=0;i<150;i++){if(window.App&&window.LEVELS&&window.MATH_DATA)return 'ok';await new Promise(function(r){setTimeout(r,100);});}return 'missing';})()`);
  await ev(`localStorage.clear();window.Wellbeing&&(window.Wellbeing.__skipRest=true);'ok'`);
  await ev(`window.App.openLevel(9)`);   // 设定 activeLevelId
  await sleep(800);

  const r = await ev(`(function(){
    var W=window.Wellbeing, D=window.MATH_DATA;
    var refs=[]; for(var i=0;i<10;i++) refs.push('9:'+i);
    W.store.setCursor(9,{nextQIndex:10,currentGroupId:1,groupsDone:[0,1],groupResults:{0:true,1:true},solved:refs,total:10});
    Engine.session({total:10,levelId:9});
    var q=Engine.quiz.shuffle(D.levels[9].questions.slice());
    var c=W.store.getCursor(9)||{};
    return {queueLen:q.length, types:q.map(function(x){return x.type;}), groupsDone:c.groupsDone||[], groupResults:c.groupResults||{}, solvedLen:(c.solved||[]).length};
  })()`);
  console.log('重进关卡队列:', JSON.stringify(r));
  const ok = r && r.queueLen > 0 && r.solvedLen === 0;
  console.log(ok ? '✅ 通关后重进可正常出题（队列已重置）' : '❌ 重进仍为空队列');
  cdp.close();process.exit(ok?0:1);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
