// Goal Orientation과 성과 향상 진단: 3×3 조합 지도와 LPA 유형별 페르소나.
// 데이터: assets/data/gl-profiles.json (가상 예시)
(function () {
  var root = document.getElementById('gl-report');
  if (!root) return;
  var tip = document.getElementById('gl-tip');
  var F, cuts, profiles, people, orgMean, sel = null;
  var LV = ['낮음', '보통', '높음'];
  // 행: 학습목표지향(높음→낮음), 열: 성과증명 목표지향(낮음→높음)
  var CELL = {
    '2-0': '탐구형', '2-1': '성장형', '2-2': '성장·성과 균형형',
    '1-0': '관망형', '1-1': '중간 안정형', '1-2': '성과 추구형',
    '0-0': '목표 부재형', '0-1': '과업 수행형', '0-2': '결과 집중형'
  };

  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function f2(v) { return v.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function band(v) { return v >= cuts[1] ? 2 : v >= cuts[0] ? 1 : 0; }
  // 성과 향상 준비도: 학습·성과증명은 높을수록, 성과회피는 낮을수록 좋음
  function readiness(s) { return (s[0] + s[1] + (6 - s[2])) / 3; }
  function level(v) { return v >= 4.0 ? { t: '높음', c: 'good' } : v >= 3.4 ? { t: '보통', c: '' } : { t: '낮음', c: 'warn' }; }

  function matrix(highlight, small) {
    var cells = {};
    people.forEach(function (p) {
      var k = band(p.scores[0]) + '-' + band(p.scores[1]);
      (cells[k] = cells[k] || []).push(p);
    });
    var marks = {};
    profiles.forEach(function (p, i) { var k = band(p.mean[0]) + '-' + band(p.mean[1]); (marks[k] = marks[k] || []).push(i + 1); });
    var maxN = Math.max.apply(null, Object.keys(cells).map(function (k) { return cells[k].length; }));
    var h = '<div class="gm' + (small ? ' gm-small' : '') + '"><div class="gm-ylab">↑ 학습목표지향</div><div class="gm-grid">';
    [2, 1, 0].forEach(function (r) {
      h += '<div class="gm-rowlab">' + LV[r] + '</div>';
      [0, 1, 2].forEach(function (c) {
        var k = r + '-' + c, list = cells[k] || [], n = list.length, pct = Math.round(n / people.length * 100);
        var avoid = n ? mean(list.map(function (p) { return p.scores[2]; })) : 0;
        var on = highlight && highlight === k;
        h += '<div class="gm-cell' + (on ? ' on' : '') + (highlight && !on ? ' dim' : '') + '" style="--a:' + (n / maxN).toFixed(2) + '" data-tip="' + esc(CELL[k] + ' · 학습 ' + LV[r] + ' × 성과증명 ' + LV[c] + ' · ' + n + '명 (' + pct + '%)' + (n ? ' · 성과회피 평균 ' + f2(avoid) : '')) + '">' +
          '<span class="gm-name">' + esc(CELL[k]) + '</span>' +
          (small ? '' : '<span class="gm-n">' + n + '명 <small>' + pct + '%</small></span>' + (n && avoid >= 3.5 ? '<span class="chip warn">회피 높음</span>' : '')) +
          (marks[k] ? '<span class="gm-marks">' + marks[k].map(function (m) { return '<i class="gm-mark gm-m' + m + '">' + m + '</i>'; }).join('') + '</span>' : '') + '</div>';
      });
    });
    h += '<div></div>' + [0, 1, 2].map(function (c) { return '<div class="gm-collab">' + LV[c] + '</div>'; }).join('') + '</div><div class="gm-xlab">성과증명 목표지향 →</div></div>';
    return h;
  }

  function bars(values) {
    function x(v) { return (v - 1) / 4 * 100; }
    return '<div class="lvr gl-bars">' + F.map(function (f, j) {
      return '<div class="lvr-row"><span class="lvr-name">' + esc(f) + (j === 2 ? '*' : '') + '</span><span class="lvr-track">' +
        '<span class="lvr-org" style="left:' + x(orgMean[j]) + '%"></span><span class="lvr-mean" style="left:' + x(values[j]) + '%"></span></span>' +
        '<span class="lvr-val"><strong>' + f2(values[j]) + '</strong> <span class="lvr-sd">조직 ' + f2(orgMean[j]) + '</span></span></div>';
    }).join('') + '</div>';
  }

  function renderCards() {
    document.getElementById('gl-personas').innerHTML = profiles.map(function (p, i) {
      var lv = level(readiness(p.mean));
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (sel === p.id) + '" data-pid="' + p.id + '">' +
        '<span class="persona-avatar gm-av' + (i + 1) + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(p.name) + '</span><span class="persona-name">' + Math.round(p.n / people.length * 100) + '% <small>' + p.n + '명 · 준비도 ' + lv.t + '</small></span></span></button>';
    }).join('');
  }
  function renderPersona() {
    var p = profiles.find(function (x) { return x.id === sel; }), i = profiles.indexOf(p);
    var r = readiness(p.mean), lv = level(r), k = band(p.mean[0]) + '-' + band(p.mean[1]);
    var good = [], gap = [];
    [[0, '학습목표지향'], [1, '성과증명 목표지향']].forEach(function (x) { (p.mean[x[0]] >= orgMean[x[0]] ? good : gap).push(x[1] + ' ' + f2(p.mean[x[0]])); });
    (p.mean[2] <= orgMean[2] ? good : gap).push('성과회피 목표지향 ' + f2(p.mean[2]) + (p.mean[2] <= orgMean[2] ? ' (낮음)' : ' (높음)'));
    function block(title, tag, list) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + list.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    document.getElementById('gl-persona-result').innerHTML =
      '<div class="pr-grid"><div><h3 class="gl-sub">요인별 수준 <span>· 조직 평균(세로선) 대비</span></h3>' + bars(p.mean) +
      '<h3 class="gl-sub">3×3 조합에서의 위치</h3>' + matrix(k, true) + '</div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">성과 향상 준비도</span><strong>' + f2(r) + '</strong><span class="chip ' + lv.c + '">' + lv.t + '</span><span class="la-level-type">' + (i + 1) + '. ' + esc(p.name) + '</span></div>' +
      '<p class="pr-summary">' + esc(p.summary) + '</p>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">강점</span></h3><ul>' + good.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">보완할 점</span></h3><ul>' + (gap.length ? gap : ['뚜렷한 약점 없음']).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="la-combo-line">조합: 학습 <strong>' + LV[band(p.mean[0])] + '</strong> × 성과증명 <strong>' + LV[band(p.mean[1])] + '</strong> × 성과회피 <strong>' + LV[band(p.mean[2])] + '</strong> → <strong>' + esc(CELL[k]) + '</strong> 영역</p>' +
      block('조직 차원의 지원', '조직', p.org) + block('팀 구성원들의 활동 변화', '팀', p.team) + block('개인 역량 향상 활동', '개인', p.individual) +
      '</div></div>';
  }

  root.addEventListener('click', function (e) { var c = e.target.closest('[data-pid]'); if (c) { sel = c.dataset.pid; renderCards(); renderPersona(); } });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    F = d.factors; cuts = d.cuts; profiles = d.profiles; people = d.people;
    orgMean = F.map(function (_, j) { return mean(people.map(function (p) { return p.scores[j]; })); });
    document.getElementById('gl-matrix').innerHTML = matrix(null, false);
    document.getElementById('gl-legend').innerHTML = profiles.map(function (p, i) {
      return '<span class="lg"><i class="gm-mark gm-m' + (i + 1) + '">' + (i + 1) + '</i>' + esc(p.name) + ' ' + Math.round(p.n / people.length * 100) + '%</span>';
    }).join('');
    sel = profiles[0].id; renderCards(); renderPersona();
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
