// AX 전환 준비도 진단: 응답 저장소 (Google Apps Script 웹앱, 스프레드시트에 붙여서 사용)
// POST  응답 저장       body: {id, group, role, answers[27], seconds}
//       answers 값: 1~5, '잘 모르겠다'는 0 (기반 마련·전사 확산·AI 내재화·전반 인식 문항에서만 허용)
// GET   ?action=all&group=G&me=ID  회사(그룹) 응답 목록 (결과 코드는 내보내지 않고, me와 같은 행에 m:1 표시)
// GET   ?action=one&id=ID           결과 코드로 내 응답 1건

var SHEET = 'responses';
var ITEMS = ['F1','F2','F3','F4','F5','P1','P2','P3','P4','P5','W1','W2','W3','W4','W5',
             'E1','E2','E3','E4','E5','N1','N2','N3','N4','N5','G1','G2'];
// 0(잘 모르겠다)을 허용하는 문항: 회사를 주어로 묻는 1단계 기반 마련(F), 4단계 전사 확산(E), 5단계 AI 내재화(N), 전반 인식(G)
function unkOk_(i) { return i < 5 || i >= 15; }
var ROLES = ['실무자(팀원)', '팀장·파트장', '임원·경영진', '기타'];
var HEAD = ['submitted_at', 'id', 'group', 'role', 'seconds'].concat(ITEMS);

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange('B:C').setNumberFormat('@'); }
  return sh;
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function rows_() {
  var sh = sheet_(), n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEAD.length).getDisplayValues() : [];
}
function cleanGroup_(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }
function validAnswers_(a) {
  if (!Array.isArray(a) || a.length !== ITEMS.length) return false;
  return a.every(function (v, i) { return (v >= 1 && v <= 5 && v === Math.floor(v)) || (v === 0 && unkOk_(i)); });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (!/^[A-Z2-9]{8}$/.test(d.id)) return json_({ ok: false, error: 'bad id' });
    if (ROLES.indexOf(d.role) < 0) return json_({ ok: false, error: 'bad role' });
    if (!validAnswers_(d.answers)) return json_({ ok: false, error: 'bad answers' });
    if (rows_().some(function (r) { return r[1] === d.id; })) return json_({ ok: false, error: 'duplicate' });
    var sec = Math.max(0, Math.min(86400, parseInt(d.seconds, 10) || 0));
    sheet_().appendRow([new Date(), d.id, cleanGroup_(d.group), d.role, sec].concat(d.answers));
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
    return json_({ ok: true, row: r ? { id: r[1], group: r[2], role: r[3], a: r.slice(5).map(Number) } : null });
  }
  var g = cleanGroup_(p.group);
  var out = data.filter(function (x) { return !g || x[2] === g; }).map(function (x) {
    var o = { role: x[3], g: x[2], a: x.slice(5).map(Number) };
    if (p.me && x[1] === p.me) o.m = 1;
    return o;
  });
  return json_({ ok: true, rows: out });
}
