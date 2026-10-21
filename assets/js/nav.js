(function () {
  var btn = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;
  var label = btn.querySelector('.menu-label');
  function setOpen(open) {
    nav.classList.toggle('open', open);
    document.documentElement.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    if (label) label.textContent = open ? '닫기' : '메뉴';
  }
  btn.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  // 모바일: 메뉴 항목(같은 페이지 #앵커 포함)을 누르거나, 바깥을 누르거나, Esc를 누르면 닫힘
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setOpen(false); btn.focus(); }
  });
  // 화면을 넓히면(가로 회전 등) 데스크톱 메뉴로 돌아가므로 열림 상태 해제
  window.addEventListener('resize', function () { if (window.innerWidth > 860 && nav.classList.contains('open')) setOpen(false); });
})();

// iOS Safari는 터치 리스너가 있어야 :active 스타일이 적용됨 (박스 확대 효과)
document.addEventListener('touchstart', function () {}, { passive: true });

// 최근 3일(72시간) 안에 새 글·새 항목이 올라온 메뉴에 NEW 표시 — 기존 내용 수정은 제외 (_plugins/item_updates.rb)
// 빌드 시각이 아니라 방문 시각 기준이라 3일 뒤 저절로 사라짐
(function () {
  var now = Date.now() / 1000, WINDOW = 72 * 3600;
  document.querySelectorAll('.nav-item > a[data-updated]').forEach(function (a) {
    var t = +a.dataset.updated;
    if (!t || now - t > WINDOW || now < t - 3600) return;
    var b = document.createElement('span');
    b.className = 'nav-new';
    b.textContent = 'NEW';
    b.title = '새로 올라옴: ' + new Date(t * 1000).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    a.appendChild(b);
  });
})();

// 메뉴에 들어가면 무엇이 바뀌었는지 보여 줌 (_plugins/item_updates.rb)
//  새로 올라온 항목(논문, 프로젝트, 글 카드 등)의 제목 옆에 NEW 표시 (수정된 항목은 제외)
(function () {
  var el = document.getElementById('site-updates');
  var main = document.querySelector('main');
  if (!el || !main) return;
  var data; try { data = JSON.parse(el.textContent); } catch (e) { return; }
  var now = Date.now() / 1000, WINDOW = 72 * 3600;
  function fresh(t) { return t && now - t <= WINDOW && now >= t - 3600; }
  function norm(s) { return String(s).toLowerCase().replace(/[^0-9a-z가-힣]/g, ''); }

  // 이 페이지가 속한 메뉴
  var path = location.pathname, best = '';
  Object.keys(data.nav || {}).forEach(function (u) { if (u !== '/' && path.indexOf(u) === 0 && u.length > best.length) best = u; });

  // 바뀐 항목 표시: 항목 글이 들어 있는 가장 안쪽 목록·카드에 NEW
  // 항목은 그 데이터가 속한 메뉴 안에서만 찾는다(예: 구성원 이름이 논문 저자 목록에 NEW로 붙지 않게)
  var keys = (data.items || []).filter(function (i) { return fresh(i.t) && i.u === best; })
    .map(function (i) { return norm(i.s); }).filter(function (k) { return k.length >= 3; });
  if (!keys.length) return;
  var SEL = 'li, tbody tr, .inst, .gcard, .member, .area';
  var hits = [];
  main.querySelectorAll(SEL).forEach(function (c) {
    var text = norm(c.textContent);
    if (keys.some(function (k) { return text.indexOf(k) >= 0; })) hits.push(c);
  });
  hits.filter(function (c) { return !hits.some(function (o) { return o !== c && c.contains(o); }); })
    .forEach(function (c) {
      var title = c.querySelector('.cite, h3, .gcard-title, .member-name, .area-en, td') || c;
      var b = document.createElement('span');
      b.className = 'item-new';
      b.textContent = 'NEW';
      title.appendChild(b);
    });
})();
