#!/usr/bin/env node
/* ============================================================
   gen-asset-manifest.js · 生成 asset-manifest.js
   ------------------------------------------------------------
   为每个素材算内容 hash，engine.js 据此给 URL 加 ?v=<hash>：
     · 内容变了 URL 就变，Cache Storage 自动失效，不需要整库清空
     · 内容没变 URL 不变，老设备继续命中本地缓存，不产生任何下载
   同时校验所有引用都指向真实存在的文件（防止「读条就绪却没声音」）。

   改过任何 mp3 / webp 之后必须重跑本脚本再推送，否则线上仍会拿旧副本。
   用法：node tools/gen-asset-manifest.js
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

const rels = new Set();
Object.keys(DATA.levels).forEach(function (k) {
  const lv = DATA.levels[k];
  (lv.assets.audio || []).forEach(function (p) { rels.add((DATA.meta.audioBase || '') + p); });
  (lv.assets.images || []).forEach(function (p) { rels.add(p); });
  if (lv.background) rels.add(lv.background);
});
// 地图阶段背景不写在 levels_data.js 里，由 app.js 按 stage 拼路径
for (let i = 1; i <= 5; i += 1) rels.add('assets/bg/stage_' + i + '.webp');

const files = {};
const missing = [];
Array.from(rels).sort().forEach(function (rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) { missing.push(rel); return; }
  files[rel] = crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex').slice(0, 12);
});

if (missing.length) {
  console.error('素材引用指向不存在的文件，已中止：\n  ' + missing.join('\n  '));
  process.exit(1);
}

const rev = crypto.createHash('sha256')
  .update(Object.keys(files).sort().map(function (k) { return k + ':' + files[k]; }).join('|'))
  .digest('hex').slice(0, 8);

/* codeRev 覆盖全部源码（不含 asset-manifest.js 自身，避免循环）。
   app.js 动态加载 level-lvNN.js 时用它做 cache bust：
   改过任何一关/引擎代码都会自动换 URL，不需要手工维护版本号。 */
const codeFiles = [
  'index.html', 'style.css', 'sw.js', 'levels_data.js', 'engine.js',
  'progress.js', 'cloud.js', 'sandbox.js', 'level-kit.js', 'app.js'
];
for (let i = 1; i <= 48; i += 1) {
  codeFiles.push('level-lv' + String(i).padStart(2, '0') + '.js');
}
const codeRev = crypto.createHash('sha256')
  .update(codeFiles.map(function (f) {
    return f + ':' + crypto.createHash('sha256')
      .update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
  }).join('|'))
  .digest('hex').slice(0, 10);

const lines = Object.keys(files).sort().map(function (k) {
  return '    ' + JSON.stringify(k) + ': ' + JSON.stringify(files[k]);
});
const out =
  '/* 自动生成，请勿手改。改动任何 mp3 / webp 后运行 node tools/gen-asset-manifest.js */\n' +
  'window.ASSET_MANIFEST = {\n' +
  '  rev: ' + JSON.stringify(rev) + ',\n' +
  '  codeRev: ' + JSON.stringify(codeRev) + ',\n' +
  '  files: {\n' + lines.join(',\n') + '\n  }\n' +
  '};\n';

fs.writeFileSync(path.join(ROOT, 'asset-manifest.js'), out);
console.log('rev=' + rev + '  codeRev=' + codeRev +
  '  files=' + Object.keys(files).length +
  '  bytes=' + Buffer.byteLength(out) + '  missing=0');
