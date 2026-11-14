#!/usr/bin/env node
/* ============================================================
   pack-voice.js · 把每关的 mp3 拼成单个 .bin
   ------------------------------------------------------------
   为什么：GitHub Pages 只提供 HTTP/1.1（同源 6 连接），
   一关 16–24 个 mp3 逐个请求，实测首次进关 10–33 秒，
   且随文件个数线性增长。拼成一个文件后，进关耗时只跟总字节数有关，
   请求数从 24 降到 1（第 1 关 625KB，正常带宽 5 秒内）。

   · 产物：voice/packs/lvNN.bin + voice/packs/index.js（含偏移索引与内容 hash）
   · 原始 mp3 一律保留：pack 下载失败时引擎会自动回退到逐条下载
   · 改过任何 mp3 之后必须重跑本脚本，否则线上仍拿旧包

   用法：node tools/pack-voice.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'levels_data.js'), 'utf8'), sandbox);
const DATA = sandbox.window.MATH_DATA;
const BASE = DATA.meta.audioBase || '';

/* 与 engine.js 的 normSrc 保持一致：C7 跨关「再玩一次」会把语音写成
   'lvNN/../lvMM/key'，打包和运行时必须映射到同一个 key，否则切片找不到。 */
function norm(src) {
  return String(src).replace(/lv\d+\/\.\.\//g, '');
}

const ids = Object.keys(DATA.levels).map(Number).sort(function (a, b) { return a - b; });
const outDir = path.join(ROOT, 'voice', 'packs');
fs.mkdirSync(outDir, { recursive: true });

const packs = {};
let totalBytes = 0;
let totalEntries = 0;

ids.forEach(function (id) {
  const lv = DATA.levels[id];
  const seen = new Set();
  const list = [];

  (lv.assets.audio || []).forEach(function (src) {
    const key = norm(src);
    if (seen.has(key)) return;
    seen.add(key);
    const abs = path.join(ROOT, BASE + key);
    if (!fs.existsSync(abs)) {
      console.error('语音文件不存在，已中止：' + BASE + key + '（第 ' + id + ' 关）');
      process.exit(1);
    }
    list.push({ key: key, abs: abs });
  });

  if (!list.length) return;

  const chunks = [];
  const entries = {};
  let off = 0;
  list.forEach(function (item) {
    const buf = fs.readFileSync(item.abs);
    chunks.push(buf);
    entries[item.key] = [off, buf.length];
    off += buf.length;
  });

  const all = Buffer.concat(chunks);
  const name = 'lv' + String(id).padStart(2, '0') + '.bin';
  fs.writeFileSync(path.join(outDir, name), all);

  totalBytes += all.length;
  totalEntries += list.length;
  packs[id] = {
    file: 'voice/packs/' + name,
    bytes: all.length,
    rev: crypto.createHash('sha256').update(all).digest('hex').slice(0, 12),
    entries: entries
  };
});

const out =
  '/* 自动生成，请勿手改。改过任何 mp3 后运行 node tools/pack-voice.js */\n' +
  'window.VOICE_PACKS = ' + JSON.stringify(packs) + ';\n';
fs.writeFileSync(path.join(outDir, 'index.js'), out);

/* 顺手算一下「打包后每个关卡要发几个请求」，方便回归时对比 */
const sample = ids.slice(0, 3).map(function (id) {
  return id + ':' + (packs[id] ? (packs[id].bytes / 1024).toFixed(0) + 'KB/' + Object.keys(packs[id].entries).length + '条' : '无');
});

console.log('packs=' + Object.keys(packs).length +
  '  音频条目=' + totalEntries +
  '  总体积=' + (totalBytes / 1048576).toFixed(2) + 'MB' +
  '  索引=' + Buffer.byteLength(out) + 'B');
console.log('样例：' + sample.join('  '));
