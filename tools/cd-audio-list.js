/* ============================================================
   tools/cd-audio-list.js · 把 L28–L48 的 assets.audio 换成新的语音清单
   ------------------------------------------------------------
   为什么要换：重做后每关的语音 key 全变了（s0a…s8 / out），
   levels_data 里还是旧关卡的 t1_a / a1_q 那一套。
   进关预加载读的就是这份清单，不换会导致「清单里的文件没用、真正要用的没预加载」。

   清单 = 本关 lines 的全部 key + 本关 T2/T5 会念到的 common/num_NN。
   用法：node tools/cd-audio-list.js [--dry]
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const dry = process.argv.includes('--dry');

// 1) CD_DATA
const cdSandbox = { window: {} };
cdSandbox.window = cdSandbox;
vm.createContext(cdSandbox);
['cd-art.js', 'cd-kit.js', 'cd-type-give.js', 'cd-type-build.js', 'cd-type-judge.js', 'cd-data.js']
  .forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), cdSandbox, { filename: f });
  });
const DATA = cdSandbox.CD_DATA;

// 2) 每关的语音 key
function audioListFor(id) {
  const spec = DATA[id];
  const file = path.join(ROOT, 'voice', 'lines', 'lv' + id + '.json');
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = [
    'common/ready.mp3',
    'common/try_again.mp3',
    'common/gold.mp3',
    'common/silver.mp3'
  ];

  (j.lines || []).forEach(function (l) {
    list.push('lv' + id + '/' + l.key + '.mp3');
  });

  // T2 / T5 会念到的累计数
  const nums = new Set();
  (spec.slots || []).forEach(function (s) {
    if (s.type === 'T2') {
      for (let i = 1; i <= s.a; i += 1) nums.add(i * s.b);
    } else if (s.type === 'T5') {
      for (let i = 1; i <= s.a; i += 1) nums.add(i * s.b);   // 横着数：每行加 b
      for (let i = 1; i <= s.b; i += 1) nums.add(i * s.a);   // 竖着数：每列加 a
    }
  });
  Array.from(nums).sort(function (a, b) { return a - b; }).forEach(function (n) {
    const f = path.join(ROOT, 'voice', 'common', 'num_' + (n < 10 ? '0' + n : n) + '.mp3');
    if (fs.existsSync(f)) list.push('common/num_' + (n < 10 ? '0' + n : n) + '.mp3');
    else console.warn('  缺少数字片段：num_' + n);
  });

  return Array.from(new Set(list));
}

// 3) 写回 levels_data.js（只替换对应 level 块里的 audio 数组）
const FILE = path.join(ROOT, 'levels_data.js');
let src = fs.readFileSync(FILE, 'utf8');
let changed = 0;

for (let id = 28; id <= 48; id += 1) {
  const list = audioListFor(id);
  const startRe = new RegExp('(id: ' + id + ',[\\s\\S]*?assets: \\{\\s*\\r?\\n\\s*audio: )\\[[\\s\\S]*?\\]');
  const m = startRe.exec(src);
  if (!m) { console.warn('未命中 L' + id); continue; }

  const indent = '          ';
  const body = '[\n' + list.map(function (p) { return indent + "'" + p + "'"; }).join(',\n') + '\n        ]';
  src = src.slice(0, m.index) + m[1] + body + src.slice(m.index + m[0].length);
  changed += 1;
}

if (!dry) fs.writeFileSync(FILE, src, 'utf8');
console.log((dry ? '[dry] ' : '') + '已更新 ' + changed + ' 关的 assets.audio');
