/* ============================================================
   level-kit.js · 关卡共用的结算界面
   ------------------------------------------------------------
   只放「每个关卡都会用到的展示件」，不放任何题面或判定。
   星效为动态辉光：光晕呼吸 + 星体微亮 + 高光流动 + 细碎光点，
   禁止旧版静态光芒条（PROJECT_MATH_RULES §5.6）。
   ============================================================ */

(function (global) {
  'use strict';

  var STAR_SVG =
    '<span class="star-halo" aria-hidden="true"></span>' +
    '<svg class="star-svg" viewBox="0 0 100 100" aria-hidden="true">' +
    '<defs>' +
    '<radialGradient id="starGoldFill" cx="38%" cy="30%" r="78%">' +
    '<stop offset="0%" stop-color="#FFF3C2"/>' +
    '<stop offset="46%" stop-color="#FFCE3F"/>' +
    '<stop offset="100%" stop-color="#DB8C07"/>' +
    '</radialGradient>' +
    '<radialGradient id="starSilverFill" cx="38%" cy="30%" r="78%">' +
    '<stop offset="0%" stop-color="#FFFFFF"/>' +
    '<stop offset="42%" stop-color="#D9E3ED"/>' +
    '<stop offset="100%" stop-color="#8E9EAF"/>' +
    '</radialGradient>' +
    '<linearGradient id="starSheen" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>' +
    '<stop offset="48%" stop-color="#ffffff" stop-opacity="0.8"/>' +
    '<stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>' +
    '</linearGradient>' +
    '</defs>' +
    '<path class="star-body" d="M50 6l13 27 30 4-22 21 6 30-27-15-27 15 6-30L7 37l30-4z" ' +
    'fill="url(#starGoldFill)" stroke="rgba(255,248,220,.95)" stroke-width="1.3" stroke-linejoin="round"/>' +
    '<path class="star-sheen" d="M50 19l8.2 17 18.8 2.5-13.9 13.3 3.8 19L50 62.6 32.9 70.8l3.8-19L22.8 38.5 41.6 36z" ' +
    'fill="url(#starSheen)"/>' +
    '</svg>' +
    '<span class="star-sparkles" aria-hidden="true">' +
    '<i></i><i></i><i></i><i></i><i></i><i></i>' +
    '</span>';

  var ICONS = {
    home:
      '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
      '<path d="M4 10.6 12 4l8 6.6V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" fill="currentColor"/></svg>',
    replay:
      '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
      '<path d="M19 12a7 7 0 1 1-2.4-5.3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>' +
      '<path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function iconButton(kind, label, onClick) {
    var btn = el('button', 'result-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    btn.innerHTML = ICONS[kind];
    btn.addEventListener('click', function () {
      if (global.Engine) global.Engine.sfx.tap();
      onClick();
    });
    return btn;
  }

  /**
   * @param host    容器（会被清空）
   * @param star    'gold' | 'silver'
   * @param opts    { onReplay, onHome, play }
   */
  function showResult(host, star, opts) {
    opts = opts || {};
    host.innerHTML = '';

    var box = el('div', 'result');
    var starWrap = el('div', 'result-star result-star--' + star);
    starWrap.innerHTML = STAR_SVG;
    box.appendChild(starWrap);

    var actions = el('div', 'result-actions');
    actions.appendChild(iconButton('replay', 'Play this level again', function () {
      if (typeof opts.onReplay === 'function') opts.onReplay();
    }));
    actions.appendChild(iconButton('home', 'Back to the map', function () {
      if (typeof opts.onHome === 'function') opts.onHome();
    }));
    box.appendChild(actions);

    host.appendChild(box);

    // 入场：整体弹入一次，之后交给 CSS 的持续辉光
    starWrap.animate([
      { transform: 'scale(.25) rotate(-16deg)', opacity: 0 },
      { transform: 'scale(1.12) rotate(3deg)', opacity: 1, offset: 0.68 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 }
    ], { duration: 720, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' });

    if (typeof opts.play === 'function') {
      opts.play(star === 'gold' ? 'common/gold' : 'common/silver');
    }
  }

  global.LevelKit = { showResult: showResult, ICONS: ICONS };
})(window);
