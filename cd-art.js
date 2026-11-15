/* ============================================================
   cd-art.js · 乘除段（L28–L48）道具库
   ------------------------------------------------------------
   全部内联 SVG，不走网络：
     · 一关零图片请求 → 不会出现「图片丢失 / 下载不利索」
     · 任意 DPI 都清晰，4 岁屏（375×667）到平板都一样
     · 「数量」永远是真画出来的数量（D5 诊断的全部基础）

   规格来自《乘除段 21 关按关策划案》§5.1：
     实物 3 种  bun / jar / block
     捆绑件 1   bundle(n)
     容器 7 型  plate / box_s / box_m / box_l / bag / basket / tray
     场景件 4   gridtray / cart / cloth / saucer
     角色 3     bo / chirp / momo
     UI         4 种主按钮 + 光点 + 计数轨
   三型盒的尺寸与形状必须同时不同（尺寸差 ≥1.35 倍），
   否则 D5 的「三个候选只许靠数量区分」会退化。
   ============================================================ */

(function (global) {
  'use strict';

  var PAL = {
    bun: '#E9B978',
    bunTop: '#F7D9A8',
    bunDark: '#CFA165',
    bunCut: '#C98A46',

    jar: '#E8A0A6',
    jarDark: '#C87F87',
    jarLid: '#8C6A5A',
    jarLidHi: '#A98470',

    block: '#9CCBE8',
    blockDark: '#77AFD1',
    blockTop: '#BFE0F3',

    wax: '#F2E3C6',
    wick: '#8A6B4F',
    band: '#C97B72',

    plate: '#EDF3F8',
    plateRim: '#C9D8E4',
    plateShade: '#D6E2EC',

    boxS: '#E3CB98',
    boxSIn: '#B79A67',
    boxM: '#D2B27A',
    boxMIn: '#A98B5C',
    boxL: '#BC9A60',
    boxLIn: '#93743F',

    bag: '#E6D3AE',
    bagDark: '#C9B187',
    basket: '#C9A06B',
    basketDark: '#A9834F',

    wood: '#C89B6A',
    woodDark: '#A67C51',
    woodLight: '#DEB98C',

    cloth: '#DC9A9A',
    clothAlt: '#F6E7E4',
    saucer: '#E3EAF0',
    saucerRim: '#C4D2DE',

    bo: '#B98157',
    boLight: '#D3A077',
    boMuzzle: '#F0D9BD',
    chirp: '#8FC9E8',
    chirpDark: '#6BA9CC',
    chirpBelly: '#EAF6FB',
    momo: '#E8DCE6',
    momoDark: '#C9B7C6',
    ink: '#4A3B33'
  };

  function svg(inner, vb) {
    return '<svg viewBox="' + (vb || '0 0 100 100') + '" preserveAspectRatio="xMidYMid meet" ' +
      'aria-hidden="true" focusable="false">' + inner + '</svg>';
  }

  /* ---------------- 实物 ---------------- */

  function bun() {
    return svg(
      '<ellipse cx="50" cy="86" rx="30" ry="6" fill="rgba(90,60,40,.14)"/>' +
      '<circle cx="50" cy="52" r="34" fill="' + PAL.bun + '"/>' +
      '<path d="M17.5 47a34 34 0 0 1 65 0c-8-9-20-14-32.5-14S25.5 38 17.5 47z" fill="' + PAL.bunTop + '"/>' +
      '<path d="M50 22c-9 0-17 3-23 8" fill="none" stroke="rgba(255,255,255,.55)" ' +
      'stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M38 41c3.6 4.4 8 6.6 12 6.6s8.4-2.2 12-6.6" fill="none" stroke="' + PAL.bunCut + '" ' +
      'stroke-width="3.4" stroke-linecap="round" opacity=".65"/>' +
      '<path d="M25 66a26 20 0 0 0 50 0" fill="none" stroke="' + PAL.bunDark + '" ' +
      'stroke-width="3" stroke-linecap="round" opacity=".45"/>'
    );
  }

  /** 果酱罐：无接缝、不可掰（D3 的整个前提） */
  function jar() {
    return svg(
      '<ellipse cx="50" cy="90" rx="26" ry="5" fill="rgba(90,60,40,.14)"/>' +
      '<rect x="23" y="26" width="54" height="64" rx="12" fill="' + PAL.jar + '"/>' +
      '<rect x="23" y="26" width="54" height="64" rx="12" fill="none" stroke="' + PAL.jarDark + '" stroke-width="1.4" opacity=".5"/>' +
      '<rect x="20" y="12" width="60" height="19" rx="8" fill="' + PAL.jarLid + '"/>' +
      '<rect x="24" y="15" width="26" height="6" rx="3" fill="' + PAL.jarLidHi + '" opacity=".75"/>' +
      '<rect x="34" y="46" width="32" height="26" rx="7" fill="#FFF9F0" opacity=".93"/>' +
      '<circle cx="50" cy="59" r="7" fill="' + PAL.jar + '" opacity=".75"/>' +
      '<rect x="30" y="32" width="6" height="46" rx="3" fill="#fff" opacity=".38"/>'
    );
  }

  function block() {
    return svg(
      '<ellipse cx="50" cy="87" rx="28" ry="5" fill="rgba(60,80,100,.16)"/>' +
      '<rect x="18" y="34" width="64" height="50" rx="10" fill="' + PAL.block + '"/>' +
      '<rect x="18" y="34" width="64" height="14" rx="7" fill="' + PAL.blockTop + '"/>' +
      '<circle cx="35" cy="30" r="7.5" fill="' + PAL.blockTop + '" stroke="' + PAL.blockDark + '" stroke-width="1.6"/>' +
      '<circle cx="65" cy="30" r="7.5" fill="' + PAL.blockTop + '" stroke="' + PAL.blockDark + '" stroke-width="1.6"/>' +
      '<rect x="18" y="34" width="64" height="50" rx="10" fill="none" stroke="' + PAL.blockDark + '" stroke-width="1.6" opacity=".55"/>' +
      '<rect x="26" y="54" width="20" height="7" rx="3.5" fill="#fff" opacity=".45"/>'
    );
  }

  /** 单支蜡烛：L33 建模型槽用（「一份」= 几支，捆与支共用同一颜色家族） */
  function candle() {
    return svg(
      '<ellipse cx="50" cy="88" rx="14" ry="4" fill="rgba(90,60,40,.14)"/>' +
      '<rect x="38" y="34" width="24" height="52" rx="6" fill="#F2E3C6"/>' +
      '<rect x="38" y="34" width="24" height="52" rx="6" fill="none" stroke="#D8C49F" stroke-width="1.4"/>' +
      '<rect x="42" y="40" width="6" height="38" rx="3" fill="#fff" opacity=".55"/>' +
      '<path d="M50 34v-6" stroke="' + PAL.wick + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M50 12c5 5 7 8 7 11a7 7 0 0 1-14 0c0-3 2-6 7-11z" fill="#F7B84B"/>' +
      '<path d="M50 18c2.4 2.6 3.4 4 3.4 5.6a3.4 3.4 0 0 1-6.8 0c0-1.6 1-3 3.4-5.6z" fill="#FFF0B8"/>'
    );
  }

  /** n 支蜡烛一捆，纸带扎着。样式固定，换样式孩子就记画面不记数量。 */  function bundle(n) {
    var count = n === 10 ? 10 : 5;
    var w = count === 10 ? 7.2 : 13.2;
    var gap = count === 10 ? 1.1 : 2.4;
    var totalW = count * w + (count - 1) * gap;
    var x0 = 50 - totalW / 2;
    var body = '';
    for (var i = 0; i < count; i += 1) {
      var x = x0 + i * (w + gap);
      body += '<rect x="' + x.toFixed(1) + '" y="22" width="' + w + '" height="58" rx="' + (w / 2.4) + '" fill="' + PAL.wax + '"/>' +
        '<rect x="' + x.toFixed(1) + '" y="22" width="' + w + '" height="58" rx="' + (w / 2.4) + '" fill="none" stroke="#D8C49F" stroke-width="1"/>' +
        '<path d="M' + (x + w / 2).toFixed(1) + ' 22v-7" stroke="' + PAL.wick + '" stroke-width="2" stroke-linecap="round"/>';
    }
    return svg(
      '<ellipse cx="50" cy="84" rx="' + (totalW / 2 + 3) + '" ry="5" fill="rgba(90,60,40,.14)"/>' +
      body +
      '<rect x="' + (x0 - 2).toFixed(1) + '" y="48" width="' + (totalW + 4).toFixed(1) + '" height="13" rx="4" fill="' + PAL.band + '"/>' +
      '<rect x="' + (x0 - 2).toFixed(1) + '" y="51" width="' + (totalW + 4).toFixed(1) + '" height="4" rx="2" fill="#fff" opacity=".28"/>'
    );
  }

  /* ---------------- 容器 ---------------- */

  function plate() {
    // 盘心必须落在 viewBox 正中（cy≈50）：token 是按「盒中心」落位的，
    // 盘心偏下会让每一颗面包都卡在盘沿上。
    return svg(
      '<ellipse cx="50" cy="76" rx="42" ry="8" fill="rgba(70,90,110,.13)"/>' +
      '<ellipse cx="50" cy="51" rx="44" ry="26" fill="' + PAL.plateShade + '"/>' +
      '<ellipse cx="50" cy="49" rx="43" ry="25" fill="' + PAL.plateRim + '"/>' +
      '<ellipse cx="50" cy="50" rx="35" ry="19" fill="' + PAL.plate + '"/>' +
      '<ellipse cx="50" cy="51" rx="25" ry="13" fill="#fff" opacity=".55"/>'
    );
  }

  var BOX = {
    // 三种盒子的画法要「填满 viewBox」：原来 s 只占下半截，
    // 放进 96×72 的盒位里会被拉成一条扁木条，看不出是盒子。
    s: { body: '<rect x="13" y="30" width="74" height="58" rx="9" fill="' + PAL.boxS + '"/>' +
        '<rect x="13" y="30" width="74" height="12" rx="6" fill="' + PAL.boxSIn + '"/>' +
        '<rect x="13" y="30" width="74" height="58" rx="9" fill="none" stroke="#C2A874" stroke-width="1.6"/>' +
        '<rect x="21" y="52" width="26" height="8" rx="4" fill="#fff" opacity=".38"/>' +
        '<path d="M13 47h74" stroke="#B79A67" stroke-width="1.6" opacity=".45"/>' },
    m: { body: '<rect x="15" y="22" width="70" height="66" rx="10" fill="' + PAL.boxM + '"/>' +
        '<rect x="15" y="22" width="70" height="13" rx="6.5" fill="' + PAL.boxMIn + '"/>' +
        '<path d="M15 43h70" stroke="#B08F58" stroke-width="2" opacity=".55"/>' +
        '<rect x="15" y="22" width="70" height="66" rx="10" fill="none" stroke="#B08F58" stroke-width="1.6"/>' +
        '<rect x="23" y="54" width="24" height="8" rx="4" fill="#fff" opacity=".35"/>' },
    l: { body: '<rect x="19" y="16" width="62" height="72" rx="11" fill="' + PAL.boxL + '"/>' +
        '<rect x="19" y="16" width="62" height="13" rx="6.5" fill="' + PAL.boxLIn + '"/>' +
        '<path d="M33 16V9a17 17 0 0 1 34 0v7" fill="none" stroke="' + PAL.boxLIn + '" stroke-width="4.5" stroke-linecap="round"/>' +
        '<rect x="19" y="16" width="62" height="72" rx="11" fill="none" stroke="#8E7040" stroke-width="1.6"/>' +
        '<rect x="27" y="48" width="22" height="8" rx="4" fill="#fff" opacity=".3"/>' }
  };

  function box(kind) {
    var k = BOX[kind] ? kind : 'm';
    return svg(
      '<ellipse cx="50" cy="88" rx="30" ry="5" fill="rgba(90,60,40,.15)"/>' + BOX[k].body
    );
  }

  function bag() {
    return svg(
      '<ellipse cx="50" cy="88" rx="27" ry="5" fill="rgba(90,60,40,.14)"/>' +
      '<path d="M22 30h56l-5 52a6 6 0 0 1-6 5H33a6 6 0 0 1-6-5z" fill="' + PAL.bag + '"/>' +
      '<path d="M22 30h56l-2 12H24z" fill="' + PAL.bagDark + '"/>' +
      '<path d="M30 24l6 10M50 22l0 12M70 24l-6 10" stroke="' + PAL.bagDark + '" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="34" y="52" width="20" height="6" rx="3" fill="#fff" opacity=".42"/>'
    );
  }

  function basket() {
    return svg(
      '<ellipse cx="50" cy="90" rx="38" ry="6" fill="rgba(90,60,40,.15)"/>' +
      '<path d="M10 34h80l-9 50a8 8 0 0 1-8 6H27a8 8 0 0 1-8-6z" fill="' + PAL.basket + '"/>' +
      '<path d="M10 34h80l-2 10H12z" fill="' + PAL.basketDark + '"/>' +
      '<path d="M18 54h64M20 68h60M23 80h54" stroke="' + PAL.basketDark + '" stroke-width="2.4" opacity=".55"/>' +
      '<path d="M26 34c0-12 10-20 24-20s24 8 24 20" fill="none" stroke="' + PAL.basketDark + '" stroke-width="4" opacity=".7"/>'
    );
  }

  function tray() {
    return svg(
      '<ellipse cx="50" cy="78" rx="44" ry="7" fill="rgba(70,90,110,.13)"/>' +
      '<rect x="6" y="40" width="88" height="34" rx="14" fill="' + PAL.plateRim + '"/>' +
      '<rect x="12" y="44" width="76" height="24" rx="10" fill="' + PAL.plate + '"/>' +
      '<rect x="2" y="46" width="10" height="14" rx="5" fill="' + PAL.plateRim + '"/>' +
      '<rect x="88" y="46" width="10" height="14" rx="5" fill="' + PAL.plateRim + '"/>'
    );
  }

  /** 烤盘：cols×rows 格线可见（T1c 的落位容器） */
  function gridtray(cols, rows) {
    var c = Math.max(2, Math.min(5, cols || 3));
    var r = Math.max(2, Math.min(5, rows || 3));
    var x0 = 14, x1 = 86, y0 = 18, y1 = 84;
    var cw = (x1 - x0) / c, ch = (y1 - y0) / r;
    var lines = '';
    for (var i = 1; i < c; i += 1) {
      lines += '<path d="M' + (x0 + i * cw).toFixed(1) + ' ' + y0 + 'v' + (y1 - y0) + '" stroke="#C0A470" stroke-width="1.6" opacity=".8"/>';
    }
    for (var j = 1; j < r; j += 1) {
      lines += '<path d="M' + x0 + ' ' + (y0 + j * ch).toFixed(1) + 'h' + (x1 - x0) + '" stroke="#C0A470" stroke-width="1.6" opacity=".8"/>';
    }
    return svg(
      '<rect x="8" y="12" width="84" height="78" rx="12" fill="#D9BC8C"/>' +
      '<rect x="12" y="16" width="76" height="70" rx="9" fill="#F3E6CC"/>' +
      lines +
      '<rect x="8" y="12" width="84" height="78" rx="12" fill="none" stroke="#BD9C68" stroke-width="2"/>'
    );
  }

  function cart() {
    return svg(
      '<ellipse cx="48" cy="88" rx="40" ry="6" fill="rgba(90,60,40,.15)"/>' +
      '<path d="M8 30h72l-6 34a7 7 0 0 1-7 6H21a7 7 0 0 1-7-6z" fill="' + PAL.wood + '"/>' +
      '<path d="M8 30h72l-1.6 9H9.6z" fill="' + PAL.woodLight + '"/>' +
      '<path d="M20 46h48M22 58h44" stroke="' + PAL.woodDark + '" stroke-width="2.2" opacity=".45"/>' +
      '<circle cx="28" cy="78" r="10" fill="' + PAL.woodDark + '"/><circle cx="28" cy="78" r="4" fill="#F3E6CC"/>' +
      '<circle cx="66" cy="78" r="10" fill="' + PAL.woodDark + '"/><circle cx="66" cy="78" r="4" fill="#F3E6CC"/>' +
      '<path d="M80 32h12a4 4 0 0 1 0 8h-12" fill="none" stroke="' + PAL.woodDark + '" stroke-width="4" stroke-linecap="round"/>'
    );
  }

  function cloth() {
    return svg(
      '<path d="M6 30h88v42c-7 4-14-3-22 1s-15 3-22-1-15 3-22 1-15 3-22-1z" fill="' + PAL.cloth + '"/>' +
      '<path d="M6 30h88v10H6z" fill="#C98484"/>' +
      '<path d="M24 30v42M50 30v43M76 30v42M6 48h88M6 62h88" stroke="' + PAL.clothAlt + '" ' +
      'stroke-width="2.2" opacity=".75"/>'
    );
  }

  function saucer() {
    return svg(
      '<ellipse cx="50" cy="70" rx="36" ry="8" fill="rgba(70,90,110,.14)"/>' +
      '<ellipse cx="50" cy="56" rx="38" ry="18" fill="' + PAL.saucerRim + '"/>' +
      '<ellipse cx="50" cy="54" rx="30" ry="13" fill="' + PAL.saucer + '"/>' +
      '<ellipse cx="50" cy="55" rx="19" ry="8" fill="#fff" opacity=".6"/>'
    );
  }

  /* ---------------- 角色 ---------------- */

  function bo() {
    return svg(
      '<circle cx="24" cy="26" r="13" fill="' + PAL.bo + '"/><circle cx="24" cy="26" r="7" fill="' + PAL.boMuzzle + '"/>' +
      '<circle cx="76" cy="26" r="13" fill="' + PAL.bo + '"/><circle cx="76" cy="26" r="7" fill="' + PAL.boMuzzle + '"/>' +
      '<circle cx="50" cy="54" r="34" fill="' + PAL.bo + '"/>' +
      '<ellipse cx="50" cy="64" rx="20" ry="16" fill="' + PAL.boMuzzle + '"/>' +
      '<circle cx="38" cy="47" r="4.6" fill="' + PAL.ink + '"/><circle cx="62" cy="47" r="4.6" fill="' + PAL.ink + '"/>' +
      '<circle cx="39.6" cy="45.4" r="1.5" fill="#fff"/><circle cx="63.6" cy="45.4" r="1.5" fill="#fff"/>' +
      '<ellipse cx="50" cy="59" rx="5.4" ry="4" fill="' + PAL.ink + '" opacity=".85"/>' +
      '<path d="M50 63v4M50 67c-1.6 3-6 3.4-8 1M50 67c1.6 3 6 3.4 8 1" fill="none" stroke="' + PAL.ink + '" ' +
      'stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M22 84c6-6 16-8 28-8s22 2 28 8" fill="' + PAL.boLight + '" opacity=".9"/>'
    );
  }

  function chirp() {
    return svg(
      '<ellipse cx="52" cy="88" rx="22" ry="4.5" fill="rgba(70,90,110,.14)"/>' +
      '<circle cx="50" cy="52" r="30" fill="' + PAL.chirp + '"/>' +
      '<ellipse cx="50" cy="62" rx="18" ry="15" fill="' + PAL.chirpBelly + '"/>' +
      '<path d="M76 44l16 7-16 8z" fill="#F0A64F"/>' +
      '<circle cx="62" cy="42" r="4.4" fill="' + PAL.ink + '"/><circle cx="63.4" cy="40.6" r="1.5" fill="#fff"/>' +
      '<path d="M30 46c-8 4-12 12-10 20 8 1 15-4 18-11z" fill="' + PAL.chirpDark + '"/>' +
      '<path d="M46 22c2-6 8-8 12-4" fill="none" stroke="' + PAL.chirpDark + '" stroke-width="3" stroke-linecap="round"/>'
    );
  }

  function momo() {
    return svg(
      '<ellipse cx="32" cy="20" rx="7" ry="16" fill="' + PAL.momo + '" transform="rotate(-12 32 36)"/>' +
      '<ellipse cx="68" cy="20" rx="7" ry="16" fill="' + PAL.momo + '" transform="rotate(12 68 36)"/>' +
      '<ellipse cx="32" cy="22" rx="3.4" ry="10" fill="#F7C9CF" transform="rotate(-12 32 36)"/>' +
      '<ellipse cx="68" cy="22" rx="3.4" ry="10" fill="#F7C9CF" transform="rotate(12 68 36)"/>' +
      '<circle cx="50" cy="58" r="30" fill="' + PAL.momo + '"/>' +
      '<circle cx="39" cy="54" r="4.4" fill="' + PAL.ink + '"/><circle cx="61" cy="54" r="4.4" fill="' + PAL.ink + '"/>' +
      '<circle cx="40.4" cy="52.6" r="1.5" fill="#fff"/><circle cx="62.4" cy="52.6" r="1.5" fill="#fff"/>' +
      '<path d="M46 64c1.6 2.6 6.4 2.6 8 0" fill="none" stroke="' + PAL.ink + '" stroke-width="2.4" stroke-linecap="round"/>' +
      '<circle cx="30" cy="64" r="5" fill="#F7C9CF" opacity=".7"/><circle cx="70" cy="64" r="5" fill="#F7C9CF" opacity=".7"/>'
    );
  }

  /* ---------------- 主按钮图标（112×112 底座由 CSS 给） ---------------- */

  var BTN = {
    round:
      '<path d="M28 58a24 24 0 0 1 40-18" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M66 26l4 16-16-3" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="30" cy="66" r="7" fill="currentColor"/><circle cx="50" cy="72" r="7" fill="currentColor"/>' +
      '<circle cx="70" cy="66" r="7" fill="currentColor"/>',
    grow:
      '<rect x="24" y="36" width="24" height="24" rx="6" fill="currentColor" opacity=".55"/>' +
      '<rect x="40" y="52" width="24" height="24" rx="6" fill="currentColor" opacity=".55"/>' +
      '<path d="M72 30v22M61 41h22" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>',
    next:
      '<rect x="22" y="34" width="18" height="18" rx="5" fill="currentColor" opacity=".5"/>' +
      '<rect x="22" y="56" width="18" height="18" rx="5" fill="currentColor" opacity=".32"/>' +
      '<path d="M52 40l20 12-20 12z" fill="currentColor"/>',
    leaveout:
      '<path d="M26 62h30" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M62 50l14 12-14 12" fill="none" stroke="currentColor" stroke-width="7" ' +
      'stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="24" y="34" width="16" height="16" rx="4" fill="currentColor" opacity=".45"/>'
  };

  function button(kind) {
    return svg(BTN[kind] || BTN.round);
  }

  function ear() {
    return svg(
      '<path d="M62 20c-16 0-28 12-28 26 0 6 2 11 6 15-4 4-7 9-7 15 0 6 4 10 10 10s10-4 12-9c3 1 5 2 7 2 14 0 26-12 26-27S78 20 62 20z" ' +
      'fill="#F6D9C8"/><path d="M60 34c-8 0-14 6-14 13 0 8 6 13 14 13s14-5 14-13c0-7-6-13-14-13z" ' +
      'fill="none" stroke="#C99A82" stroke-width="3.4"/>'
    );
  }

  function dot() {
    return '<span class="cd-dot"></span>';
  }

  /* ---------------- 组装 ---------------- */

  var IMG = {
    bun: bun, jar: jar, block: block, candle: candle,
    plate: plate, bag: bag, basket: basket, tray: tray, cart: cart, cloth: cloth, saucer: saucer,
    bo: bo, chirp: chirp, momo: momo
  };

  /**
   * 取一个道具节点。
   * @param name  上述名字，或 box_s / box_m / box_l / bundle5 / bundle10 / gridtray
   * @param opts  { size:px, cls:'', style:'' }
   */
  /**
   * 容器「能装东西的那块区域」在 viewBox 里的坐标 [x0, y0, x1, y1]。
   * 物体一律按这块区域落位，而不是按容器元素的外框：画出来的盒身/盘面
   * 总比外框小一圈（阴影、盘沿、盒盖都要占位），按外框居中会让面包停在
   * 盒盖上、卡在盘沿上。数值和各容器的绘制坐标一一对应。
   */
  var INNER = {
    plate: [14, 32, 86, 70],
    box_s: [16, 44, 84, 84],
    box_m: [18, 34, 82, 84],
    box_l: [22, 32, 78, 84],
    bag: [26, 44, 74, 82],
    basket: [14, 46, 86, 84],
    tray: [14, 44, 86, 68],
    gridtray: [8, 8, 92, 92],
    bundle5: [10, 10, 90, 90],
    bundle10: [10, 10, 90, 90]
  };

  function inner(kind) {
    return INNER[kind] || [12, 12, 88, 88];
  }

  function node(name, opts) {    opts = opts || {};
    var host = document.createElement('span');
    host.className = 'cd-obj cd-obj--' + name + (opts.cls ? ' ' + opts.cls : '');
    var html;
    if (name === 'box_s' || name === 'box_m' || name === 'box_l') html = box(name.slice(4));
    else if (name === 'bundle5') html = bundle(5);
    else if (name === 'bundle10') html = bundle(10);
    else if (name === 'gridtray') html = gridtray(opts.cols, opts.rows);
    else if (name === 'ear') html = ear();
    else if (IMG[name]) html = IMG[name]();
    else html = bun();
    host.innerHTML = html;
    if (opts.size) host.style.setProperty('--cds', opts.size + 'px');
    if (opts.style) host.setAttribute('style', host.getAttribute('style') + ';' + opts.style);
    return host;
  }

  global.CDArt = {
    pal: PAL,
    node: node,
    inner: inner,
    svg: svg,
    button: button,
    dot: dot,
    box: box,
    gridtray: gridtray,
    bundle: bundle
  };
})(window);
