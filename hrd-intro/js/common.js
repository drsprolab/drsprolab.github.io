/* HRD개론 공통: 테마 전환, 열람 비밀번호 화면.
 * 비밀번호를 바꾸려면 새 비밀번호의 SHA-256 값을 PASS_HASH에 넣는다(원문은 코드에 두지 않는다). */
(function () {
  'use strict';
  var PASS_HASH = '517e6378947cd7aa3ba388d78ce7e8e1c0a2cf07e7282c981856449e03985297';
  var PASS_KEY = 'hrd-intro-pass';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  // 테마
  var theme = store('paperlog-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  var tbtn = document.querySelector('[data-theme-toggle]');
  if (tbtn) {
    tbtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    tbtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      tbtn.textContent = next === 'dark' ? '☀️' : '🌙';
      store('paperlog-theme', next);
    });
  }

  // 비밀번호
  function sha256(text) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    });
  }
  if (store(PASS_KEY) === PASS_HASH) return;
  var gate = document.createElement('div');
  gate.id = 'pw-gate';
  gate.innerHTML = '<form autocomplete="on"><div class="pw-mark">HRD개론 · DET1003</div>' +
    '<h1>비밀번호를 입력해 주세요</h1>' +
    '<p>HRD개론 수강생만 열람할 수 있습니다. 한 번 입력하면 이 브라우저에서는 다시 묻지 않습니다.</p>' +
    '<input id="pw-input" type="password" name="password" autocomplete="current-password" placeholder="비밀번호" aria-label="비밀번호" required>' +
    '<button type="submit">들어가기</button><div id="pw-msg" role="alert"></div></form>';
  document.body.appendChild(gate);
  var input = gate.querySelector('#pw-input');
  input.focus();
  gate.querySelector('form').addEventListener('submit', function (e) {
    e.preventDefault();
    sha256(input.value.trim()).then(function (h) {
      if (h === PASS_HASH) { store(PASS_KEY, h); gate.remove(); return; }
      gate.querySelector('#pw-msg').textContent = '비밀번호가 맞지 않습니다. 다시 입력해 주세요.';
      input.select();
    });
  });
})();
