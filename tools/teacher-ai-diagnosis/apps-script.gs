// 우리학교 교사 AI 역량 수준 진단: 응답 저장소 (Google Apps Script 웹앱, 스프레드시트에 붙여서 사용)
// POST  응답 저장       body: {id, group, role, org, answers[31], seconds}
//       org(소속 학교·직장)는 시트 맨 끝 열에만 저장하고, GET으로는 내보내지 않는다.
// GET   ?action=all&group=G&me=ID  그룹 응답 목록 (결과 코드는 내보내지 않고, 그룹 코드 g와 me와 같은 행의 m:1 표시)
// GET   ?action=all&org=O&me=ID    같은 소속(org)으로 응답한 사람들만. 소속 이름 자체는 내보내지 않는다.
// GET   ?action=one&id=ID           결과 코드로 내 응답 1건

var SHEET = 'responses';
var ITEMS = ['D1','D2','D3','D4','D5','L1','L2','L3','L4','L5','V1','V2','V3','V4','V5',
             'R1','R2','R3','R4','R5','H1','H2','H3','H4','H5','T1','T2','T3','T4','T5','T6'];
var ROLES = ['학생', '교사', '보직교사', '행정직원'];
var HEAD = ['submitted_at', 'id', 'group', 'role', 'seconds'].concat(ITEMS, ['org']);
var A0 = 5, A1 = A0 + ITEMS.length; // 응답값 열 범위

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange('B:C').setNumberFormat('@'); }
  // org 열을 넣기 전에 만든 시트는 머리글만 채운다(기존 응답의 org는 빈칸).
  if (sh.getRange(1, HEAD.length).getValue() === '') sh.getRange(1, HEAD.length).setValue('org');
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function rows_() {
  var sh = sheet_(), n = sh.getLastRow() - 1;
  // 숫자로만 된 코드·그룹이 숫자로 바뀌지 않도록 문자열로 읽는다.
  return n > 0 ? sh.getRange(2, 1, n, HEAD.length).getDisplayValues() : [];
}
// 띄어쓰기·대소문자·문장부호 차이는 같은 소속으로 본다(teacher-ai-diagnosis.js의 normOrg와 같은 규칙).
function normOrg_(s) { return String(s || '').toLowerCase().replace(/[\s.,·()\[\]'"-]/g, ''); }
function cleanGroup_(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (!/^[A-Z2-9]{8}$/.test(d.id)) return json_({ ok: false, error: 'bad id' });
    if (ROLES.indexOf(d.role) < 0) return json_({ ok: false, error: 'bad role' });
    if (!Array.isArray(d.answers) || d.answers.length !== ITEMS.length ||
        !d.answers.every(function (v) { return v === 1 || v === 2 || v === 3 || v === 4 || v === 5; })) {
      return json_({ ok: false, error: 'bad answers' });
    }
    if (rows_().some(function (r) { return r[1] === d.id; })) return json_({ ok: false, error: 'duplicate' });
    var sec = Math.max(0, Math.min(86400, parseInt(d.seconds, 10) || 0));
    // 수식으로 해석되지 않도록 앞에 '를 붙인다.
    var org = String(d.org || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40);
    sheet_().appendRow([new Date(), d.id, cleanGroup_(d.group), d.role, sec].concat(d.answers, [org ? "'" + org : '']));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = e.parameter || {}, data = rows_();
  if (p.action === 'one') {
    var r = data.filter(function (x) { return x[1] === p.id; })[0];
    return json_({ ok: true, row: r ? { id: r[1], group: r[2], role: r[3], org: r[A1], a: r.slice(A0, A1).map(Number) } : null });
  }
  var g = cleanGroup_(p.group), org = normOrg_(p.org);
  var out = data.filter(function (x) { return org ? normOrg_(x[A1]) === org : !g || x[2] === g; }).map(function (x) {
    var o = { role: x[3], g: x[2], a: x.slice(A0, A1).map(Number) };
    if (p.me && x[1] === p.me) o.m = 1;
    return o;
  });
  return json_({ ok: true, rows: out });
}
