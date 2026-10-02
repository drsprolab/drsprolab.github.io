// 지식은폐(Knowledge Hiding) 리포트: 상황×행동 지도, 숨기는 이유, 유형별 개인·팀·조직 처방.
// 데이터: assets/data/kh-data.json (가상 예시)
(function () {
  var root = document.getElementById('kh-report');
  if (!root) return;
  var tip = document.getElementById('kh-tip');
  var D, sel = null;
  var CLS = ['s1', 's2', 's3', 's4'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- 1. 어느 상황에서 어떤 행동으로 숨기는가 ----------
  function renderHeat() {
    var h = '<div class="table-wrap"><table class="kh-heat"><thead><tr><th>상황</th>' + D.behaviors.map(function (b) { return '<th>' + esc(b) + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.situations.forEach(function (s, i) {
      var row = D.heat[i], max = Math.max.apply(null, row);
      h += '<tr><td class="kh-sit">' + esc(s) + '</td>' + row.map(function (v, j) {
        var a = Math.max(0, (v - 2) / 2.3);
        return '<td><span class="kh-cell' + (v === max && v >= 3.5 ? ' top' : '') + '" style="--a:' + a.toFixed(2) + '" data-tip="' + esc(s + ' · ' + D.behaviors[j] + ' ' + v.toFixed(1)) + '">' + v.toFixed(1) + '</span></td>';
      }).join('') + '</tr>';
    });
    document.getElementById('kh-heat').innerHTML = h + '</tbody></table></div>';
  }

  // ---------- 2. 왜 숨기는가 ----------
  function renderReasons() {
    var rows = D.reasons.map(function (r, i) { return { r: r, v: D.reason_strength[i] }; }).sort(function (a, b) { return b.v - a.v; });
    document.getElementById('kh-reasons').innerHTML = '<div class="pe-cause-list">' + rows.map(function (x) {
      return '<div class="pe-cause-row" data-tip="' + esc(x.r + ' · 은폐 행동과의 관련 정도 ' + x.v.toFixed(2)) + '"><span class="pe-cause-name">' + esc(x.r) + '</span><span class="pe-cause-track"><span class="pe-cause-bar pos" style="width:' + (x.v * 100).toFixed(0) + '%"></span></span><span class="pe-cause-val">' + x.v.toFixed(2) + '</span></div>';
    }).join('') + '</div>';
  }

  // ---------- 3. 유형별 처방 ----------
  function renderCards() {
    document.getElementById('kh-types').innerHTML = D.types.map(function (t, i) {
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (sel === t.id) + '" data-pid="' + t.id + '">' +
        '<span class="persona-avatar sc-av-' + CLS[i] + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + Math.round(t.share * 100) + '%</span><span class="persona-name">' + esc(t.name) + '</span></span></button>';
    }).join('');
  }
  function renderType() {
    var t = D.types.find(function (x) { return x.id === sel; });
    function x(v) { return (v - 1) / 4 * 100; }
    function block(title, tag, l) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + l.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    var bars = '<div class="lvr gl-bars">' + D.behaviors.map(function (b, j) {
      var v = t.profile[j];
      return '<div class="lvr-row"><span class="lvr-name">' + esc(b) + '</span><span class="lvr-track"><span class="lvr-mean" style="left:' + x(v) + '%;background:' + (v >= 3.5 ? 'var(--warn)' : 'var(--series-1)') + '"></span></span><span class="lvr-val"><strong>' + v.toFixed(1) + '</strong></span></div>';
    }).join('') + '</div>';
    var chips = function (idx, arr, cls) { return idx.length ? idx.map(function (k) { return '<span class="chip ' + cls + '">' + esc(arr[k]) + '</span>'; }).join(' ') : '<span class="chip good">해당 없음</span>'; };
    document.getElementById('kh-type-result').innerHTML =
      '<div class="pr-grid"><div><h3 class="gl-sub">어떤 행동으로 숨기는가 <span>· 행동별 수준 (1–5)</span></h3>' + bars +
      '<h3 class="gl-sub">주로 어떤 상황에서</h3><p class="kh-chips">' + chips(t.situations, D.situations, '') + '</p>' +
      '<h3 class="gl-sub">왜 숨기는가</h3><p class="kh-chips">' + chips(t.reasons, D.reasons, 'warn') + '</p></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">유형</span><strong class="lm-pname">' + esc(t.name) + '</strong><span class="la-level-type">' + Math.round(t.share * 100) + '%</span></div>' +
      '<p class="pr-summary">' + esc(t.why) + '</p>' +
      block('개인 차원', '개인', t.individual) + block('팀 차원', '팀', t.team) + block('조직 차원', '조직', t.org) +
      '</div></div>';
  }
  function select(id) { sel = id; renderCards(); renderType(); }

  root.addEventListener('click', function (e) { var b = e.target.closest('[data-pid]'); if (b) select(b.dataset.pid); });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    D = d; renderHeat(); renderReasons(); select(D.types[0].id);
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
