#!/usr/bin/env node
/* probe-audio.js — 验证语音包切片能被解码（真没声音比慢更糟） */
'use strict';
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const TARGET='https://lipinglabs.github.io/math-adventure/';
const ROOT=path.resolve(__dirname,'..');
const PROFILE=path.join(ROOT,'tmp','.aud-'+Date.now());
const PORT=9522;
const EDGE=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(p=>{try{return fs.existsSync(p);}catch(e){return false;}});
fs.mkdirSync(PROFILE,{recursive:true});
spawn(EDGE,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port='+PORT,'--user-data-dir='+PROFILE,'--window-size=414,896','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wsUrl(){for(let i=0;i<80;i++){try{const j=await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();const p=j.find(t=>t.type==='page');if(p)return p.webSocketDebuggerUrl;}catch(e){}await sleep(250);}throw new Error('no cdp');}
function conn(u){return new Promise((res,rej)=>{const w=new WebSocket(u,{perMessageDeflate:false});let id=0;const pend=new Map();const hs=[];w.addEventListener('open',()=>res({send(m,p){const i=++id;w.send(JSON.stringify({id:i,method:m,params:p||{}}));return new Promise((a,b)=>pend.set(i,{a,b}));},on(f){hs.push(f);},close(){try{w.close();}catch(e){}}}));w.addEventListener('error',rej);w.addEventListener('message',e=>{let m;try{m=JSON.parse(e.data);}catch(x){return;}if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.b(m.error):p.a(m.result);}else if(m.method)hs.forEach(h=>h(m));});});}
(async()=>{
  const cdp=await conn(await wsUrl());
  const exc=[];
  cdp.on(m=>{if(m.method==='Runtime.exceptionThrown'){const d=m.params.exceptionDetails;exc.push(((d.exception&&d.exception.description)||d.text||'').slice(0,200));}});
  await cdp.send('Runtime.enable');await cdp.send('Page.enable');
  const ev=async e=>{const r=await cdp.send('Runtime.evaluate',{expression:e,returnByValue:true,awaitPromise:true,userGesture:true});return r.exceptionDetails?{__err:JSON.stringify(r.exceptionDetails).slice(0,300)}:r.result.value;};
  await cdp.send('Page.navigate',{url:TARGET+'?cb='+Date.now()});
  await sleep(6000);
  await ev(`window.Wellbeing&&(window.Wellbeing.__skipRest=true);'ok'`);
  console.log('VOICE_PACKS 加载:', await ev(`Object.keys(window.VOICE_PACKS||{}).length`));
  console.log('第1关包信息:', await ev(`(function(){var p=window.VOICE_PACKS&&window.VOICE_PACKS[1];return p?{file:p.file,bytes:p.bytes,entries:Object.keys(p.entries).length}:null;})()`));

  await ev(`window.App.openLevel(1)`);
  await sleep(2500);

  const r = await ev(`(async function(){
    var ac = new (window.AudioContext||window.webkitAudioContext)();
    var c = await caches.open('math-adventure-assets-v1');
    var ks = (await c.keys()).filter(function(q){return /\\.mp3/.test(q.url);});
    var out = {total: ks.length, decoded: 0, failed: [], durations: []};
    for (var i = 0; i < ks.length && i < 6; i++) {
      try {
        var resp = await c.match(ks[i]);
        var buf = await resp.arrayBuffer();
        var ab = await new Promise(function(res, rej){
          var p = ac.decodeAudioData(buf.slice(0), res, rej);
          if (p && p.then) p.then(res, rej);
          setTimeout(function(){ rej(new Error('decode timeout')); }, 4000);
        });
        out.decoded++;
        out.durations.push(ks[i].url.split('/').pop().slice(0,16) + '=' + ab.duration.toFixed(2) + 's/' + Math.round(buf.byteLength/1024) + 'KB');
      } catch (e) { out.failed.push(ks[i].url.split('/').pop() + ': ' + e.message); }
    }
    try { ac.close(); } catch(e){}
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  console.log('页面异常:', exc.length, exc.slice(0,3));
  cdp.close(); process.exit(0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(1);});
