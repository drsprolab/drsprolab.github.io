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

// 메뉴에 들어가면 무엇이 바뀌었는지 보여 줌 (_plugins/item_updates.rb)
//  바뀐 항목(논문, 프로젝트, 구성원, 글 카드 등)의 제목 옆에 NEW 표시
(function () {
  var el = document.getElementById('site-updates');
  var main = document.querySelector('main');
  if (!el || !main) return;
  var data; try { data = JSON.parse(el.textContent); } catch (e) { return; }
  var now = Date.now() / 1000, WINDOW = 48 * 3600;
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
