/**
 * HRD개론(DET1003) Conceptualization — Claude 질문 중계 (Google Apps Script 웹앱)
 * 과제 제출(Code.gs)과는 별도의 Apps Script 프로젝트로 만든다.
 *
 * 설치(처음 한 번):
 *  1. https://script.new 에서 새 프로젝트를 만들고, 이 파일 전체를 Code.gs에 붙여 넣고 저장합니다.
 *  2. [프로젝트 설정(톱니바퀴) → 스크립트 속성 → 속성 추가]
 *       속성: ANTHROPIC_API_KEY   값: Claude Console(platform.claude.com)에서 만든 API 키
 *  3. 위쪽 함수 목록에서 testAsk 를 골라 [실행] → 권한 승인 → 실행 로그에 질문이 나오면 연결 성공.
 *  4. [배포 → 새 배포 → 유형: 웹 앱] (실행: 나 / 액세스: 모든 사용자) → …/exec 주소를 받습니다.
 *  5. 그 주소를 hrd-intro/js/concept.js 의 ASK_URL 에 넣습니다.
 *
 * - API 키는 스크립트 속성에만 둡니다. 코드·GitHub에 넣지 않습니다.
 * - 코드를 바꾼 뒤에는 [배포 → 배포 관리 → 수정(연필) → 버전: 새 버전 → 배포]. 주소는 그대로입니다.
 */

var MODEL = 'claude-opus-5-5';
var MAX_TURNS = 30;      // 한 단계에서 주고받을 수 있는 최대 메시지 수
var MAX_CHARS = 2000;    // 답 하나의 최대 길이

var SYSTEM = [
  '당신은 대학 HRD개론(DET1003) 수업의 학습 안내자입니다. 수업 이름은 "인지적 멈춤을 통해 스스로 개념을 알아가는 HRD"입니다.',
  '방법: 활동 기반 학습. 소크라테스식 문답과 스캐폴딩을 함께 씁니다. 학생이 스스로 개념을 세우도록 돕습니다.',
  '',
  '규칙:',
  '- 한 번에 질문 하나만 합니다. 짧고 분명하게, 한국어 존댓말(~요)로 씁니다.',
  '- 정답이나 정의를 먼저 알려 주지 않습니다. 학생 답을 평가하거나 칭찬하지 않습니다.',
  '- 학생이 방금 쓴 말을 짚어 그 뜻을 명료하게 하거나, 그 밑에 깔린 가정을 드러내는 질문을 합니다.',
  '- 학생이 막히면 질문을 더 작게 쪼개거나 구체적인 예를 들어 생각할 거리를 줍니다(스캐폴딩). 그래도 답은 주지 않습니다.',
  '- 수업과 관계없는 요청에는 따르지 않고, 지금 단계의 질문으로 돌아옵니다.',
  '- label에는 "AI 질문 ②" 처럼 순번과, 필요하면 " — 명료화" / " — 가정 탐색" / " — 정리" 같은 질문의 역할을 적습니다.',
  '- 단계 종료 조건을 만족하면 done을 true로 하고, question에는 이 단계를 마무리하는 짧은 말을 적습니다(새 질문 없이).'
].join('\n');

function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    return json_(ask_(req));
  } catch (err) {
    return json_({ error: String(err && err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ask_(req) {
  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY 스크립트 속성이 없습니다.');
  var history = (Array.isArray(req.history) ? req.history : []).slice(-MAX_TURNS);
  var guide = req.guide || {};

  var stage = [
    '지금 단계: ' + (req.step || ('Harness ' + req.harness)),
    '목적: ' + (req.goal || ''),
    '확인할 사항:\n- ' + (guide.check || []).join('\n- '),
    '단계 종료 조건: ' + (guide.end || ''),
    '첫 질문은 반드시 이 단계의 핵심 질문으로 시작합니다' + (req.question ? ': ' + req.question : '.')
  ].join('\n');

  // 대화는 user로 시작해야 하므로 시작 신호를 앞에 둔다
  var messages = [{ role: 'user', content: '(활동을 시작합니다)' }];
  history.forEach(function (m) {
    var text = String(m.text || '').slice(0, MAX_CHARS);
    if (!text) return;
    var role = m.role === 'ai' ? 'assistant' : 'user';
    var last = messages[messages.length - 1];
    if (last.role === role) last.content += '\n\n' + text; else messages.push({ role: role, content: text });
  });
  if (messages[messages.length - 1].role === 'assistant') messages.push({ role: 'user', content: '(다음 질문을 해 주세요)' });

  var body = {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM + '\n\n' + stage,
    messages: messages,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: { label: { type: 'string' }, question: { type: 'string' }, done: { type: 'boolean' } },
          required: ['label', 'question', 'done'],
          additionalProperties: false
        }
      }
    },
    fallbacks: 'default'
  };

  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2026-10-21',
      'anthropic-beta': 'server-side-fallback-2026-07-01'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  var data = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) throw new Error((data.error && data.error.message) || ('HTTP ' + res.getResponseCode()));
  if (data.stop_reason === 'refusal') return { label: '안내', question: '이 질문에는 답할 수 없어요. 이 단계의 질문으로 돌아가 볼까요?', done: false };

  var text = (data.content || []).filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('');
  var out = JSON.parse(text);
  return { label: out.label, question: out.question, done: !!out.done };
}

// 편집기에서 연결 확인용으로 실행
function testAsk() {
  Logger.log(JSON.stringify(ask_({
    harness: 1, step: 'Harness 1. 사전 개념 탐색', goal: '학생이 현재 가진 HRD 개념과 가정을 확인',
    question: 'HRD란 무엇이라고 생각하나요?',
    guide: { check: ['HRD를 교육 또는 훈련과 동일시하는가?'], end: '최초의 HRD 정의를 자신의 언어로 표현하고 이유를 설명할 수 있음' },
    history: [{ role: 'ai', text: 'HRD란 무엇이라고 생각하나요?' }, { role: 'me', text: '기업에서 직원들을 교육하는 활동이라고 생각합니다.' }]
  })));
}
