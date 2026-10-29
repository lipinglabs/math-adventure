/* ============================================================
   sandbox.js · 开发者沙盒后门
   ------------------------------------------------------------
   触发：屏幕左上角（热区 92×92）连续点击 5 次，每次间隔 < 1.6 秒
   口令：123
   行为：内存态全解锁 + 关闭云同步 + 不写任何存档
   退出：点右上角「沙盒」角标，恢复进入前的快照

   铁律（PROJECT_MATH_RULES §8）：
     · 沙盒进度绝不写入 localStorage，也绝不上传云端
     · 进入即切断 Cloud 的所有入口（Cloud 内部判 Sandbox.active）
   ============================================================ */

window.Sandbox = (function () {
  'use strict';

  var NEED = 5;
  var GAP = 1600;
  var PIN = '123';

  var active = false;
  var taps = [];
  var chip = null;
  var pinModal = null;

  function built() {
    if (document.getElementById('sandbox-chip')) return;
    chip = Engine.util.el('button', 'sandbox-chip', '沙盒 · 全解锁');
    chip.id = 'sandbox-chip';
    chip.type = 'button';
    chip.addEventListener('click', askExit);
    document.body.appendChild(chip);
  }

  function onTap(event) {
    if (active) return;
    var now = Date.now();
    if (taps.length && now - taps[taps.length - 1] > GAP) taps = [];
    taps.push(now);

    if (taps.length >= NEED) {
      taps = [];
      openPin();
    }
    // 避免热区吞掉地图边缘的点击
    if (event && event.type === 'pointerdown') { /* 热区本身不做业务 */ }
  }

  function openPin() {
    if (pinModal) return;
    Engine.sfx.tap();

    pinModal = Engine.modal({
      title: '开发者入口',
      text: '请输入口令。此模式下的进度不会保存，也不会同步到云端。',
      dismissible: true,
      onClose: function () { pinModal = null; },
      bodyHTML:
        '<label class="field-label" for="sandbox-pin">口令</label>' +
        '<input id="sandbox-pin" class="field" type="password" inputmode="numeric" ' +
        'autocomplete="off" maxlength="8" placeholder="请输入口令" />',
      actions: [
        { label: '取消', kind: 'ghost' },
        { label: '进入', onClick: submit }
      ]
    });

    var input = document.getElementById('sandbox-pin');
    if (input) {
      setTimeout(function () { input.focus(); }, 120);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit();
      });
    }
  }

  function submit() {
    var input = document.getElementById('sandbox-pin');
    var value = input ? input.value.trim() : '';

    if (value !== PIN) {
      Engine.sfx.deny();
      Engine.anim.play(input, 'shake', 420);
      if (input) {
        input.value = '';
        input.placeholder = '口令不对，再试一次';
      }
      return false;   // 不关闭弹层，让用户重输
    }

    if (pinModal) {
      pinModal.close();
      pinModal = null;
    }
    activate();
    return false;     // 已手动关闭，阻止二次关闭
  }

  function activate() {
    if (active) return;
    active = true;
    Progress.enterSandbox();
    document.body.classList.add('is-sandbox');
    built();
    Engine.sfx.star();
    Engine.toast('沙盒已开启：全部关卡解锁，进度不会保存', 2600);
  }

  function askExit() {
    Engine.modal({
      title: '退出沙盒',
      text: '将恢复进入前的存档，并重新连接云端。',
      actions: [
        { label: '继续调试', kind: 'ghost' },
        { label: '退出', onClick: deactivate }
      ]
    });
  }

  function deactivate() {
    if (!active) return;
    active = false;
    Progress.exitSandbox();
    document.body.classList.remove('is-sandbox');
    Engine.toast('已退出沙盒，存档已恢复');
  }

  function install() {
    var hotspot = document.getElementById('hotspot');
    if (!hotspot) return;
    hotspot.addEventListener('pointerdown', onTap);
    // 鼠标端补一个 click，触屏端 pointerdown 已覆盖
    hotspot.addEventListener('click', function (e) {
      if (e.pointerType === 'mouse') return;   // 避免同一次点击记两次
    });
  }

  return {
    install: install,
    active: function () { return active; },
    // 供测试脚本直接调用
    open: openPin,
    exit: deactivate
  };
})();
