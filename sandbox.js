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
    chip = Engine.util.el('button', 'sandbox-chip', 'SANDBOX');
    chip.id = 'sandbox-chip';
    chip.type = 'button';
    chip.addEventListener('click', askExit);
    document.body.appendChild(chip);
  }

  function onTap() {
    if (active) return;
    var now = Date.now();
    if (taps.length && now - taps[taps.length - 1] > GAP) taps = [];
    taps.push(now);

    if (taps.length >= NEED) {
      taps = [];
      openPin();
    }
  }

  function openPin() {
    if (pinModal) return;
    Engine.sfx.tap();

    pinModal = Engine.modal({
      title: 'Developer access',
      text: 'Enter the passcode. Progress is not saved or synced in this mode.',
      dismissible: true,
      onClose: function () { pinModal = null; },
      bodyHTML:
        '<label class="field-label" for="sandbox-pin">Passcode</label>' +
        '<input id="sandbox-pin" class="field" type="password" inputmode="numeric" ' +
        'autocomplete="off" maxlength="8" placeholder="Passcode" />',
      actions: [
        { label: 'Cancel', kind: 'ghost' },
        { label: 'Enter', onClick: submit }
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
        input.placeholder = 'Wrong passcode, try again';
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
    Engine.toast('Sandbox on: all levels unlocked, progress is not saved', 2600);
  }

  function askExit() {
    Engine.modal({
      title: 'Leave sandbox',
      text: 'Your previous save will be restored and cloud sync resumed.',
      actions: [
        { label: 'Keep playing', kind: 'ghost' },
        { label: 'Leave', onClick: deactivate }
      ]
    });
  }

  function deactivate() {
    if (!active) return;
    active = false;
    Progress.exitSandbox();
    document.body.classList.remove('is-sandbox');
    Engine.toast('Sandbox off: save restored');
  }

  function install() {
    var hotspot = document.getElementById('hotspot');
    if (!hotspot) return;
    hotspot.addEventListener('pointerdown', onTap);
  }

  return {
    install: install,
    active: function () { return active; },
    // 供测试脚本直接调用
    open: openPin,
    exit: deactivate
  };
})();
