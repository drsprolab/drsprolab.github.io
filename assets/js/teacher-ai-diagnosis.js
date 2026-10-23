// 나와 우리학교 AI 역량 수준 진단(AI 역량 수준 진단의 복제본, 학교급·소속 학교 입력): 설문 응답 수집 → 분석 실시 →
// 나의 역량 수준 / 우리 학교 역량 수준 / 타학교 비교 / 학교급별 비교 / 전체 학교 수준.
// 문항: AI 활용 역량 진단 도구(기본형)의 실천 25문항(5개 영역) + 태도 6문항을 5점 동의 척도로 묻는다.
// 응답 저장: #aidx의 data-endpoint(Google Apps Script 웹앱, tools/teacher-ai-diagnosis/)가 있으면 그곳에,
// 비어 있으면 연결 전 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
(function () {
  var root = document.getElementById('aidx');
  if (!root) return;
  var tip = document.getElementById('aidx-tip');
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = cleanGroup(new URLSearchParams(location.search).get('group'));
  // 저장 키에 판(v2)과 모드를 넣는다. 판을 올리면 예전 응답은 무시되고, 시험 모드 응답은 실제 수집과 섞이지 않는다.
  // 원본 진단(aidx-v2)과 저장 키를 나눠, 두 진단의 내 결과가 섞이지 않게 한다.
  var LS_ME = 'tadx-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'tadx-v1-test-responses';
  var MIN_N = 5; // 그룹 내 위치(백분위)를 보여 줄 최소 응답 수

  // ---------- 문항 ----------
  // 중고등학교용: 원본(ai-diagnosis.js)과 같은 다섯 영역을 중학생도 바로 이해할 수 있는 이름과 말로 바꿨다.
  var DOMAINS = [
    { key: 'D', when: '맡기기 전', icon: '🤔', ex: '틀리면 얼마나 곤란한지, 직접 하는 게 더 빠른지 생각해 본다', def: '틀렸을 때의 피해, 내가 확인할 수 있는지, 걸리는 시간을 따져 AI를 쓸지, 얼마나 쓸지 정한다.', name: '맡길지 판단', q: '이 일을 AI에게 맡길까?', risk: 'AI를 너무 믿거나, 아예 피하기' },
    { key: 'L', when: '맡길 때', icon: '🗣️', ex: '결과물을 어디에 쓸지, 지킬 조건은 무엇인지 함께 알려 준다', def: '목적과 조건을 알려 주고, 단계를 나눠 진행하며, AI에게 줄 권한의 범위를 정한다.', name: '요청하기', q: '어떻게 부탁할까?', risk: '엉뚱한 결과, 너무 많은 권한 주기' },
    { key: 'V', when: '결과를 받으면', icon: '🔍', ex: 'AI가 알려 준 숫자와 출처를 믿을 만한 자료에서 확인한다', def: '사실, 근거, 출처, 완성 여부를 직접 확인한다.', name: '확인하기', q: '이 답을 믿어도 될까?', risk: '틀린 정보를 그대로 믿기' },
    { key: 'R', when: '내기 전', icon: '📤', ex: '개인정보·저작권을 살피고, AI를 썼다면 밝힌다', def: '개인정보와 저작권을 지키고, 차별 표현을 살피며, AI 사용을 밝히고 결과를 내 책임으로 다룬다.', name: '책임 있게 쓰기', q: '이대로 내도 될까?', risk: '개인정보 유출, 표절, 차별' },
    { key: 'H', when: '쓰는 내내', icon: '🧠', ex: 'AI에게 묻기 전에 내 생각부터 정리한다', def: '스스로 먼저 생각하고, 기본 실력을 지키며, AI를 쓰는 습관을 돌아본다.', name: '내 힘 지키기', q: '내 실력은 그대로인가?', risk: '생각하는 힘과 기본 실력이 약해짐' }
  ];
  // 문항: 원본과 같은 코드·같은 행동을 묻되, 중고등학생 읽기 수준의 쉬운 말과 학교 장면(숙제·수행평가·수업 자료·공문)의 예시로 바꿨다.
  // 학생과 교직원이 같은 문항에 답하므로, 예시는 둘 다 떠올릴 수 있는 것으로 든다.
  var ITEMS = [
    ['D1', 'AI에게 일을 맡기기 전에, AI가 틀리면 얼마나 곤란해질지 생각해 본다.'],
    ['D2', 'AI에게 일을 맡기기 전에, AI의 답이 맞는지 내가 확인할 수 있는 일인지 생각해 본다.'],
    ['D3', 'AI의 답을 볼 때, 전에 비슷한 질문에서 AI가 얼마나 맞았는지 떠올려 본다.'],
    ['D4', 'AI에게 일을 맡기기 전에, 내가 직접 하는 것이 더 빠를지 생각해 본다.'],
    ['D5', '진로나 친구·동료 관계처럼 나에게 중요한 고민을 AI에게 물을 때, AI가 말하지 않은 다른 방법도 생각해 본다.'],
    ['L1', 'AI에게 부탁할 때, 결과물을 어디에 쓸지(예: 발표 자료, 수업 자료, 가정통신문) 알려 준다.'],
    ['L2', 'AI에게 부탁할 때, 지켜야 할 조건(예: 글자 수, 형식, 빼야 할 내용)을 함께 적는다.'],
    ['L3', 'AI의 답이 내가 원한 것과 다르면, 어느 부분이 다른지 말해 주고 다시 부탁한다.'],
    ['L4', '여러 단계로 된 일을 맡길 때, 한꺼번에 맡기지 않고 단계마다 결과를 확인하며 진행한다.'],
    ['L5', 'AI 앱이나 프로그램이 내 계정이나 파일을 쓰도록 허용하기 전에, 무엇을 허용하는지 확인한다.'],
    ['V1', 'AI가 알려 준 숫자나 날짜를 쓰기 전에, 교과서나 믿을 만한 자료에서 확인한다.'],
    ['V2', 'AI가 알려 준 출처(예: 책, 기사, 웹사이트)가 실제로 있는지 찾아본다.'],
    ['V3', 'AI의 답을 읽을 때, 근거가 있는 내용과 근거 없이 주장만 하는 내용을 구분한다.'],
    ['V4', 'AI의 답이 내 생각과 같을 때에도, 그 답의 근거를 확인한다.'],
    ['V5', 'AI가 다 했다고 해도, 결과물(예: 파일, 표, 요약)을 직접 열어 확인한다.'],
    ['R1', 'AI에 자료를 넣기 전에, 다른 사람의 개인정보(예: 이름, 연락처, 성적)가 들어 있는지 확인한다.'],
    ['R2', 'AI가 만든 내용을 내 이름으로 내기 전에, 그 내용을 내가 설명할 수 있는지 확인한다.'],
    ['R3', 'AI를 썼는지 밝히도록 정해진 경우(예: 숙제, 수행평가, 공문서)에는 AI를 어떻게 썼는지 밝힌다.'],
    ['R4', 'AI가 만든 글이나 그림에 어떤 사람이나 집단을 차별하는 표현이 있는지 살펴본다.'],
    ['R5', 'AI가 만든 결과물을 쓰기 전에, 다른 사람의 글이나 그림이 그대로 들어 있는지 확인한다.'],
    ['H1', 'AI에게 묻기 전에, 내 생각을 먼저 정리한다.'],
    ['H2', 'AI가 대신할 수 있는 일이라도, 내가 꼭 익혀야 할 기본 작업(예: 글쓰기, 계산)은 직접 한다.'],
    ['H3', 'AI의 도움을 받아 끝낸 일에서 내가 새로 배운 점을 돌아본다.'],
    ['H4', 'AI로 끝낸 일을 AI 없이도 할 수 있을지 생각해 본다.'],
    ['H5', 'AI가 쓴 글을 사용할 때, 내 말로 다시 쓴다.'],
    ['T1', 'AI에게 맡기면 편한 일이라도, 맡길지 먼저 생각해 보는 것이 좋다.'],
    ['T2', '중요한 결정일수록 AI의 의견보다 사람의 판단을 먼저 따라야 한다.'],
    ['T3', 'AI의 답이 그럴듯해 보여도, 시간을 들여 확인할 가치가 있다.'],
    ['T4', 'AI가 틀린 내용이라도, 그것을 그대로 쓴 사람에게 책임이 있다.'],
    ['T5', '밝히지 않아도 되는 경우에도, AI를 쓴 사실을 밝히는 것이 좋다.'],
    ['T6', 'AI가 더 빨리 할 수 있는 일이라도, 사람이 직접 할 줄 알아야 한다.']
  ].map(function (r, i) { return { code: r[0], text: r[1], idx: i }; });
  var NP = 25, NI = ITEMS.length; // 실천 문항 수, 전체 문항 수
  var SCALE = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var ROLES = ['학생', '교사', '보직교사', '행정직원'];
  var ROLE_NOTE = { '보직교사': '부장·교감·교장 포함' };
  var SCHOOL_LEVELS = ['초등학교', '중학교', '고등학교', '기타'];
  var MIN_SCHOOL = 3; // 학교끼리 비교할 때 넣을 최소 응답 수
  // 우리 학교 결과의 우선순위 제안: 영역마다 학교 차원에서 할 일 두 가지
  var SCHOOL_TIPS = {
    D: ['수업·업무별로 "AI에게 맡겨도 되는 일 / 확인하고 쓰는 일 / 맡기면 안 되는 일" 기준표를 만들어 학교 전체에 공유하세요.', '교과·부서별로 AI에게 맡겨서 잘 된 사례와 실패한 사례를 나누는 짧은 공유회를 여세요.'],
    L: ['수업 준비·공문·생활기록부처럼 자주 하는 일의 AI 요청문(목적·조건·형식) 예시를 모아 학교 공용 자료로 만드세요.', '여러 단계로 된 일을 나눠 요청하고 중간 결과를 확인하는 실습형 연수를 운영하세요.'],
    V: ['과제·보고서 양식에 "AI가 준 수치·출처를 원자료에서 확인했는가" 체크 칸을 넣으세요.', 'AI가 만든 그럴듯한 오류를 직접 찾아보는 팩트체크 수업·연수를 학기마다 한 번 이상 운영하세요.'],
    R: ['학생 개인정보·성적·상담 기록을 AI에 넣지 않는다는 학교 지침을 정하고 교직원·학생에게 안내하세요.', '수행평가·과제에서 AI 사용을 밝히는 공통 양식(무엇에, 어떻게 썼는지)을 정해 함께 쓰세요.'],
    H: ['AI를 쓰기 전에 자기 생각을 먼저 적게 하는 "먼저 생각하기" 단계를 수업 활동에 넣으세요.', 'AI를 활용한 수업·업무 뒤에 배운 점을 한 줄로 남기는 성찰 활동을 정례화하세요.']
  }; // 응답 버튼에서 이름 아래 작은 글씨로 보인다
  // 제시 순서: 실천 문항은 영역을 섞어 한 쪽에 영역별 1문항씩(D1 L1 V1 R1 H1 …), 마지막 쪽은 태도
  var PAGES = [0, 1, 2, 3, 4].map(function (k) { return DOMAINS.map(function (_, d) { return ITEMS[d * 5 + k]; }); });
  PAGES.push(ITEMS.slice(NP));

  // ---------- 수준·유형·조언 ----------
  var LEVELS = [{ min: 80, t: '주도' }, { min: 60, t: '정착' }, { min: 40, t: '형성' }, { min: 0, t: '시작' }];
  var CUT = 60; // 정착 기준점(잠정)
  // 결과지에 보여 줄 AI 활용 유형. 이름은 영역 이름을 피하고 캐릭터처럼 짓는다.
  // icon 이모지 · quote 이 유형이 자주 하는 말 · ai "AI는 나에게 ○○" · tags 해시태그 · tag 한 줄 설명(그룹 결과 툴팁)
  var TYPES = {
    master: { name: 'AI 드림팀 캡틴', icon: '🧭', quote: '맡길 건 맡기고, 확인할 건 확인하고, 책임은 내가 진다.', ai: '믿고 일하는 팀원', tags: ['완급조절', '끝까지확인', '모두의기준'], tag: 'AI와 한 팀처럼 일하는 법이 몸에 밴 사람',
      desc: '언제 AI를 부를지, 어떻게 시킬지, 결과를 어디까지 믿을지가 모두 습관이 되어 있습니다. 빠르면서도 실수가 적어서, 주변 사람들이 "AI 어떻게 써요?"라고 물어보러 오는 사람입니다.' },
    starter: { name: 'AI 새내기 탐험가', icon: '🌱', quote: '일단 한번 물어볼까?', ai: '아직 낯선 신문물', tags: ['호기심', '첫걸음', '성장잠재력'], tag: 'AI와 일하는 습관을 이제 막 만들어 가는 사람',
      desc: 'AI를 아직 많이 쓰지 않았거나, 쓰더라도 별다른 기준 없이 쓰고 있습니다. 지금은 출발선이라 작은 습관 하나만 들여도 점수가 눈에 띄게 오르는, 성장 폭이 가장 큰 단계입니다.' },
    speed: { name: '질주하는 스피드레이서', icon: '🏎️', quote: '벌써 다 됐는데요?', ai: '터보 엔진', tags: ['초고속', '결과물뽑기장인', '브레이크점검필요'], tag: 'AI를 잘 부리지만 확인 없이 달리기 쉬운 사람',
      desc: 'AI에게서 원하는 결과를 뽑아내는 솜씨는 수준급인데, 결승선을 너무 빨리 통과합니다. 틀린 수치나 없는 출처가 그대로 실려 나갈 수 있으니, 출발 전 브레이크 점검 한 번이면 완벽해집니다.' },
    self: { name: '손맛 지키는 장인', icon: '🔨', quote: '그래도 이건 내가 직접 해야지.', ai: '가끔 꺼내 쓰는 연장', tags: ['기본기', '자기주도', 'AI는조금만'], tag: '자기 실력은 지키지만 AI에게 잘 맡기지 않는 사람',
      desc: '스스로 생각하고 손으로 해내는 힘은 단단합니다. 대신 AI에게 일을 맡기고 이끄는 데는 아직 서툴러서, AI가 금방 끝낼 일에도 시간을 쓰고 있을 수 있습니다. 연장 몇 개만 더 손에 익히면 작업 속도가 확 달라집니다.' },
    balanced: { name: '오각형 꿈나무', icon: '⭐', quote: '골고루 조금씩 다 해요.', ai: '함께 크는 동료', tags: ['고른성장', '약점없음', '한방이필요'], tag: '모든 면이 고르게 자라고 있는 사람',
      desc: '어느 한쪽으로 치우치지 않은 반듯한 오각형입니다. 뚜렷한 약점이 없는 대신 "이건 내가 최고"라고 할 무기도 아직 없습니다. 하나를 골라 먼저 습관으로 굳히면 오각형 전체가 커집니다.' },
    D: { name: '냉철한 전략가', icon: '♟️', quote: '이걸 굳이 AI한테 맡겨야 할까?', ai: '상황 봐서 꺼내는 카드', tags: ['손익계산', '선택과집중', '과신금지'], tag: 'AI 카드를 언제 쓸지 계산하는 사람',
      desc: 'AI를 쓰기 전에 "틀리면 얼마나 곤란한지, 확인은 할 수 있는지, 내가 하는 게 더 빠른지"를 먼저 따집니다. AI에 휘둘리지도, 괜히 피하지도 않는 노련한 플레이어입니다.' },
    L: { name: 'AI 조련사', icon: '🎛️', quote: '용도는 발표 자료, 분량은 한 쪽, 표는 빼고!', ai: '말 잘 듣는 조수', tags: ['요청의달인', '재요청장인', '단계별진행'], tag: 'AI에게 원하는 것을 정확히 시키는 사람',
      desc: '무엇에 쓸지, 어떤 조건을 지켜야 할지 분명하게 말하고, 결과가 엇나가면 어디가 다른지 짚어서 다시 시킵니다. 같은 AI를 써도 이 사람이 쓰면 결과물이 다릅니다.' },
    V: { name: 'AI 팩트체크 탐정', icon: '🔍', quote: '그 출처, 진짜 있는 거 맞아?', ai: '일단 의심해 볼 증인', tags: ['출처확인', '원래자료', '속지않음'], tag: 'AI의 답을 그냥 믿지 않고 증거부터 찾는 사람',
      desc: 'AI가 내놓은 수치는 원래 자료에서, 출처는 실제로 있는지 직접 확인합니다. 그럴듯한 말과 근거 있는 말을 가려내는 눈이 있어서, AI가 지어낸 이야기에 좀처럼 속지 않습니다.' },
    R: { name: '디지털 양심 지킴이', icon: '🛡️', quote: '잠깐, 여기 개인정보 들어 있어요.', ai: '조심히 다뤄야 할 강력한 도구', tags: ['개인정보', '저작권', '투명공개'], tag: '내보내기 전에 선을 넘지 않았는지 챙기는 사람',
      desc: '자료를 넣기 전에는 개인정보를, 내보내기 전에는 저작권과 차별 표현을 살피고, AI를 썼으면 썼다고 밝힙니다. 팀에 한 명 있으면 사고가 나지 않는, 믿고 맡길 수 있는 사람입니다.' },
    H: { name: '생각 근육 트레이너', icon: '🧠', quote: 'AI한테 묻기 전에, 내 생각부터.', ai: '스파링 파트너', tags: ['먼저생각', '기본기유지', '배우는사용자'], tag: 'AI를 써도 자기 생각 근육은 놓지 않는 사람',
      desc: 'AI에게 묻기 전에 생각을 먼저 정리하고, AI와 함께 끝낸 일에서도 무엇을 배웠는지 돌아봅니다. AI를 오래 쓸수록 오히려 실력이 느는 드문 유형입니다.' }
  };
  var TYPE_ORDER = ['master', 'D', 'L', 'V', 'R', 'H', 'speed', 'self', 'balanced', 'starter'];
  var TIPS = {
    D: ['일을 맡기기 전에 "틀리면 얼마나 곤란한가"를 상·중·하로 매겨 보세요. 상이면 AI 결과는 초안으로만 씁니다.', '결과를 확인할 방법이 없는 일은 AI 답을 그대로 쓰지 말고, 확인할 경로부터 정하세요.', '몇 분 안에 직접 끝낼 수 있는 일은 AI에게 맡기지 않는 기준을 정해 두세요.'],
    L: ['요청 첫 줄에 결과물을 어디에 쓸지(누가 읽는지, 어떤 자리인지) 적으세요.', '분량·형식·피해야 할 내용 같은 조건을 요청과 함께 적으세요.', '여러 단계로 된 일은 한 번에 맡기지 말고, 단계마다 중간 결과를 보고 넘어가세요.'],
    V: ['AI가 제시한 수치는 쓰기 전에 원래 출처에서 한 번 확인하세요.', 'AI가 알려 준 책·기사가 실제로 있는지 검색해 보세요. AI는 없는 출처를 만들어 내기도 합니다.', '내 예상과 같은 답일수록 근거를 한 번 더 확인하세요.'],
    R: ['AI에 붙여 넣기 전에 다른 사람의 이름·연락처·성적 같은 개인정보를 지우세요.', '내 이름으로 내보낼 내용은 내가 설명할 수 있는지 먼저 확인하세요.', '숙제·수행평가·공문서에서는 AI를 어떻게 썼는지 밝히세요.'],
    H: ['AI에게 묻기 전에 내 생각을 두세 줄로 먼저 적어 보세요.', '내 일의 기본이 되는 작업은 AI가 할 수 있어도 정기적으로 직접 해 보세요.', 'AI와 함께 끝낸 일에서 새로 배운 점을 한 줄로 남겨 보세요.']
  };

  // ---------- 상태 ----------
  var state = { view: 'home', page: -1, answers: {}, role: '', org: '', started: 0, tab: 'me', me: null, pool: null, allPool: null };

  // ---------- 유틸 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cleanGroup(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function variance(a) { var m = mean(a); return a.length > 1 ? a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1) : 0; }
  function sd(a) { return Math.sqrt(variance(a)); }
  function q(a, p) { var s = a.slice().sort(function (x, y) { return x - y; }), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); }
  function r0(v) { return Math.round(v); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function signed(v) { var r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function level(v) { for (var i = 0; i < LEVELS.length; i++) if (v >= LEVELS[i].min) return LEVELS[i].t; return '시작'; }
  function lvlCls(t) { return { '주도': 'l4', '정착': 'l3', '형성': 'l2', '시작': 'l1' }[t]; }
  function pct(arr, v) { var lo = 0, eq = 0; arr.forEach(function (x) { if (x < v - 1e-9) lo++; else if (Math.abs(x - v) < 1e-9) eq++; }); return (lo + eq / 2) / arr.length * 100; }
  function topPct(arr, v) { return Math.min(99, Math.max(1, Math.round(100 - pct(arr, v)))); }
  function rank(arr, v) { return arr.length < MIN_N ? '–' : '상위 ' + topPct(arr, v) + '%'; }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경: 이번 화면에서만 유지 */ } }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 8; i++) s += A[b[i] % A.length];
    return s;
  }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  // 받침에 맞는 조사: josa('확인하기', '은', '는') → '확인하기는'
  function josa(w, a, b) { var c = w.charCodeAt(w.length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
  function copyBtn(id, small) { return '<button type="button" class="aidx-copy' + (small ? ' small' : '') + '" data-act="copycode" data-code="' + fmtId(id) + '">복사</button>'; }
  // 비교 집단 이름: 소속이 있으면 같은 소속, 없으면 링크의 그룹, 둘 다 없으면 전체
  function groupLabel(P) { return P.org ? '우리 학교(' + P.org + ')' : '전체 응답자'; }
  // 소속 비교용: 띄어쓰기·대소문자·문장부호 차이는 같은 소속으로 본다(서버의 normOrg_와 같은 규칙).
  function normOrg(s) { return String(s || '').toLowerCase().replace(/[\s.,·()\[\]'"-]/g, ''); }

  // ---------- 점수 ----------
  // 영역 점수 0~100 = (문항 평균 − 1) × 25. 종합 = 5개 실천 영역 점수의 평균. 태도도 같은 방식.
  function score(a) {
    var dom = DOMAINS.map(function (_, d) { return (mean(a.slice(d * 5, d * 5 + 5)) - 1) * 25; });
    return { dom: dom, total: mean(dom), att: (mean(a.slice(NP)) - 1) * 25, a: a };
  }
  function typeOf(s) {
    var d = s.dom, m = s.total, mx = Math.max.apply(null, d), mn = Math.min.apply(null, d);
    if (m >= 80 && mn >= 70) return 'master';
    if (m < 40) return 'starter';
    if (d[1] >= 65 && d[2] <= d[1] - 20) return 'speed';
    if (d[4] >= 65 && d[1] <= d[4] - 20) return 'self';
    if (mx - mn < 12) return 'balanced';
    return DOMAINS[d.indexOf(mx)].key;
  }

  // ---------- 데이터 ----------
  // 응답 저장소 호출. 구글 쪽이 멈춰도 화면이 '저장하는 중'에 머물지 않도록 25초 뒤 실패로 끝낸다.
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function localRows() { return load(LS_DATA) || []; }

  function submit(rec) {
    if (PREVIEW) {
      var rows = localRows(); rows.push(rec); save(LS_DATA, rows);
      return Promise.resolve();
    }
    // text/plain으로 보내야 Apps Script가 사전 요청(CORS preflight) 없이 받는다.
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      // 시간 초과 뒤 다시 누르면 같은 코드로 보낸다. 앞선 요청이 이미 저장됐다면 duplicate가 오니 성공으로 본다.
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  // 모든 응답을 한 번에 불러온다. 학교 이름은 받지 않고, 서버가 준 익명 학교 키(k)와 내 학교 표시(s)만 쓴다.
  function fetchAll(me) {
    if (PREVIEW) {
      var mine = me ? normOrg(me.org) : '';
      return Promise.resolve(withMine(localRows().map(function (r) {
        var k = normOrg(r.org);
        return { role: r.role, lv: r.lv || '', k: k, same: !!(mine && k === mine), a: r.answers, mine: !!(me && r.id === me.id) };
      }), me));
    }
    var u = ENDPOINT + '?action=all' + (me ? '&me=' + encodeURIComponent(me.id) + '&org=' + encodeURIComponent(me.org || '') : '');
    return call(u).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return withMine(j.rows.map(function (r) { return { role: r.role, lv: r.lv || '', k: r.k || '', same: !!r.s, a: r.a, mine: !!r.m }; }), me);
    });
  }
  function withMine(rows, me) {
    if (me && !rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, lv: me.lv || '', k: 'me', same: true, a: me.answers, mine: true });
    return rows;
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve(localRows().filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id))
      .then(function (j) { return j.ok && j.row ? { id: j.row.id, group: j.row.group, role: j.row.role, lv: j.row.lv || '', org: j.row.org || '', answers: j.row.a } : null; });
  }

  // ---------- 그림: 방사형 차트 (0~100) ----------
  function radar(series, label) {
    var n = DOMAINS.length, W = 540, H = 400, cx = W / 2, cy = H / 2 + 8, R = 136;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="radar" role="img" aria-label="' + esc(label) + '">';
    [20, 40, 60, 80, 100].forEach(function (g) {
      s += '<polygon points="' + DOMAINS.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" class="rd-grid' + (g === 100 ? ' rd-outer' : '') + (g === CUT ? ' aidx-cut' : '') + '"/>';
      var p0 = pt(0, g); s += '<text x="' + (p0[0] + 5) + '" y="' + (p0[1] + 4) + '" class="rd-tick">' + g + '</text>';
    });
    DOMAINS.forEach(function (dm, i) {
      var e = pt(i, 100), l = pt(i, 116);
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" class="rd-axis"/>';
      var anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<text x="' + l[0] + '" y="' + (l[1] + (i === 0 ? -2 : 6)) + '" text-anchor="' + anchor + '" class="rd-label">' + esc(dm.name) + '</text>';
    });
    series.forEach(function (se) { s += '<polygon points="' + se.values.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" class="rd-area ' + se.cls + (se.dashed ? ' rd-dashed' : '') + '"/>'; });
    series.forEach(function (se) {
      if (se.dashed) return;
      se.values.forEach(function (v, i) {
        var p = pt(i, v);
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" class="rd-dot ' + se.cls + '"/>';
        s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="13" class="rd-hit" data-tip="' + esc(se.label + ' · ' + DOMAINS[i].name + ' ' + r0(v) + '점') + '"/>';
      });
    });
    return s + '</svg>';
  }
  function legend(items) {
    return '<div class="legend">' + items.map(function (it) { return '<span class="lg"><span class="lg-key ' + it.cls + (it.dashed ? ' lg-dashed' : '') + '"></span>' + esc(it.label) + '</span>'; }).join('') + '</div>';
  }
  function kpi(k, v, s) { return '<div class="kpi"><span class="kpi-k">' + k + '</span><span class="kpi-v">' + v + '</span>' + (s ? '<span class="kpi-s">' + s + '</span>' : '') + '</div>'; }
  function lvlChip(v) { var t = level(v); return '<span class="aidx-lv ' + lvlCls(t) + '">' + t + '</span>'; }

  // ---------- 화면: 대문 ----------
  function viewHome() {
    var me = load(LS_ME);
    var h = previewNote() +
      '<section class="aidx-home">' +
      '<p class="aidx-lead">AI에게 무엇을 맡기고, 어떻게 부탁하고, 결과를 어떻게 확인하는지.<br>지난 4주 동안의 실제 행동으로 나의 AI 활용 역량을 진단합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">BETA</li><li>31문항</li><li>약 6분</li><li>익명</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 그룹 <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button></div>' +
      '<div class="aidx-actions sub">' +
      '<button type="button" class="aidx-btn" data-act="my">나의 역량 수준 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="school">우리 학교 역량 수준 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="all">전체 학교 수준 보기</button></div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code> ' + copyBtn(me.id, true) + '</p>' : '') +
      '<div class="aidx-gate" id="aidx-gate" role="alert" hidden><p><strong id="aidx-gate-msg"></strong></p>' +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button></div>' +
      '<form class="aidx-code" id="aidx-code" hidden><label for="aidx-code-in">결과 코드</label>' +
      '<input id="aidx-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="aidx-code-err"></span></form>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 진단하나요</h2>' +
      '<p>AI와 일하는 한 번의 흐름에서, 다섯 순간마다 내가 <strong>실제로 하는 행동</strong>을 봅니다.</p>' +
      '<ol class="aidx-flow">' + DOMAINS.map(function (dm, i) {
        return '<li><span class="aidx-when"><b>' + (i + 1) + '</b>' + dm.when + '</span>' +
          '<span class="aidx-ficon" aria-hidden="true">' + dm.icon + '</span>' +
          '<strong class="aidx-fname">' + dm.name + '</strong>' +
          '<span class="aidx-fq">' + dm.q + '</span>' +
          '<span class="aidx-fex">예) ' + dm.ex + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>영역별 5문항 → 실천 25문항</span><span>+ AI에 대한 생각 6문항</span><span>= 31문항</span></p></section>';
    root.innerHTML = h;
  }
  function previewNote() {
    return PREVIEW ? '<p class="aidx-preview">시험 모드: 응답 저장소가 아직 연결되지 않아, 응답이 이 브라우저에만 저장됩니다.</p>' : '';
  }

  // ---------- 화면: 설문 ----------
  function answered() { return Object.keys(state.answers).length; }
  function viewSurvey() {
    var p = state.page, h = '';
    var done = answered() + (state.role ? 1 : 0), total = NI + 1;
    h += '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total * 100) + '%"></span></div>';
    h += '<p class="aidx-step">' + (p + 2) + ' / ' + (PAGES.length + 1) + '</p>';
    if (p === -1) {
      h += '<h2 class="aidx-h">응답하기 전에</h2>' +
        '<ol class="aidx-guide">' +
        '<li><span class="aidx-gicon" aria-hidden="true">🗓️</span><strong>지난 4주를 떠올리세요</strong><span>ChatGPT, Claude, Gemini, Copilot 등 AI를 쓰거나 쓸지 고민했던 순간</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">✋</span><strong>실제로 하는 만큼 고르세요</strong><span>정답은 없습니다. 해야 한다고 생각하는 것이 아니라 실제로 하는 것</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">⏱️</span><strong>31문항 · 약 6분</strong><span>한 화면에 5문항씩, 1(전혀 그렇지 않다)~5(매우 그렇다) 중 하나</span></li>' +
        '</ol>' +
        '<fieldset class="aidx-role"><legend>먼저, 나는</legend><div class="aidx-roles">' +
        ROLES.map(function (r) { return '<label><input type="radio" name="role" value="' + r + '"' + (state.role === r ? ' checked' : '') + '><span>' + r + (ROLE_NOTE[r] ? '<small class="aidx-role-note">' + ROLE_NOTE[r] + '</small>' : '') + '</span></label>'; }).join('') +
        '</div></fieldset>' +
        '<fieldset class="aidx-role"><legend>학교급</legend><div class="aidx-roles">' +
        SCHOOL_LEVELS.map(function (v) { return '<label><input type="radio" name="lv" value="' + v + '"' + (state.lv === v ? ' checked' : '') + '><span>' + v + '</span></label>'; }).join('') +
        '</div></fieldset>' +
        '<div class="aidx-org"><label for="aidx-org-in">소속 학교</label>' +
        '<input id="aidx-org-in" name="org" maxlength="40" autocomplete="organization" value="' + esc(state.org) + '">' +
        '<p class="aidx-hint">학교 이름을 정확히 적어 주세요. 예) 대한중학교 / 대한고등학교</p></div>';
    } else {
      var items = PAGES[p];
      h += '<h2 class="aidx-h">' + (p < 5 ? '각 문장이 나의 실제 행동과 얼마나 같은가요?' : '다음 생각에 얼마나 동의하나요?') + '</h2>';
      h += '<ol class="aidx-items">' + items.map(function (it) {
        var no = PAGES.slice(0, p).reduce(function (s, x) { return s + x.length; }, 0) + items.indexOf(it) + 1;
        return '<li class="aidx-item" id="q-' + it.code + '"><p class="aidx-q"><span class="aidx-no">' + no + '</span>' + esc(it.text) + '</p>' +
          '<div class="aidx-scale"><span class="aidx-end">' + SCALE[0] + '</span><div class="aidx-dots" role="radiogroup" aria-label="' + esc(it.text) + '">' + SCALE.map(function (lab, v) {
            return '<label title="' + lab + '"><input type="radio" name="' + it.code + '" value="' + (v + 1) + '" aria-label="' + (v + 1) + ' ' + lab + '"' + (state.answers[it.code] === v + 1 ? ' checked' : '') + '><span>' + (v + 1) + '</span></label>';
          }).join('') + '</div><span class="aidx-end">' + SCALE[4] + '</span></div></li>';
      }).join('') + '</ol>';
    }
    var last = p === PAGES.length - 1;
    h += '<div class="aidx-nav"><button type="button" class="aidx-btn" data-act="prev">' + (p === -1 ? '처음으로' : '이전') + '</button>' +
      '<span class="aidx-err" id="aidx-err"></span>' +
      '<button type="button" class="aidx-btn primary" data-act="next">' + (last ? '응답 제출' : '다음') + '</button></div>';
    root.innerHTML = previewNote() + '<section class="aidx-survey">' + h + '</section>';
  }
  function pageComplete() {
    if (state.page === -1) return !state.role ? 'role' : !state.lv ? 'lv' : !state.org.trim() ? 'org' : null;
    var miss = PAGES[state.page].filter(function (it) { return !state.answers[it.code]; });
    return miss.length ? miss[0].code : null;
  }

  // ---------- 화면: 제출 완료 / 분석 중 ----------
  function viewDone() {
    var me = state.me;
    root.innerHTML = previewNote() + '<section class="aidx-home">' +
      '<h2 class="aidx-h">응답이 저장되었습니다</h2>' +
      '<p class="aidx-codeline">결과 코드 <code class="aidx-bigcode">' + fmtId(me.id) + '</code>' + copyBtn(me.id) + '</p>' +
      '<p class="aidx-small">다른 기기에서 결과를 다시 볼 때 이 코드가 필요합니다. 복사해 두세요.</p>' +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="analyze">분석 실시</button></div></section>';
  }
  function viewAnalyzing(msg) {
    root.innerHTML = '<section class="aidx-home"><div class="aidx-spin" aria-hidden="true"></div><p>' + esc(msg) + '</p></section>';
  }
  function viewError(msg) {
    root.innerHTML = '<section class="aidx-home"><p class="aidx-err">' + esc(msg) + '</p><div class="aidx-actions"><button type="button" class="aidx-btn" data-act="home">처음으로</button></div></section>';
  }

  // ---------- 분석 실행 ----------
  function scored(r) { var s = score(r.a); s.role = r.role; s.lv = r.lv || ''; s.k = r.k || ''; s.same = !!r.same; s.mine = r.mine; s.type = typeOf(s); return s; }
  // 응답 전체를 불러와 나눈다: 우리 학교(같은 소속), 같은 학교급 다른 학교, 전체.
  function analyze(tab) {
    state.tab = tab;
    var me = state.me;
    viewAnalyzing(tab === 'me' ? '응답을 분석하고 있습니다' : '학교별 응답을 모으고 있습니다');
    var t0 = Date.now();
    fetchAll(me).then(function (raw) {
      var rows = raw.map(scored), org = me ? me.org || '' : '', lv = me ? me.lv || '' : '';
      var S = rows.filter(function (r) { return r.same; });
      state.data = { rows: rows, S: S, lv: lv, org: org,
        LA: rows.filter(function (r) { return lv && r.lv === lv; }),
        LO: rows.filter(function (r) { return lv && r.lv === lv && !r.same; }) };
      state.pool = { org: org, rows: S };
      state.allPool = { org: '', rows: rows };
      setTimeout(viewResult, Math.max(0, 700 - (Date.now() - t0)));
    }).catch(function () { viewError('응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
  }

  // ---------- 화면: 결과 ----------
  // 결과 탭 이름: 좁은 휴대폰에서는 짧은 이름으로
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  // 결과 탭 다섯 개: 나 → 우리 학교 → 같은 학교급 다른 학교 → 학교급별 → 전체 학교
  var RESULT_TABS = [['me', '나의 역량 수준', '나의 역량'], ['school', '우리 학교 역량 수준', '우리 학교'], ['others', '타학교 비교', '타학교'],
    ['level', '학교급별 비교', '학교급별'], ['all', '전체 학교 수준', '전체']];
  function viewResult() {
    var h = previewNote() +
      '<div class="aidx-tabs aidx-tabs5" role="tablist">' + RESULT_TABS.map(function (t) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + tabLabel(t[1], t[2]) + '</button>';
      }).join('') + '</div>' +
      '<div role="tabpanel">' + ({ me: personal, school: schoolReport, others: othersReport, level: levelReport, all: allReport })[state.tab]() + '</div>' +
      '<p class="report-foot aidx-foot"><strong>BETA 버전</strong>입니다. 유형 구분과 기준점(정착 60점)은 타당화 전의 잠정 기준입니다. 점수 = (문항 평균 − 1) × 25, 0~100점. ' +
      '<button type="button" class="aidx-link" data-act="home">처음으로</button></p>';
    root.innerHTML = h;
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 });
  }

  function domMeans(rs) { return DOMAINS.map(function (_, d) { return rs.length ? mean(rs.map(function (r) { return r.dom[d]; })) : null; }); }
  function totOf(rs) { return rs.map(function (r) { return r.total; }); }
  function n0(v) { return v == null ? '–' : r0(v); }
  function diffCls(v) { return v == null ? '' : v >= 5 ? 'up' : v <= -5 ? 'down' : ''; }
  function rankBox(label, rs, v, who) {
    return rs.length < MIN_N ? kpi(label, '–', who + ' ' + rs.length + '명 · ' + MIN_N + '명 이상이면 표시') : kpi(label, '상위 ' + topPct(totOf(rs), v) + '<small>%</small>', who + ' ' + rs.length + '명 중');
  }
  // 학교별 묶음: 익명 키로 묶고 응답이 MIN_SCHOOL명 이상인 학교만. 우리 학교는 mine 표시.
  function schoolsOf(rs) {
    var map = {};
    rs.forEach(function (r) { var k = r.same ? '__mine' : r.k || '?'; (map[k] = map[k] || []).push(r); });
    return Object.keys(map).map(function (k) { var g = map[k]; return { mine: k === '__mine', rs: g, n: g.length, total: mean(totOf(g)), m: domMeans(g) }; })
      .filter(function (x) { return x.n >= MIN_SCHOOL || x.mine; }).sort(function (a, b) { return b.total - a.total; });
  }
  function personal() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="my">결과 코드 입력</button></div></section>';
    }
    var rows = P.rows, n = rows.length, T = TYPES[me.type], few = n < MIN_N;
    var gm = DOMAINS.map(function (_, d) { return mean(rows.map(function (r) { return r.dom[d]; })); });
    var gs = DOMAINS.map(function (_, d) { return sd(rows.map(function (r) { return r.dom[d]; })); });
    var z = me.dom.map(function (v, d) { return gs[d] > 0 ? (v - gm[d]) / gs[d] : 0; });
    var totals = rows.map(function (r) { return r.total; });
    var goal = me.dom.map(function (v) { return Math.max(v, 80); });
    var h = '<div class="aidx-dl"><button type="button" class="aidx-btn" data-act="pdf">⬇ 검사결과 다운로드 <span class="aidx-muted">PDF</span></button><span class="aidx-err" id="aidx-pdf-msg" role="status"></span></div>';

    // 1. 유형
    // 짝꿍: 내가 가장 약한 영역이 강점인 유형. 이미 모든 영역이 높으면 새내기 탐험가의 멘토로.
    var weakIdx = me.dom.indexOf(Math.min.apply(null, me.dom));
    var mateKey = me.type === 'master' ? 'starter' : DOMAINS[weakIdx].key, M = TYPES[mateKey];
    var mateWhy = me.type === 'master'
      ? 'AI를 이제 막 쓰기 시작한 사람입니다. 내가 AI를 쓰는 방식을 보여 주면 가장 빨리 자라고, 나도 가르치면서 기준이 더 단단해집니다.'
      : '나에게 가장 약한 <strong>' + DOMAINS[weakIdx].name + '</strong> 영역("' + DOMAINS[weakIdx].q + '")이 이 유형의 특기입니다. ' +
        '이런 동료와 함께 일하거나, 이 유형이 하는 행동을 따라 해 보면 내 빈틈이 채워집니다.';
    h += '<section class="aidx-type aidx-persona"><div class="aidx-icon" aria-hidden="true">' + T.icon + '</div><div class="aidx-pbody">' +
      '<p class="aidx-eyebrow">AI를 쓸 때 나는</p><h2>' + T.name + '</h2>' +
      '<p class="aidx-quote">“' + T.quote + '”</p>' +
      '<p class="aidx-tags">' + T.tags.map(function (t) { return '<span>#' + t + '</span>'; }).join('') + '</p>' +
      '<p>' + T.desc + '</p>' +
      '<dl class="aidx-pfacts"><div><dt>AI는 나에게</dt><dd>' + T.ai + '</dd></div>' +
      '<div class="aidx-mate"><dt>' + (me.type === 'master' ? '내가 이끌어 주면 좋은 유형' : '나와 환상의 짝꿍') + '</dt>' +
      '<dd>' + M.icon + ' ' + M.name + ' <span class="aidx-muted">“' + M.quote + '”</span></dd>' +
      '<dd class="aidx-why">' + mateWhy + '</dd></div></dl>' +
      '</div></section>';

    // 2·3. 나의 수준과 위치: 우리 학교 · 같은 학교급(다른 학교 포함) · 전체
    var D = state.data, A = D.rows, LA = D.LA, LO = D.LO, lvName = D.lv || '같은 학교급';
    var sm = domMeans(rows), lom = domMeans(LO), am = domMeans(A);
    var sT = mean(totOf(rows)), loT = LO.length ? mean(totOf(LO)) : null, aT = mean(totOf(A));
    h += '<div class="kpis aidx-kpis aidx-fixed">' +
      kpi('나의 종합 점수', r0(me.total) + '<small>/ 100</small>', lvlChip(me.total) + ' 태도 ' + r0(me.att) + '점') +
      rankBox('우리 학교 안에서', rows, me.total, '우리 학교') +
      rankBox(lvName + ' 안에서', LA, me.total, lvName) +
      rankBox('전체 응답자 안에서', A, me.total, '전체') + '</div>';
    h += '<div class="aidx-cmp3 aidx-fixed">' + [['우리 학교 평균', sT, rows.length], [lvName + ' 다른 학교 평균', loT, LO.length], ['전체 평균', aT, A.length]].map(function (c) {
      var d = c[1] == null ? null : me.total - c[1];
      return '<div class="aidx-cmpbox"><p class="aidx-cmpk">' + c[0] + ' 대비</p><p class="aidx-cmpv ' + diffCls(d) + '">' + (d == null ? '–' : signed(d) + '<small>점</small>') + '</p>' +
        '<p class="aidx-small">' + (c[1] == null ? '아직 응답이 없습니다' : '평균 ' + r0(c[1]) + '점 · ' + c[2] + '명') + '</p></div>';
    }).join('') + '</div>';
    var series = [{ label: '나', values: me.dom, cls: 's1' }, { label: '우리 학교', values: sm, cls: 's2' }]
      .concat(LO.length ? [{ label: lvName + ' 다른 학교', values: lom, cls: 's3' }] : [])
      .concat([{ label: '전체', values: am, cls: 'ref', dashed: true }]);
    h += '<section class="report-grid aidx-eqh">' +
      '<div class="panel"><h3 class="panel-title">영역별 나의 수준 비교</h3><p class="panel-sub">0~100점 · 굵은 선은 정착 기준 60점</p>' +
      legend(series) + '<div class="radar-box">' + radar(series, '나와 비교 집단의 영역별 점수') + '</div></div>' +
      '<div class="panel"><h3 class="panel-title">영역별 점수</h3><p class="panel-sub">괄호는 나와의 차이(나 − 비교 집단)</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th><th>나</th><th>우리 학교</th><th>' + esc(lvName) + ' 다른 학교</th><th>전체</th></tr></thead><tbody>' +
      DOMAINS.map(function (dm, d) {
        function cell(v) { return v == null ? '–' : r0(v) + ' <span class="aidx-muted ' + diffCls(me.dom[d] - v) + '">(' + signed(me.dom[d] - v) + ')</span>'; }
        return '<tr><td>' + dm.name + '</td><td><strong>' + r0(me.dom[d]) + '</strong> ' + lvlChip(me.dom[d]) + '</td><td>' + cell(sm[d]) + '</td><td>' + cell(lom[d]) + '</td><td>' + cell(am[d]) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">수준: 시작 0~39 · 형성 40~59 · 정착 60~79 · 주도 80~100</p></div></section>';

    // 4. 한눈에 보는 강점과 약점 (진단만, 행동 추천은 6에서 따로)
    var itemMeans = ITEMS.map(function (_, i) { return mean(rows.map(function (r) { return r.a[i]; })); });
    var myTop = me.dom.indexOf(Math.max.apply(null, me.dom));
    var weak = me.dom.map(function (v, d) { return { d: d, v: v }; }).filter(function (x) { return x.v < CUT; }).sort(function (a, b) { return a.v - b.v; });
    var mode = 'cut';
    if (!weak.length) { weak = me.dom.map(function (v, d) { return { d: d, v: v }; }).filter(function (x) { return x.v < 80; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 2); mode = 'top'; }
    var weakSet = weak.map(function (x) { return x.d; });
    // 강점: 보완 영역이 아니면서, 내 최고 영역이거나 80점 이상이거나 그룹보다 뚜렷이 높은 영역(최대 2개)
    var strong = me.dom.map(function (v, d) { return { d: d, v: v }; })
      .filter(function (x) { return weakSet.indexOf(x.d) < 0 && (x.d === myTop || x.v >= 80 || (!few && z[x.d] >= 0.5)); })
      .sort(function (a, b) { return b.v - a.v; }).slice(0, 2);
    var strongSet = strong.map(function (x) { return x.d; });
    var ranked = me.dom.map(function (v, d) { return { d: d, v: v }; }).sort(function (a, b) { return b.v - a.v; });
    var standout = few
      ? ITEMS.slice(0, NP).filter(function (it) { return me.a[it.idx] >= 4 && strongSet.indexOf(Math.floor(it.idx / 5)) >= 0; }).sort(function (a, b) { return me.a[b.idx] - me.a[a.idx]; }).slice(0, 3).map(function (it) { return { it: it }; })
      : ITEMS.slice(0, NP).map(function (it) { return { it: it, d: me.a[it.idx] - itemMeans[it.idx] }; })
        .filter(function (x) { return x.d >= 0.8 && me.a[x.it.idx] >= 4; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 3);
    h += '<section class="panel aidx-sw-panel"><h3 class="panel-title">한눈에 보는 나의 강점과 약점</h3>' +
      '<p class="panel-sub">영역별 내 점수 · 회색 눈금은 그룹 평균 · 점선은 정착 기준 60점</p>' +
      '<div class="aidx-rank">' + ranked.map(function (x) {
        var st = strongSet.indexOf(x.d) >= 0 ? 'good' : weakSet.indexOf(x.d) >= 0 ? 'warn' : '';
        return '<div class="aidx-rrow ' + st + '"><span class="aidx-rname">' + DOMAINS[x.d].name + '</span>' +
          '<span class="aidx-rtrack"><span class="aidx-rbar" style="width:' + x.v + '%"></span>' +
          '<i class="aidx-rcut" style="left:' + CUT + '%"></i>' +
          (n > 1 ? '<i class="aidx-rmean" style="left:' + gm[x.d] + '%" data-tip="그룹 평균 ' + r0(gm[x.d]) + '점"></i>' : '') + '</span>' +
          '<span class="aidx-rval">' + r0(x.v) + '</span>' +
          '<span class="aidx-rtag">' + (st === 'good' ? '강점' : st === 'warn' ? '보완 필요' : '') + '</span></div>';
      }).join('') + '</div>' +
      '<div class="aidx-swgrid">' +
      '<div class="aidx-swcard good"><p class="aidx-swh">💪 나의 강점</p>' +
      (strong.length ? '' : '<div class="aidx-switem"><strong>' + DOMAINS[myTop].name + ' <span>' + r0(me.dom[myTop]) + '점</span></strong>' +
        '<p>아직 정착 기준(60점)을 넘은 영역은 없지만, 다섯 영역 중 가장 앞선 곳입니다. 여기서부터 습관을 굳히면 가장 빨리 올라갑니다.</p></div>') +
      strong.map(function (x) {
        var diff = me.dom[x.d] - gm[x.d];
        return '<div class="aidx-switem"><strong>' + DOMAINS[x.d].name + ' <span>' + r0(x.v) + '점</span></strong>' +
          '<p>"' + DOMAINS[x.d].q + '"에 ' + (few || diff < 5 ? '가장 자신 있게' : '그룹보다 ' + r0(diff) + '점 높게') + ' 답합니다.' + (!few && z[x.d] >= 0.5 ? ' 그룹 ' + rank(rows.map(function (r) { return r.dom[x.d]; }), me.dom[x.d]) + '입니다.' : '') + '</p></div>';
      }).join('') +
      (standout.length ? '<p class="aidx-small">' + (few ? '내가 잘하는 행동' : '남들보다 특히 잘하는 행동') + '</p><ul class="aidx-list">' + standout.map(function (x) { return '<li>' + esc(x.it.text) + (few ? '' : ' <span class="aidx-muted">나 ' + me.a[x.it.idx] + ' · 그룹 ' + f1(itemMeans[x.it.idx]) + '</span>') + '</li>'; }).join('') + '</ul>' : '') +
      '</div>' +
      '<div class="aidx-swcard warn"><p class="aidx-swh">🔧 보완이 필요한 영역</p>' +
      (weak.length ? weak.map(function (x) {
        return '<div class="aidx-switem"><strong>' + DOMAINS[x.d].name + ' <span>' + r0(x.v) + '점 → 목표 ' + (mode === 'cut' ? CUT : 80) + '점</span></strong>' +
          '<p>놓치기 쉬운 위험: <b>' + DOMAINS[x.d].risk + '</b></p></div>';
      }).join('') + '<p class="aidx-small">' + (mode === 'cut' ? '정착 기준(60점) 아래인 영역입니다.' : '모든 영역이 60점 이상입니다. 80점(주도)까지 남은 영역입니다.') + '</p>'
        : '<div class="aidx-switem"><p>다섯 영역이 모두 주도 수준(80점 이상)입니다. 보완할 영역이 없습니다.</p></div>') +
      '</div></div></section>';

    // 5. 생각과 행동의 차이: 태도(생각)와 실천(행동)을 나란히
    var gap = me.att - me.total, gapH, gapP;
    if (gap >= 20) { gapH = '생각은 앞서는데, 행동이 따라가지 못하고 있어요'; gapP = '무엇이 바람직한지는 알고 있지만 실제 행동으로 옮기지 못하는 부분이 있습니다. 아래 행동 추천 중 하나를 정해 매번 하는 것부터 시작하면 이 차이가 가장 빨리 줄어듭니다.'; }
    else if (gap <= -20) { gapH = '행동은 잘하는데, 왜 해야 하는지에 대한 확신은 약해요'; gapP = '좋은 습관은 이미 있지만 그 이유에 대한 확신은 상대적으로 약합니다. 바쁠 때 습관이 무너지지 않도록, 왜 그렇게 하는지 한 번 정리해 두세요.'; }
    else { gapH = '생각과 행동이 잘 맞아요'; gapP = '바람직하다고 생각하는 만큼 실제로도 행동하고 있습니다. 생각과 행동의 차이가 ' + r0(Math.abs(gap)) + '점으로 작습니다.'; }
    h += '<section class="aidx-gap ' + (gap >= 20 ? 'ahead' : gap <= -20 ? 'behind' : 'match') + '">' +
      '<p class="aidx-eyebrow">생각과 행동의 차이</p><h3>' + gapH + '</h3>' +
      '<div class="aidx-gbars">' +
      '<div class="aidx-grow"><span>생각 <small>태도</small></span><span class="aidx-gtrack"><span style="width:' + me.att + '%"></span></span><b>' + r0(me.att) + '</b></div>' +
      '<div class="aidx-grow act"><span>행동 <small>실천</small></span><span class="aidx-gtrack"><span style="width:' + me.total + '%"></span></span><b>' + r0(me.total) + '</b></div>' +
      '</div>' +
      '<p class="aidx-gnum">차이 <strong>' + (gap > 0 ? '+' : gap < 0 ? '−' : '') + r0(Math.abs(gap)) + '점</strong></p>' +
      '<p>' + gapP + '</p></section>';

    // 6. 보완 우선순위 행동지침 3가지: 점수가 낮은 영역부터 한 가지씩
    var low3 = me.dom.map(function (v, d) { return { d: d, v: v }; }).sort(function (a, b) { return a.v - b.v; }).slice(0, 3);
    h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">나의 보완 행동지침</p><h3>우선순위 3가지, 이것부터 하세요</h3>' +
      '<p>점수가 낮은 영역부터 순서를 정했습니다. 한 가지씩 4주 동안 습관으로 만든 뒤 다음으로 넘어가세요.</p></div>' +
      '<ol class="aidx-prio3">' + low3.map(function (x, i) {
        var dm = DOMAINS[x.d];
        var item = ITEMS.slice(x.d * 5, x.d * 5 + 5).slice().sort(function (a, b) { return me.a[a.idx] - me.a[b.idx]; })[0];
        return '<li class="aidx-prio-card"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + dm.icon + ' ' + dm.name + '</p>' +
          '<p class="aidx-prio-act">' + TIPS[dm.key][0] + '</p>' +
          '<p class="aidx-small">왜: 나 ' + r0(x.v) + '점 · 우리 학교 ' + n0(sm[x.d]) + '점 · 전체 ' + n0(am[x.d]) + '점</p>' +
          '<p class="aidx-small">체크할 행동: ☐ ' + esc(item.text) + '</p></li>';
      }).join('') + '</ol></section>';
    var keep = DOMAINS[strong.length ? strong[0].d : myTop];
    // PDF 보고서가 화면과 같은 계산 결과를 쓰도록 남겨 둔다.
    state.model = { P: P, me: me, rows: rows, n: n, few: few, gm: gm, gs: gs, z: z, T: T, M: M, mateWhy: mateWhy, weak: weak, mode: mode,
      strong: strong, standout: standout, itemMeans: itemMeans, gap: gap, gapH: gapH, gapP: gapP, keep: keep, myTop: myTop };
    return h;
  }

  function groupReport(P) {
    var rows = P.rows, n = rows.length;
    if (!n) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var gm = DOMAINS.map(function (_, d) { return mean(rows.map(function (r) { return r.dom[d]; })); });
    var totals = rows.map(function (r) { return r.total; }), hiCut = q(totals, 0.75), loCut = q(totals, 0.25);
    var top = rows.filter(function (r) { return r.total >= hiCut; }), low = rows.filter(function (r) { return r.total <= loCut; });
    var weakD = gm.indexOf(Math.min.apply(null, gm)), strongD = gm.indexOf(Math.max.apply(null, gm));
    var settled = rows.filter(function (r) { return r.total >= CUT; }).length;
    var h = '';
    h += '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (n < MIN_N) h += '<p class="aidx-note">아직 응답이 ' + n + '명입니다. ' + MIN_N + '명 이상 모이면 그룹 결과가 안정됩니다.</p>';

    // 요약
    var weakShare = Math.round(rows.filter(function (r) { return r.dom[weakD] < CUT; }).length / n * 100);
    h += '<section class="aidx-type"><p class="aidx-eyebrow">' + (P.org ? '우리 학교' : '전체 응답자') + ' 한 줄 요약</p>' +
      '<h2>' + josa(DOMAINS[strongD].name, '은', '는') + ' 강하고, ' + josa(DOMAINS[weakD].name, '이', '가') + ' 약합니다</h2>' +
      '<p>종합 평균은 ' + r0(mean(totals)) + '점(' + level(mean(totals)) + ')입니다. 가장 낮은 <strong>' + DOMAINS[weakD].name + '</strong> 영역은 응답자의 ' + weakShare + '%가 정착 기준(60점) 아래에 있어, 그룹 교육을 한다면 이 영역부터 다루는 것이 효과가 큽니다.</p></section>';

    h += '<div class="kpis aidx-kpis">' +
      kpi('응답자', n + '<small>명</small>', esc(groupLabel(P))) +
      kpi('종합 평균', r0(mean(totals)) + '<small>/ 100</small>', 'SD ' + r0(sd(totals)) + ' · 범위 ' + r0(Math.min.apply(null, totals)) + '~' + r0(Math.max.apply(null, totals))) +
      kpi('정착 이상', Math.round(settled / n * 100) + '<small>%</small>', '종합 60점 이상 ' + settled + '명') +
      kpi('가장 약한 영역', DOMAINS[weakD].name, '평균 ' + r0(gm[weakD]) + '점') +
      '</div>';

    // 방사형 + 수준 분포
    var series = [
      { label: '상위 25%', values: DOMAINS.map(function (_, d) { return mean(top.map(function (r) { return r.dom[d]; })); }), cls: 's2' },
      { label: '그룹 평균', values: gm, cls: 's1' },
      { label: '하위 25%', values: DOMAINS.map(function (_, d) { return mean(low.map(function (r) { return r.dom[d]; })); }), cls: 'ref', dashed: true }
    ];
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">영역별 그룹 프로파일</h3><p class="panel-sub">종합 점수 상위·하위 25%와 비교 · 0~100점</p>' + legend(series) +
      '<div class="radar-box">' + radar(series, '그룹 영역별 평균') + '</div></div>' +
      '<div class="panel"><h3 class="panel-title">영역별 수준 분포</h3><p class="panel-sub">각 영역에서 시작·형성·정착·주도 수준인 응답자 비율</p>' +
      '<div class="legend">' + ['시작', '형성', '정착', '주도'].map(function (t) { return '<span class="lg"><span class="aidx-sw ' + lvlCls(t) + '"></span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="aidx-stack">' + DOMAINS.map(function (dm, d) {
        var cnt = { '시작': 0, '형성': 0, '정착': 0, '주도': 0 };
        rows.forEach(function (r) { cnt[level(r.dom[d])]++; });
        return '<div class="aidx-srow"><span class="aidx-sname">' + dm.name + '</span><div class="aidx-sbar">' + ['시작', '형성', '정착', '주도'].map(function (t) {
          var p = cnt[t] / n * 100;
          return p ? '<span class="' + lvlCls(t) + '" style="width:' + p + '%" data-tip="' + esc(dm.name + ' · ' + t + ' ' + cnt[t] + '명 (' + Math.round(p) + '%)') + '">' + (p >= 9 ? Math.round(p) : '') + '</span>' : '';
        }).join('') + '</div></div>';
      }).join('') + '</div></div></section>';

    // 기초 통계 표
    var att = rows.map(function (r) { return r.att; });
    h += '<div class="panel"><h3 class="panel-title">영역별 기초 통계</h3><p class="panel-sub">신뢰도(Cronbach α)는 응답 10명 이상일 때 표시</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th><th>평균</th><th>SD</th><th>최소~최대</th><th>정착 이상</th><th>α</th></tr></thead><tbody>' +
      DOMAINS.map(function (dm, d) {
        var col = rows.map(function (r) { return r.dom[d]; });
        return '<tr><td>' + dm.name + '</td><td><strong>' + r0(gm[d]) + '</strong> ' + lvlChip(gm[d]) + '</td><td>' + r0(sd(col)) + '</td><td>' + r0(Math.min.apply(null, col)) + '~' + r0(Math.max.apply(null, col)) + '</td>' +
          '<td>' + Math.round(col.filter(function (v) { return v >= CUT; }).length / n * 100) + '%</td><td>' + alpha(rows, d * 5, d * 5 + 5) + '</td></tr>';
      }).join('') +
      '<tr class="aidx-sep"><td>태도</td><td><strong>' + r0(mean(att)) + '</strong></td><td>' + r0(sd(att)) + '</td><td>' + r0(Math.min.apply(null, att)) + '~' + r0(Math.max.apply(null, att)) + '</td><td>' + Math.round(att.filter(function (v) { return v >= CUT; }).length / n * 100) + '%</td><td>' + alpha(rows, NP, NI) + '</td></tr>' +
      '</tbody></table></div></div>';

    // 유형 분포 + 문항
    var tc = {}; rows.forEach(function (r) { tc[r.type] = (tc[r.type] || 0) + 1; });
    var types = TYPE_ORDER.filter(function (k) { return tc[k]; }).sort(function (a, b) { return tc[b] - tc[a]; });
    var maxT = Math.max.apply(null, types.map(function (k) { return tc[k]; }));
    var im = ITEMS.slice(0, NP).map(function (it) { return { it: it, m: mean(rows.map(function (r) { return r.a[it.idx]; })) }; }).sort(function (a, b) { return b.m - a.m; });
    function itemList(arr) { return '<ul class="aidx-list">' + arr.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + DOMAINS[Math.floor(x.it.idx / 5)].name + ' · 평균 ' + f1(x.m) + '</span></li>'; }).join('') + '</ul>'; }
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">AI 활용 유형 분포</h3><p class="panel-sub">응답자 수 기준</p><div class="aidx-hbars">' +
      types.map(function (k) { return '<div class="aidx-hrow" data-tip="' + esc(TYPES[k].name + ' · ' + TYPES[k].tag) + '"><span class="aidx-hname">' + TYPES[k].icon + ' ' + TYPES[k].name + '</span><span class="aidx-htrack"><span style="width:' + (tc[k] / maxT * 100) + '%"></span></span><span class="aidx-hval">' + tc[k] + '명 · ' + Math.round(tc[k] / n * 100) + '%</span></div>'; }).join('') +
      '</div></div>' +
      '<div class="panel"><h3 class="panel-title">그룹이 잘하는 행동과 놓치는 행동</h3><p class="panel-sub">실천 문항 평균 (1~5점)</p>' +
      '<p class="aidx-small">가장 잘 실천하는 행동</p>' + itemList(im.slice(0, 3)) +
      '<p class="aidx-small">가장 덜 실천하는 행동</p>' + itemList(im.slice(-3).reverse()) + '</div></section>';

    // 응답자 구분별
    var roles = ROLES.map(function (rl) { return { rl: rl, rs: rows.filter(function (r) { return r.role === rl; }) }; }).filter(function (x) { return x.rs.length >= 3; });
    if (roles.length >= 2) {
      h += '<div class="panel"><h3 class="panel-title">응답자 구분별 평균</h3><p class="panel-sub">3명 이상인 구분만 표시</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>인원</th>' +
        DOMAINS.map(function (dm) { return '<th>' + dm.name + '</th>'; }).join('') + '<th>종합</th></tr></thead><tbody>' +
        roles.map(function (x) {
          return '<tr><td>' + x.rl + '</td><td>' + x.rs.length + '</td>' + DOMAINS.map(function (_, d) { return '<td>' + r0(mean(x.rs.map(function (r) { return r.dom[d]; }))) + '</td>'; }).join('') +
            '<td><strong>' + r0(mean(x.rs.map(function (r) { return r.total; }))) + '</strong></td></tr>';
        }).join('') + '</tbody></table></div></div>';
    }
    return h;
  }
  // ---------- 검사결과 PDF: 나의 분석결과만, 연구실 의견서(국방AI 검토의견서) 양식 ----------
  var H2C_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  var JSPDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  function loadScript(src, ready) {
    return new Promise(function (ok, fail) {
      if (ready()) return ok();
      var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }
  function loadFonts() {
    if (!document.getElementById('aidx-rep-font')) {
      var l = document.createElement('link'); l.id = 'aidx-rep-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=block';
      document.head.appendChild(l);
    }
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([document.fonts.load('400 14px "Noto Serif KR"', '가'), document.fonts.load('600 14px "Noto Serif KR"', '가'),
      document.fonts.load('600 14px "IBM Plex Sans KR"', '가')]).catch(function () {});
  }
  // 방사형 차트를 색을 직접 지정한 SVG로 그려 PNG로 바꾼다(PDF 캡처는 페이지 CSS 변수를 읽지 못한다).
  function radarPng(M) {
    var n = DOMAINS.length, W = 560, H = 440, cx = W / 2, cy = H / 2 + 10, R = 150;
    function pt(i, v) { var a = -Math.PI / 2 + i * 2 * Math.PI / n, r = R * v / 100; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W * 2 + '" height="' + H * 2 + '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR, sans-serif">' +
      '<rect width="100%" height="100%" fill="#fff"/>';
    [20, 40, 60, 80, 100].forEach(function (g) {
      s += '<polygon points="' + DOMAINS.map(function (_, i) { return pt(i, g).join(','); }).join(' ') + '" fill="none" stroke="' + (g === CUT ? '#888' : '#d6d6d6') + '" stroke-width="' + (g === CUT ? 1.6 : 1) + '"/>';
      var p0 = pt(0, g); s += '<text x="' + (p0[0] + 5) + '" y="' + (p0[1] + 4) + '" font-size="11" fill="#888">' + g + '</text>';
    });
    DOMAINS.forEach(function (dm, i) {
      var e = pt(i, 100), l = pt(i, 117), anchor = Math.abs(l[0] - cx) < 8 ? 'middle' : (l[0] > cx ? 'start' : 'end');
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0] + '" y2="' + e[1] + '" stroke="#e2e2e2"/>' +
        '<text x="' + l[0] + '" y="' + (l[1] + (i === 0 ? -2 : 6)) + '" text-anchor="' + anchor + '" font-size="15" font-weight="600" fill="#222">' + dm.name + '</text>';
    });
    function poly(vals, stroke, fill, dash) { return '<polygon points="' + vals.map(function (v, i) { return pt(i, v).join(','); }).join(' ') + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2.2"' + (dash ? ' stroke-dasharray="6 5"' : '') + '/>'; }
    if (M.n > 1) s += poly(M.gm, '#9a9a9a', 'none', true);
    s += poly(M.me.dom, '#8e1b2c', 'rgba(142,27,44,.12)');
    M.me.dom.forEach(function (v, i) { var p = pt(i, v); s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.5" fill="#8e1b2c" stroke="#fff" stroke-width="2"/>'; });
    s += '</svg>';
    return new Promise(function (ok) {
      var img = new Image();
      img.onload = function () { var c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; c.getContext('2d').drawImage(img, 0, 0); ok(c.toDataURL('image/png')); };
      img.onerror = function () { ok(''); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    });
  }
  function repHtml(M, png) {
    var me = M.me, T = M.T, now = new Date(), totals = M.rows.map(function (r) { return r.total; });
    var date = now.getFullYear() + '. ' + (now.getMonth() + 1) + '. ' + now.getDate() + '.';
    var target = M.mode === 'cut' ? CUT : 80;
    var css = '<style>' +
      '.rep{width:680px;color:#222;font-family:"Noto Serif KR","AppleMyungjo","Batang",serif;font-size:13.5px;line-height:1.75;word-break:keep-all;background:#fff}' +
      '.rep *{box-sizing:border-box;margin:0}' +
      '.rep .hd{border-top:3px solid #222;padding-top:26px;text-align:center}' +
      '.rep h1{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:25px;font-weight:700;letter-spacing:-.02em}' +
      '.rep .beta{display:inline-block;vertical-align:5px;margin-left:8px;font-size:11px;font-weight:700;letter-spacing:.08em;color:#8e1b2c;border:1.5px solid #8e1b2c;border-radius:4px;padding:0 6px;line-height:1.6}' +
      '.rep .sub{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:12.5px;color:#444;margin-top:12px;padding-bottom:16px;border-bottom:1px solid #222}' +
      '.rep .date{text-align:right;font-size:12.5px;color:#444;margin:12px 0 6px}' +
      '.rep h2{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:17px;font-weight:700;margin:26px 0 12px;padding-bottom:7px;border-bottom:1px solid #222}' +
      '.rep h3{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:14.5px;font-weight:700;margin:16px 0 8px}' +
      '.rep p.b{padding-left:1.2em;text-indent:-1.2em;margin:4px 0}' +
      '.rep p.c{padding-left:2.4em;text-indent:-1.2em;margin:2px 0}' +
      '.rep p.d{padding-left:3.4em;text-indent:-1em;margin:1px 0;color:#333}' +
      '.rep p.e{padding-left:4.6em;text-indent:-1.2em;margin:1px 0;color:#333}' +
      '.rep strong{font-weight:600}' +
      '.rep .flow{display:flex;align-items:center;gap:6px;margin:12px 0 4px}' +
      '.rep .flow div{flex:1;border:1px solid #333;text-align:center;padding:6px 2px;font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:11.5px;line-height:1.45}' +
      '.rep .flow b{display:block;font-size:12.5px}' +
      '.rep .flow i{font-style:normal;font-size:12px}' +
      '.rep .cap{text-align:center;font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-weight:700;font-size:12.5px;margin:14px 0 6px}' +
      '.rep table{width:100%;border-collapse:collapse;font-size:12.5px;line-height:1.5}' +
      '.rep th{background:#f1f1f1;font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-weight:600;border-top:1.5px solid #222;border-bottom:1px solid #999;padding:6px 6px;text-align:center}' +
      '.rep td{border-bottom:1px solid #d4d4d4;padding:6px 6px;text-align:center}' +
      '.rep td:first-child{text-align:left;font-weight:600}' +
      '.rep tr:last-child td{border-bottom:1.5px solid #222}' +
      '.rep .fig{text-align:center;margin:4px 0}' +
      '.rep .fig img{width:400px}' +
      '.rep .lg{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:11.5px;color:#555;text-align:center}' +
      '.rep .type{border:1px solid #333;padding:12px 16px;margin:8px 0}' +
      '.rep .type .nm{font-family:"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif;font-size:18px;font-weight:700;color:#8e1b2c}' +
      '.rep .note{margin-top:22px;padding-top:10px;border-top:1px solid #999;font-size:11.5px;color:#555}' +
      '.rep .avoid{page-break-inside:avoid;break-inside:avoid}' +
      '</style>';
    var h = css + '<div class="rep">' +
      '<div class="hd"><h1>나와 우리학교 AI 역량 수준 진단 결과 보고서<span class="beta">BETA</span></h1>' +
      '<p class="sub">나의 분석결과 · 결과 코드 ' + fmtId(me.id || (state.me && state.me.id) || '') + ' · 응답자 구분 ' + esc((state.me && state.me.role) || me.role || '-') + '</p></div>' +
      '<p class="date">' + date + '</p>';
    // Ⅰ. 진단 개요
    h += '<h2>Ⅰ. 진단 개요</h2>' +
      '<p class="b">□ 진단 목적: AI와 함께 일하는 한 번의 흐름에서, 다섯 순간마다 실제로 하는 행동을 진단함</p>' +
      '<div class="flow avoid">' + DOMAINS.map(function (dm, i) { return (i ? '<i>▶</i>' : '') + '<div>' + (i + 1) + ' ' + dm.when + '<b>' + dm.name + '</b>' + dm.q + '</div>'; }).join('') + '</div>' +
      '<p class="b">□ 진단 구성: 실천 5개 영역 25문항(영역별 5문항)과 태도 6문항, 5점 척도(1 전혀 그렇지 않다 ~ 5 매우 그렇다)</p>' +
      '<p class="b">□ 비교 집단: ' + esc(groupLabel(M.P)) + ' ' + M.n + '명' + (M.few ? ' (응답이 ' + MIN_N + '명 미만이라 그룹 내 위치는 표시하지 않음)' : '') + '</p>' +
      '<p class="b">□ 점수 산출: 영역 점수 = (문항 평균 − 1) × 25, 0~100점</p>' +
      '<p class="c">○ 수준 구분: 시작 0~39 · 형성 40~59 · 정착 60~79 · 주도 80~100 (정착 기준 60점)</p>';
    // Ⅱ. 종합 결과
    h += '<h2>Ⅱ. 종합 결과</h2><h3>1. AI 활용 유형</h3>' +
      '<div class="type avoid"><p class="nm">' + T.icon + ' ' + T.name + '</p><p>“' + T.quote + '” — ' + T.tag + '</p></div>' +
      '<p class="b">□ ' + T.desc + '</p>' +
      '<p class="c">○ AI는 나에게: ' + T.ai + '</p>' +
      '<p class="c">○ ' + (me.type === 'master' ? '내가 이끌어 주면 좋은 유형' : '나와 환상의 짝꿍') + ': ' + M.M.icon + ' ' + M.M.name + ' — ' + M.mateWhy + '</p>' +
      '<h3>2. 영역별 점수</h3>' +
      '<p class="b">□ 종합 점수 <strong>' + r0(me.total) + '점(' + level(me.total) + ')</strong>, 그룹 평균 ' + r0(mean(totals)) + '점' +
      (M.few ? '' : ', 그룹 내 위치 상위 ' + topPct(totals, me.total) + '%') + ', 태도 점수 ' + r0(me.att) + '점</p>' +
      '<div class="avoid"><p class="cap">&lt;표 1&gt; 영역별 점수와 그룹 비교</p><table><thead><tr><th>영역</th><th>나</th><th>수준</th><th>그룹 평균 (SD)</th><th>차이</th><th>그룹 내 위치</th></tr></thead><tbody>' +
      DOMAINS.map(function (dm, d) {
        return '<tr><td>' + dm.name + '</td><td><strong>' + r0(me.dom[d]) + '</strong></td><td>' + level(me.dom[d]) + '</td><td>' + r0(M.gm[d]) + ' (' + r0(M.gs[d]) + ')</td><td>' + signed(me.dom[d] - M.gm[d]) + '</td><td>' + rank(M.rows.map(function (r) { return r.dom[d]; }), me.dom[d]) + '</td></tr>';
      }).join('') +
      '<tr><td>태도</td><td><strong>' + r0(me.att) + '</strong></td><td>' + level(me.att) + '</td><td>' + r0(mean(M.rows.map(function (r) { return r.att; }))) + ' (' + r0(sd(M.rows.map(function (r) { return r.att; }))) + ')</td><td>' + signed(me.att - mean(M.rows.map(function (r) { return r.att; }))) + '</td><td>' + rank(M.rows.map(function (r) { return r.att; }), me.att) + '</td></tr>' +
      '</tbody></table></div>' +
      (png ? '<div class="avoid"><p class="cap">[그림 1] 나와 그룹의 영역별 점수</p><div class="fig"><img src="' + png + '"></div><p class="lg" style="text-align:center">— 나(진한 선)　 - - 그룹 평균(점선)　 ── 정착 기준 60점(굵은 회색 선)</p></div>' : '');
    // Ⅲ. 강점과 보완점
    h += '<h2>Ⅲ. 강점과 보완점</h2>' +
      '<p class="b">□ 강점</p>' +
      (M.strong.length ? '' : '<p class="c">○ ' + DOMAINS[M.myTop].name + ' ' + r0(me.dom[M.myTop]) + '점: 정착 기준(60점)을 넘은 영역은 아직 없지만 다섯 영역 중 가장 앞선 곳임</p>') +
      M.strong.map(function (x) {
        var diff = me.dom[x.d] - M.gm[x.d];
        return '<p class="c">○ ' + DOMAINS[x.d].name + ' ' + r0(x.v) + '점: “' + DOMAINS[x.d].q + '”에 ' + (M.few || diff < 5 ? '가장 자신 있게' : '그룹보다 ' + r0(diff) + '점 높게') + ' 답함</p>';
      }).join('') +
      M.standout.map(function (x) { return '<p class="d">- ' + esc(x.it.text) + '</p>'; }).join('') +
      '<p class="b">□ 보완이 필요한 영역</p>' +
      (M.weak.length ? M.weak.map(function (x) { return '<p class="c">○ ' + DOMAINS[x.d].name + ' ' + r0(x.v) + '점 → 목표 ' + target + '점: 놓치기 쉬운 위험은 ' + DOMAINS[x.d].risk + '</p>'; }).join('')
        : '<p class="c">○ 다섯 영역이 모두 주도 수준(80점 이상)으로 보완할 영역이 없음</p>') +
      '<p class="b">□ 생각과 행동의 차이: 생각(태도) ' + r0(me.att) + '점, 행동(실천) ' + r0(me.total) + '점, 차이 ' + (M.gap > 0 ? '+' : M.gap < 0 ? '−' : '') + r0(Math.abs(M.gap)) + '점</p>' +
      '<p class="c">○ <strong>' + M.gapH + '</strong>. ' + M.gapP + '</p>';
    // Ⅳ. 행동 제언
    h += '<h2>Ⅳ. 행동 제언 (다음 4주)</h2>' +
      M.weak.slice(0, 3).map(function (x, i) {
        var dm = DOMAINS[x.d];
        var low = ITEMS.slice(x.d * 5, x.d * 5 + 5).filter(function (it) { return me.a[it.idx] <= 3; }).sort(function (a, b) { return me.a[a.idx] - me.a[b.idx]; }).slice(0, 2);
        return '<div class="avoid"><p class="b">□ 우선순위 ' + (i + 1) + '. ' + dm.name + ' (' + r0(x.v) + '점 → ' + target + '점)</p>' +
          TIPS[dm.key].map(function (t) { return '<p class="c">○ ' + t + '</p>'; }).join('') +
          (low.length ? '<p class="d">- 지금 덜 하고 있는 행동(4주 동안 체크)</p>' + low.map(function (it) { return '<p class="e">☐ ' + esc(it.text) + '</p>'; }).join('') : '') + '</div>';
      }).join('') +
      '<div class="avoid"><p class="b">□ 강점 살리기: ' + M.keep.name + '</p>' +
      '<p class="c">○ 지금처럼 “' + M.keep.q + '”를 습관처럼 묻는 것을 유지하고, ' + (M.standout.length ? '“' + esc(M.standout[0].it.text.replace(/\.$/, '')) + '”는 동료에게 알려 주면 그룹 전체의 수준이 올라감' : '내가 잘하는 방식을 동료에게 보여 주면 그룹 전체의 수준이 올라감') + '</p></div>' +
      '<p class="note">※ 본 진단은 BETA 버전입니다. 유형 구분과 기준점(정착 60점)은 타당화 전의 잠정 기준이며, 결과는 응답자의 자기 보고에 기반합니다.<br>' +
      '※ PRO AnalytiX Lab, 한양대학교 교육공학과 · hrdpro.hanyang.ac.kr/in-progress/teacher-ai-competency/</p></div>';
    return h;
  }
  // 보고서 블록(문단·표·그림)을 재어 A4 쪽에 나눠 담고, 쪽마다 이미지로 떠서 PDF에 붙인다.
  // 블록 중간에서 쪽이 갈리지 않고, 제목이 쪽 맨 아래에 홀로 남지 않는다.
  var PAGE_W = 680, PAGE_H = 990; // 본문 영역(px): A4 210×297mm에서 좌우 15mm, 위 16mm, 아래 19mm를 뺀 180×262mm
  function paginate(rep) {
    var blocks = Array.prototype.slice.call(rep.children), pages = [], cur = [], start = 0;
    blocks.forEach(function (el) {
      var top = el.offsetTop - (parseFloat(getComputedStyle(el).marginTop) || 0), bottom = el.offsetTop + el.offsetHeight;
      if (cur.length && bottom - start > PAGE_H) {
        var carry = [];
        while (cur.length > 1 && /^H[23]$/.test(cur[cur.length - 1].tagName)) carry.unshift(cur.pop());
        pages.push(cur); cur = carry;
        start = (carry[0] || el).offsetTop;
      }
      if (!cur.length && !pages.length) start = top;
      cur.push(el);
    });
    if (cur.length) pages.push(cur);
    return pages;
  }
  function downloadPdf(btn) {
    var M = state.model, msg = document.getElementById('aidx-pdf-msg'), host;
    if (!M) return;
    btn.disabled = true; msg.textContent = 'PDF를 만드는 중…';
    Promise.all([loadScript(H2C_LIB, function () { return !!window.html2canvas; }), loadScript(JSPDF_LIB, function () { return !!(window.jspdf && window.jspdf.jsPDF); }),
      loadFonts(), radarPng(M)]).then(function (res) {
      host = document.createElement('div');
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:fixed;left:-20000px;top:0;width:' + PAGE_W + 'px;background:#fff';
      host.innerHTML = repHtml(M, res[3]);
      document.body.appendChild(host);
      var img = host.querySelector('img');
      return (img && img.decode ? img.decode().catch(function () {}) : Promise.resolve()).then(function () {
        var rep = host.querySelector('.rep'), pages = paginate(rep);
        var pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        var chain = Promise.resolve();
        pages.forEach(function (blocks, i) {
          chain = chain.then(function () {
            var page = document.createElement('div');
            page.className = 'rep';
            page.style.cssText = 'width:' + PAGE_W + 'px;height:' + PAGE_H + 'px;overflow:hidden;background:#fff';
            blocks.forEach(function (el, k) { var c = el.cloneNode(true); if (k === 0) c.style.marginTop = '0'; page.appendChild(c); });
            host.appendChild(page);
            return window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', logging: false }).then(function (canvas) {
              if (i) pdf.addPage();
              pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 15, 16, 180, 180 * PAGE_H / PAGE_W);
              pdf.setFontSize(9); pdf.setTextColor(90);
              pdf.text('- ' + (i + 1) + ' -', 105, 289, { align: 'center' });
              host.removeChild(page);
            });
          });
        });
        return chain.then(function () { pdf.save('나와우리학교AI역량진단_결과_' + fmtId((state.me && state.me.id) || 'RESULT00') + '.pdf'); });
      });
    }).then(function () { msg.textContent = ''; btn.disabled = false; })
      .catch(function () { msg.textContent = 'PDF를 만들지 못했습니다. 잠시 뒤 다시 눌러 주세요.'; btn.disabled = false; })
      .then(function () { if (host && host.parentNode) host.parentNode.removeChild(host); });
  }

  // ---------- 응답자 그룹별 비교: 응답할 때 고른 구분(학생·교사·보직교사·행정직원)별 평균과 일원분산분석 ----------
  function lgamma(x) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5, s = 1.000000000190015;
    t -= (x + 0.5) * Math.log(t);
    for (var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, h;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d; h = d;
    for (var m = 1; m <= 200; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30; c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30; d = 1 / d;
      var del = d * c; h *= del; if (Math.abs(del - 1) < 3e-12) break;
    }
    return h;
  }
  function ibeta(x, a, b) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  // 일원분산분석: groups = [[값...], ...] → {F, p, df1, df2}
  function anova(groups) {
    var all = [].concat.apply([], groups), gmn = mean(all), k = groups.length, N = all.length, ssb = 0, ssw = 0;
    groups.forEach(function (g) { var m = mean(g); ssb += g.length * (m - gmn) * (m - gmn); g.forEach(function (v) { ssw += (v - m) * (v - m); }); });
    var df1 = k - 1, df2 = N - k;
    if (df1 < 1 || df2 < 1) return null;
    if (ssw === 0) return { F: Infinity, p: ssb > 0 ? 0 : 1, df1: df1, df2: df2 };
    var F = (ssb / df1) / (ssw / df2);
    return { F: F, p: ibeta(df2 / (df2 + df1 * F), df2 / 2, df1 / 2), df1: df1, df2: df2 };
  }
  function fmtP(p) { return p < 0.001 ? '< .001' : p.toFixed(3).replace(/^0/, ''); }

  // rows를 keyOf로 묶어(order 순서) 영역별 평균과 일원분산분석. noun은 묶음 이름(예: 학교급).
  // ---------- 우리 학교 역량 수준: 같은 학교급 다른 학교·전체와 비교, 강점·약점·보완점, 우선순위 제안 5가지 ----------
  function schoolReport() {
    var D = state.data, S = D.S, LO = D.LO, LA = D.LA, A = D.rows, lvName = D.lv || '같은 학교급';
    if (!S.length) return '<section class="aidx-home"><p>우리 학교 응답이 없습니다. 진단에 응답하면 우리 학교 결과를 볼 수 있습니다.</p></section>';
    var sm = domMeans(S), lom = domMeans(LO), am = domMeans(A), sT = mean(totOf(S)), loT = LO.length ? mean(totOf(LO)) : null, aT = mean(totOf(A));
    var lvSchools = schoolsOf(LA), allSchools = schoolsOf(A);
    function place(list) { var i = list.findIndex(function (x) { return x.mine; }); return list.length < 2 ? '–' : (i + 1) + '<small>위 / ' + list.length + '개교</small>'; }
    var h = '<p class="aidx-context">' + esc(groupLabel(state.pool)) + ' · ' + esc(lvName) + ' · 응답 ' + S.length + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (S.length < MIN_N) h += '<p class="aidx-note">우리 학교 응답이 아직 ' + S.length + '명입니다. ' + MIN_N + '명 이상 모이면 결과가 안정됩니다.</p>';
    h += '<div class="kpis aidx-kpis aidx-fixed">' +
      kpi('우리 학교 종합 점수', r0(sT) + '<small>/ 100</small>', lvlChip(sT) + ' 응답 ' + S.length + '명') +
      kpi(lvName + ' 안에서', place(lvSchools), MIN_SCHOOL + '명 이상 응답한 학교 기준') +
      kpi('전체 학교 안에서', place(allSchools), MIN_SCHOOL + '명 이상 응답한 학교 기준') +
      kpi('정착 이상 비율', Math.round(S.filter(function (r) { return r.total >= CUT; }).length / S.length * 100) + '<small>%</small>', '종합 60점 이상인 구성원') + '</div>';
    h += '<div class="aidx-cmp3 aidx-fixed">' + [['우리 학교', sT, S.length], [lvName + ' 다른 학교 평균', loT, LO.length], ['전체 평균', aT, A.length]].map(function (c, i) {
      var d = i && c[1] != null ? sT - c[1] : null;
      return '<div class="aidx-cmpbox"><p class="aidx-cmpk">' + c[0] + (i ? ' 대비' : '') + '</p><p class="aidx-cmpv ' + diffCls(d) + '">' + (i ? (d == null ? '–' : signed(d) + '<small>점</small>') : r0(c[1]) + '<small>점</small>') + '</p>' +
        '<p class="aidx-small">' + (c[1] == null ? '아직 응답이 없습니다' : (i ? '평균 ' + r0(c[1]) + '점 · ' : '') + c[2] + '명') + '</p></div>';
    }).join('') + '</div>';
    var series = [{ label: '우리 학교', values: sm, cls: 's1' }].concat(LO.length ? [{ label: lvName + ' 다른 학교', values: lom, cls: 's3' }] : [])
      .concat([{ label: '전체', values: am, cls: 'ref', dashed: true }]);
    h += '<section class="report-grid aidx-eqh"><div class="panel"><h3 class="panel-title">영역별 우리 학교 수준</h3><p class="panel-sub">0~100점 · 굵은 선은 정착 기준 60점</p>' +
      legend(series) + '<div class="radar-box">' + radar(series, '우리 학교와 비교 집단의 영역별 점수') + '</div></div>' +
      '<div class="panel"><h3 class="panel-title">영역별 비교</h3><p class="panel-sub">괄호는 우리 학교와의 차이 · 정착 이상은 우리 학교 구성원 비율</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th><th>우리 학교</th><th>' + esc(lvName) + ' 다른 학교</th><th>전체</th><th>정착 이상</th></tr></thead><tbody>' +
      DOMAINS.map(function (dm, d) {
        function cell(v) { return v == null ? '–' : r0(v) + ' <span class="aidx-muted ' + diffCls(sm[d] - v) + '">(' + signed(sm[d] - v) + ')</span>'; }
        return '<tr><td>' + dm.name + '</td><td><strong>' + r0(sm[d]) + '</strong> ' + lvlChip(sm[d]) + '</td><td>' + cell(lom[d]) + '</td><td>' + cell(am[d]) + '</td>' +
          '<td>' + Math.round(S.filter(function (r) { return r.dom[d] >= CUT; }).length / S.length * 100) + '%</td></tr>';
      }).join('') + '</tbody></table></div></div></section>';

    // 강점 · 약점 · 보완점
    var ref = LO.length ? lom : am, refName = LO.length ? lvName + ' 다른 학교' : '전체';
    var order = DOMAINS.map(function (_, d) { return { d: d, v: sm[d], gap: sm[d] - ref[d] }; });
    var strong = order.slice().sort(function (a, b) { return (b.v + b.gap) - (a.v + a.gap); }).slice(0, 2);
    var weak = order.slice().sort(function (a, b) { return (a.v + a.gap) - (b.v + b.gap); }).slice(0, 2);
    var itemM = ITEMS.slice(0, NP).map(function (it) { return { it: it, m: mean(S.map(function (r) { return r.a[it.idx]; })) }; }).sort(function (a, b) { return a.m - b.m; }).slice(0, 3);
    function line(x) { return '<div class="aidx-switem"><strong>' + DOMAINS[x.d].name + ' <span>' + r0(x.v) + '점 · ' + refName + ' ' + signed(x.gap) + '</span></strong><p>"' + DOMAINS[x.d].q + '"</p></div>'; }
    h += '<section class="aidx-swgrid aidx-sw3">' +
      '<div class="aidx-swcard good"><p class="aidx-swh">💪 우리 학교의 강점</p>' + strong.map(line).join('') + '</div>' +
      '<div class="aidx-swcard warn"><p class="aidx-swh">🔧 우리 학교의 약점</p>' + weak.map(line).join('') + '</div>' +
      '<div class="aidx-swcard"><p class="aidx-swh">🧩 보완점: 가장 덜 하는 행동</p><ul class="aidx-list">' +
      itemM.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + DOMAINS[Math.floor(x.it.idx / 5)].name + ' · 평균 ' + f1(x.m) + '</span></li>'; }).join('') + '</ul></div></section>';

    // 우선순위 제안 5가지: 약한 영역부터 학교 차원의 할 일을 번갈아
    var need = order.slice().sort(function (a, b) { return (a.v + a.gap) - (b.v + b.gap); });
    var picks = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]].map(function (p) { return { x: need[p[0]], tip: SCHOOL_TIPS[DOMAINS[need[p[0]].d].key][p[1]] }; });
    h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">우리 학교 보완 제안</p><h3>우선순위 5가지</h3>' +
      '<p>' + refName + '와 비교해 가장 약한 영역부터 순서를 정했습니다. 위에서부터 한 학기에 한두 가지씩 실행하세요.</p></div>' +
      '<ol class="aidx-prio5">' + picks.map(function (pk, i) {
        var d = pk.x.d, byRole = ROLES.map(function (rl) { var g = S.filter(function (r) { return r.role === rl; }); return { rl: rl, n: g.length, m: g.length ? mean(g.map(function (r) { return r.dom[d]; })) : 0 }; })
          .filter(function (x) { return x.n >= 2; }).sort(function (a, b) { return a.m - b.m; })[0];
        return '<li class="aidx-prio-card"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + DOMAINS[d].icon + ' ' + DOMAINS[d].name + '</p>' +
          '<p class="aidx-prio-act">' + pk.tip + '</p>' +
          '<p class="aidx-small">근거: 우리 학교 ' + r0(sm[d]) + '점 · ' + refName + ' ' + r0(ref[d]) + '점(' + signed(pk.x.gap) + ')' + (byRole ? ' · 특히 ' + esc(byRole.rl) + '(평균 ' + r0(byRole.m) + '점)부터' : '') + '</p></li>';
      }).join('') + '</ol></section>';
    h += '<h3 class="aidx-subh">우리 학교 상세 통계</h3>' + groupReport(state.pool);
    return h;
  }

  // ---------- 타학교 비교: 같은 학교급 학교끼리 종합·영역 점수 순위(다른 학교 이름은 익명) ----------
  function othersReport() {
    var D = state.data, lvName = D.lv || '같은 학교급', list = schoolsOf(D.LA);
    var h = '<p class="aidx-context">' + esc(lvName) + '에서 응답이 ' + MIN_SCHOOL + '명 이상인 학교끼리 비교합니다. 다른 학교 이름은 공개하지 않고 순위대로 학교 A, B, C…로 표시합니다.</p>';
    if (list.length < 2) return h + '<p class="aidx-note">비교할 ' + esc(lvName) + ' 다른 학교가 아직 없습니다. 다른 학교 응답이 ' + MIN_SCHOOL + '명 이상 모이면 이 화면이 자동으로 채워집니다.</p>';
    var letter = 0;
    list.forEach(function (x) { x.name = x.mine ? '우리 학교' : '학교 ' + String.fromCharCode(65 + letter++); });
    var mineI = list.findIndex(function (x) { return x.mine; }), lvT = mean(totOf(D.LA));
    h += '<div class="kpis aidx-kpis aidx-fixed">' +
      kpi('비교 학교 수', list.length + '<small>개교</small>', esc(lvName) + ' · 응답 ' + D.LA.length + '명') +
      kpi('우리 학교 순위', (mineI + 1) + '<small>위 / ' + list.length + '</small>', '종합 점수 기준') +
      kpi('1위 학교와 차이', mineI === 0 ? '1위' : signed(list[mineI].total - list[0].total) + '<small>점</small>', '1위 ' + r0(list[0].total) + '점') +
      kpi(lvName + ' 평균', r0(lvT) + '<small>/ 100</small>', '우리 학교 ' + signed(list[mineI].total - lvT) + '점') + '</div>';
    h += '<div class="panel"><h3 class="panel-title">학교별 종합 점수</h3><p class="panel-sub">0~100점 · 점선은 ' + esc(lvName) + ' 평균</p><div class="aidx-hbars aidx-school-bars">' +
      list.map(function (x) {
        return '<div class="aidx-hrow' + (x.mine ? ' is-mine' : '') + '"><span class="aidx-hname">' + x.name + '</span><span class="aidx-htrack"><span style="width:' + x.total + '%"></span><i style="left:' + lvT + '%"></i></span>' +
          '<span class="aidx-hval">' + r0(x.total) + '점 · ' + x.n + '명</span></div>';
      }).join('') + '</div></div>';
    h += '<div class="panel"><h3 class="panel-title">영역별 학교 비교</h3><p class="panel-sub">각 영역에서 가장 높은 학교 굵게</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>학교</th><th>응답</th>' +
      DOMAINS.map(function (dm) { return '<th>' + dm.name + '</th>'; }).join('') + '<th>종합</th></tr></thead><tbody>' +
      list.map(function (x) {
        return '<tr' + (x.mine ? ' class="aidx-mine-row"' : '') + '><td>' + x.name + '</td><td>' + x.n + '</td>' + DOMAINS.map(function (_, d) {
          var best = Math.max.apply(null, list.map(function (y) { return y.m[d]; }));
          return '<td>' + (x.m[d] === best ? '<strong>' + r0(x.m[d]) + '</strong>' : r0(x.m[d])) + '</td>';
        }).join('') + '<td><strong>' + r0(x.total) + '</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    return h;
  }

  // ---------- 학교급별 비교 / 전체 학교 수준 ----------
  function levelReport() {
    return compareReport(state.data.rows, function (r) { return r.lv || '기타'; }, SCHOOL_LEVELS, '학교급',
      '응답할 때 고른 학교급(' + SCHOOL_LEVELS.join('·') + ')별로 전체 응답을 자동으로 묶어 비교합니다. 응답 ' + state.data.rows.length + '명 기준.');
  }
  function allReport() {
    var A = state.data.rows, keys = {};
    A.forEach(function (r) { keys[r.same ? '__mine' : r.k] = 1; });
    var schools = schoolsOf(A);
    var h = '<div class="kpis aidx-kpis aidx-fixed">' +
      kpi('참여 학교', Object.keys(keys).length + '<small>개교</small>', MIN_SCHOOL + '명 이상 응답 ' + schools.length + '개교') +
      SCHOOL_LEVELS.slice(0, 3).map(function (lv) { var g = A.filter(function (r) { return r.lv === lv; }); return kpi(lv, g.length + '<small>명</small>', g.length ? '종합 평균 ' + r0(mean(totOf(g))) + '점' : '응답 없음'); }).join('') + '</div>';
    return h + groupReport(state.allPool);
  }

  function compareReport(rows, keyOf, order, noun, intro) {
    var map = {};
    var h = '<p class="aidx-context">' + intro + '</p>';
    rows.forEach(function (r) { var k = keyOf(r); (map[k] = map[k] || []).push(r); });
    var keys = order.filter(function (k) { return map[k]; }).concat(Object.keys(map).filter(function (k) { return order.indexOf(k) < 0; }));
    var inc = keys.filter(function (k) { return map[k].length >= 3; }), exc = keys.filter(function (k) { return map[k].length < 3; });
    if (exc.length) h += '<p class="aidx-context">응답이 3명 미만이라 비교에서 빠진 ' + noun + ': ' + exc.map(function (k) { return esc(k) + '(' + map[k].length + '명)'; }).join(', ') + '</p>';
    if (inc.length < 2) return h + '<p class="aidx-note">비교하려면 응답이 3명 이상인 ' + noun + '이 둘 이상 필요합니다. 응답이 더 모이면 이 화면이 자동으로 채워집니다.</p>';

    var G = inc.map(function (k) { var rs = map[k]; return { k: k, rs: rs, n: rs.length, m: DOMAINS.map(function (_, d) { return mean(rs.map(function (r) { return r.dom[d]; })); }) }; });
    var measures = DOMAINS.map(function (dm, d) { return { name: dm.name, get: function (r) { return r.dom[d]; } }; })
      .concat([{ name: '종합 (실천)', get: function (r) { return r.total; }, sep: true }, { name: '태도', get: function (r) { return r.att; } }]);
    var stats = measures.map(function (ms) {
      var arrs = G.map(function (g) { return g.rs.map(ms.get); }), means = arrs.map(mean);
      var hi = means.indexOf(Math.max.apply(null, means)), lo = means.indexOf(Math.min.apply(null, means));
      return { ms: ms, arrs: arrs, means: means, hi: hi, lo: lo, diff: means[hi] - means[lo], a: anova(arrs) };
    });
    var sig = stats.filter(function (s) { return s.a && s.a.p < 0.05; }).sort(function (a, b) { return a.a.p - b.a.p; });
    var biggest = stats.slice(0, 5).slice().sort(function (a, b) { return b.diff - a.diff; })[0];
    var lead = sig.length
      ? '<strong>' + sig.map(function (s) { return s.ms.name; }).join(', ') + '</strong>에서 ' + noun + ' 간 차이가 통계적으로 의미 있습니다(p < .05). ' +
        '가장 뚜렷한 곳은 ' + josa(sig[0].ms.name.replace(/ \(.*\)$/, ''), '으로', '로') + ', ' + esc(josa(G[sig[0].hi].k, '이', '가')) + ' ' + r0(sig[0].means[sig[0].hi]) + '점으로 ' + esc(G[sig[0].lo].k) + '(' + r0(sig[0].means[sig[0].lo]) + '점)보다 ' + r0(sig[0].diff) + '점 높습니다.'
      : '아직 ' + noun + ' 간 통계적으로 의미 있는 차이는 없습니다(모두 p ≥ .05). 점수 차이가 가장 큰 영역은 ' + biggest.ms.name + '(' + esc(G[biggest.hi].k) + ' ' + r0(biggest.means[biggest.hi]) + '점, ' + esc(G[biggest.lo].k) + ' ' + r0(biggest.means[biggest.lo]) + '점)입니다.';
    h += '<section class="aidx-type"><p class="aidx-eyebrow">그룹 간 차이 한 줄 요약</p><p class="aidx-cmp-lead">' + lead + '</p></section>';

    var cls = ['s1', 's2', 's3', 's4'], shown = G.slice(0, 4);
    var series = shown.map(function (g, i) { return { label: g.k + ' (' + g.n + '명)', values: g.m, cls: cls[i] }; });
    var tc = G.map(function (g) { var c = {}; g.rs.forEach(function (r) { c[r.type] = (c[r.type] || 0) + 1; }); var best = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0]; return { t: TYPES[best], p: Math.round(c[best] / g.n * 100) }; });
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">' + noun + '별 영역 프로파일</h3><p class="panel-sub">영역별 평균 · 0~100점' + (G.length > 4 ? ' · 응답이 많은 4개만 표시' : '') + '</p>' +
      legend(series) + '<div class="radar-box">' + radar(series, noun + '별 영역 평균') + '</div></div>' +
      '<div class="panel"><h3 class="panel-title">' + noun + '별 요약</h3><p class="panel-sub">응답 수, 종합 평균, 가장 많은 AI 활용 유형</p>' +
      '<div class="aidx-cmp-cards">' + G.map(function (g, i) {
        return '<div class="aidx-cmp-card"><p class="aidx-cmp-name">' + (i < 4 ? '<span class="lg-key ' + cls[i] + '"></span>' : '') + esc(g.k) + ' <span class="aidx-muted">' + g.n + '명</span></p>' +
          '<p class="aidx-cmp-total">' + r0(mean(g.rs.map(function (r) { return r.total; }))) + '<small>점</small></p>' +
          '<p class="aidx-small">' + tc[i].t.icon + ' ' + tc[i].t.name + ' ' + tc[i].p + '%</p></div>';
      }).join('') + '</div></div></section>';

    h += '<div class="panel"><h3 class="panel-title">영역별 평균 비교와 차이 검정</h3><p class="panel-sub">평균 (표준편차) · 일원분산분석 · <span class="aidx-sig">유의</span> p < .05 · 가장 높은 값 굵게</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>영역</th>' + G.map(function (g) { return '<th>' + esc(g.k) + ' <span class="aidx-muted">n=' + g.n + '</span></th>'; }).join('') +
      '<th>최대 차이</th><th>F</th><th>p</th></tr></thead><tbody>' +
      stats.map(function (s) {
        return '<tr' + (s.ms.sep ? ' class="aidx-sep"' : '') + '><td>' + s.ms.name + '</td>' + s.means.map(function (m, i) {
          return '<td>' + (i === s.hi ? '<strong>' + r0(m) + '</strong>' : r0(m)) + ' <span class="aidx-muted">(' + r0(sd(s.arrs[i])) + ')</span></td>';
        }).join('') + '<td>' + r0(s.diff) + '</td><td>' + (s.a ? (isFinite(s.a.F) ? s.a.F.toFixed(2) : '–') : '–') + '</td>' +
          '<td>' + (s.a ? fmtP(s.a.p) + (s.a.p < 0.05 ? ' <span class="aidx-sig">유의</span>' : '') : '–') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">응답 수가 적으면 차이가 커 보여도 유의하지 않을 수 있습니다. 표본이 작을 때는 참고용으로 보세요.</p></div>';
    return h;
  }

  function alpha(rows, from, to) {
    if (rows.length < 10) return '–';
    var k = to - from, iv = 0;
    for (var i = from; i < to; i++) iv += variance(rows.map(function (r) { return r.a[i]; }));
    var tv = variance(rows.map(function (r) { return r.a.slice(from, to).reduce(function (s, v) { return s + v; }, 0); }));
    return tv > 0 ? (k / (k - 1) * (1 - iv / tv)).toFixed(2) : '–';
  }

  // ---------- 이벤트 ----------
  function render() {
    if (state.view === 'home') viewHome();
    else if (state.view === 'survey') viewSurvey();
  }
  function go(view) { state.view = view; render(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 }); }

  root.addEventListener('input', function (e) {
    if (e.target.name === 'org') { state.org = e.target.value; state.pending = null; }
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    state.pending = null; // 응답을 바꾸면 새 코드로 다시 보낸다
    if (t.name === 'role') state.role = t.value;
    else if (t.name === 'lv') state.lv = t.value;
    else if (t.type === 'radio') {
      state.answers[t.name] = +t.value;
      var li = t.closest('.aidx-item'); if (li) li.classList.remove('is-miss');
    }
    var bar = root.querySelector('.aidx-progress');
    if (bar) { var done = answered() + (state.role ? 1 : 0); bar.firstChild.style.width = (done / (NI + 1) * 100) + '%'; bar.setAttribute('aria-valuenow', done); }
  });

  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]');
    if (tb) {
      if (!state.data) { analyze(tb.dataset.tab); return; }
      state.tab = tb.dataset.tab; viewResult(); return;
    }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'start') { state.answers = {}; state.role = ''; state.lv = ''; state.org = ''; state.pending = null; state.page = -1; state.started = Date.now(); go('survey'); }
    else if (act === 'home') { go('home'); }
    else if (act === 'prev') { if (state.page === -1) go('home'); else { state.page--; go('survey'); } }
    else if (act === 'next') {
      var miss = pageComplete(), err = document.getElementById('aidx-err');
      if (miss) {
        err.textContent = miss === 'role' ? '응답자 구분을 골라 주세요.' : miss === 'lv' ? '학교급을 골라 주세요.' : miss === 'org' ? '소속 학교 이름을 적어 주세요.' : '응답하지 않은 문항이 있습니다.';
        if (miss === 'org') document.getElementById('aidx-org-in').focus();
        else if (miss !== 'role' && miss !== 'lv') {
          PAGES[state.page].forEach(function (it) { if (!state.answers[it.code]) document.getElementById('q-' + it.code).classList.add('is-miss'); });
          document.getElementById('q-' + miss).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (state.page < PAGES.length - 1) { state.page++; go('survey'); return; }
      var rec = state.pending || { id: newId(), group: GROUP, role: state.role, lv: state.lv, org: state.org.trim().slice(0, 40), answers: ITEMS.map(function (it) { return state.answers[it.code]; }), seconds: Math.round((Date.now() - state.started) / 1000) };
      state.pending = rec; b.disabled = true; err.textContent = '저장하는 중…';
      submit(rec).then(function () {
        state.me = rec; state.pending = null; state.data = state.pool = state.allPool = null; save(LS_ME, rec); viewDone();
      }).catch(function () { b.disabled = false; err.textContent = '저장하지 못했습니다. 잠시 뒤 응답 제출을 다시 눌러 주세요.'; });
    }
    else if (act === 'analyze') { analyze('me'); }
    else if (act === 'pdf') { downloadPdf(b); }
    else if (act === 'copycode') {
      var code = b.dataset.code;
      var done = function () { b.textContent = '복사했습니다'; b.classList.add('is-done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(done, function () { window.prompt('결과 코드를 복사하세요', code); });
      else window.prompt('결과 코드를 복사하세요', code);
    }
    else if (act === 'my' || act === 'school' || act === 'all') {
      // 결과는 진단을 마친 사람만 본다. 이 기기에 응답이 없으면 안내를 띄운다.
      var me = load(LS_ME), tab = act === 'my' ? 'me' : act;
      if (me) { state.me = me; state.data = state.pool = state.allPool = null; analyze(tab); return; }
      state.gateTab = tab;
      if (state.view !== 'home' || !document.getElementById('aidx-gate')) go('home');
      document.getElementById('aidx-gate-msg').textContent = ({ me: '나의 역량 수준은', school: '우리 학교 역량 수준은', all: '전체 학교 수준은' })[tab] + ' 먼저 진단을 완료해야 볼 수 있습니다.';
      document.getElementById('aidx-gate').hidden = false;
      document.getElementById('aidx-code').hidden = true;
    }
    else if (act === 'code') {
      document.getElementById('aidx-code').hidden = false; document.getElementById('aidx-code-in').focus();
    }
  });

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'aidx-code') return;
    e.preventDefault();
    var id = document.getElementById('aidx-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), err = document.getElementById('aidx-code-err');
    if (id.length !== 8) { err.textContent = '코드 8자리를 입력해 주세요.'; return; }
    err.textContent = '찾는 중…';
    fetchOne(id).then(function (rec) {
      if (!rec) { err.textContent = '해당 코드의 응답이 없습니다.'; return; }
      state.me = rec; state.data = state.pool = state.allPool = null; save(LS_ME, rec); analyze(state.gateTab || 'me');
    }).catch(function () { err.textContent = '불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'; });
  });

  root.addEventListener('mousemove', function (e) {
    var t = e.target.closest('[data-tip]');
    if (!t) { tip.hidden = true; return; }
    tip.textContent = t.getAttribute('data-tip'); tip.hidden = false;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8) + 'px'; tip.style.top = (e.clientY + 14) + 'px';
  });
  root.addEventListener('mouseleave', function () { tip.hidden = true; });

  render();
})();
