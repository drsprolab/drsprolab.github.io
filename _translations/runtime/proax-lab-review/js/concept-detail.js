/* PRO-AX Lab Review — Concept map 본문 보기
 * ?id=<recordId> 로 제출된 개념 지도를 읽기 전용으로 렌더링합니다.
 * 도식은 업로드 시 받은 파일 참조(cm_diagram_ref)를 그대로 사용합니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var MD = window.MD;
  var row = null;
  var all = [];
  var els = { detail: document.getElementById('detail') };

  function currentId() {
    return new URLSearchParams(window.location.search).get('id');
  }

  function avatar(name) {
    var h = PL.hue(name);
    return '<span class="avatar" style="background:hsl(' + h + ',32%,92%);color:hsl(' + h + ',42%,34%)" aria-hidden="true">' +
      PL.esc(PL.initials(name)) + '</span>';
  }

  function fileUrl(ref) {
    return PL.fileUrl('concept-maps', ref);
  }

  function emptyState(title, message) {
    return "<a class=\"daily-back\" href=\"index.html\">← Back to all entries</a>" +
      '<div class="empty"><strong>' + PL.esc(title) + '</strong>' + message + ' ' +
      "<a href=\"index.html\">Back to all entries</a></div>";
  }

  function render() {
    if (!row) {
      els.detail.innerHTML = emptyState("Concept map not found", "Check the <code>?id</code> value in the URL.");
      return;
    }

    document.title = PL.weekShort(row.week_key) + ' Concept map · PRO-AX Lab Review';

    var html = '<article class="page">';
    html += "<a class=\"daily-back\" href=\"index.html\">← Back to all entries</a>";

    html += '<header class="page-head">';
    if (String(row.best_of_week).toLowerCase() === 'true') {
      html += '<div><span class="best-week-badge">Best Review of Week</span></div>';
    }
    html += '<div class="eyebrow">' +
      '<time datetime="' + PL.esc(row.submitted_at || '') + '">' + PL.esc(PL.fmtDate(row.submitted_at)) + '</time> · ' +
      PL.esc(PL.weekShort(row.week_key)) + ' · CONCEPT MAP</div>';
    html += '<div class="entry-by" style="gap:9px">' + avatar(row.student || '') +
      '<span style="font-size:15px;font-weight:600">' + PL.esc(row.student || "(No author listed)") + '</span>' +
      PL.submitTime(row, 'concept_maps') + '</div>';
    html += '<h1>' + PL.esc(PL.weekLabel(row.week_key)) + ' Concept map</h1>';
    html += '</header>';

    /* 1. 이론과 개념 */
    html += '<section class="body-item">' +
      "<div class=\"body-item-head\"><span class=\"body-num\">1</span><h2>Key theories and concepts</h2></div>" +
      '<div class="qa-a">' + (MD.render(row.cm_theory) || "<p class=\"qa-empty\">No response provided.</p>") + '</div>' +
    '</section>';

    /* 2. 도식화 */
    html += '<section class="body-item">' +
      "<div class=\"body-item-head\"><span class=\"body-num\">2</span><h2>Diagram</h2></div>";
    if (row.cm_diagram_ref) {
      html += '<figure class="cm-figure">' +
        '<img id="diagram" src="' + PL.esc(fileUrl(row.cm_diagram_ref)) + "\" alt=\"Concept map diagram — " +
          PL.esc(row.student || '') + ' ' + PL.esc(PL.weekShort(row.week_key)) + '" loading="lazy" />' +
        (row.cm_diagram_name ? '<figcaption>' + PL.esc(row.cm_diagram_name) + '</figcaption>' : '') +
      '</figure>' +
      "<p class=\"dz-hint\" id=\"imgNote\" hidden>The diagram could not be loaded. The image may not yet be available.</p>";
    } else {
      html += "<p class=\"qa-empty\">No diagram attached.</p>";
    }
    html += '</section>';

    /* 3. 설명 */
    html += '<section class="body-item">' +
      "<div class=\"body-item-head\"><span class=\"body-num\">3</span><h2>Explain your concept map</h2></div>" +
      '<div class="qa-a">' + (MD.render(row.cm_explanation) || "<p class=\"qa-empty\">No response provided.</p>") + '</div>' +
    '</section>';

    /* 정보 */
    html += '<section class="dsection">' +
      "<div class=\"dsection-head\"><span class=\"dsection-num\">INFO</span><h2>Submission details</h2></div>" +
      '<dl class="metagrid">' +
        "<div><dt>Submitted by</dt><dd>" + PL.esc(row.student || '–') + '</dd></div>' +
        "<div><dt>Week</dt><dd>" + PL.esc(PL.weekLabel(row.week_key)) + '</dd></div>' +
        "<div><dt>Submission date</dt><dd>" + PL.esc(PL.fmtDate(row.submitted_at) || '–') + '</dd></div>' +
        "<div><dt>Submission time</dt><dd>" + (PL.submitTime(row, 'concept_maps') || '–') + '</dd></div>' +
        "<div><dt>Diagram file</dt><dd>" + PL.esc(row.cm_diagram_name || '–') + '</dd></div>' +
      '</dl>' +
    '</section>';

    html += nav();
    html += '</article>';

    els.detail.innerHTML = html;

    var img = document.getElementById('diagram');
    if (img) {
      img.addEventListener('error', function () {
        img.hidden = true;
        var note = document.getElementById('imgNote');
        if (note) note.hidden = false;
      });
    }
  }

  function nav() {
    var ordered = all.slice().sort(function (a, b) {
      var ka = String(a.week_key || '');
      var kb = String(b.week_key || '');
      if (ka !== kb) return ka.localeCompare(kb);
      return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
    });
    var i = -1;
    for (var k = 0; k < ordered.length; k += 1) if (ordered[k].id === row.id) { i = k; break; }

    var prev = i > 0 ? ordered[i - 1] : null;
    var next = i >= 0 && i < ordered.length - 1 ? ordered[i + 1] : null;

    function link(r, dir) {
      var t = PL.weekShort(r.week_key) + ' · ' + (r.student || '');
      return '<a href="concept-detail.html?id=' + encodeURIComponent(r.id) + '">' +
        (dir === 'prev' ? '← ' + PL.esc(t) : PL.esc(t) + ' →') + '</a>';
    }

    return "<nav class=\"post-nav\" aria-label=\"Other concept maps\">" +
      '<span>' + (prev ? link(prev, 'prev') : "<a href=\"index.html\">← Back to all entries</a>") + '</span>' +
      '<span>' + (next ? link(next, 'next') : "<a href=\"index.html\">All entries →</a>") + '</span>' +
    '</nav>';
  }

  function boot() {
    var id = currentId();
    if (!id) {
      els.detail.innerHTML = emptyState("Concept map not found", "The URL requires an <code>?id</code> value.");
      return;
    }

    els.detail.innerHTML = '<div class="skeleton" style="height:280px"></div>';

    PL.table('concept_maps').get(id)
      .then(function (record) {
        row = record;
        render();
        return PL.table('concept_maps').list();
      })
      .then(function (rows) {
        all = rows || [];
        if (row) render();
      })
      .catch(function (err) {
        row = null;
        els.detail.innerHTML = emptyState("Concept maps could not be loaded", PL.esc(err.message || "Network error"));
        PL.toast("The concept map could not be loaded.", 'err');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
