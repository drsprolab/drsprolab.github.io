const OWNER_EMAIL = 'jhsong77@hanyang.ac.kr';
const ZONE = 'Asia/Seoul';
const HEADERS = ['id', 'createdAt', 'name', 'email', 'date', 'time', 'message', 'token', 'status', 'decidedAt', 'calendarEventId'];

function doGet(e) {
  const token = String((e && e.parameter && e.parameter.token) || '');
  const row = token ? findByToken_(token) : null;
  if (!row) return page_('유효하지 않은 요청', '승인 링크를 확인해 주세요.');
  const r = row.values;
  if (r[8] !== 'pending') return page_('처리된 요청', '이 요청은 이미 처리되었습니다.');
  const action = escape_(ScriptApp.getService().getUrl());
  const content = '<p><strong>' + escape_(r[2]) + '</strong> (' + escape_(r[3]) +
    ')님의 미팅 요청</p><p>' + escape_(r[4]) + ' ' + escape_(r[5]) +
    '–' + (r[5] === '13:00' ? '14:00' : '15:00') + ' KST</p>' +
    '<form method="post" target="_top" action="' + action + '">' +
    '<input type="hidden" name="action" value="approve">' +
    '<input type="hidden" name="token" value="' + escape_(token) + '">' +
    '<button type="submit">이 시간 승인하기</button></form>' +
    '<p>승인 버튼을 누르면 학생에게 확정 이메일이 발송됩니다.</p>';
  return page_('미팅 요청 승인', content, true);
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'request') return request_(p);
  if (p.action === 'approve') return approve_(p);
  return page_('요청 오류', '지원하지 않는 요청입니다.');
}

function request_(p) {
  if (p.website) return page_('요청 접수', '요청을 확인해 주세요.');
  const name = String(p.name || '').trim();
  const email = String(p.email || '').trim();
  const date = String(p.date || '');
  const time = String(p.time || '');
  const message = String(p.message || '').trim();
  const meetingType = String(p.meetingType || 'general');
  if (!name || name.length > 80 || /[\x00-\x1f\x7f]/.test(name) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254 || message.length > 1000 ||
      !['general', 'research'].includes(meetingType) || !validSlot_(date, time)) {
    return page_('입력 오류', '이름, 이메일, 날짜와 시간을 확인한 후 다시 요청해 주세요.');
  }
  let attachments;
  try {
    attachments = parseAttachments_(p.attachments);
  } catch (err) {
    return page_('첨부파일 오류', 'PDF·문서·발표자료·텍스트·이미지 파일을 최대 3개, 합계 4MB까지 첨부해 주세요.');
  }
  if (meetingType === 'research' && !attachments.length) {
    return page_('첨부파일 필요', '연구 관련 미팅은 미리 확인할 수 있는 간단한 자료를 첨부해 주세요.');
  }
  const meetingTypeLabel = meetingType === 'research' ? '연구 관련 미팅' : '일반 미팅';
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = sheet_();
    const rows = sheet.getDataRange().getDisplayValues();
    const today = Utilities.formatDate(new Date(), ZONE, 'yyyy-MM-dd');
    const recent = rows.slice(1).filter(r =>
      String(r[3]).toLowerCase() === email.toLowerCase() &&
      String(r[1]).slice(0, 10) === today
    ).length;
    if (recent >= 3) return page_('요청 횟수 초과', '오늘은 최대 3건까지 요청할 수 있습니다. 내일 다시 시도해 주세요.');
    if (rows.slice(1).some(r => r[4] === date && r[5] === time && r[8] === 'approved')) {
      return page_('시간 마감', '선택한 시간은 이미 확정되었습니다. 다른 시간을 선택해 주세요.');
    }
    if (calendarBusy_(date, time)) {
      return page_('시간 마감', '선택한 시간에는 이미 일정이 있습니다. 다른 시간을 선택해 주세요.');
    }
    const token = Utilities.getUuid() + Utilities.getUuid();
    const id = Utilities.getUuid();
    const created = Utilities.formatDate(new Date(), ZONE, "yyyy-MM-dd'T'HH:mm:ss");
    sheet.appendRow([id, created, sheetText_(name), sheetText_(email), date, time,
      sheetText_('[' + meetingTypeLabel + '] ' + message), token, 'pending', '', '']);
    const approveUrl = ScriptApp.getService().getUrl() + '?token=' + encodeURIComponent(token);
    MailApp.sendEmail({
      to: OWNER_EMAIL,
      replyTo: email,
      subject: '[미팅 요청] ' + date + ' ' + time + ' · ' + name,
      body: '새 미팅 요청이 있습니다.\n\n이름: ' + name + '\n이메일: ' + email +
        '\n희망 시간: ' + date + ' ' + time + '–' + (time === '13:00' ? '14:00' : '15:00') +
        ' (한국시간)\n미팅 종류: ' + meetingTypeLabel + '\n미팅 목적: ' + (message || '미입력') +
        '\n\n승인 링크: ' + approveUrl +
        '\n\n요청을 승인하면 학생에게 확정 메일이 발송됩니다.',
      attachments: attachments
    });
    return page_('요청 접수 완료', '요청이 전달되었습니다. 승인되면 ' + escape_(email) + ' 주소로 확정 메일을 보내드립니다.');
  } catch (err) {
    return page_('전송 오류', '요청을 처리하지 못했습니다. 잠시 후 다시 시도하거나 교수님께 이메일로 문의해 주세요.');
  } finally {
    lock.releaseLock();
  }
}

function parseAttachments_(value) {
  if (!value) return [];
  const raw = String(value);
  if (raw.length > 6 * 1024 * 1024) throw new Error('첨부파일 용량 초과');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length > 3) throw new Error('첨부파일 개수 초과');
  const types = {
    pdf: 'application/pdf', doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg'
  };
  let total = 0;
  return items.map(item => {
    if (!item || typeof item.name !== 'string' || typeof item.data !== 'string' ||
        !item.name || item.name.length > 100 || /[\\/\x00-\x1f\x7f]/.test(item.name) ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(item.data)) throw new Error('첨부파일 형식 오류');
    const extension = (item.name.match(/\.([^.]+)$/) || [])[1];
    const type = types[String(extension).toLowerCase()];
    if (!type) throw new Error('지원하지 않는 첨부파일');
    const bytes = Utilities.base64Decode(item.data);
    total += bytes.length;
    if (total > 4 * 1024 * 1024) throw new Error('첨부파일 용량 초과');
    return Utilities.newBlob(bytes, type, item.name);
  });
}

function approve_(p) {
  const token = String(p.token || '');
  if (!/^[0-9a-f-]{72}$/.test(token)) return page_('유효하지 않은 요청', '승인 링크를 확인해 주세요.');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const row = findByToken_(token);
    if (!row || row.values[8] !== 'pending') return page_('처리된 요청', '이 요청은 이미 처리되었거나 유효하지 않습니다.');
    const r = row.values;
    const sheet = sheet_();
    const rows = sheet.getDataRange().getDisplayValues();
    const conflict = rows.slice(1).some((other, index) =>
      index + 2 !== row.index && other[4] === r[4] && other[5] === r[5] && other[8] === 'approved'
    );
    if (conflict) return page_('시간 중복', '이 시간에는 이미 승인된 미팅이 있습니다. 학생에게 다른 시간을 요청해 주세요.');
    if (!validSlot_(String(r[4]), String(r[5]))) return page_('지난 요청', '이미 지난 시간이거나 예약 범위를 벗어났습니다.');
    if (calendarBusy_(String(r[4]), String(r[5]))) {
      return page_('캘린더 일정 중복', '이 시간에는 이미 캘린더 일정이 있습니다. 학생에게 다른 시간을 요청해 주세요.');
    }
    sheet.getRange(row.index, 9).setValue('sending');
    let event = null;
    try {
      const [start, end] = slotDates_(String(r[4]), String(r[5]));
      event = CalendarApp.getDefaultCalendar().createEvent(
        '학생 미팅 · ' + String(r[2]), start, end,
        { description: '요청 학생: ' + r[2] + '\n이메일: ' + r[3] +
          '\n미팅 목적: ' + (r[6] || '미입력') }
      );
      sheet.getRange(row.index, 11).setValue(event.getId());
      MailApp.sendEmail({
        to: String(r[3]),
        subject: '[미팅 확정] 송지훈 교수님 · ' + r[4] + ' ' + r[5],
        body: r[2] + '님,\n\n송지훈 교수님과의 미팅이 확정되었습니다.\n\n' +
          '일시: ' + r[4] + ' ' + r[5] + '–' + (r[5] === '13:00' ? '14:00' : '15:00') +
          ' (한국시간)\n\n감사합니다.'
      });
      sheet.getRange(row.index, 9, 1, 2).setValues([[
        'approved', Utilities.formatDate(new Date(), ZONE, "yyyy-MM-dd'T'HH:mm:ss")
      ]]);
      return page_('미팅 확정', '학생에게 확정 이메일을 발송했습니다.');
    } catch (err) {
      if (event) {
        try { event.deleteEvent(); } catch (cleanupError) {
          return page_('캘린더 확인 필요', '확정 메일 발송에 실패했습니다. 캘린더에 남은 일정을 확인해 주세요.');
        }
        sheet.getRange(row.index, 11).setValue('');
      }
      sheet.getRange(row.index, 9).setValue('pending');
      return page_('처리 오류', '캘린더 등록 또는 메일 발송에 실패했습니다. 잠시 후 승인 링크에서 다시 시도해 주세요.');
    }
  } finally {
    lock.releaseLock();
  }
}

function validSlot_(date, time) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !['13:00', '14:00'].includes(time)) return false;
  const parsed = new Date(date + 'T00:00:00Z');
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ||
      ![1, 2, 4].includes(parsed.getUTCDay())) return false;
  const today = Utilities.formatDate(new Date(), ZONE, 'yyyy-MM-dd');
  const days = (parsed.getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000;
  return days >= 1 && days <= 56;
}

function slotDates_(date, time) {
  const hour = time === '13:00' ? 13 : 14;
  return [new Date(date + 'T' + String(hour).padStart(2, '0') + ':00:00+09:00'),
    new Date(date + 'T' + String(hour + 1).padStart(2, '0') + ':00:00+09:00')];
}

function calendarBusy_(date, time) {
  const [start, end] = slotDates_(date, time);
  return CalendarApp.getDefaultCalendar().getEvents(start, end).length > 0;
}

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty('APPOINTMENT_SHEET_ID');
  if (!id) {
    const spreadsheet = SpreadsheetApp.create('PRO AnalytiX Lab · Appointment requests');
    id = spreadsheet.getId();
    props.setProperty('APPOINTMENT_SHEET_ID', id);
  }
  const sheet = SpreadsheetApp.openById(id).getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.getRange('A:K').setNumberFormat('@');
    sheet.appendRow(HEADERS);
  }
  return sheet;
}

function findByToken_(token) {
  if (!/^[0-9a-f-]{72}$/.test(token)) return null;
  const rows = sheet_().getDataRange().getDisplayValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][7] === token) return { index: i + 1, values: rows[i] };
  }
  return null;
}

function escape_(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

function sheetText_(value) {
  const text = String(value);
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

function page_(title, content, raw) {
  const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><base target="_top">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + escape_(title) + '</title><style>' +
    'body{font:16px/1.7 system-ui,sans-serif;max-width:620px;margin:64px auto;padding:0 20px;color:#16202b}' +
    'button{background:#1d4f86;color:white;border:0;border-radius:6px;padding:12px 20px;font:inherit;cursor:pointer}' +
    'a{color:#1d4f86}</style></head><body><h1>' + escape_(title) + '</h1>' +
    (raw ? content : '<p>' + content + '</p>') +
    '<p><a href="https://hrdpro.hanyang.ac.kr/appointment/">예약 페이지로 돌아가기</a></p></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title);
}
