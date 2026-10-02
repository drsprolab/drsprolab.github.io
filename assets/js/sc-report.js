// 자기자비(Self-Compassion) 진단 리포트: 3명 페르소나 비교 레이더, LPA 군집 패턴, 군집별 맞춤 지원.
// 데이터: assets/data/sc-profiles.json (가상 예시)
(function () {
  var root = document.getElementById('sc-report');
  if (!root) return;
  var tip = document.getElementById('sc-tip');
  var F, NEG, profiles, personas, N, sel = null;
  var CLS = ['s1', 's2', 's3', 's4'];

  function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  function f2(v) { return v.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function neg(f) { return NEG.indexOf(f) >= 0; }
  function lvl(v) { return v >= 3.7 ? 'hi' : v <= 2.6 ? 'lo' : 'mid'; }

  function radar(series, label) {
    var n = F.length, W = 460, H = 410, cx = W / 2, cy = H / 2 + 4, R = 145;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * (v - 1) / 4; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(label) + '">';
    for (var g = 1; g <= 5; g++) {
      s += '<polygon points="' + F.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" class="rd-grid' + (g === 5 ? ' rd-outer' : '') + '"/>';
      if (g > 1) { var p0 = pt(0, g); s += '<text x="' + (p0[0] + 5) + '" y="' + (p0[1] + 4) + '" class="rd-tick">' + g + '</text>'; }
    }
    F.forEach(function (name, i) {
      var e = pt(i, 5), l = pt(i, 5.55);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + anchor + '" class="rd-label' + (neg(name) ? ' rd-burden' : '') + '">' + esc(name) + (neg(name) ? '*' : '') + '</text>';
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
  function legend(items) {
    return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join('');
  }
  function profileOf(id) { return profiles.find(function (p) { return p.id === id; }); }

  // ---------- 1. 페르소나 3명 비교 ----------
  function renderPersonas() {
    var series = personas.map(function (p, i) { return { label: p.name + ' (' + profileOf(p.profile).name + ')', values: p.scores, cls: CLS[i] }; });
    document.getElementById('sc-legend').innerHTML = legend(series);
    document.getElementById('sc-radar').innerHTML = radar(series, '세 페르소나의 자기자비 상태 비교');
    document.getElementById('sc-persona-list').innerHTML = personas.map(function (p, i) {
      var pr = profileOf(p.profile);
      return '<button type="button" class="sc-pcard" data-pid="' + pr.id + '"><span class="persona-avatar sc-av-' + CLS[i] + '" aria-hidden="true">' + esc(p.name.slice(0, 1)) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(pr.name) + '</span><span class="persona-name">' + esc(p.name) + ' <small>' + esc(p.role) + '</small></span>' +
        '<span class="sc-state">' + esc(p.state) + '</span></span></button>';
    }).join('');
  }

  // ---------- 2. LPA 군집 패턴 ----------
  function renderPattern() {
    var mark = { hi: '▲ 높음', mid: '— 보통', lo: '▼ 낮음' };
    var h = '<div class="table-wrap"><table class="sc-pattern"><thead><tr><th>군집</th><th class="num">비율</th>' +
      F.map(function (f) { return '<th>' + esc(f) + (neg(f) ? '*' : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
    profiles.forEach(function (p, i) {
      h += '<tr data-pid="' + p.id + '" class="' + (sel === p.id ? 'is-sel' : '') + '"><td><span class="lg-key ' + CLS[i] + '"></span> <strong>' + esc(p.name) + '</strong></td><td class="num">' + Math.round(p.n / N * 100) + '%</td>' +
        p.mean.map(function (v, j) {
          var l = lvl(v), good = neg(F[j]) ? l === 'lo' : l === 'hi', bad = neg(F[j]) ? l === 'hi' : l === 'lo';
          return '<td><span class="sc-cell ' + (good ? 'good' : bad ? 'bad' : '') + '" data-tip="' + esc(p.name + ' · ' + F[j] + ' 평균 ' + f2(v)) + '">' + mark[l] + '</span></td>';
        }).join('') + '</tr>';
    });
    document.getElementById('sc-pattern').innerHTML = h + '</tbody></table></div>';
  }

  // ---------- 3. 군집별 맞춤 지원 ----------
  function renderCards() {
    document.getElementById('sc-clusters').innerHTML = profiles.map(function (p, i) {
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (sel === p.id) + '" data-pid="' + p.id + '">' +
        '<span class="persona-avatar sc-av-' + CLS[i] + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + Math.round(p.n / N * 100) + '% · ' + p.n + '명</span><span class="persona-name">' + esc(p.name) + '</span></span></button>';
    }).join('');
  }
  function renderSolution() {
    var p = profileOf(sel), i = profiles.indexOf(p);
    var all = F.map(function (_, j) { return mean(profiles.map(function (x) { return x.mean[j] * x.n; })) * profiles.length / N; });
    var strong = [], weak = [];
    F.forEach(function (f, j) { var l = lvl(p.mean[j]); var tag = f + (l === 'hi' ? ' 높음' : ' 낮음') + ' (' + p.mean[j].toFixed(1) + ')'; if (neg(f) ? l === 'lo' : l === 'hi') strong.push(tag); if (neg(f) ? l === 'hi' : l === 'lo') weak.push(tag); });
    function block(title, tag, list) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + list.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    var series = [{ label: '전체 평균', values: all, cls: 'ref', dashed: true }, { label: p.name, values: p.mean, cls: CLS[i] }];
    document.getElementById('sc-solution').innerHTML =
      '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' + radar(series, p.name + ' 군집 평균') + '</div></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">군집</span><strong class="lm-pname">' + esc(p.name) + '</strong><span class="la-level-type">' + Math.round(p.n / N * 100) + '%</span></div>' +
      '<p class="pr-summary">' + esc(p.summary) + '</p>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">지켜 주는 힘</span></h3><ul>' + (strong.length ? strong : ['뚜렷하게 높은 요인 없음']).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">돌봐야 할 부분</span></h3><ul>' + (weak.length ? weak : ['뚜렷하게 취약한 요인 없음']).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div></div>' +
      block('조직 내 지원 요소', '조직', p.org) + block('현 상태를 극복하는 행동 조언', '개인', p.self) +
      '</div></div>';
  }
  function select(id) {
    sel = id; renderPattern(); renderCards(); renderSolution();
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-pid]'); if (!b) return;
    select(b.dataset.pid);
    if (b.classList.contains('sc-pcard') || b.tagName === 'TR') document.getElementById('sc-solution-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    F = d.factors; NEG = d.negative; profiles = d.profiles; personas = d.personas; N = d.n;
    sel = profiles[0].id; renderPersonas(); select(sel);
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
