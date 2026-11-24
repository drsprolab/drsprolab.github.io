/**
 * HRD개론(DET1003) 과제 제출 — 구글 시트 + 드라이브 저장소 (Google Apps Script 웹앱)
 *
 * 설치(처음 한 번):
 *  1. 새 구글 시트를 만들고 [확장 프로그램 → Apps Script]를 엽니다.
 *  2. 이 파일 전체를 Code.gs에 붙여 넣고 저장합니다.
 *  3. 위쪽 함수 목록에서 setup 을 골라 [실행] → 권한 승인.
 *  4. [배포 → 새 배포 → 유형: 웹 앱] (실행: 나 / 액세스: 모든 사용자) → …/exec 주소를 받습니다.
 *  5. 그 주소를 hrd-intro/js/submit.js 의 GAS_URL 에 넣습니다.
 *
 * - 제출 PDF는 내 드라이브의 'HRD개론 과제 제출' 폴더 아래 프로젝트명별 폴더에 저장되고,
 *   '링크가 있는 모든 사용자 보기'로 공유되어 사이트 제출 현황에서 누구나 내려받을 수 있습니다.
 * - 코드를 바꾼 뒤에는 [배포 → 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포]. 주소는 그대로입니다.
 * - 제출 기록은 이 시트의 submissions 탭에 한 줄씩 쌓입니다(자동 삭제 없음).
 */

var SHEET_NAME = 'submissions';
var FOLDER_NAME = 'HRD개론 과제 제출';
var MAX_BYTES = 20 * 1024 * 1024; // 20MB
var COLUMNS = ['id', 'created_at', 'submitted_at', 'assignment', 'team', 'members', 'file_name', 'file_size', 'file_id', 'file_url'];

function setup() {
  sheet_();
  folder_();
  shareAll();
}

// 이미 제출된 PDF까지 모두 '링크가 있는 모든 사용자 보기'로 바꿉니다(한 번 실행).
function shareAll() {
  list_().forEach(function (r) {
    if (!r.file_id) return;
    try { DriveApp.getFileById(r.file_id).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) { /* 지운 파일은 건너뜀 */ }
  });
}

/* ---------- 요청 ---------- */

function doGet(e) { return respond_(e && e.parameter ? e.parameter : {}); }

function doPost(e) {
  var body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return json_({ ok: false, error: '요청 형식이 올바르지 않습니다.' }); }
  return respond_(body);
}

function respond_(req) {
  try { return json_({ ok: true, data: route_(req) }); }
  catch (err) { return json_({ ok: false, error: String((err && err.message) || err) }); }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function route_(req) {
  switch (req.action) {
    case 'list': return list_();
    case 'folder': return folder_().getUrl();
    case 'submit': return submit_(req);
    case 'ping': return 'ok';
  }
  throw new Error('알 수 없는 요청입니다.');
}

/* ---------- 제출 ---------- */

function text_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function submit_(req) {
  var assignment = text_(req.assignment, 60);
  var team = text_(req.team, 40);
  var members = (Array.isArray(req.members) ? req.members : []).map(function (m) { return text_(m, 20); })
    .filter(function (m) { return m; }).slice(0, 8);
  if (!assignment) throw new Error('프로젝트명이 없습니다.');
  if (!members.length) throw new Error('팀원 이름이 없습니다.');
  if (!req.data) throw new Error('PDF 파일이 없습니다.');

  var bytes = Utilities.base64Decode(String(req.data));
  if (bytes.length > MAX_BYTES) throw new Error('파일이 20MB를 넘습니다.');
  // PDF 파일은 '%PDF' 로 시작합니다.
  if (!(bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70)) throw new Error('PDF 파일이 아닙니다.');

  var now = new Date();
  var stamp = Utilities.formatDate(now, 'Asia/Seoul', 'yyyyMMdd-HHmm');
  var safe = function (s) { return s.replace(/[\\/:*?"<>|#%]/g, '_'); };
  var name = safe(assignment) + '_' + (team ? safe(team) + '_' : '') + safe(members.join('·')) + '_' + stamp + '.pdf';

  var blob = Utilities.newBlob(bytes, 'application/pdf', name);
  var file = subfolder_(assignment).createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var row = {
    id: Utilities.getUuid(),
    created_at: now.getTime(),
    submitted_at: Utilities.formatDate(now, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'),
    assignment: assignment,
    team: team,
    members: members.join('|'),
    file_name: text_(req.file_name, 120) || name,
    file_size: bytes.length,
    file_id: file.getId(),
    file_url: file.getUrl()
  };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    sheet_().appendRow(COLUMNS.map(function (k) {
      var v = row[k];
      return typeof v === 'number' ? v : (v === '' ? '' : "'" + v); // 글자는 ' 를 붙여 수식·날짜로 바뀌지 않게
    }));
  } finally { lock.releaseLock(); }
  return publicRow_(row);
}

/* ---------- 목록 ---------- */

function publicRow_(r) {
  return {
    id: String(r.id), created_at: Number(r.created_at), assignment: String(r.assignment), team: String(r.team || ''),
    members: String(r.members || ''), file_name: String(r.file_name || ''), file_size: Number(r.file_size) || 0,
    file_id: String(r.file_id || '')
  };
}

function list_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  return sh.getRange(2, 1, last - 1, head.length).getValues()
    .filter(function (v) { return v[0] !== ''; })
    .map(function (v) { var o = {}; head.forEach(function (k, i) { o[k] = v[i]; }); return publicRow_(o); });
}

/* ---------- 시트·폴더 ---------- */

function sheet_() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sh = book.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = book.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
    sh.setFrozenRows(1);
  }
  return sh;
}

function folder_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* 지워졌으면 새로 만든다 */ } }
  var it = DriveApp.getFoldersByName(FOLDER_NAME);
  var f = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
  props.setProperty('FOLDER_ID', f.getId());
  return f;
}

function subfolder_(assignment) {
  var parent = folder_();
  var name = assignment.replace(/[\\/]/g, '_');
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
