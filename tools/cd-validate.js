#!/usr/bin/env node
/* ============================================================
   cd-validate.js · 乘除段 168 槽构建期断言
   ------------------------------------------------------------
   把 cd-kit.js 的 valid() 与 cd-data.js 的槽数据同时装进 vm，
   逐槽跑一遍 §6.1 的四条断言：
     1. valid(a,b)：组数 2–5、每组 2–5、积 ≤20（M3 / D3 例外另算）
     2. 末槽校验：6 槽看 S6、8 槽看 S8，必须是建模型或动作型
     3. 步数上限：建模 ≤5、T2 ≤12、串联 ≤8
     4. 判断型选项必须是「真数量」：每个选项都要有 groups / containers / rows

   用法：node tools/cd-validate.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const sandbox = { window: {}, console };
sandbox.window.document = undefined;
sandbox.window.location = undefined;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'cd-art.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'cd-kit.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'cd-data.js'), 'utf8'), sandbox);

const CDKit = sandbox.window.CDKit;
const DATA = sandbox.window.CD_DATA;

const result = DATA.validate({ throw: false });

/* 额外的步数断言（validate 里只卡了 valid 与末槽） */
const STEPS = [];
DATA.ids.forEach(function (id) {
  const lv = DATA[id];
  lv.slots.forEach(function (s, i) {
    const where = `L${id} S${i + 1} ${s.type}`;
    let steps = 0;
    if (s.type === 'T1a' || s.type === 'T1c') steps = s.a;
    else if (s.type === 'T3a') steps = s.total / s.b;
    else if (s.type === 'T4a') steps = s.b;
    else if (s.type === 'T4b') steps = s.b;
    else if (s.type === 'T4d') steps = 1;
    else if (s.type === 'T2') steps = s.a;
    else if (s.type === 'T5') steps = s.a + s.b;
    else if (s.type === 'serial') steps = s.a + s.b;
    else steps = 1;

    const cap = s.type === 'T2' ? 12 : (s.type === 'serial' ? 8 : (s.type === 'T5' ? 10 : 5));
    if (steps > cap) STEPS.push(`${where} 步数 ${steps} > ${cap}`);
    s.__steps = steps;
  });
});

/* 判断型选项必须带真数量字段 */
const OPTIONS = [];
DATA.ids.forEach(function (id) {
  const lv = DATA[id];
  lv.slots.forEach(function (s, i) {
    if (!s.options) return;
    s.options.forEach(function (o, k) {
      const ok = (o.groups && o.groups.length) || o.containers || (o.rows && o.per);
      if (!ok) OPTIONS.push(`L${id} S${i + 1} 选项 ${k} 没有画出数量`);
      if (o.containers != null && (!(o.containers >= 1) || o.containers > 12)) {
        OPTIONS.push(`L${id} S${i + 1} 选项 ${k} 容器数 ${o.containers} 不合理`);
      }
    });
    // D5 对子：同一对里两题答案必须不同
    if (s.type === 'T7b') {
      const vals = s.options.map(function (o) {
        return o.containers != null ? o.containers : (o.groups && o.groups[0]);
      });
      if (new Set(vals).size !== vals.length) OPTIONS.push(`L${id} S${i + 1} 选项数值重复：${vals.join('/')}`);
    }
  });
});

/* 汇总 */
let slotTotal = 0;
const perLevel = [];
DATA.ids.forEach(function (id) {
  const lv = DATA[id];
  slotTotal += lv.slots.length;
  perLevel.push(`  L${id} ${String(lv.name).padEnd(18)} ${lv.slots.length} 槽 · ` +
    lv.slots.map(function (s, i) { return 'S' + (i + 1) + '=' + s.type; }).join(' ') +
    ` · 步数合计 ${lv.slots.reduce(function (n, s) { return n + s.__steps; }, 0)}`);
});

console.log(perLevel.join('\n'));
console.log(`\n关数 ${DATA.ids.length} · 槽数 ${slotTotal}`);

const problems = result.problems.concat(STEPS, OPTIONS);
const warnings = result.warnings;

if (warnings.length) {
  console.log('\n提示：');
  warnings.forEach(function (w) { console.log('  · ' + w); });
}

if (problems.length) {
  console.error(`\n断言未通过（${problems.length} 项）：`);
  problems.forEach(function (p) { console.error('  · ' + p); });
  process.exit(1);
}

console.log('\n构建期断言全部通过：valid() / 末槽 / 步数 / 真数量选项。');
