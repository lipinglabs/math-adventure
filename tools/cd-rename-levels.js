/* 一次性脚本：把 L28–L48 的关卡名换成新内容的名字（只改 name 一行） */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'levels_data.js');
const NAMES = {
  28: 'Two Plates',
  29: 'Which Tray',
  30: 'Groups of Four',
  31: 'Read the Groups',
  32: 'Count by Groups',
  33: 'Counting Bundles',
  34: 'The Big Tray',
  35: 'Count the Tray',
  36: 'Turn the Tray',
  37: 'One for Each',
  38: 'All Shared',
  39: 'How Many Each',
  40: 'Bags Today',
  41: 'One Is Left',
  42: 'Fill the Boxes',
  43: 'Bigger Boxes',
  44: 'Plates or Boxes',
  45: 'Mixed Up',
  46: 'Three Ways to Twelve',
  47: 'Back and Forth',
  48: 'Two Ways to Ask'
};

let src = fs.readFileSync(FILE, 'utf8');
let changed = 0;

Object.keys(NAMES).forEach((id) => {
  const re = new RegExp('(id: ' + id + ',\\s*\\r?\\n\\s*name: )\'[^\']*\'');
  const before = src;
  src = src.replace(re, (m, p1) => p1 + "'" + NAMES[id] + "'");
  if (src !== before) changed += 1;
  else console.log('未命中：' + id);
});

fs.writeFileSync(FILE, src, 'utf8');
console.log('改名完成：' + changed + ' / ' + Object.keys(NAMES).length);
