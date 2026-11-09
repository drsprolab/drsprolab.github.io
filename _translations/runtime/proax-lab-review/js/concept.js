/* PRO-AX Lab Review — Concept map 제출
 * 흐름: 기본 정보 → ① 이론과 개념(직접 타이핑) → ② 도식 이미지(드래그 앤 드롭 업로드)
 *       → ③ Conceptual Map 설명(직접 타이핑) → [확인하기] 문서형 1장 → [제출하기]
 *
 * 도식은 먼저 구글 드라이브에 올리고(PL.upload), 돌려받은 파일 id(reference)만
 * concept_maps 행에 저장합니다. (미리보기 모드에서는 이 브라우저에 data URL 로 저장)
 */
(function () {
  'use strict';

  var PL = window.PL;
  var MD = window.MD;
  var DRAFT_KEY = 'proax-concept-draft-v1';
  var COLLECTION = 'concept-maps';
  var MAX_BYTES = 10 * 1024 * 1024; // 10MiB

  var state = {
    week: PL.weekKey(),
    file: null,
    dirty: false,
    step: 'form',
    uploading: false
  };

  var els = {
    formView: document.getElementById('formView'),
    confirmView: document.getElementById('confirmView'),
    sheet: document.getElementById('sheet'),
    sheetSummary: document.getElementById('sheetSummary'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    previewWrap: document.getElementById('previewWrap'),
    preview: document.getElementById('preview'),
    fileName: document.getElementById('fileName'),
    removeFile: document.getElementById('removeFile'),
    dzHint: document.getElementById('dzHint'),
    fillCount: document.getElementById('fillCount'),
    saveState: document.getElementById('saveState'),
    draftBtn: document.getElementById('draftBtn'),
    confirmBtn: document.getElementById('confirmBtn')
  };

  function el(id) { return document.getElementById(id); }
  function val(id) { return (el(id) && el(id).value || '').trim(); }

  /* ---------- 주차 ---------- */

  function renderWeeks() {
    var keys = PL.lastNWeeks(10, true).reverse();
    if (keys.indexOf(state.week) === -1) keys.unshift(state.week);
    el('f-week').innerHTML = keys.map(function (k) {
      return '<option value="' + PL.esc(k) + '"' + (k === state.week ? ' selected' : '') + '>' +
        PL.esc(PL.weekLabel(k)) + '</option>';
    }).join('');
  }

  /* ---------- 도식 파일 선택 ---------- */

  function human(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function setHint(text, isError) {
    els.dzHint.textContent = text;
    els.dzHint.className = 'dz-hint' + (isError ? ' is-err' : '');
  }

  function clearFile() {
    if (state.file && els.preview.src) URL.revokeObjectURL(els.preview.src);
    state.file = null;
    els.preview.removeAttribute('src');
    els.previewWrap.hidden = true;
    els.dropzone.hidden = false;
    els.dropzone.classList.remove('is-filled', 'is-over');
    els.fileInput.value = '';
    setHint("Your diagram will be uploaded when you submit.", false);
    refreshCount();
  }

  function acceptFile(file) {
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      setHint("Please choose an image file: PNG, JPG, WEBP, or GIF.", true);
      PL.toast("Only image files are supported.", 'err');
      return;
    }
    if (file.size > MAX_BYTES) {
      setHint("The file is too large (" + human(file.size) + "). Please choose a file of 10 MB or less.", true);
      PL.toast("The file is too large. Please choose a file of 10 MB or less.", 'err');
      return;
    }

    state.file = file;
    state.dirty = true;

    if (els.preview.src) URL.revokeObjectURL(els.preview.src);
    els.preview.src = URL.createObjectURL(file);
    els.preview.alt = "Diagram preview — " + file.name;
    els.fileName.textContent = file.name + ' · ' + human(file.size);
    els.previewWrap.hidden = false;
    els.dropzone.hidden = true;
    setHint("This file will be uploaded when you submit.", false);
    refreshCount();
  }

  function bindDropzone() {
    els.dropzone.addEventListener('click', function () { els.fileInput.click(); });
    els.dropzone.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        els.fileInput.click();
      }
    });
    els.fileInput.addEventListener('change', function () {
      acceptFile(els.fileInput.files && els.fileInput.files[0]);
    });

    ['dragenter', 'dragover'].forEach(function (type) {
      els.dropzone.addEventListener(type, function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        els.dropzone.classList.add('is-over');
      });
    });
    ['dragleave', 'dragend'].forEach(function (type) {
      els.dropzone.addEventListener(type, function (ev) {
        ev.preventDefault();
        els.dropzone.classList.remove('is-over');
      });
    });
    els.dropzone.addEventListener('drop', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      els.dropzone.classList.remove('is-over');
      var files = ev.dataTransfer && ev.dataTransfer.files;
      acceptFile(files && files[0]);
    });

    els.removeFile.addEventListener('click', clearFile);

    // 페이지 어디로든 파일을 떨어뜨려도 브라우저가 파일을 열지 않게 합니다.
    ['dragover', 'drop'].forEach(function (type) {
      window.addEventListener(type, function (ev) {
        if (ev.target === els.dropzone || els.dropzone.contains(ev.target)) return;
        ev.preventDefault();
      });
    });
  }

  /* ---------- 작성 개수 ---------- */

  function refreshCount() {
    var filled = 0;
    if (val('ta-cm_theory')) filled += 1;
    if (state.file) filled += 1;
    if (val('ta-cm_explanation')) filled += 1;

    ['cm_theory', 'cm_explanation'].forEach(function (n) {
      var node = el('ta-' + n);
      var len = node ? node.value.trim().length : 0;
      var cnt = document.querySelector('[data-count="' + n + '"]');
      if (cnt) {
        cnt.textContent = len + " characters";
        cnt.style.color = len ? 'var(--ink)' : 'var(--muted)';
      }
    });

    var cnt = document.querySelector('[data-count="cm_diagram"]');
    if (cnt) cnt.textContent = state.file ? "1 item" : "0 items";

    els.fillCount.textContent = filled + ' / 3';
    return filled;
  }

  /* ---------- 임시 저장 (텍스트만) ---------- */

  function collect() {
    return {
      student: val('f-student'),
      week_key: el('f-week').value || state.week,
      submitted_at: val('f-date') || PL.today(),
      cm_theory: val('ta-cm_theory'),
      cm_explanation: val('ta-cm_explanation')
    };
  }

  function saveDraft(silent) {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ meta: collect(), savedAt: Date.now() }));
      els.saveState.textContent = "Draft saved · " + PL.fmtDateTime(Date.now()) +
        (state.file ? " (Diagram files are not included in saved drafts.)" : '');
      state.dirty = false;
      if (!silent) PL.toast("Draft saved in this browser.", 'ok');
    } catch (e) {
      if (!silent) PL.toast("Your draft could not be saved.", 'err');
    }
  }

  function readDraft() {
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* 무시 */ }
    els.saveState.textContent = "No draft saved";
  }

  /* ---------- 확인 문서 ---------- */

  function buildSheet() {
    var d = collect();
    var firstLine = String(d.cm_theory || '').split('\n')[0].trim();

    var html = PL.rptHead({
      eyebrow: [PL.fmtDate(d.submitted_at), 'Concept Map', PL.weekShort(d.week_key)],
      title: firstLine || PL.weekLabel(d.week_key) + ' Concept map',
      tags: [PL.weekLabel(d.week_key)],
      who: d.student,
      meta: ["Approx. " + PL.readMinutes(d.cm_theory + d.cm_explanation) + " min"]
    });

    html += PL.rptSection(1, "Key theories and concepts", PL.rptBody(d.cm_theory));

    html += PL.rptSection(2, "Diagram", state.file
      ? '<figure class="rpt-figure"><img src="' + PL.esc(els.preview.src) + "\" alt=\"Concept map diagram\" />" +
        "<figcaption><b>Figure 1.</b> " + PL.esc(d.student || '') + " — concept map (" + PL.esc(PL.weekShort(d.week_key)) + ')</figcaption></figure>'
      : "<p class=\"doc-empty\">No diagram attached.</p>");

    html += PL.rptSection(3, "Explain your concept map", PL.rptBody(d.cm_explanation));

    els.sheet.innerHTML = html;

    var missing = [];
    if (!d.cm_theory) missing.push("Item 1");
    if (!state.file) missing.push("Item 2");
    if (!d.cm_explanation) missing.push("Item 3");
    els.sheetSummary.textContent = missing.length
      ? "Empty items: " + missing.join(', ')
      : "All three items are ready.";
  }

  function goConfirm() {
    var d = collect();
    if (!d.student) {
      PL.toast("Please enter your name.", 'err');
      el('f-student').focus();
      return;
    }
    if (!d.cm_theory) {
      PL.toast("Please complete item 1 (theories and concepts).", 'err');
      el('ta-cm_theory').focus();
      return;
    }
    buildSheet();
    state.step = 'confirm';
    document.body.classList.add('is-confirm');
    els.formView.hidden = true;
    els.confirmView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function goForm() {
    state.step = 'form';
    document.body.classList.remove('is-confirm');
    els.confirmView.hidden = true;
    els.formView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------- 업로드 ---------- */

  function uploadDiagram(file) {
    return PL.upload(COLLECTION, file);
  }

  /* ---------- 제출 ---------- */

  function setSubmitting(on) {
    state.uploading = on;
    [el('submitBtn'), el('submitBtn2')].forEach(function (b) {
      if (!b) return;
      b.disabled = on;
      b.textContent = on ? "Saving…" : "Submit";
    });
  }

  function submit() {
    var d = collect();
    var missing = [];
    if (!d.cm_theory) missing.push("Item 1");
    if (!d.cm_explanation) missing.push("Item 3");

    var msg = (missing.length
      ? "Some items are empty (" + missing.join(', ') + "). Submit anyway?"
      : "Submit this entry?");
    if (!window.confirm(msg)) return;

    setSubmitting(true);

    var chain = state.file ? uploadDiagram(state.file) : Promise.resolve(null);

    chain
      .then(function (uploaded) {
        var row = {
          student: d.student,
          week_key: d.week_key,
          submitted_at: d.submitted_at,
          cm_theory: d.cm_theory,
          cm_explanation: d.cm_explanation,
          cm_diagram_ref: uploaded ? uploaded.reference : '',
          cm_diagram_name: uploaded ? (uploaded.original_filename || state.file.name) : '',
          cm_diagram_type: uploaded ? (uploaded.content_type || state.file.type) : '',
          cm_diagram_size: uploaded ? (uploaded.size || state.file.size) : 0
        };
        return PL.table('concept_maps').create(row);
      })
      .then(function (saved) {
        clearDraft();
        state.step = 'done';
        PL.toast("Concept map submitted.", 'ok');
        PL.showSubmitted({ id: saved.id, kind: 'maps' });
      })
      .catch(function (err) {
        PL.toast(err.message || "Submission failed.", 'err');
        setSubmitting(false);
      });
  }

  /* ---------- 이벤트 ---------- */

  function bind() {
    el('f-week').addEventListener('change', function () { state.dirty = true; });
    el('f-student').addEventListener('input', function () { state.dirty = true; });
    el('f-date').addEventListener('change', function () { state.dirty = true; });

    ['ta-cm_theory', 'ta-cm_explanation'].forEach(function (id) {
      el(id).addEventListener('input', function () { state.dirty = true; refreshCount(); });
    });

    els.draftBtn.addEventListener('click', function () { saveDraft(false); });
    els.confirmBtn.addEventListener('click', goConfirm);
    el('backBtn').addEventListener('click', goForm);
    el('backBtn2').addEventListener('click', goForm);
    el('draftPdfBtn').addEventListener('click', function () {
      var d = collect();
      PL.printPdf('ConceptMap_' + d.student + '_' + d.week_key);
    });
    el('submitBtn').addEventListener('click', submit);
    el('submitBtn2').addEventListener('click', submit);

    setInterval(function () {
      if (state.dirty && state.step === 'form') saveDraft(true);
    }, 15000);

    window.addEventListener('beforeunload', function (ev) {
      if (state.dirty && state.step === 'form') {
        saveDraft(true);
        ev.preventDefault();
        ev.returnValue = '';
      }
    });
  }

  /* ---------- 시작 ---------- */

  function boot() {
    renderWeeks();
    el('f-date').value = PL.today();
    bind();
    bindDropzone();
    if (window.TYPING) window.TYPING.applyAll();

    var draft = readDraft();
    if (draft && draft.meta && draft.meta.student) {
      if (draft.meta.week_key) {
        state.week = draft.meta.week_key;
        renderWeeks();
        el('f-week').value = draft.meta.week_key;
      }
      el('f-student').value = draft.meta.student || '';
      el('ta-cm_theory').value = draft.meta.cm_theory || '';
      el('ta-cm_explanation').value = draft.meta.cm_explanation || '';
      els.saveState.textContent = "Draft restored · " + PL.fmtDateTime(draft.savedAt);
    }

    refreshCount();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
