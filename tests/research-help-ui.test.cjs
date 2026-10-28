'use strict';
// Research help 화면 상태 관리 테스트. 서버는 가짜 transport(테스트 데이터)로 대체한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const RH = require(path.join(__dirname, '../assets/js/research-help.js'));

const KEYS = ['name', 'title', 'problem', 'purpose', 'model', 'rq', 'theory', 'method', 'implications'];
const fields = extra => Object.assign(Object.fromEntries(KEYS.map(k => [k, k === 'name' ? '테스트 작성자' : `${k} 연구 내용`])), extra);
const feedback = round => ({ round, kind: round === 1 ? 'socratic' : 'literature', generatedBy: 'AI (OpenAI test)',
  items: Object.fromEntries(KEYS.slice(1).map(k => [k, round === 1 ? { focus: 'f', questions: ['q'] } : { status: 'reviewed', assessment: 'a', suggestions: [], sources: [] }])) });

function memoryStorage() {
  let v = null;
  return { get: () => v, set: x => { v = x; }, remove: () => { v = null; }, peek: () => v };
}
function fakeServer() {
  const s = { round: 0, calls: [], failNext: null };
  s.transport = async body => {
    s.calls.push(body);
    if (s.failNext) { const f = s.failNext; s.failNext = null; return f; }
    if (body.action === 'save') {
      if (body.round !== s.round + 1) return { ok: false, error: 'stale_round', message: '단계 불일치' };
      s.round = body.round;
      return { ok: true, id: 'RH261029ABCDEF12', token: body.id ? undefined : 't'.repeat(64), round: body.round, savedAt: `2026-10-29T0${body.round}:00:00+09:00`,
        feedback: body.round < 3 ? feedback(body.round) : null, submission: { round: body.round, status: 'draft' } };
    }
    if (body.action === 'submit') return s.round === 3 ? { ok: true, submission: { status: 'submitted' } } : { ok: false, error: 'not_ready', message: '3차 저장 필요' };
    return { ok: false, error: 'unsupported' };
  };
  return s;
}

test('서버 연결이 없으면 저장을 거절하고 단계를 올리지 않는다', async () => {
  const app = RH.createController({});
  app.setFields(fields()); app.setConsent(true);
  await assert.rejects(app.save(), /서버|연결/);
  assert.equal(app.state.round, 0);
  assert.equal(app.state.history.length, 0);
});

test('빈 항목이나 미동의 상태에서는 서버로 보내지 않는다', async () => {
  const server = fakeServer();
  const app = RH.createController({ transport: server.transport });
  app.setFields(fields({ theory: ' ' })); app.setConsent(true);
  await assert.rejects(app.save(), /이론적 근거/);
  app.setFields(fields()); app.setConsent(false);
  await assert.rejects(app.save(), /동의/);
  assert.equal(server.calls.length, 0);
});

test('1차 저장은 저장본을 고정해 보관하고, 이후 수정은 별도 편집본으로 남는다', async () => {
  const server = fakeServer(), storage = memoryStorage();
  const app = RH.createController({ transport: server.transport, storage });
  app.setFields(fields()); app.setConsent(true);
  await app.save();
  assert.equal(app.state.round, 1);
  assert.equal(app.state.feedback[1].kind, 'socratic');
  assert.deepEqual(storage.peek(), { id: 'RH261029ABCDEF12', token: 't'.repeat(64) });
  app.setField('title', '수정된 제목');
  assert.equal(app.state.history[0].fields.title, 'title 연구 내용');
  assert.ok(Object.isFrozen(app.state.history[0].fields));
});

test('서버 실패 시 단계를 유지하고, 재시도는 같은 요청 번호와 서버가 준 식별값으로 보낸다', async () => {
  const server = fakeServer(), storage = memoryStorage();
  const app = RH.createController({ transport: server.transport, storage });
  app.setFields(fields()); app.setConsent(true);
  server.failNext = { ok: false, error: 'feedback_failed', message: 'AI 피드백 생성에 실패했습니다.', id: 'RH261029ABCDEF12', token: 't'.repeat(64) };
  await assert.rejects(app.save(), /AI 피드백 생성에 실패/);
  assert.equal(app.state.round, 0);
  assert.equal(app.state.busy, false);
  assert.equal(app.state.id, 'RH261029ABCDEF12');
  await app.save();
  assert.equal(server.calls[1].requestId, server.calls[0].requestId);
  assert.equal(server.calls[1].id, 'RH261029ABCDEF12');
  assert.equal(app.state.round, 1);
  // 다음 단계는 새 요청 번호
  await app.save();
  assert.notEqual(server.calls[2].requestId, server.calls[1].requestId);
});

test('3차 저장 전에는 제출할 수 없고, 3차 저장 후 제출하면 상태가 바뀐다', async () => {
  const server = fakeServer();
  const app = RH.createController({ transport: server.transport });
  app.setFields(fields()); app.setConsent(true);
  await app.save(); await app.save();
  await assert.rejects(app.submit(), /3차 저장/);
  await app.save();
  assert.equal(app.state.round, 3);
  assert.equal(app.state.history.length, 3);
  await assert.rejects(app.save(), /3차 저장까지 완료/);
  await app.submit();
  assert.equal(app.state.status, 'submitted');
  await assert.rejects(app.save(), /이미 제출/);
});

test('이어쓰기: 저장 기록으로 단계·피드백·마지막 작성 내용을 되살린다', async () => {
  const storage = memoryStorage();
  storage.set({ id: 'RH261029ABCDEF12', token: 't'.repeat(64) });
  const transport = async body => ({ ok: true, submission: { id: body.id, round: 2, status: 'draft' }, revisions: [
    { round: 1, status: 'ok', savedAt: 'a', fields: fields(), feedback: feedback(1) },
    { round: 2, status: 'ok', savedAt: 'b', fields: fields({ title: '2차' }), feedback: feedback(2) },
    { round: 3, status: 'failed', savedAt: 'c', fields: fields({ title: '3차 시도' }), feedback: null }
  ] });
  const app = RH.createController({ transport, storage });
  assert.equal(await app.resume(), true);
  assert.equal(app.state.round, 2);
  assert.equal(app.state.history.length, 2);
  assert.equal(app.state.feedback[2].kind, 'literature');
  assert.equal(app.state.fields.title, '3차 시도');
});

test('이어쓰기 권한이 없으면 기기 기록을 지운다', async () => {
  const storage = memoryStorage();
  storage.set({ id: 'RH261029ABCDEF12', token: 'x'.repeat(64) });
  const app = RH.createController({ transport: async () => ({ ok: false, error: 'unauthorized', message: '저장 기록을 확인할 수 없습니다.' }), storage });
  await assert.rejects(app.resume(), /확인할 수 없/);
  assert.equal(storage.peek(), null);
});

test('PDF 문서: 작성자용은 최종본, 관리자용은 1·2·3차 저장본과 AI 표시가 있는 피드백을 담는다', () => {
  const record = { submission: { id: 'RH261029ABCDEF12', name: '테스트 작성자', submittedAt: '2026-10-29' }, revisions: [
    { round: 1, status: 'ok', savedAt: 'a', fields: fields(), feedback: feedback(1) },
    { round: 2, status: 'failed', savedAt: 'b', fields: fields(), feedback: null },
    { round: 2, status: 'ok', savedAt: 'c', fields: fields(), feedback: feedback(2) },
    { round: 3, status: 'ok', savedAt: 'd', fields: fields({ title: '최종 제목' }), feedback: null }
  ] };
  const mine = RH.pdfDocument(record);
  assert.match(mine.title, /최종 제목/);
  assert.equal(mine.blocks.filter(b => b.type === 'h3').length, 9);
  const all = RH.pdfDocument(record, { history: true });
  const h2 = all.blocks.filter(b => b.type === 'h2').map(b => b.text);
  assert.ok(h2.some(t => t.startsWith('1차 저장본')) && h2.some(t => t.startsWith('3차 저장본')));
  assert.ok(h2.includes('1차 DrS comments (AI 생성)'));
  assert.ok(all.blocks.some(b => b.type === 'note' && b.text.includes('AI(OpenAI)')));
  assert.equal(RH.pdfFileName(record), 'research-plan-테스트_작성자-RH261029ABCDEF12.pdf');
});

test('관리자: 세션이 만료되면 세션을 지운다', async () => {
  const session = memoryStorage();
  session.set('s'.repeat(64));
  const admin = RH.createAdmin({ transport: async () => ({ ok: false, error: 'admin_session', message: '만료' }), session });
  await assert.rejects(admin.list(), /만료/);
  assert.equal(admin.state.session, null);
  assert.equal(session.peek(), null);
});
