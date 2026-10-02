// 직원열의(Employee Engagement) 리포트: 개인·팀 수준 레이더, LPA 군집, 수준별 조언.
// 데이터: assets/data/ee-data.json (가상 예시)
(function () {
  var root = document.getElementById('ee-report');
  if (!root) return;
  var tip = document.getElementById('ee-tip');
  var D, mode = 'person', sel = null;
  var CLS = ['s1', 's2', 's3', 's4'];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function lvl(v) { return v >= 3.8 ? 'hi' : v <= 2.8 ? 'lo' : 'mid'; }

  function radar(series, label) {
    var F = D.factors, n = F.length, W = 420, H = 380, cx = W / 2, cy = H / 2, R = 135;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * (v - 1) / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(label) + '">';
    for (var g = 1; g <= 5; g++) {
      s += '<polygon points="' + F.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" class="rd-grid' + (g === 5 ? ' rd-outer' : '') + '"/>';
      if (g > 1) { var p0 = pt(0, g); s += '<text x="' + (p0[0] + 5) + '" y="' + (p0[1] + 4) + '" class="rd-tick">' + g + '</text>'; }
    }
    F.forEach(function (name, i) {
      var e = pt(i, 5), l = pt(i, 5.5);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<text x="' + l[0] + '" y="' + (l[1] + (l[1] > cy + 5 ? 12 : l[1] < cy - 5 ? -2 : 4)) + '" text-anchor="' + anchor + '" class="rd-label">' + esc(name) + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>'; });
    series.forEach(function (se) {
      if (se.dashed) return;
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" class="rd-hit" data-tip="' + esc(se.label + ' · ' + F[i] + ' ' + v.toFixed(1)) + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) { return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join(''); }
  function clusterOf(id) { return D.clusters.find(function (c) { return c.id === id; }); }

  function renderLevels() {
    var ps = D.personas.map(function (p, i) { return { label: p.name + ' (' + clusterOf(p.cluster).name + ')', values: p.scores, cls: CLS[i] }; });
    document.getElementById('ee-legend-person').innerHTML = legend(ps);
    document.getElementById('ee-radar-person').innerHTML = radar(ps, '개인 수준 열의 비교');
    var ts = D.teams.map(function (t, i) { return { label: t.name + ' ' + t.unit + ' · ' + t.level, values: t.mean, cls: CLS[i] }; });
    document.getElementById('ee-legend-team').innerHTML = legend(ts);
    document.getElementById('ee-radar-team').innerHTML = radar(ts, '팀 수준 열의 비교');
  }
  function renderPattern() {
    var mark = { hi: '▲ 높음', mid: '— 보통', lo: '▼ 낮음' };
    var h = '<div class="table-wrap"><table class="sc-pattern"><thead><tr><th>군집</th><th class="num">비율</th>' + D.factors.map(function (f) { return '<th>' + esc(f) + '</th>'; }).join('') + '</tr></thead><tbody>';
    D.clusters.forEach(function (c, i) {
      h += '<tr data-kind="person" data-pid="' + c.id + '"><td><span class="lg-key ' + CLS[i] + '"></span> <strong>' + esc(c.name) + '</strong></td><td class="num">' + Math.round(c.n / D.n * 100) + '%</td>' +
        c.mean.map(function (v, j) { var l = lvl(v); return '<td><span class="sc-cell ' + (l === 'hi' ? 'good' : l === 'lo' ? 'bad' : '') + '" data-tip="' + esc(c.name + ' · ' + D.factors[j] + ' ' + v.toFixed(1)) + '">' + mark[l] + '</span></td>'; }).join('') + '</tr>';
    });
    document.getElementById('ee-pattern').innerHTML = h + '</tbody></table></div>';
  }
  function list() { return mode === 'person' ? D.clusters : D.teams; }
  function renderCards() {
    document.querySelectorAll('#ee-mode button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === mode)); });
    document.getElementById('ee-cards').innerHTML = list().map(function (c, i) {
      var sub = mode === 'person' ? Math.round(c.n / D.n * 100) + '% · ' + c.n + '명' : c.unit + ' · 열의 ' + c.level;
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (sel === c.id) + '" data-kind="' + mode + '" data-pid="' + c.id + '">' +
        '<span class="persona-avatar sc-av-' + CLS[i] + '" aria-hidden="true">' + (mode === 'person' ? i + 1 : esc(c.name.slice(0, 1))) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(sub) + '</span><span class="persona-name">' + esc(c.name) + '</span></span></button>';
    }).join('');
  }
  function renderAdvice() {
    var arr = list(), c = arr.find(function (x) { return x.id === sel; }), i = arr.indexOf(c);
    var avg = D.factors.map(function (_, j) { return D.clusters.reduce(function (s, x) { return s + x.mean[j] * x.n; }, 0) / D.n; });
    var series = [{ label: '조직 평균', values: avg, cls: 'ref', dashed: true }, { label: c.name, values: c.mean, cls: CLS[i] }];
    function block(title, tag, l) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + l.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    var hi = [], lo = [];
    D.factors.forEach(function (f, j) { var l = lvl(c.mean[j]); if (l === 'hi') hi.push(f + ' ' + c.mean[j].toFixed(1)); if (l === 'lo') lo.push(f + ' ' + c.mean[j].toFixed(1)); });
    document.getElementById('ee-advice').innerHTML =
      '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' + radar(series, c.name) + '</div></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">' + (mode === 'person' ? '개인 군집' : '팀 수준') + '</span><strong class="lm-pname">' + esc(c.name) + '</strong><span class="la-level-type">' + esc(mode === 'person' ? Math.round(c.n / D.n * 100) + '%' : c.unit + ' · ' + c.level) + '</span></div>' +
      '<p class="pr-summary">' + esc(c.summary) + '</p>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">높은 열의</span></h3><ul>' + (hi.length ? hi : ['뚜렷하게 높은 영역 없음']).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">낮은 열의</span></h3><ul>' + (lo.length ? lo : ['뚜렷하게 낮은 영역 없음']).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>' +
      (mode === 'person' ? block('개인: 열의를 높이는 실천', '개인', c.self) + block('관리자·조직의 지원', '조직', c.support)
                         : block('팀: 함께 열의를 높이는 활동', '팀', c.team) + block('조직의 지원', '조직', c.org)) +
      '</div></div>';
  }
  function select(kind, id) { mode = kind; sel = id; renderCards(); renderAdvice(); }

  root.addEventListener('click', function (e) {
    var m = e.target.closest('[data-mode]'); if (m) { select(m.dataset.mode, (m.dataset.mode === 'person' ? D.clusters : D.teams)[0].id); return; }
    var b = e.target.closest('[data-pid]'); if (b) { select(b.dataset.kind, b.dataset.pid); if (b.tagName === 'TR') document.getElementById('ee-advice-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    D = d; renderLevels(); renderPattern(); select('person', D.clusters[0].id);
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
