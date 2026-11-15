/* ============================================================
   level-lv47.js · 乘除段第 20 关（L47）· 综合·除侧收口
   ------------------------------------------------------------
   本文件只做接线，不含任何题面与判定：
     教学四幕、八槽编排、题型原语、记录与星级全部在 cd-kit.js。
     槽数据在 cd-data.js 的 CD_DATA[47]，与《21 关按关策划案》§3 一一对应。

   前置 = L1–L27（会数到 100、20 以内加减），不需要任何乘除前置。
   本题型构成：S1=T4a S2=T4a S3=T3a S4=T3a S5=T4b S6=T7a S7=T8 S8=serial
   ============================================================ */

(function (global) {
  'use strict';

  var ID = 47;
  var spec = global.CD_DATA && global.CD_DATA[ID];
  var handle = null;

  function unmount() {
    if (handle && typeof handle.unmount === 'function') handle.unmount();
    handle = null;
  }

  global.LEVELS = global.LEVELS || {};
  global.LEVELS[ID] = {
    /** 8 槽（首玩 6 槽 / 重玩 8 槽；本关综合关，恒 8 槽） */
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
