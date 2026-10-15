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
