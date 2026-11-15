#!/usr/bin/env node
/* ============================================================
   gen-cd-levels.js · 生成 L28–L48 的关卡外壳文件
   ------------------------------------------------------------
   乘除段重做后，21 个关卡文件只做一件事：
   把 CDKit 与 CD_DATA[id] 接起来，不再各自实现一套教学与题目。
   真正的题型实现全在 cd-kit.js / cd-type-*.js 里 ——
   21 关共用同一套原语，才不会出现「第 3 关对了第 17 关歪了」。

   用法：node tools/gen-cd-levels.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const sandbox = { window: {} };
vm.createContext(sandbox);
// 只读数据，不跑断言（断言由 cd-validate.js 负责）
vm.runInContext(fs.readFileSync(path.join(ROOT, 'cd-data.js'), 'utf8'), sandbox);
const DATA = sandbox.window.CD_DATA;

const ORDINAL = {
  28: 'M1 一样多的小堆', 29: 'M1 哪一堆是分好的',
  30: 'M2 几个几', 31: 'M2 看小堆说出指令',
  32: 'M3 一组一组数', 33: 'M3 跳数',
  34: 'M4 阵列', 35: 'M4 方阵里一共有几个',
  36: 'M5 两种看法',
  37: 'D1 轮流发', 38: 'D1 发到分完为止',
  39: 'D2 每人几个', 40: 'D2 换个东西再分一次',
  41: 'D3 分不完怎么办',
  42: 'D4 装几盒', 43: 'D4 换一种装法',
  44: 'D5 两种问法', 45: 'D5 混着来',
  46: '综合·乘侧收口', 47: '综合·除侧收口', 48: '综合·辨别与互逆'
};

let written = 0;
for (let id = 28; id <= 48; id += 1) {
  const spec = DATA[id];
  if (!spec) { console.error(`缺少 CD_DATA[${id}]`); process.exit(1); }
  const no = id - 27;
  const slots = spec.only8 ? 8 : 8;
  const src = `/* ============================================================
   level-lv${id}.js · 乘除段第 ${no} 关（L${id}）· ${ORDINAL[id]}
   ------------------------------------------------------------
   本文件只做接线，不含任何题面与判定：
     教学四幕、八槽编排、题型原语、记录与星级全部在 cd-kit.js。
     槽数据在 cd-data.js 的 CD_DATA[${id}]，与《21 关按关策划案》§3 一一对应。

   前置 = L1–L27（会数到 100、20 以内加减），不需要任何乘除前置。
   本题型构成：${spec.slots.map((s, i) => 'S' + (i + 1) + '=' + s.type).join(' ')}
   ============================================================ */

(function (global) {
  'use strict';

  var ID = ${id};
  var spec = global.CD_DATA && global.CD_DATA[ID];
  var handle = null;

  function unmount() {
    if (handle && typeof handle.unmount === 'function') handle.unmount();
    handle = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[ID] = {
    /** ${slots} 槽（首玩 6 槽 / 重玩 8 槽${spec.only8 ? '；本关综合关，恒 8 槽' : ''}） */
    mount: function (stage, ctx) {
      unmount();
      if (!global.CDKit || !spec) {
        stage.innerHTML = '<div class="wip"><h2>Level ' + ID + '</h2>' +
          '<p>Level content is not ready.</p></div>';
        return { unmount: function () {} };
      }
      handle = global.CDKit.mount(stage, ctx, spec);
      return { unmount: unmount };
    },
    unmount: unmount,
    /** 验收脚本用：返回本关的槽数据（不改变任何状态） */
    current: function () { return spec; }
  };
})(window);
`;
  fs.writeFileSync(path.join(ROOT, `level-lv${id}.js`), src, 'utf8');
  written += 1;
}

console.log(`已生成 ${written} 个关卡外壳文件（L28–L48）`);
