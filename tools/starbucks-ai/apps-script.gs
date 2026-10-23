// 스타벅스 AI 기본 역량 진단(매장용·본사용): 응답 저장소 (Google Apps Script 웹앱, 스프레드시트 하나에 붙여서 사용)
// 매장용은 store 탭, 본사용은 hq 탭에 따로 쌓인다.
// POST  응답 저장   body: {id, track, role, job, exp, answers[24], seconds}
// GET   ?action=all&track=T&me=ID  그 진단의 응답 목록(결과 코드는 빼고 직급 r, 직무 j, 응답 a, 내 응답이면 m:1)
// GET   ?action=one&track=T&id=ID  결과 코드로 내 응답 1건

var N = 24;
var TRACKS = {
  store: { roles: ['partner', 'supervisor', 'manager', 'area'] },
  hq: { roles: ['practitioner', 'senior', 'lead', 'exec'] }
};
var EXPS = ['regular', 'sometimes', 'rare'];
var HEAD = ['submitted_at', 'id', 'role', 'job', 'exp', 'seconds'];
for (var q = 1; q <= N; q++) HEAD.push('Q' + (q < 10 ? '0' : '') + q);
var A0 = 6; // 응답값이 시작하는 열(0부터)

function sheet_(track) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(track) || ss.insertSheet(track);
  if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); sh.getRange('B:B').setNumberFormat('@'); }
  return sh;
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function rows_(track) {
  var sh = sheet_(track), n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, HEAD.length).getDisplayValues() : [];
}
function clean_(s, max) { return String(s || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, max); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents), T = TRACKS[d.track];
    if (!T) return json_({ ok: false, error: 'bad track' });
    if (!/^[A-Z2-9]{8}$/.test(d.id)) return json_({ ok: false, error: 'bad id' });
    if (T.roles.indexOf(d.role) < 0) return json_({ ok: false, error: 'bad role' });
    if (EXPS.indexOf(d.exp) < 0) return json_({ ok: false, error: 'bad exp' });
    var job = clean_(d.job, 40);
    if (!job) return json_({ ok: false, error: 'bad job' });
    if (!Array.isArray(d.answers) || d.answers.length !== N ||
        !d.answers.every(function (v) { return v === 1 || v === 2 || v === 3 || v === 4 || v === 5; })) {
      return json_({ ok: false, error: 'bad answers' });
    }
    if (rows_(d.track).some(function (r) { return r[1] === d.id; })) return json_({ ok: false, error: 'duplicate' });
    var sec = Math.max(0, Math.min(86400, parseInt(d.seconds, 10) || 0));
    sheet_(d.track).appendRow([new Date(), d.id, d.role, "'" + job, d.exp, sec].concat(d.answers));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var p = e.parameter || {};
  if (!TRACKS[p.track]) return json_({ ok: false, error: 'bad track' });
  var data = rows_(p.track);
  if (p.action === 'one') {
    var r = data.filter(function (x) { return x[1] === p.id; })[0];
    return json_({ ok: true, row: r ? { id: r[1], role: r[2], job: r[3], exp: r[4], answers: r.slice(A0, A0 + N).map(Number) } : null });
  }
  return json_({ ok: true, rows: data.map(function (x) {
    var o = { r: x[2], j: x[3], a: x.slice(A0, A0 + N).map(Number) };
    if (p.me && x[1] === p.me) o.m = 1;
    return o;
  }) });
}
