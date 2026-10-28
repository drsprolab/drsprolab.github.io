const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function backend() {
  const rows = [];
  const emails = [];
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
      getUuid: () => '00000000-0000-4000-8000-000000000000'
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
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/test/exec' }) },
    HtmlService: { createHtmlOutput: html => ({ html, setTitle() { return this; } }) }
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../appointment-backend/Code.gs'), 'utf8'), context);
  return { context, rows, emails };
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
  const { context, rows, emails } = backend();
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
  assert.equal(emails.length, 1);
  assert.match(context.doPost({ parameter: { action: 'approve', token } }).html, /미팅 확정/);
  assert.equal(rows[1][8], 'approved');
  assert.equal(emails[1].to, 'student@example.edu');
  context.doPost({ parameter: { action: 'approve', token } });
  assert.equal(emails.length, 2);
});
