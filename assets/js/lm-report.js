// Learning Motivation 진단 리포트: 개인별 레이더와 LPA(잠재프로파일) 그룹별 맞춤 솔루션.
// 데이터: assets/data/lm-profiles.json (가상 예시)
(function () {
  var root = document.getElementById('lm-report');
  if (!root) return;
  var tip = document.getElementById('lm-tip');
  var F, burden, profiles, people, byProfile = {}, selPerson = null, selProfile = null;
  var CLS = ['s1', 's2', 's3', 's4'];

  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function f2(v) { return v.toFixed(2); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isBurden(f) { return burden.indexOf(f) >= 0; }

  function radar(series, label) {
    var n = F.length, W = 460, H = 420, cx = W / 2, cy = H / 2 + 4, R = 140;
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
      s += '<text x="' + l[0] + '" y="' + (l[1] + 4) + '" text-anchor="' + anchor + '" class="rd-label' + (isBurden(name) ? ' rd-burden' : '') + '">' + esc(name) + (isBurden(name) ? '*' : '') + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>'; });
    series.forEach(function (se) {
      if (se.dashed) return;
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="12" class="rd-hit" data-tip="' + esc(se.label + ' · ' + F[i] + ' ' + f2(v)) + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join('');
  }
  function profileOf(id) { return profiles.find(function (p) { return p.id === id; }); }
  function clsOf(id) { return CLS[profiles.indexOf(profileOf(id)) % CLS.length]; }
  // 동기 요인은 높을수록, 부담 요인은 낮을수록 좋은 방향
  function highlights(values) {
    var pos = F.map(function (f, j) { return { f: f, v: values[j] }; }).filter(function (x) { return !isBurden(x.f); });
    var neg = F.map(function (f, j) { return { f: f, v: values[j] }; }).filter(function (x) { return isBurden(x.f); });
    return {
      hi: pos.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 2),
      lo: pos.slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 2),
      burden: neg.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 2)
    };
  }

  // ---------- 1. 개인별 프로파일 ----------
  function renderPerson() {
    var p = people.find(function (x) { return x.id === selPerson; }), pr = profileOf(p.profile);
    document.getElementById('lm-person-select').value = p.id;
    var series = [{ label: pr.name + ' 평균', values: pr.mean, cls: 'ref', dashed: true }, { label: p.id, values: p.scores, cls: clsOf(pr.id) }];
    var h = highlights(p.scores);
    function li(x) { return '<li><strong>' + esc(x.f) + '</strong> <span class="pd-score">' + x.v.toFixed(1) + '</span></li>'; }
    document.getElementById('lm-person').innerHTML =
      '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' + radar(series, p.id + ' 학습동기 프로파일') + '</div></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">' + esc(p.id) + '의 소속 프로파일</span><strong class="lm-pname">' + esc(pr.name) + '</strong>' +
      '<button type="button" class="pf-chip" data-goto="' + pr.id + '">맞춤 솔루션 보기 ↓</button></div>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">동기 강점</span></h3><ul>' + h.hi.map(li).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">보완할 동기</span></h3><ul>' + h.lo.map(li).join('') + '</ul></div></div>' +
      '<div class="pd-block"><h3><span class="chip">크게 느끼는 부담</span></h3><ul>' + h.burden.map(li).join('') + '</ul></div>' +
      '<p class="lvr-note">* 표시 요인(노력·기회·심리비용, 수행회피목표)은 점수가 높을수록 학습 부담이 크다는 뜻입니다.</p></div></div>';
  }

  // ---------- 2. LPA 프로파일 ----------
  function renderProfiles() {
    var series = profiles.map(function (p, i) { return { label: p.name + ' (' + Math.round(p.n / people.length * 100) + '%)', values: p.mean, cls: CLS[i % CLS.length] }; });
    document.getElementById('lm-legend-lpa').innerHTML = legend(series);
    document.getElementById('lm-radar-lpa').innerHTML = radar(series, '잠재프로파일별 학습동기 평균');
    document.getElementById('lm-share').innerHTML = profiles.map(function (p, i) {
      var pct = Math.round(p.n / people.length * 100);
      return '<div class="lm-share-row"><span class="lm-share-name"><span class="lg-key ' + CLS[i % CLS.length] + '"></span>' + esc(p.name) + '</span>' +
        '<span class="lm-share-track"><span class="lm-share-bar ' + CLS[i % CLS.length] + '" style="width:' + pct + '%"></span></span><span class="lm-share-val">' + pct + '% · ' + p.n + '명</span></div>';
    }).join('');
  }
  function renderProfileCards() {
    document.getElementById('lm-profiles').innerHTML = profiles.map(function (p, i) {
      return '<button type="button" class="persona-card" role="tab" aria-selected="' + (selProfile === p.id) + '" data-pid="' + p.id + '">' +
        '<span class="persona-avatar lm-av-' + CLS[i % CLS.length] + '" aria-hidden="true">' + (i + 1) + '</span>' +
        '<span class="persona-meta"><span class="persona-type">' + esc(p.hrd) + '</span><span class="persona-name">' + esc(p.name) + ' <small>' + Math.round(p.n / people.length * 100) + '% · ' + p.n + '명</small></span></span></button>';
    }).join('');
  }
  function renderSolution() {
    var p = profileOf(selProfile), i = profiles.indexOf(p), h = highlights(p.mean);
    var all = F.map(function (_, j) { return mean(people.map(function (x) { return x.scores[j]; })); });
    var series = [{ label: '전체 구성원 평균', values: all, cls: 'ref', dashed: true }, { label: p.name, values: p.mean, cls: CLS[i % CLS.length] }];
    function li(x) { return '<li><strong>' + esc(x.f) + '</strong> <span class="pd-score">' + x.v.toFixed(2) + '</span></li>'; }
    function block(title, tag, list) { return '<div class="pd-block"><h3>' + title + '</h3><ul class="pd-acts">' + list.map(function (a) { return '<li><span class="pd-tag">' + tag + '</span>' + esc(a) + '</li>'; }).join('') + '</ul></div>'; }
    document.getElementById('lm-solution').innerHTML =
      '<div class="pr-grid"><div><div class="legend">' + legend(series) + '</div><div class="radar-box">' + radar(series, p.name + ' 프로파일') + '</div></div>' +
      '<div class="pr-diag"><div class="la-level"><span class="la-level-k">HRD 지원 수준</span><strong class="lm-pname">' + esc(p.hrd) + '</strong><span class="la-level-type">' + esc(p.name) + '</span></div>' +
      '<p class="pr-summary">' + esc(p.summary) + '</p>' +
      '<div class="la-combo"><div class="pd-block"><h3><span class="chip good">높은 동기</span></h3><ul>' + h.hi.map(li).join('') + '</ul></div>' +
      '<div class="pd-block"><h3><span class="chip warn">낮은 동기</span></h3><ul>' + h.lo.map(li).join('') + '</ul></div></div>' +
      '<p class="la-combo-line">조합: <strong>' + h.hi.map(function (x) { return x.f; }).join('·') + '</strong> 높음 × <strong>' + h.lo.map(function (x) { return x.f; }).join('·') + '</strong> 낮음 · 부담 <strong>' + h.burden.map(function (x) { return x.f; }).join('·') + '</strong></p>' +
      block('교육환경 구축', '조직·HRD', p.env) + block('구성원 학습 활동', '개인·관리자', p.act) +
      '</div></div>';
  }

  root.addEventListener('change', function (e) { if (e.target.id === 'lm-person-select') { selPerson = e.target.value; renderPerson(); } });
  root.addEventListener('click', function (e) {
    var g = e.target.closest('[data-goto]');
    if (g) { selProfile = g.dataset.goto; renderProfileCards(); renderSolution(); document.getElementById('lm-solution-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    var c = e.target.closest('[data-pid]'); if (c) { selProfile = c.dataset.pid; renderProfileCards(); renderSolution(); }
  });
  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  fetch(root.dataset.src).then(function (r) { return r.json(); }).then(function (d) {
    F = d.factors; burden = d.burden; profiles = d.profiles; people = d.people;
    document.getElementById('lm-person-select').innerHTML = profiles.map(function (p) {
      return '<optgroup label="' + esc(p.name) + '">' + people.filter(function (x) { return x.profile === p.id; }).map(function (x) { return '<option value="' + x.id + '">' + x.id + ' · ' + esc(p.name) + '</option>'; }).join('') + '</optgroup>';
    }).join('');
    selPerson = people.filter(function (x) { return x.profile === profiles[0].id; })[0].id; selProfile = profiles[0].id;
    renderPerson(); renderProfiles(); renderProfileCards(); renderSolution();
  }).catch(function () { root.innerHTML = '<p class="report-foot">데이터를 불러오지 못했습니다.</p>'; });
})();
