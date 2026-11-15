/* 一次性：清掉 L28–L48 的旧 questions 与旧注释（重做后内容已迁到 cd-data.js） */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'levels_data.js');
let src = fs.readFileSync(FILE, 'utf8');

let removedQ = 0;
let replacedC = 0;

for (let id = 28; id <= 48; id += 1) {
  const startIdx = src.indexOf('id: ' + id + ',');
  if (startIdx < 0) { console.warn('未找到 L' + id); continue; }
  const nextIdx = id < 48 ? src.indexOf('id: ' + (id + 1) + ',', startIdx) : src.length;
  const endIdx = nextIdx < 0 ? src.length : nextIdx;
  let block = src.slice(startIdx, endIdx);

  // 1) 删 questions 数组
  const qStart = block.indexOf('      questions: [');
  if (qStart >= 0) {
    const qEnd = block.indexOf('\n      ]', qStart);
    if (qEnd > 0) {
      block = block.slice(0, qStart) + block.slice(qEnd + '\n      ]'.length + 1);
      removedQ += 1;
    }
  }

  // 2) 换掉 background 之后、assets 之前的旧注释
  const bg = /(background: '[^']*',\r?\n)((?:\s*\/\/[^\n]*\r?\n)+)(\s*assets: \{)/.exec(block);
  if (bg) {
    block = block.replace(bg[0],
      bg[1] +
      '      // 乘除段重做（《乘除段 21 关按关策划案》§3）：题目与判定都在 cd-data.js / cd-kit.js，\n' +
      '      // 本条目只保留外壳需要的名字、背景与预加载清单。\n' +
      bg[3]);
    replacedC += 1;
  }

  src = src.slice(0, startIdx) + block + src.slice(endIdx);
}

fs.writeFileSync(FILE, src, 'utf8');
console.log('删除 questions：' + removedQ + ' 关；替换注释：' + replacedC + ' 关');
