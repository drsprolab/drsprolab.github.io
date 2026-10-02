// Agile 조직문화 진단 리포트: 개인·팀 프로파일, 팀 수준과 구성원 차이, 팀 페르소나 진단.
// 데이터: assets/data/la-teams.json (가상 예시)
(function () {
  var root = document.getElementById('la-report');
  if (!root) return;
  var tip = document.getElementById('la-tip');
  var D, F, teams, all, orgMean, selTeam = null, selPersona = null;
  var LBL = root.dataset.label || 'Agility';           // 레이더 제목에 쓰는 이름
  var LEVEL = root.dataset.levelLabel || 'Agile 수준'; // 팀 수준 표시 이름

  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function sd(a) { var m = mean(a); return Math.sqrt(mean(a.map(function (v) { return (v - m) * (v - m); }))); }
  function q(a, p) { var s = a.slice().sort(function (x, y) { return x - y; }), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function f2(v) { return v.toFixed(2); }
  function signed(v) { return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function col(rows, j) { return rows.map(function (r) { return r[j]; }); }
  function level(v) { return v >= 4.0 ? { t: '높음', c: 'good' } : v >= 3.4 ? { t: '보통', c: '' } : { t: '낮음', c: 'warn' }; }

  // ---------- radar ----------
  function radar(series, label) {
    var n = F.length, W = 440, H = 400, cx = W / 2, cy = H / 2 + 6, R = 138;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * (v - 1) / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(label) + '">';
    for (var g = 1; g <= 5; g++) {
      s += '<polygon points="' + F.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" class="rd-grid' + (g === 5 ? ' rd-outer' : '') + '"/>';
      if (g > 1) { var p0 = pt(0, g); s += '<text x="' + (p0[0] + 5) + '" y="' + (p0[1] + 4) + '" class="rd-tick">' + g + '</text>'; }
    }
    F.forEach(function (name, i) {
      var e = pt(i, 5), l = pt(i, 5.62);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      var words = name.split(' '), lines = [name];
      if (name.length > 7 && words.length > 1) { var cut = Math.ceil(words.length / 2); lines = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]; }
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4 - (lines.length - 1) * 7) + '" text-anchor="' + anchor + '" class="rd-label">' +
        lines.map(function (t, k) { return '<tspan x="' + l[0] + '" dy="' + (k ? 15 : 0) + '">' + esc(t) + '</tspan>'; }).join('') + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>'; });
    series.forEach(function (se) {
      if (se.dashed) return;
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="rd-hit" data-tip="' + esc(se.label + ' · ' + F[i] + ' ' + f2(v)) + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join('');
  }

  // ---------- 1. 집단 프로파일: 개인 수준 / 팀 수준 ----------
  function renderProfiles() {
    // 개인별: 구성원 전체 평균과, 종합점수 상위·하위 25% 구성원의 평균
    var scored = all.map(function (m) { return { m: m, s: mean(m) }; });
    var hiCut = q(scored.map(function (x) { return x.s; }), 0.75), loCut = q(scored.map(function (x) { return x.s; }), 0.25);
    var top = scored.filter(function (x) { return x.s >= hiCut; }).map(function (x) { return x.m; });
    var low = scored.filter(function (x) { return x.s <= loCut; }).map(function (x) { return x.m; });
    var indiv = [
      { label: '상위 25% 구성원', values: F.map(function (_, j) { return mean(col(top, j)); }), cls: 's2' },
      { label: '전체 구성원 평균', values: orgMean, cls: 's1' },
      { label: '하위 25% 구성원', values: F.map(function (_, j) { return mean(col(low, j)); }), cls: 'ref', dashed: true }
    ];
    document.getElementById('la-legend-indiv').innerHTML = legend(indiv);
    document.getElementById('la-radar-indiv').innerHTML = radar(indiv, '개인별 ' + LBL + ' 진단');
    document.getElementById('la-indiv-note').textContent = '구성원 ' + all.length + '명 · 상위와 하위 25% 구성원의 차이가 가장 큰 요인: ' +
      F.map(function (f, j) { return { f: f, d: indiv[0].values[j] - indiv[2].values[j] }; }).sort(function (a, b) { return b.d - a.d; })[0].f;

    var clsByTeam = ['s1', 's2', 's3'];
    var teamSeries = teams.map(function (t, i) { return { label: t.name + ' (' + t.unit + ')', values: t.mean, cls: clsByTeam[i % 3] }; });
    document.getElementById('la-legend-team').innerHTML = legend(teamSeries);
    document.getElementById('la-radar-team').innerHTML = radar(teamSeries, '팀별 ' + LBL + ' 진단');
  }

  // ---------- 2. 하위요인별 팀 수준과 구성원 간 차이 ----------
  function renderSpread() {
    var t = teams.find(function (x) { return x.id === selTeam; });
    document.querySelectorAll('#la-spread-tabs button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.team === selTeam)); });
    function x(v) { return (v - 1) / 4 * 100; }
    var rows = F.map(function (f, j) {
      var v = col(t.members, j);
      return { f: f, mean: mean(v), min: Math.min.apply(null, v), max: Math.max.apply(null, v), q1: q(v, .25), q3: q(v, .75), sd: sd(v), org: orgMean[j] };
    });
    var widest = rows.slice().sort(function (a, b) { return b.sd - a.sd; })[0];
    var h = '<div class="lvr"><div class="lvr-scale"><span></span><span class="lvr-axis">' +
      [1, 2, 3, 4, 5].map(function (v) { return '<i style="left:' + x(v) + '%">' + v + '</i>'; }).join('') + '</span><span class="lvr-head">팀 평균 · 편차</span></div>';
    rows.forEach(function (r) {
      var lv = level(r.mean);
      h += '<div class="lvr-row" data-tip="' + esc(t.name + ' · ' + r.f + ' · 평균 ' + f2(r.mean) + ' · 구성원 범위 ' + r.min.toFixed(1) + '–' + r.max.toFixed(1) + ' · 조직 평균 ' + f2(r.org)) + '">' +
        '<span class="lvr-name">' + esc(r.f) + '</span>' +
        '<span class="lvr-track"><span class="lvr-range" style="left:' + x(r.min) + '%;width:' + (x(r.max) - x(r.min)) + '%"></span>' +
        '<span class="lvr-iqr" style="left:' + x(r.q1) + '%;width:' + Math.max(x(r.q3) - x(r.q1), 1) + '%"></span>' +
        '<span class="lvr-org" style="left:' + x(r.org) + '%"></span>' +
        '<span class="lvr-mean" style="left:' + x(r.mean) + '%"></span></span>' +
        '<span class="lvr-val"><strong>' + f2(r.mean) + '</strong> <span class="chip ' + lv.c + '">' + lv.t + '</span> <span class="lvr-sd">±' + r.sd.toFixed(2) + '</span></span></div>';
    });
    h += '</div><div class="legend"><span class="lg"><span class="lvr-key-mean"></span>팀 평균</span><span class="lg"><span class="lvr-key-iqr"></span>구성원 가운데 50%</span><span class="lg"><span class="lvr-key-range"></span>구성원 최저–최고</span><span class="lg"><span class="lvr-key-org"></span>조직 평균</span></div>' +
      '<p class="lvr-note">' + esc(t.name) + '에서 구성원 간 차이가 가장 큰 요인은 <strong>' + esc(widest.f) + '</strong>(편차 ±' + widest.sd.toFixed(2) + ')입니다. 평균만 보지 말고 이 요인에서 뒤처진 구성원을 함께 살펴보세요.</p>';
    document.getElementById('la-spread').innerHTML = h;
  }

  // ---------- 3. 팀 페르소나 진단 ----------
  function renderPersonaCards() {
    document.getElementById('la-personas').innerHTML = teams.map(function (t) {
      var lv = level(mean(t.mean));
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (selPersona === t.id) + '" data-pid="' + t.id + '">' +
        '<span class="persona-avatar" aria-hidden="true">' + esc(t.id) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(t.type) + '</span>' +
        '<span class="persona-name">' + esc(t.name) + ' <small>' + esc(t.unit) + ' · ' + t.members.length + '명 · 수준 ' + lv.t + '</small></span></span></button>';
    }).join('');
  }
  function renderPersona() {
    var t = teams.find(function (x) { return x.id === selPersona; });
    var box = document.getElementById('la-persona-result');
    var overall = mean(t.mean), lv = level(overall);
    var rank = F.map(function (f, j) { return { f: f, v: t.mean[j], d: t.mean[j] - orgMean[j] }; });
    var hi = rank.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 2);
    var lo = rank.slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 2);
    var series = [{ label: '조직 평균', values: orgMean, cls: 'ref', dashed: true }, { label: t.name, values: t.mean, cls: 's1' }];
    function item(x) { return '<strong>' + esc(x.f) + '</strong> <span class="pd-score">' + x.v.toFixed(2) + '</span> <span class="pd-diff ' + (x.d >= 0 ? 'up' : 'down') + '">조직 평균 대비 ' + signed(x.d) + '</span>'; }
    function block(title, tag, list) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + list.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    box.innerHTML = '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' + radar(series, t.name + ' 팀 프로파일') + '</div></div>' +
      '<div class="pr-diag">' +
      '<div class="la-level"><span class="la-level-k">' + esc(LEVEL) + '</span><strong>' + f2(overall) + '</strong><span class="chip ' + lv.c + '">' + lv.t + '</span><span class="la-level-type">' + esc(t.type) + '</span></div>' +
      '<p class="pr-summary">' + esc(t.summary) + '</p>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">높은 영역</span></h3><ul>' + hi.map(function (x) { return '<li>' + item(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">낮은 영역</span></h3><ul>' + lo.map(function (x) { return '<li>' + item(x) + '</li>'; }).join('') + '</ul></div></div>' +
      '<p class="la-combo-line">조합: <strong>' + hi.map(function (x) { return x.f; }).join('·') + '</strong> 높음 × <strong>' + lo.map(function (x) { return x.f; }).join('·') + '</strong> 낮음</p>' +
      block('조직 차원의 지원', '조직', t.org) + block('팀 구성원들의 활동 변화', '팀', t.team) + block('개인 역량 향상 활동', '개인', t.individual) +
      '</div></div>';
  }

  // ---------- events ----------
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-team]'); if (b) { selTeam = b.dataset.team; renderSpread(); return; }
    var p = e.target.closest('[data-pid]'); if (p) { selPersona = p.dataset.pid; renderPersonaCards(); renderPersona(); }
  });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (data) {
    D = data; F = data.factors; teams = data.teams;
    teams.forEach(function (t) { t.mean = F.map(function (_, j) { return mean(col(t.members, j)); }); });
    all = [].concat.apply([], teams.map(function (t) { return t.members; }));
    orgMean = F.map(function (_, j) { return mean(col(all, j)); });
    document.getElementById('la-spread-tabs').innerHTML = teams.map(function (t) { return '<button type="button" class="pf-chip" data-team="' + t.id + '" aria-pressed="false">' + esc(t.name + ' · ' + t.unit) + '</button>'; }).join('');
    selTeam = teams[0].id; selPersona = teams[0].id;
    renderProfiles(); renderSpread(); renderPersonaCards(); renderPersona();
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
