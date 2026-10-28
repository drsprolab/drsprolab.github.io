const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function backend() {
  const rows = [];
  const emails = [];
  const events = [];
  const props = {};
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: values => rows.push(values),
    getDataRange: () => ({ getDisplayValues: () => rows.map(row => row.map(String)) }),
    getRange: (row, column) => ({
      setNumberFormat: () => {},
      setValue: value => { rows[row - 1][column - 1] = value; },
      setValues: values => { values[0].forEach((value, i) => { rows[row - 1][column - 1 + i] = value; }); }
    })
  };
  const context = {
    Utilities: {
      formatDate: () => '2026-10-28',
      getUuid: () => '00000000-0000-4000-8000-000000000000',
      base64Decode: value => Array.from(Buffer.from(value, 'base64')),
      newBlob: (bytes, type, name) => ({ bytes, type, name })
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: key => props[key], setProperty: (key, value) => { props[key] = value; }
    }) },
    SpreadsheetApp: {
      create: () => ({ getId: () => 'test-sheet' }),
      openById: () => ({ getSheets: () => [sheet] })
    },
    MailApp: { sendEmail: mail => emails.push(mail) },
    CalendarApp: { getDefaultCalendar: () => ({
      getEvents: (start, end) => events.filter(event =>
        !event.deleted && event.start < end && event.end > start
      ),
      createEvent: (title, start, end, options) => {
        const event = {
          title, start, end, options, deleted: false,
          getId: () => 'calendar-event-1',
          deleteEvent() { this.deleted = true; }
        };
        events.push(event);
        return event;
      }
    }) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' }) },
    HtmlService: { createHtmlOutput: html => ({ html, setTitle() { return this; } }) }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../appointment-backend/Code.gs'), 'utf8'), context);
  return { context, rows, emails, events };
}

test('only future Monday, Tuesday, Thursday one-hour slots are accepted', () => {
  const { context } = backend();
  assert.equal(context.validSlot_('2026-10-29', '13:00'), true);
  assert.equal(context.validSlot_('2026-10-30', '13:00'), false);
  assert.equal(context.validSlot_('2026-10-29', '15:00'), false);
  assert.equal(context.validSlot_('2026-10-28', '14:00'), false);
  assert.equal(context.validSlot_('2026-12-22', '14:00'), true);
  assert.equal(context.validSlot_('2026-12-24', '14:00'), false);
});

test('request emails owner; explicit approval emails student once', () => {
  const { context, rows, emails, events } = backend();
  const request = context.doPost({ parameter: {
    action: 'request', name: '학생', email: 'student@example.edu',
    date: '2026-10-29', time: '13:00', message: '연구 상담'
  } });
  assert.match(request.html, /요청 접수 완료/);
  assert.equal(rows[1][8], 'pending');
  assert.equal(emails.length, 1);
  assert.equal(emails[0].to, 'jhsong77@hanyang.ac.kr');

  const token = rows[1][7];
  assert.match(context.doGet({ parameter: { token } }).html, /이 시간 승인하기/);
  assert.match(context.doGet({ parameter: { token } }).html, /<form method="post" target="_top"/);
  assert.equal(emails.length, 1);
  assert.match(context.doPost({ parameter: { action: 'approve', token } }).html, /미팅 확정/);
  assert.equal(rows[1][8], 'approved');
  assert.equal(emails[1].to, 'student@example.edu');
  assert.equal(events.length, 1);
  assert.equal(events[0].title, '학생 미팅 · 학생');
  assert.equal(events[0].start.toISOString(), '2026-10-29T04:00:00.000Z');
  assert.equal(events[0].end.toISOString(), '2026-10-29T05:00:00.000Z');
  assert.equal(rows[1][10], 'calendar-event-1');
  context.doPost({ parameter: { action: 'approve', token } });
  assert.equal(emails.length, 2);
  assert.equal(events.length, 1);
});

test('an existing calendar event blocks a request for the same hour', () => {
  const { context, emails, events } = backend();
  events.push({
    start: new Date('2026-10-29T04:00:00Z'),
    end: new Date('2026-10-29T05:00:00Z'),
    deleted: false
  });
  const result = context.doPost({ parameter: {
    action: 'request', name: '학생', email: 'student@example.edu',
    date: '2026-10-29', time: '13:00'
  } });
  assert.match(result.html, /시간 마감/);
  assert.equal(emails.length, 0);
});

test('research request requires a file and forwards valid attachments to owner', () => {
  const { context, emails } = backend();
  const details = {
    action: 'request', name: '학생', email: 'student@example.edu',
    date: '2026-10-29', time: '14:00', meetingType: 'research', message: '연구계획 논의'
  };
  assert.match(context.doPost({ parameter: details }).html, /첨부파일 필요/);
  assert.equal(emails.length, 0);
  const file = { name: '연구계획.pdf', data: Buffer.from('%PDF-test').toString('base64') };
  assert.match(context.doPost({ parameter: { ...details, attachments: JSON.stringify([file]) } }).html, /요청 접수 완료/);
  assert.equal(emails[0].attachments.length, 1);
  assert.equal(emails[0].attachments[0].name, '연구계획.pdf');
  assert.equal(emails[0].attachments[0].type, 'application/pdf');
  assert.match(emails[0].body, /연구 관련 미팅/);
});

test('unsafe attachments are rejected before sending email', () => {
  const { context, emails } = backend();
  const result = context.doPost({ parameter: {
    action: 'request', name: '학생', email: 'student@example.edu',
    date: '2026-10-29', time: '14:00', meetingType: 'general',
    attachments: JSON.stringify([{ name: 'program.exe', data: 'YWJj' }])
  } });
  assert.match(result.html, /첨부파일 오류/);
  assert.equal(emails.length, 0);
});
