/* LO_Review — 관리자용 주차별 Conceptual Map PDF 저장
 * 브라우저 인쇄 기능은 화면에 표시되는 Drive 이미지를 그대로 PDF에 포함합니다.
 */
(function () {
  'use strict';

  var PL = window.PL;
  var currentRows = [];
  var currentAdminMode = false;

  function esc(value) { return PL.esc(value === null || value === undefined ? '' : value); }

  function groupsByWeek(rows) {
    var groups = {};
    (rows || []).forEach(function (row) {
      var key = String(row.week_key || '');
      (groups[key] = groups[key] || []).push(row);
    });
    return Object.keys(groups).sort(function (a, b) { return b.localeCompare(a); }).map(function (key) {
      return {
        key: key,
        rows: groups[key].sort(function (a, b) {
          return String(a.student || '').localeCompare(String(b.student || ''), 'ko');
        })
      };
    });
  }

  function entryHtml(row, index) {
    var theory = window.MD ? window.MD.render(row.cm_theory || '') : '<p>' + esc(row.cm_theory || '') + '</p>';
    var explanation = window.MD ? window.MD.render(row.cm_explanation || '') : '<p>' + esc(row.cm_explanation || '') + '</p>';
    var ref = String(row.cm_diagram_ref || '').trim();
    var diagram = '';
    if (ref) {
      var url = esc(PL.fileUrl('concept-maps', ref));
      diagram = '<figure><img src="' + url + '" alt="' + esc(row.cm_diagram_name || '제출 도식') + '" loading="eager">' +
        '<figcaption>' + (row.cm_diagram_name ? esc(row.cm_diagram_name) + ' · ' : '') +
        '<a href="' + url + '" target="_blank" rel="noopener noreferrer">원본 도식 보기</a></figcaption></figure>';
    } else {
      diagram = '<p class="empty">도식 이미지가 제출되지 않았습니다.</p>';
    }
    return '<article class="entry">' +
      '<div class="kicker">CONCEPTUAL MAP · ' + String(index + 1).padStart(2, '0') + '</div>' +
      '<h2>' + esc(row.student || '이름 없음') + '</h2>' +
      '<p class="meta">' + esc(PL.weekLabel(row.week_key)) + ' · 제출일 ' + esc(PL.fmtDate(row.submitted_at) || '–') + '</p>' +
      '<section><h3>1. 중점적으로 보는 이론과 개념</h3><div class="body-copy">' + (theory || '<p>작성되지 않았습니다.</p>') + '</div></section>' +
      '<section><h3>2. 도식화</h3>' + diagram + '</section>' +
      '<section><h3>3. Conceptual Map 설명</h3><div class="body-copy">' + (explanation || '<p>작성되지 않았습니다.</p>') + '</div></section>' +
    '</article>';
  }

  function printDocument(week, rows) {
    var key = String(week || '주차없음').replace(/[^0-9A-Za-z가-힣_-]+/g, '-');
    var title = 'LO_Review_' + key + '_ConceptualMap';
    var popup = window.open('', '_blank');
    if (!popup) throw new Error('인쇄 창이 차단되었습니다. 이 사이트의 팝업을 허용하고 다시 눌러 주세요.');

    var html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600&display=swap">' +
      '<style>' +
      '@page{size:A4;margin:15mm 14mm}' +
      '*{box-sizing:border-box}body{margin:0;background:#fff;color:#192331;font:11pt/1.65 "IBM Plex Sans KR",Arial,sans-serif;word-break:keep-all}' +
      '.toolbar{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid #dce2e8;background:#f3f5f8;font-size:13px}' +
      '.toolbar button{border:0;border-radius:8px;padding:9px 14px;background:#1d4f86;color:#fff;font:600 14px "IBM Plex Sans KR",Arial,sans-serif;cursor:pointer}' +
      '.document{max-width:182mm;margin:20px auto;padding:0 12px}.doc-head{padding:0 0 15px;border-bottom:2px solid #1d4f86}' +
      '.doc-head h1{margin:0;font-size:23px;line-height:1.4}.doc-head p{margin:5px 0 0;color:#667587;font-size:13px}' +
      '.entry{padding:23px 0 18px}.entry+.entry{break-before:page;page-break-before:always}' +
      '.kicker{color:#667587;font-size:11px;letter-spacing:.08em}.entry h2{margin:5px 0 0;font-size:21px}.meta{margin:4px 0 18px;color:#667587;font-size:12px}' +
      '.entry section{margin:19px 0 0;padding-top:12px;border-top:1px solid #dce2e8}.entry h3{margin:0 0 7px;color:#1d4f86;font-size:15px;break-after:avoid-page}' +
      '.body-copy{overflow-wrap:anywhere}.body-copy p{margin:0 0 9px}.body-copy h1,.body-copy h2,.body-copy h3,.body-copy h4{margin:12px 0 7px;font-size:14px}' +
      '.body-copy ul,.body-copy ol{margin:0 0 9px;padding-left:22px}.body-copy blockquote{margin:8px 0;padding:4px 11px;border-left:3px solid #9eafbf;color:#566577}' +
      'figure{margin:8px 0 0;break-inside:avoid-page;page-break-inside:avoid}figure img{display:block;max-width:100%;max-height:210mm;margin:0 auto;object-fit:contain}' +
      'figcaption{margin-top:5px;color:#667587;font-size:11px;text-align:center}.empty{color:#667587;font-size:12px}' +
      '.image-warning{display:none;margin:10px 18px;padding:10px 12px;border:1px solid #b54708;border-radius:6px;color:#8a3508;font-size:13px}' +
      '@media print{.toolbar,.image-warning{display:none!important}.document{max-width:none;margin:0;padding:0}.doc-head{break-after:avoid-page}a{color:inherit;text-decoration:none}}' +
      '</style></head><body>' +
      '<div class="toolbar"><span>주차별 제출물 · 인쇄 창에서 <strong>PDF로 저장</strong>을 선택하세요.</span><button type="button" id="printButton">PDF로 저장 / 인쇄</button></div>' +
      '<p class="image-warning" id="imageWarning">일부 도식 이미지를 불러오지 못했습니다. 원본 도식 링크를 확인한 뒤 다시 시도해 주세요.</p>' +
      '<main class="document"><header class="doc-head"><h1>' + esc(PL.weekLabel(week)) + ' Conceptual Map 제출물</h1><p>총 ' + rows.length + '건 · LO_Review</p></header>' +
      rows.map(entryHtml).join('') + '</main></body></html>';

    try {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.document.getElementById('printButton').addEventListener('click', function () { popup.print(); });
    } catch (err) {
      popup.close();
      throw new Error('인쇄 문서를 열지 못했습니다. 다시 시도해 주세요.');
    }

    var images = Array.prototype.slice.call(popup.document.images);
    var imageLoads = images.map(function (img) {
      if (img.complete) return Promise.resolve(img.naturalWidth > 0);
      return new Promise(function (resolve) {
        var timer = setTimeout(function () { resolve(false); }, 30000);
        img.addEventListener('load', function () { clearTimeout(timer); resolve(true); }, { once: true });
        img.addEventListener('error', function () { clearTimeout(timer); resolve(false); }, { once: true });
      });
    });

    return Promise.all(imageLoads).then(function (loaded) {
      if (popup.closed) return;
      var failures = loaded.filter(function (ok) { return !ok; }).length;
      if (failures) {
        popup.document.getElementById('imageWarning').style.display = 'block';
        throw new Error(failures + '개 도식 이미지를 인쇄 창에서 불러오지 못했습니다. 원본 링크를 확인해 주세요.');
      }
      var ready = popup.document.fonts && popup.document.fonts.ready ? popup.document.fonts.ready : Promise.resolve();
      return ready.then(function () {
        if (popup.closed) return;
        popup.focus();
        popup.print();
      });
    });
  }

  function renderAdminMapPdf(panel, buttons, rows, adminMode) {
    if (!panel || !buttons) return;
    currentRows = rows || [];
    currentAdminMode = !!adminMode;
    if (!currentAdminMode || !PL.isBestAdmin()) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    var groups = groupsByWeek(currentRows);
    buttons.innerHTML = groups.length ? groups.map(function (group) {
      var label = group.key ? PL.weekShort(group.key) : '주차 미지정';
      return '<button type="button" class="btn btn-primary" data-map-pdf-week="' + esc(group.key) + '" aria-label="' + esc(label) + ' 제출물 전체 PDF 저장">' +
        esc(label) + ' PDF 저장 · ' + group.rows.length + '건</button>';
    }).join('') : '<p class="admin-pdf-empty">아직 제출된 Conceptual Map이 없습니다.</p>';

    if (!buttons.dataset.bound) {
      buttons.dataset.bound = 'true';
      panel.addEventListener('click', function (event) {
        var button = event.target.closest('[data-map-pdf-week]');
        if (!button || !buttons.contains(button)) return;
        if (!currentAdminMode || !PL.isBestAdmin()) {
          PL.toast('관리자 인증이 필요합니다.', 'err');
          return;
        }
        var week = button.getAttribute('data-map-pdf-week');
        var selected = currentRows.filter(function (row) { return String(row.week_key || '') === String(week || ''); });
        if (!selected.length) {
          PL.toast('해당 주차 제출물이 없습니다.', 'err');
          return;
        }
        var status = document.getElementById('mapPdfStatus');
        try {
          printDocument(week, selected).then(function () {
            if (status) status.textContent = '인쇄 창에서 대상을 PDF로 저장으로 선택해 파일을 저장하세요.';
          }).catch(function (err) {
            PL.toast(err.message || '인쇄 문서를 만들지 못했습니다.', 'err');
            if (status) status.textContent = err.message || '인쇄 문서를 만들지 못했습니다.';
          });
          if (status) status.textContent = '해당 주차 제출물 ' + selected.length + '건을 인쇄 창으로 열었습니다.';
        } catch (err) {
          PL.toast(err.message || '인쇄 문서를 만들지 못했습니다.', 'err');
          if (status) status.textContent = err.message || '인쇄 문서를 만들지 못했습니다.';
        }
      });
    }
  }

  PL.renderAdminMapPdf = renderAdminMapPdf;
})();
