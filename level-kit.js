/* ============================================================
   level-kit.js · 关卡共用的结算界面
   ------------------------------------------------------------
   只放「每个关卡都会用到的展示件」，不放任何题面或判定。
   目前只有结算页（金星 / 银星 + 重玩 + 回地图）。
   ============================================================ */

(function (global) {
  'use strict';

  var ICONS = {
    star:
      '<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">' +
      '<path d="M50 8l12.4 26.2 28.6 3.4-21.1 19.8 5.6 28.3L50 71.2 24.5 85.7l5.6-28.3L9 37.6l28.6-3.4z" ' +
      'fill="currentColor"/></svg>',
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
    starWrap.innerHTML = ICONS.star;

    var rays = el('div', 'result-rays');
    var rayCount = star === 'gold' ? 8 : 4;
    for (var i = 0; i < rayCount; i += 1) {
      var ray = el('span', 'result-ray');
      ray.style.setProperty('--i', String(i));
      ray.style.setProperty('--n', String(rayCount));
      rays.appendChild(ray);
    }
    starWrap.appendChild(rays);
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

    starWrap.animate([
      { transform: 'scale(.2) rotate(-18deg)', opacity: 0 },
      { transform: 'scale(1.14) rotate(4deg)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1 }
    ], { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' });

    rays.animate([
      { opacity: 0, transform: 'scale(.6)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 600, delay: 220, easing: 'cubic-bezier(0.22,.61,.36,1)', fill: 'both' });

    if (typeof opts.play === 'function') {
      opts.play(star === 'gold' ? 'common/gold' : 'common/silver');
    }
  }

  global.LevelKit = { showResult: showResult, ICONS: ICONS };
})(window);
