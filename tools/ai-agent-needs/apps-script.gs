// AI Agent 구축 및 활용에 대한 요구도 분석: 응답 저장소 (Google Apps Script 웹앱, 스프레드시트에 붙여서 사용)
// POST  응답 저장  body: {id, group, major, year, ai_frequency, agent_experience, build_interest, advanced, I:{코드:1~5}, P:{코드:1~5}, seconds}
//       공통 15문항(A~E)은 중요도·수행수준 모두 필수, Agent 심화 6문항(F·G)은 advanced일 때만 필수(아니면 빈칸)
// GET   ?action=all&group=G&me=ID  응답 목록(결과 코드는 내보내지 않고, me와 같은 행에 m:1 표시). group이 비면 전체
// GET   ?action=one&id=ID           결과 코드로 내 응답 1건

var SHEET = 'responses';
var CODES = ['A01','A02','A03','B01','B02','B03','C01','C02','C03','D01','D02','D03','E01','E02','E03','F01','F02','F03','G01','G02','G03'];
var NC = 15; // 공통 문항 수(앞 15개)
var BG = ['major', 'year', 'ai_frequency', 'agent_experience', 'build_interest'];
var BG_OK = { major: [1,2,3,4,5,6,9], year: [1,2,3,4,9], ai_frequency: [0,1,2,3,4], agent_experience: [0,1,2,3], build_interest: [1,2,3,4,5] };
var HEAD = ['submitted_at', 'id', 'group'].concat(BG, ['advanced', 'seconds'],
  CODES.map(function (c) { return 'I_' + c; }), CODES.map(function (c) { return 'P_' + c; }));
var A0 = 10; // 중요도 응답이 시작하는 열 위치(0부터)

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
function score_(v) { v = Number(v); return v >= 1 && v <= 5 && v === Math.floor(v) ? v : null; }
function num_(v) { return v === '' || v === null || v === undefined ? null : Number(v); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (!/^[A-Z2-9]{8}$/.test(d.id)) return json_({ ok: false, error: 'bad id' });
    if (BG.some(function (k) { return BG_OK[k].indexOf(Number(d[k])) < 0; })) return json_({ ok: false, error: 'bad background' });
    var adv = !!d.advanced, I = d.I || {}, P = d.P || {}, iv = [], pv = [];
    for (var k = 0; k < CODES.length; k++) {
      var need = k < NC || adv, a = score_(I[CODES[k]]), b = score_(P[CODES[k]]);
      if (need && (a === null || b === null)) return json_({ ok: false, error: 'bad answers' });
      iv.push(need ? a : ''); pv.push(need ? b : '');
    }
    if (rows_().some(function (r) { return r[1] === d.id; })) return json_({ ok: false, error: 'duplicate' });
    var sec = Math.max(0, Math.min(86400, parseInt(d.seconds, 10) || 0));
    sheet_().appendRow([new Date(), d.id, cleanGroup_(d.group)].concat(BG.map(function (k) { return Number(d[k]); }), [adv ? 1 : 0, sec], iv, pv));
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'bad request' });
  } finally {
    lock.releaseLock();
  }
}

function row_(x) {
  var o = { g: x[2], bg: BG.map(function (_, i) { return Number(x[3 + i]); }), adv: x[8] === '1' ? 1 : 0,
    I: x.slice(A0, A0 + CODES.length).map(num_), P: x.slice(A0 + CODES.length, A0 + 2 * CODES.length).map(num_) };
  return o;
}
function doGet(e) {
  var p = e.parameter || {}, data = rows_();
  if (p.action === 'one') {
    var r = data.filter(function (x) { return x[1] === p.id; })[0];
    if (!r) return json_({ ok: true, row: null });
    var o = row_(r); o.id = r[1];
    return json_({ ok: true, row: o });
  }
  var g = cleanGroup_(p.group);
  var out = data.filter(function (x) { return !g || x[2] === g; }).map(function (x) {
    var o = row_(x);
    if (p.me && x[1] === p.me) o.m = 1;
    return o;
  });
  return json_({ ok: true, codes: CODES, rows: out });
}
