/* HRD개론 과제 제출.
 * 저장소: 교수님 구글 시트 + Apps Script 웹앱(hrd-intro-backend/Code.gs).
 *   GET  ?action=list            → 제출 목록
 *   GET  ?action=folder          → 제출 PDF가 모이는 드라이브 폴더 주소
 *   POST {action:'submit', ...}  → PDF를 드라이브에 저장하고 시트에 한 줄 추가
 * GAS_URL이 비어 있으면 제출 칸을 막고 '준비 중' 안내를 띄운다.
 * 제출된 PDF는 '링크가 있는 모든 사용자 보기'로 공유되어 제출 현황에서 누구나 내려받는다.
 * 주소 끝에 ?admin 을 붙이면 드라이브 폴더 열기 버튼이 나온다. */
(function () {
  'use strict';
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbyQrVES1C4qbwWhBy3d5ggS5JXwu8CYuKC6q_7A8EWrSrjuQst_3ES8VN1AgLhwB5thhA/exec';
  var MAX_MB = 20;
  var MAX_MEMBERS = 8;
  var ADMIN = /[?&]admin\b/.test(location.search);
  var MINE_KEY = 'hrd-intro-submitted';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('subForm'), btn = $('submitBtn'), status = $('subStatus');
  var dz = $('dropzone'), fileInput = $('fileInput'), hint = $('dzHint');
  var membersBox = $('members');
  var file = null;

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function setStatus(text, kind) { status.textContent = text || ''; status.className = 'sub-status' + (kind ? ' is-' + kind : ''); }

  // ── 팀원 칸 ──
  function addMember(value) {
    if (membersBox.children.length >= MAX_MEMBERS) return;
    var row = document.createElement('div');
    row.className = 'member-row';
    var n = membersBox.children.length + 1;
    row.innerHTML = '<input type="text" maxlength="20" autocomplete="off" /><button class="btn btn-sm" type="button" aria-label="이 팀원 칸 지우기">삭제</button>';
    var input = row.querySelector('input');
    input.placeholder = n === 1 ? '이름 (예: 홍길동)' : '팀원 ' + n;
    input.setAttribute('aria-label', '팀원 ' + n + ' 이름');
    input.value = value || '';
    row.querySelector('button').addEventListener('click', function () {
      if (membersBox.children.length > 1) row.remove(); else input.value = '';
      $('addMember').disabled = false;
    });
    membersBox.appendChild(row);
    $('addMember').disabled = membersBox.children.length >= MAX_MEMBERS;
    return input;
  }
  for (var i = 0; i < 4; i++) addMember();
  $('addMember').addEventListener('click', function () { var el = addMember(); if (el) el.focus(); });
  function members() {
    var seen = {};
    return Array.prototype.map.call(membersBox.querySelectorAll('input'), function (el) { return el.value.replace(/\s+/g, ' ').trim(); })
      .filter(function (v) { if (!v || seen[v]) return false; seen[v] = 1; return true; });
  }

  // ── PDF 고르기 ──
  function showHint(text, err) { hint.hidden = !text; hint.textContent = text || ''; hint.className = 'dz-hint' + (err ? ' is-err' : ''); }
  function mb(bytes) { return (bytes / 1048576).toFixed(1) + 'MB'; }
  function pick(f) {
    if (!f) return;
    if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') { showHint('PDF 파일만 올릴 수 있습니다.', true); return; }
    if (f.size > MAX_MB * 1048576) { showHint('파일이 ' + mb(f.size) + '입니다. ' + MAX_MB + 'MB 이하로 줄여 주세요.', true); return; }
    file = f;
    dz.classList.add('is-filled');
    $('dzTitle').textContent = f.name;
    $('dzSub').textContent = mb(f.size) + ' · 다른 파일로 바꾸려면 다시 누르세요';
    showHint('');
  }
  dz.addEventListener('click', function () { fileInput.click(); });
  dz.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener('change', function () { pick(fileInput.files[0]); fileInput.value = ''; });
  ['dragenter', 'dragover'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (t) { dz.addEventListener(t, function (e) { e.preventDefault(); dz.classList.remove('is-over'); }); });
  dz.addEventListener('drop', function (e) { pick(e.dataTransfer.files[0]); });
  // 칸 밖에 떨어뜨려도 브라우저가 PDF를 열어 버리지 않게
  ['dragover', 'drop'].forEach(function (t) { window.addEventListener(t, function (e) { if (!dz.contains(e.target)) e.preventDefault(); }); });

  // ── 서버 ──
  function call(method, payload) {
    var req = method === 'GET'
      ? fetch(GAS_URL + '?' + new URLSearchParams(payload).toString())
      : fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
    return req.then(function (r) { return r.json(); }).then(function (res) {
      if (!res.ok) throw new Error(res.error || '서버 오류');
      return res.data;
    });
  }
  function toBase64(f) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(new Error('파일을 읽지 못했습니다.')); };
      r.readAsDataURL(f);
    });
  }

  // ── 제출 ──
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!GAS_URL) return;
    var assign = $('f-assign').value.replace(/\s+/g, ' ').trim();
    var team = $('f-team').value.replace(/\s+/g, ' ').trim();
    var names = members();
    $('f-assign').removeAttribute('aria-invalid');
    if (!assign) { $('f-assign').setAttribute('aria-invalid', 'true'); $('f-assign').focus(); setStatus('과제명을 적어 주세요.', 'err'); return; }
    if (!names.length) { membersBox.querySelector('input').focus(); setStatus('팀원 이름을 한 명 이상 적어 주세요.', 'err'); return; }
    if (!file) { dz.focus(); setStatus('PDF 파일을 올려 주세요.', 'err'); return; }
    if (!window.confirm('다음 내용으로 제출할까요?\n\n과제명: ' + assign + (team ? '\n팀: ' + team : '') + '\n팀원: ' + names.join(', ') + '\n파일: ' + file.name)) return;

    btn.disabled = true;
    setStatus('제출하는 중입니다… 파일 크기에 따라 30초 정도 걸릴 수 있습니다.');
    toBase64(file).then(function (data) {
      return call('POST', { action: 'submit', assignment: assign, team: team, members: names, file_name: file.name, file_size: file.size, data: data });
    }).then(function (row) {
      var mine = []; try { mine = JSON.parse(store(MINE_KEY) || '[]'); } catch (err) { mine = []; }
      mine.push(row.id); store(MINE_KEY, JSON.stringify(mine.slice(-30)));
      setStatus('제출했습니다. 아래 제출 현황에서 내려받을 수 있습니다.', 'ok');
      file = null; dz.classList.remove('is-filled');
      $('dzTitle').textContent = 'PDF 파일을 여기로 끌어 놓거나 눌러서 고르세요';
      $('dzSub').textContent = 'PDF만 · ' + MAX_MB + 'MB 이하';
      return loadList(row.id);
    }).catch(function (err) {
      setStatus('제출하지 못했습니다: ' + err.message + ' 잠시 후 다시 시도해 주세요.', 'err');
    }).then(function () { btn.disabled = false; });
  });

  // ── 제출 현황 ──
  function fmtTime(ms) {
    var d = new Date(Number(ms));
    if (isNaN(d)) return '';
    var p = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
    var g = function (t) { var x = p.filter(function (q) { return q.type === t; })[0]; return x ? x.value : ''; };
    return g('month') + '.' + g('day') + '(' + g('weekday') + ') ' + g('hour') + ':' + g('minute');
  }
  function cell(tr, cls, text) { var td = document.createElement('td'); if (cls) td.className = cls; td.textContent = text; tr.appendChild(td); return td; }

  function render(rows, highlight) {
    var box = $('subList');
    box.innerHTML = '';
    var mine = []; try { mine = JSON.parse(store(MINE_KEY) || '[]'); } catch (e) { mine = []; }
    rows.sort(function (a, b) { return Number(b.created_at) - Number(a.created_at); });
    $('listCount').textContent = rows.length ? rows.length + '건' : '';
    $('subEmpty').hidden = rows.length > 0;
    var dl = [];
    var groups = {}, order = [];
    rows.forEach(function (r) {
      var k = String(r.assignment || '(과제명 없음)');
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(r);
      if (dl.indexOf(k) < 0) dl.push(k);
    });
    $('assignList').innerHTML = '';
    dl.forEach(function (k) { var o = document.createElement('option'); o.value = k; $('assignList').appendChild(o); });
    order.forEach(function (k) {
      var sec = document.createElement('section');
      sec.className = 'sub-group';
      var h = document.createElement('h3'); h.textContent = k + ' · ' + groups[k].length + '건'; sec.appendChild(h);
      var table = document.createElement('table'); table.className = 'sub-table';
      table.innerHTML = '<thead><tr><th>팀</th><th>팀원</th><th>제출 시각</th><th class="t-file">파일</th><th></th></tr></thead>';
      var tb = document.createElement('tbody');
      groups[k].forEach(function (r) {
        var tr = document.createElement('tr');
        if (r.id === highlight || mine.indexOf(r.id) >= 0) tr.className = 'sub-mine';
        cell(tr, '', r.team || '—');
        cell(tr, '', String(r.members || '').split('|').join(', '));
        cell(tr, 't-time', fmtTime(r.created_at));
        cell(tr, 't-file', (r.file_name || '') + (r.file_size ? ' · ' + mb(Number(r.file_size)) : ''));
        var td = cell(tr, 't-dl', '');
        if (r.file_id) {
          var a = document.createElement('a');
          a.className = 'btn btn-sm'; a.textContent = 'PDF 받기';
          a.href = 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(r.file_id);
          a.target = '_blank'; a.rel = 'noopener';
          td.appendChild(a);
        }
        tb.appendChild(tr);
      });
      table.appendChild(tb); sec.appendChild(table); box.appendChild(sec);
    });
  }

  function loadList(highlight) {
    return call('GET', { action: 'list' }).then(function (rows) { render(rows || [], highlight); })
      .catch(function (err) { $('subEmpty').hidden = false; $('subEmpty').textContent = '제출 현황을 불러오지 못했습니다: ' + err.message; });
  }

  if (!GAS_URL) {
    $('subOff').hidden = false;
    Array.prototype.forEach.call(form.querySelectorAll('input, button'), function (el) { el.disabled = true; });
    dz.setAttribute('aria-disabled', 'true'); dz.style.pointerEvents = 'none'; dz.style.opacity = '0.6';
    $('subEmpty').hidden = false;
    return;
  }
  if (ADMIN) {
    $('adminBar').hidden = false;
    call('GET', { action: 'folder' }).then(function (url) { if (url) { $('folderLink').href = url; $('folderLink').hidden = false; } }).catch(function () {});
  }
  loadList();
})();
