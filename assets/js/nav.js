(function () {
  var btn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
})();

// iOS Safari는 터치 리스너가 있어야 :active 스타일이 적용됨 (박스 확대 효과)
document.addEventListener('touchstart', function () {}, { passive: true });

// 최근 48시간 안에 내용이 바뀐 메뉴에 NEW 표시 (빌드 시각이 아니라 방문 시각 기준이라 이틀 뒤 저절로 사라짐)
(function () {
  var now = Date.now() / 1000, WINDOW = 48 * 3600;
  document.querySelectorAll('.nav-item > a[data-updated]').forEach(function (a) {
    var t = +a.dataset.updated;
    if (!t || now - t > WINDOW || now < t - 3600) return;
    var b = document.createElement('span');
    b.className = 'nav-new';
    b.textContent = 'NEW';
    b.title = '최근 업데이트: ' + new Date(t * 1000).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    a.appendChild(b);
  });
})();
