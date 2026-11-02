// 우리학교 AIX 전환 준비·성숙도 진단: 설문 응답 수집 → 분석 실시 → 종합 결과 / 내가 본 우리 학교 / 우리 학교 분석결과 / 응답자 구분별 비교.
// 우리 학교 = 같은 학교 이름으로 응답한 사람들. 종합 결과는 같은 학교급의 다른 학교(학교 이름은 받지 않고 번호만)와도 비교한다.
// 문항: 기반 마련 → 교원 활용 → 공동 실천 → 학교 확산 → AI 내재화, 5단계 × 6문항 + 전반 인식 2문항 = 32문항, 5점 동의 척도.
// 학교를 주어로 묻는 단계(기반 마련·학교 확산·AI 내재화)와 전반 인식 문항에는 '잘 모르겠다'(값 0)를 둔다. 0은 점수 계산에서 빼고, 단계별 '모르겠다' 비율로 따로 보고한다.
// 응답 저장: #axr의 data-endpoint(Google Apps Script 웹앱, tools/aix-school/)가 있으면 그곳에,
// 비어 있으면 시험 모드로, 응답을 이 브라우저에만 저장하고 이 브라우저의 응답끼리만 분석한다.
// 화면 구성과 분석 로직은 기업용 AX 전환 준비도 진단(assets/js/ax-readiness.js)과 같다.
(function () {
  var root = document.getElementById('axr');
  if (!root) return;
  var tip = document.getElementById('axr-tip');
  var ENDPOINT = (root.dataset.endpoint || '').trim();
  var PREVIEW = !ENDPOINT;
  var GROUP = cleanGroup(new URLSearchParams(location.search).get('group'));
  var LS_ME = 'aixs-v1-me' + (PREVIEW ? '-test' : ''), LS_DATA = 'aixs-v1-test-responses';
  var MIN_N = 5;   // 학교 결과·비교를 보여 줄 최소 응답 수
  var MIN_ROLE = 3; // 응답자 구분별 비교에 넣을 최소 인원
  var MIN_SCHOOL = 3; // 같은 학교급 비교에 넣을 다른 학교의 최소 응답 수

  // ---------- 단계와 문항 ----------
  // ref: 문항의 주어(참조 대상). 한 단계 안에서는 주어를 통일한다.
  // unk: '잘 모르겠다' 허용 여부. 응답자가 직접 알기 어려운 학교 수준 단계에만 둔다.
  var STAGES = [
    { key: 'F', name: '기반 마련', ref: '우리 학교는', icon: '🧱', q: '학교는 AIX를 시작할 바탕을 깔았나?', unk: true,
      def: '학교가 AI 활용 교육 목표를 세우고, 지침·승인 도구·기반 시설·연수를 갖추며, 방침을 교원과 함께 정한 상태.',
      ex: '교육계획에 AI 활용 목표가 있고, 학교 지침과 승인된 도구 목록이 있다',
      owner: '교장·교감과 학교 운영위원회', basis: 'CoSN K-12 Gen AI 성숙도 Emerging · 미국 교육부 AI 툴킷 · UNESCO 생성형 AI 지침 · SELFIE 리더십·인프라' },
    { key: 'P', name: '교원 활용', ref: '나는', icon: '🧑‍🏫', q: '나는 수업과 업무에 AI를 쓰고 있나?', unk: false,
      def: '교원 한 사람 한 사람이 수업 준비와 업무에 AI를 쓰고, 요청을 구체화하며, 내용과 학생 정보를 확인하고, 효과를 확인하는 상태.',
      ex: '수업 자료 준비에 AI를 쓰고, 정확성과 학생 개인정보를 확인한다',
      owner: '교원 개인', basis: 'UNESCO 교사 AI 역량 프레임워크 · 학생 사용 전 교원 사용부터(Plante Moran 2단계) · 개인 변화 준비도(Holt 외)' },
    { key: 'W', name: '공동 실천', ref: '나와 동료 교원들은', icon: '🤝', q: '동료 교원과 AI 활용을 함께 맞추고 나누고 있나?', unk: false,
      def: '교원 개인의 활용이 가까운 동료(같은 학년·교과 등)와의 협력으로 이어져, 수업에서 AI와 교사의 역할을 함께 정하고, 학생의 AI 사용 기준과 평가 방식을 맞추며, 효과와 문제 사례를 함께 확인하고, 잘 된 방법을 서로 나누는 상태. 공식 협의회가 아니어도 된다.',
      ex: '같은 과제의 AI 사용 기준을 동료와 맞추고, 잘 된 요청문과 활동지를 서로 나눈다',
      owner: '교원과 가까운 동료(같은 학년·교과)', basis: 'SELFIE 교수학습·평가 · TeachAI 학업 윤리 · Plante Moran 3단계(사용 공개·과정 중시) · UNESCO 인간 주도성' },
    { key: 'E', name: '학교 확산', ref: '우리 학교는', icon: '🔗', q: '좋은 수업이 학교 전체로 퍼지고 있나?', unk: true,
      def: '교원 학습공동체와 수업 공개로 사례가 퍼지고, 행정 업무에도 AI가 쓰이며, 데이터를 보호 기준 안에서 활용하고, 효과를 학교 차원에서 점검하며, 학부모에게 알리는 상태.',
      ex: '교원 학습공동체가 운영되고, 학교 자체 평가에서 AI 활용 효과를 점검한다',
      owner: '교감·부장교사와 교원 학습공동체', basis: 'SELFIE 협력·전문성 개발 · CoSN Developing · Plante Moran 3단계 · AI 중점학교 사례 공유' },
    { key: 'N', name: 'AI 내재화', ref: '우리 학교는', icon: '⚙️', q: 'AI가 수업과 업무, 학교생활 전반에 자연스럽게 녹아들었나?', unk: true,
      def: '교사가 수업에서 AI를 활용하면서 AI 리터러시(한계·사실 확인·개인정보·저작권)를 함께 가르치고, 학생은 AI를 학습 도구로 자연스럽게 쓰며, 교사 업무와 학교생활 전반에서도 AI가 일상적인 도구로 쓰이는 상태. 별도의 AI 교육과정을 운영하지 않아도 되며, 위험 점검과 활용 기회의 형평성도 함께 챙긴다.',
      ex: '수업에서 AI를 쓸 때 사실 확인과 책임 있는 사용을 함께 가르치고, 교사 업무에도 AI가 일상적으로 쓰인다',
      owner: '학교 전체 (관리자·교원·학생·학부모)', basis: 'CoSN Mature · Plante Moran 4단계 · OECD·EC AILit · UNESCO 학생 AI 역량 · AI 중점학교 요건' }
  ];
  var RAW = [
    ['F1', '우리 학교는 AI 활용으로 이루려는 교육 목표를 학교 교육계획에 구체적으로 제시했다.'],
    ['F2', '우리 학교는 AI 활용 수업에 필요한 기반 시설(예: 학생용 기기, 무선 네트워크)을 갖추고 있다.'],
    ['F3', '우리 학교는 AI 사용 기준(예: 학생 개인정보 입력 금지, 학생 사용 연령, 과제에서의 허용 범위)을 담은 학교 지침을 갖추고 있다.'],
    ['F4', '우리 학교는 학교(또는 교육청)가 승인한 AI 도구 목록을 교원에게 안내한다.'],
    ['F5', '우리 학교는 교원이 수업에 AI를 활용하는 방법을 익히는 연수 기회를 제공한다.'],
    ['F6', '우리 학교는 AI 활용 방침을 정하는 과정에서 교원의 의견을 수렴했다.'],
    ['P1', '나는 매주 반복되는 내 업무(예: 수업 자료 준비, 행정 문서 작성) 가운데 적어도 한 가지를 AI로 처리하고 있다.'],
    ['P2', '나는 AI에게 일을 맡기기 전에 그 일이 AI에 적합한지 따져 본다.'],
    ['P3', '나는 AI에게 요청할 때 결과물이 갖출 조건(예: 학년 수준, 성취기준, 분량)을 구체적으로 제시한다.'],
    ['P4', '나는 AI가 만든 수업 자료를 쓰기 전에 내용의 정확성을 교육과정이나 원자료와 대조해 확인한다.'],
    ['P5', '나는 AI에 자료를 입력하기 전에 학생 개인정보(예: 이름, 성적, 상담 내용)가 들어 있는지 확인한다.'],
    ['P6', '나는 AI 활용으로 달라진 내 수업이나 업무의 변화(예: 줄어든 준비 시간, 늘어난 개별 피드백)를 확인한다.'],
    ['W1', '나와 동료 교원들은 수업을 함께 준비할 때 AI가 맡을 활동과 교사가 판단할 활동을 나누어 정한다.'],
    ['W2', '나와 동료 교원들은 같은 과제나 평가에서 학생의 AI 사용 허용 범위를 같은 기준으로 맞춘다.'],
    ['W3', '나와 동료 교원들은 학생의 AI 사용을 고려해 평가 방식을 함께 바꾸었다(예: 과정 중심 평가, 구술 확인 추가).'],
    ['W4', '나와 동료 교원들은 AI를 활용한 수업의 효과를 학생의 학습 결과(예: 과제 완성도, 성취 수준)로 함께 확인한다.'],
    ['W5', '나와 동료 교원들은 효과가 확인된 AI 활용 수업 방법을 서로 바로 쓸 수 있는 형태(예: 공유 지도안, 활동지, 요청문)로 나눈다.'],
    ['W6', '나와 동료 교원들은 AI 활용 수업에서 생긴 문제 사례(예: 부정확한 정보, 부적절한 결과물)를 함께 검토한다.'],
    ['E1', '우리 학교는 AI 활용 수업을 주제로 한 교원 학습공동체를 운영한다.'],
    ['E2', '우리 학교는 한 교과(학년)에서 효과가 확인된 AI 활용 수업 사례를 다른 교과(학년)와 나누는 자리(예: 수업 공개, 사례 발표회)를 운영한다.'],
    ['E3', '우리 학교는 반복되는 행정 업무(예: 공문 초안, 가정통신문)를 AI로 처리하는 방법을 학교 공통으로 정해 쓰고 있다.'],
    ['E4', '우리 학교에서는 정해진 보호 기준에 따라 여러 교과 교사가 학생 학습 데이터를 함께 학생 지도에 활용한다.'],
    ['E5', '우리 학교는 학교 자체 평가에서 AI 활용 교육의 효과를 정기적으로 점검한다.'],
    ['E6', '우리 학교는 AI 활용 교육의 내용과 방침을 학부모에게 정기적으로 안내한다.'],
    ['N1', '우리 학교 교사들은 수업에서 AI를 활용할 때 AI 리터러시(예: AI의 한계, 사실 확인, 개인정보·저작권)를 함께 가르친다.'],
    ['N2', '우리 학교에서는 여러 교과의 수업에서 학생이 AI를 학습 도구로 활용하는 일이 자연스럽다.'],
    ['N3', '우리 학교 교사들은 AI의 도움을 받아 학생별 피드백이나 맞춤 지도를 일상적으로 한다.'],
    ['N4', '우리 학교는 사용 중인 AI 도구의 위험(예: 부적절한 콘텐츠, 편향, 개인정보 유출)을 정해진 주기로 점검한다.'],
    ['N5', '우리 학교는 가정 환경 때문에 학생 간 AI 활용 기회에 차이가 생기지 않도록 지원한다(예: 기기 대여, 방과 후 이용 공간).'],
    ['N6', '우리 학교에서는 수업 준비, 평가, 행정, 학생 지도 등 교사 업무와 학교생활 전반에서 AI가 특별한 일이 아닌 일상적인 도구로 쓰인다.'],
    ['G1', '우리 학교 교원들은 AIX 전환을 해내려는 의지가 강하다.'],
    ['G2', '우리 학교는 AIX 전환을 해낼 역량을 갖추고 있다.']
  ];
  var K = 6, NS = 30; // 단계당 문항 수, 단계 문항 수
  var ITEMS = RAW.map(function (r, i) {
    var s = i < NS ? STAGES[Math.floor(i / K)] : null;
    return { code: r[0], text: r[1], idx: i, unk: s ? s.unk : true };
  });
  var NI = ITEMS.length; // 전체 문항 수
  var SCALE = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var UNK = '잘 모르겠다';
  var ROLES = ['교사', '부장교사', '교감·교장', '기타 교원'];
  // 배경 문항: 학교급과 AI 사용 빈도. 비교 분석의 보조 변수로만 쓰고, 개인을 식별할 수 있는 정보는 묻지 않는다.
  var JOBS = ['초등학교', '중학교', '고등학교', '특수학교', '기타'];
  var FREQS = ['거의 쓰지 않음', '월 1~3회', '주 1~2회', '주 3회 이상', '매일'];
  var BG = [{ key: 'role', label: '직위', opts: ROLES }, { key: 'job', label: '학교급', opts: JOBS }, { key: 'freq', label: '최근 한 달 동안 수업이나 업무에 AI를 쓴 빈도', opts: FREQS }];
  // 제시 순서: 단계 순서대로, 한 쪽에 한 단계(주어가 같은 문항끼리) → 전반 인식
  var PAGES = STAGES.map(function (_, s) { return ITEMS.slice(s * K, s * K + K); });
  PAGES.push(ITEMS.slice(NS));
  var PAGE_HEAD = ['우리 학교 전체에 대한 문장입니다.', '나 자신에 대한 문장입니다.', '나와 가까이 일하는 동료 교원(같은 학년·교과 등)에 대한 문장입니다. 공식 협의회가 아니어도 됩니다.', '우리 학교 전체에 대한 문장입니다.', '우리 학교의 수업과 교사 업무, 학교생활 전반에 대한 문장입니다.', '마지막으로, 우리 학교 전체를 떠올려 주세요.'];

  // ---------- 수준·단계 ----------
  var LEVELS = [{ min: 80, t: '주도' }, { min: 60, t: '정착' }, { min: 40, t: '형성' }, { min: 0, t: '시작' }];
  var CUT = 60;      // 단계 '준비 완료' 기준점(잠정)
  var MIN_ITEMS = 4; // 단계 점수를 내려면 6문항 중 이만큼 응답(모르겠다 제외)해야 함
  var GAP_NOTE = 10, GAP_BIG = 20; // 나와 다른 응답자의 차이: 눈여겨볼 차이, 큰 차이(점)
  var STAGE_NAMES = ['출발 전', '1단계 · 기반 마련', '2단계 · 교원 활용', '3단계 · 공동 실천', '4단계 · 학교 확산', '5단계 · AI 내재화'];
  var STAGE_DESC = [
    'AIX를 시작할 바탕(교육 목표·지침·승인 도구·기반 시설·연수)부터 갖추어야 하는 단계입니다.',
    '학교가 출발선은 마련했지만, 교원이 수업 준비와 업무에 AI를 쓰는 일이 아직 자리 잡지 않았습니다.',
    '교원 개인은 AI를 쓰고 있지만, 동료 교원과 함께 기준을 맞추고 방법을 나누는 데까지는 이어지지 않았습니다.',
    '동료 교원끼리는 기준을 맞추고 방법을 나누고 있지만, 좋은 사례와 운영 방식이 학교 전체로 이어지지 않았습니다.',
    '학교 전체로 확산되었지만, 수업과 교사 업무, 학교생활 전반에 AI가 아직 자연스럽게 녹아들지 않았습니다.',
    '다섯 단계를 모두 갖추어, AI를 전제로 가르치고 배우는 학교로 전환할 준비가 된 상태입니다.'
  ];
  // 단계별로 학교(또는 동료 교원)가 해 볼 일
  var ACTIONS = {
    F: ['다음 학년도 학교 교육계획서의 디지털·AI 교육 항목에 확인할 수 있는 목표 1~2개(예: 학기당 AI 활용 수업 공개 2회, 반복 행정 업무 3가지 공통 방법 마련)를 적고, 12~2월 교육과정 협의 때 교원 의견을 받아 확정합니다.', '교육청 지침을 바탕으로 "AI에 넣으면 안 되는 정보(학생 이름·성적·상담 내용·사진) / 도구별 학생 사용 가능 연령과 보호자 동의 / 과제별 허용 범위" 세 가지만 담은 A4 한 쪽 지침을 만들어 교무실 게시판과 업무 메신저 공지에 고정합니다.', '교육청이 승인했거나 학교가 계약한 AI 도구를 "도구 이름 · 계정 받는 법 · 학생 사용 가능 여부" 표 한 장으로 정리해 3월 첫 교직원 회의에서 나눠 주고, 무선망·기기가 부족한 교실은 정보부가 목록으로 받아 둡니다.'],
    P: ['같은 학년·교과 동료와 30분을 내어(기존 협의회·학년 모임 시간을 써도 됩니다) "다음 주 실제로 쓸 형성평가 3문항이나 수준별 활동지 1장"을 AI로 함께 만들고, 교과서와 대조해 고친 뒤 바로 수업에 씁니다.', '공문 요약·가정통신문 초안·회의록 정리처럼 학교에 이미 있는 업무 3가지에 쓸 검증된 요청문을 공유 폴더에 올려, 처음 쓰는 교원도 복사해 바로 쓰게 합니다.', '연수 첫 10분에 학생 이름을 "학생A"로 바꾸고 성적·상담 내용을 지운 뒤 넣는 익명화 실습을 하고, 학교생활기록부 문장은 AI가 쓴 문장을 그대로 쓰지 않는다는 원칙을 함께 안내합니다.'],
    W: ['학기 초 같은 과목·학년을 맡은 동료 교원끼리 수행평가마다 AI 사용을 "금지 / 아이디어만 / 초안까지 / 자유" 가운데 하나로 정해 평가 계획과 과제 안내문에 한 줄로 적습니다.', '결과물만 내는 수행평가 하나를 골라 "AI 사용 기록 제출 + 5분 구술 확인"을 넣고, 채점 기준표에 "자기 말로 설명하기" 항목을 추가합니다.', '동료 교원 2~3명이 한 단원을 정해 한 교사가 먼저 AI 활용 수업을 하고, 15분 동안 학생 결과물 3~4개를 함께 보며 지도안을 고칩니다.'],
    E: ['이미 운영 중인 전문적 학습공동체 하나의 학기 주제를 "AI 활용 수업"으로 정하고, 학기 말 수업 나눔 때 1회 공개합니다. 새 모임을 만들기보다 있는 모임을 씁니다.', '가정통신문·공문 회신 초안·회의록 3가지에 대해 요청문과 개인정보 확인 절차를 한 장으로 만들고, 전입·신규 교원 안내 자료에 넣습니다.', '학기 말 학교 자체 평가 설문에 AI 활용 문항 2~3개를 넣고, 이 진단을 다시 실시해 단계 점수 변화를 교직원 회의와 가정통신문으로 알립니다.'],
    N: ['AI를 활용하는 수업에서 5분이라도 "AI 답을 어떻게 확인할까, 무엇을 넣으면 안 될까"를 함께 다루도록, 교과마다 짧은 AI 리터러시 활동 예시를 하나씩 만들어 공유합니다. 별도 교육과정을 만들지 않아도 됩니다.', '수업 준비·평가·행정에서 교원들이 실제로 AI를 쓰는 방법을 학기마다 "우리 학교 AI 일상 사례"로 모아 나누고, 신규·전입 교원 안내에 넣습니다.', '학교에서 쓰는 AI 도구마다 담당 교사를 정하고, 학기 초 1회 "이용 연령 기준 · 개인정보 처리 · 부적절한 응답" 세 가지를 점검표로 확인합니다.', '가정에 기기나 인터넷이 없는 학생을 담임 조사로 파악해, 학교 기기 대여와 도서실·컴퓨터실 방과 후 개방으로 AI 과제 격차를 줄입니다.']
  };
  var STRATEGIES = {
    F: [
      { t: '학교 교육계획에 확인할 수 있는 AI 활용 목표 넣기', who: '교감, 교육과정부장', when: '12~2월 다음 학년도 교육계획 수립 기간',
        steps: ['교육과정 협의 때 안건 하나로 "AI로 교사가 덜 하게 될 일, 학생이 더 하게 될 일"을 교과별 1줄씩 받습니다(별도 회의를 만들지 않습니다).', '받은 의견을 목표 1~2개로 줄이고, 학기 말에 무엇으로 확인할지 함께 정합니다(예: 공개 수업 횟수, 공통 요청문이 있는 업무 수).', '교육계획서 디지털·AI 교육 항목에 적고, 3월 첫 교직원 회의에서 5분 안에 설명합니다.'],
        kpi: '교육계획서에 확인 방법이 있는 AI 활용 목표 1~2개' },
      { t: 'A4 한 쪽 학교 AI 사용 지침 만들기', who: '교감, 정보부장, 학생부장', when: '2월 말까지(학기 시작 전)',
        steps: ['교육청 지침과 승인 도구 목록을 펴 놓고 세 칸만 채웁니다: ① AI에 넣으면 안 되는 정보(학생 이름·성적·상담 내용·사진) ② 도구별 학생 사용 가능 연령과 보호자 동의 필요 여부 ③ 과제 허용 범위 4단계(금지·아이디어만·초안까지·자유).', '부장 회의에서 확정하고, 학생 오리엔테이션용으로 학생 말투 버전을 한 장 더 만듭니다.', '교무실 게시판·업무 메신저 공지·누리집에 올리고, 3월 첫 주 학급 조회 때 담임이 5분 안내합니다.'],
        kpi: '1단계 "잘 모르겠다" 응답 비율 10% 이하' },
      { t: '승인 도구 안내표와 기기·무선망 점검', who: '정보부장, 행정실', when: '3월 첫 2주',
        steps: ['쓸 수 있는 AI 도구를 "도구 이름 · 계정 받는 법 · 학생 사용 가능 여부 · 담당자" 표 한 장으로 만들어 배부합니다.', '교실별로 기기 대수와 무선망 접속 상태를 담임에게 메신저 설문으로 받아 부족한 곳을 목록으로 만듭니다.', '교육청 원격연수나 찾아가는 연수 가운데 교과별로 들을 만한 과정을 2~3개 골라 안내합니다.'],
        kpi: '승인 도구 계정이 있는 교원 비율, 연수 안내 후 수강 교원 수' }
    ],
    P: [
      { t: '동료와 30분 "바로 쓰는 자료" 실습', who: '연구부장, 학년·교과 대표 교사', when: '월 1회(기존 협의회·학년 모임 시간 활용 가능), 한 학기',
        steps: ['각자 다음 주 수업 단원을 정하고, 형성평가 3문항이나 수준별 활동지 1장을 AI로 만듭니다. 요청 예: "○학년 ○○ 단원, 성취기준 [코드], 자주 생기는 오개념을 확인하는 선다형 3문항과 해설".', '만든 결과를 교과서·지도서와 대조해 틀린 내용과 수준에 안 맞는 표현을 고칩니다(10분).', '고친 자료와 요청문을 공유 폴더에 올리고, 다음 모임 첫 5분에 써 본 결과를 한 줄씩 나눕니다.'],
        kpi: '매주 수업 준비에 AI를 쓰는 교원 비율(P1 문항)' },
      { t: '업무 경감용 "검증된 요청문" 묶음 만들기', who: '교무부장, 부장교사', when: '학기 중 2개월',
        steps: ['교원이 반복해서 하는 업무 3가지를 고릅니다(예: 받은 공문 요약, 가정통신문 초안, 회의록 정리).', '업무마다 써 본 요청문과 확인할 점을 한 장에 적습니다. 요청 예: "아래 공문에서 기한·제출물·담당 부서만 표로 정리해 줘".', '공유 폴더에 두고 교원별로 줄어든 시간을 한 줄씩 기록해, 월말 교직원 회의에서 사례 2개를 소개합니다.'],
        kpi: '요청문이 마련된 업무 수, 교원 1인당 월 절감 시간(자기 기록)' },
      { t: '학생 개인정보·생활기록부 원칙 몸에 익히기', who: '정보부장, 교무부장', when: '3월, 이후 학기 말 생활기록부 작성 전',
        steps: ['"넣지 말 것(이름·성적·상담·사진)"과 "바꿔 넣는 법(학생A, 점수 구간)"을 한 장으로 만들어 교무실에 붙입니다.', '연수 첫 10분에 실제 활동 기록을 익명화해 넣어 보는 실습을 합니다.', '생활기록부 작성 기간 전 메신저 공지로 "AI가 쓴 문장을 그대로 쓰지 않고, 교사가 관찰한 기록에서 시작한다"는 원칙을 다시 안내합니다.'],
        kpi: 'P5 문항 학교 평균 4점 이상' }
    ],
    W: [
      { t: '같은 과제는 같은 AI 허용 기준으로', who: '같은 과목·학년을 맡은 교원', when: '3월·8월 평가 계획 수립 때',
        steps: ['평가 계획을 세울 때 수행평가마다 AI 사용을 "금지 / 아이디어만 / 초안까지 / 자유" 가운데 하나로 정합니다.', '허용한 경우 제출 방법(사용한 대화 캡처 1장 또는 사용 내용 3줄)을 과제 안내문에 적습니다.', '학기 말에 동료와 학생 질문이 많았던 과제를 골라 기준 문구를 고칩니다.'],
        kpi: 'AI 허용 범위가 적힌 수행평가 비율 100%' },
      { t: '과제 하나에 구술 확인 넣기', who: '같은 과목 동료 교원, 연구부', when: '한 학기',
        steps: ['결과물만 내는 과제 하나를 골라 학생 1명당 3~5분 구술 확인("이 부분은 왜 이렇게 썼나요?")을 넣습니다. 시간이 부족하면 무작위 5명만 확인합니다.', '채점 기준표에 "자기 말로 설명하기" 항목을 넣고 배점을 정합니다.', '학기 말에 이전 학기 같은 과제와 학생 결과물을 비교해 동료와 15분 검토합니다.'],
        kpi: '구술 확인을 넣은 과제가 있는 교과 수' },
      { t: '동료와 한 단원 함께 준비하고 결과물로 고치기', who: '같은 학년·교과 동료 교원 2~3명', when: '약 1개월(모임 2회)',
        steps: ['다음 단원 하나를 골라 AI가 맡을 활동(예: 자료 요약, 예시 생성)과 교사가 판단할 활동(예: 근거 확인, 피드백)을 지도안에 표시합니다.', '한 교사가 먼저 수업하고, 학생 결과물 3~4개를 가져옵니다.', '다음 모임 15분 동안 결과물을 보며 지도안·활동지를 고치고 공유 폴더에 올립니다.'],
        kpi: '학기당 동료와 함께 준비한 단원 1개 이상' }
    ],
    E: [
      { t: '있는 학습공동체 하나를 "AI 수업" 주제로', who: '교감, 학습공동체 대표 교사', when: '한 학기(격주 모임)',
        steps: ['이미 운영 중인 전문적 학습공동체 가운데 하나의 학기 주제를 AI 활용 수업으로 정합니다(새 모임을 만들지 않습니다).', '모임마다 한 명이 10분 동안 실제 수업 자료와 학생 결과물을 보여 주고 함께 고칩니다.', '학기 말 수업 나눔 때 1회 공개하고, 자료를 학교 공유 폴더에 모읍니다.'],
        kpi: '학습공동체 참여 교원 수, 학기당 공개 수업 횟수' },
      { t: '반복 행정 업무 3가지 학교 공통 방법 정하기', who: '교무부, 행정실', when: '2개월',
        steps: ['교원 설문으로 가장 시간이 많이 드는 반복 업무 3가지를 고릅니다(예: 가정통신문, 공문 회신 초안, 회의록).', '업무마다 요청문, 개인정보 확인 절차, 최종 확인자를 한 장으로 정리합니다.', '공유 폴더와 전입·신규 교원 안내 자료에 넣고, 학기 말에 처리 시간 변화를 다시 묻습니다.'],
        kpi: '공통 방법이 있는 행정 업무 수, 업무 처리 시간(교원 응답)' },
      { t: '학기 말 점검과 학부모 안내', who: '교육과정부', when: '7월·12월',
        steps: ['학교 자체 평가 설문에 AI 활용 문항 2~3개(수업 적용 경험, 업무 부담 변화)를 넣습니다.', '이 진단을 다시 실시해 단계 점수 변화를 확인합니다.', '결과와 다음 학기 계획을 교직원 회의에서 공유하고, 학생 AI 사용 원칙과 함께 가정통신문으로 안내합니다.'],
        kpi: '진단 재실시 응답률, 자체 평가 AI 문항 포함 여부' }
    ],
    N: [
      { t: 'AI를 쓰는 수업에 리터러시 한 가지씩 넣기', who: '교과 교사, 정보 교사', when: '한 학기',
        steps: ['AI를 활용하는 수업마다 함께 다룰 리터러시 요소 하나(AI의 한계, 사실 확인, 출처, 개인정보, 저작권)를 정해 수업 계획에 한 줄 적습니다.', '교과마다 5분짜리 활동 예시(예: AI 답의 틀린 곳 찾기, 출처가 실제로 있는지 확인하기)를 하나씩 만들어 공유 폴더에 모읍니다.', '학기 말에 짧은 학생 점검 문항으로 리터러시가 자랐는지 확인합니다.'],
        kpi: '리터러시 요소를 함께 다룬 AI 활용 수업 비율' },
      { t: '사용 중인 AI 도구 학기 초 점검', who: '정보부, 학교운영위원회 보고', when: '3월·9월',
        steps: ['학교에서 쓰는 AI 도구와 도구별 담당 교사를 목록으로 만듭니다.', '도구마다 "이용 연령 기준 · 개인정보 처리 방식 · 부적절한 응답 사례" 세 가지를 점검표로 확인합니다.', '문제가 있으면 사용 중단이나 대체 도구를 정해 메신저와 가정통신문으로 알립니다.'],
        kpi: '점검을 마친 도구 비율 100%' },
      { t: '가정 환경에 따른 AI 과제 격차 줄이기', who: '교육복지 담당, 행정실, 담임', when: '한 학기',
        steps: ['3월 담임 조사로 집에 기기나 인터넷이 없는 학생을 파악합니다.', '학교 기기 대여와 도서실·컴퓨터실 방과 후 개방을 운영하고, AI가 필요한 과제는 수업 시간 안에 할 수 있게 설계합니다.', '지원받은 학생의 과제 제출률을 학기 말에 확인합니다.'],
        kpi: '지원 대상 학생의 AI 과제 제출률' }
    ]
  };
  // 교원이 직접 해 볼 일 (교원 활용·공동 실천 단계)
  var MY_TIPS = {
    P: ['이번 주 수업 하나에서 형성평가 3문항을 AI로 만들어 보세요. 요청 예: "○학년 ○○ 단원, 성취기준 [코드], 오개념을 확인하는 선다형 3문항과 해설". 쓰기 전에 교과서와 한 번 대조하세요(15분).', '반복 업무 하나를 AI에 맡겨 보세요. 예: 받은 공문을 붙여 넣고 "기한·제출물·담당 부서만 표로 정리해 줘". 걸린 시간을 메모해 두면 효과를 비교할 수 있습니다.', '학생 자료를 넣을 때는 이름을 학생A·B로 바꾸고 성적·상담 내용은 지운 뒤 넣으세요. 학교생활기록부 문장은 AI가 쓴 문장을 그대로 붙이지 말고 내 관찰 기록에서 시작하세요.'],
    W: ['다음 수행평가 안내문에 "AI 사용: 아이디어만 허용, 사용한 대화 캡처 1장 제출" 같은 한 줄을 넣어 보고, 같은 과제를 맡은 동료에게 같은 기준을 쓰자고 제안하세요.', '과제 하나에 3~5분 구술 확인("이 부분은 왜 이렇게 썼나요?")을 넣어 보세요. 시간이 없으면 무작위 5명만 확인해도 됩니다.', '잘 된 AI 활용 수업은 지도안 전체 대신 "요청문 + 활동지 + 학생 결과물 1개"만 공유 폴더에 올려 보세요. 동료가 바로 따라 할 수 있습니다.']
  };
  var GAP_READ = {
    F: { hi: { why: '나는 우리 학교가 AI 활용 목표·지침·승인 도구·연수를 잘 갖추었다고 보는데, 다른 선생님들은 그렇게 보지 않습니다. 내가 알고 있는 학교 안내를 다른 선생님들은 아직 모르고 있을 수 있어요.',
          act: ['학교 AI 지침과 승인 도구 표가 어디 있는지 업무 메신저로 동료들에게 한 번 공유해 주세요(파일 링크 하나면 충분합니다).', '교원들이 잘 모르는 항목을 교감·부장교사에게 알리고, 교직원 회의 5분 안내나 메신저 공지 고정을 제안하세요.', '들어 본 연수 가운데 쓸모 있던 과정 하나를 동료에게 추천해 주세요.'] },
        lo: { why: '다른 선생님들은 우리 학교에 AI 활용 목표·지침·승인 도구·연수가 있다고 보는데, 나는 그렇게 보지 않습니다. 학교 안내가 있었는데 내가 못 봤거나, 내 학년·교과에는 안내가 오지 않았을 수 있어요.',
          act: ['학교 교육계획서의 디지털·AI 교육 항목과 업무 메신저 공지에서 AI 지침을 찾아 10분만 읽어 보세요.', '쓸 수 있는 AI 도구와 계정 받는 법을 정보부장에게 물어보세요.', '찾아봐도 없다면 부장교사에게 "우리 학년·교과에는 안내가 안 왔다"고 알려 주세요. 그 자체가 학교에 필요한 정보입니다.'] } },
    P: { hi: { why: '나는 다른 선생님들보다 수업 준비와 업무에 AI를 더 자주, 더 꼼꼼하게 쓰고 있습니다. 학교 안에서 앞서 가는 편이에요.',
          act: ['동료와 모이는 자리에서 10분 동안 내가 쓰는 요청문 하나와 결과물을 화면으로 보여 주세요.', '내가 효과를 본 요청문 2~3개를 공유 폴더에 올리고 짧은 사용 메모를 붙여 주세요.', 'AI로 줄어든 시간을 한 달 동안 메모해, 동료와 방법을 나눌 때 근거로 쓰세요.'] },
        lo: { why: '다른 선생님들보다 수업 준비와 업무에 AI를 덜 쓰고 있습니다. 출발이 조금 늦었을 뿐이고, 가장 따라잡기 쉬운 부분이에요.',
          act: ['이번 주 수업 하나에서 형성평가 3문항이나 활동지 1장을 AI로 만들어 보세요(15분). 쓰기 전에 교과서와 대조하세요.', 'AI를 잘 쓰는 동료에게 "실제로 쓰는 화면을 10분만 보여 달라"고 부탁해 보세요.', '공문 요약이나 가정통신문 초안처럼 부담이 적은 업무부터 맡겨 보세요.'] } },
    W: { hi: { why: '나는 가까운 동료들과 AI 활용 기준을 맞추고 방법을 나누는 일이 잘 되고 있다고 보는데, 다른 선생님들은 그만큼은 아니라고 봅니다. 내 주변 동료 모임이 다른 곳보다 앞서 있을 수 있어요.',
          act: ['우리가 쓰는 AI 허용 기준과 과제 안내문을 다른 학년·교과 동료에게 그대로 나눠 주세요.', '함께하는 동료들에게 "우리는 어디까지 맞추고 나누고 있나요?"를 5분만 물어 생각을 맞춰 보세요.', '바꾼 과제의 학생 결과물 2~3개를 모아 두면 학교 확산 때 가장 설득력 있는 자료가 됩니다.'] },
        lo: { why: '다른 선생님들은 동료끼리 AI 활용 기준을 맞추고 방법을 나눈다고 보는데, 나는 그렇게 느끼지 못합니다. 다른 학년·교과에서는 함께하고 있지만, 내 주변에서는 아직 그런 협력이 드물 수 있어요.',
          act: ['같은 과제를 맡은 동료 한 명에게 "다음 수행평가의 AI 사용 기준을 같이 정하자"고 10분만 청해 보세요.', '앞서 있는 다른 학년·교과의 과제 안내문을 빌려 와 우리 과목 문구로만 바꿔 써 보세요.', '동료 한 명과 같은 단원에서 AI 활용 활동 하나를 해 보고 학생 결과물을 비교해 보세요.'] } },
    E: { hi: { why: '나는 좋은 AI 활용 사례가 학교 전체로 퍼지고 있다고 보는데, 다른 선생님들은 그렇게 느끼지 않습니다. 내 주변에서 보이는 공유가 다른 선생님들에게는 보이지 않을 수 있어요.',
          act: ['내가 참여한 학습공동체나 수업 나눔 자료를 다른 학년·교과에서도 볼 수 있게 공유 폴더 위치를 알려 주세요.', '확산이 일부 교원에게만 머무는지 교감·부장교사와 함께 이 진단 결과로 점검해 보세요.', '행정 업무에 쓰는 요청문을 아직 모르는 동료에게 하나만 알려 주세요.'] },
        lo: { why: '다른 선생님들은 학습공동체·수업 나눔·행정 업무의 AI 활용이 학교에 퍼지고 있다고 보는데, 나는 그렇게 느끼지 못합니다. 그런 활동이 있는데 내가 참여하지 못했거나, 내 학년·교과까지는 퍼지지 않았을 수 있어요.',
          act: ['학교에서 운영 중인 학습공동체와 수업 나눔 일정을 확인해, 한 번은 참관해 보세요.', '가정통신문·공문 회신에 쓰는 학교 공통 요청문이 있는지 교무부에 물어보세요.', '우리 학년·교과가 빠져 있다면 부장교사를 통해 학습공동체 참여를 요청하세요.'] } },
    N: { hi: { why: '나는 수업과 업무에서 AI가 자연스럽게 쓰인다고 보는데, 다른 선생님들은 아직 그렇지 않다고 봅니다. 내 수업과 업무에서는 일상이 되었지만, 학교 전체로는 아직일 수 있어요.',
          act: ['내 수업에서 학생이 AI를 학습 도구로 쓰는 장면(과제 안내문과 결과물)을 다른 교원과 나눠 주세요.', 'AI 결과를 참고해 지도할 때 "교사가 최종 판단한 지점"을 기록해 두세요. 학교 지침을 다듬는 근거가 됩니다.', '수업에서 AI 리터러시를 함께 다룬 방법(활동지·질문)을 동료와 나눠 주세요.'] },
        lo: { why: '다른 선생님들은 수업과 업무에서 AI가 자연스럽게 쓰인다고 보는데, 나는 그렇게 느끼지 못합니다. 다른 교실과 업무에서는 이미 쓰이고 있는데, 내 수업과 업무에는 아직 들어오지 않았을 수 있어요.',
          act: ['다른 교원이 수업에서 AI를 쓸 때 리터러시(사실 확인·개인정보 등)를 어떻게 함께 다루는지 물어보세요.', '학생이 AI를 학습 도구로 쓰는 다른 교과 수업을 한 번 참관해 보세요.', '내 수업에서 학생이 쓸 수 있는 승인 도구와 이용 연령 기준을 정보부에 확인해 보세요.'] } }
  };

  // 관리자(교감·교장 또는 부장교사)와 교사의 인식 차이를 겪을 때: 무슨 현상인지, 나는 무엇을 할지, 상대를 어떻게 도울지, 학교가 함께 어떻게 내재화할지.
  // hi = 관리자가 교사보다 높게 봄, lo = 교사가 관리자보다 높게 봄. leadDo/staffDo는 그 입장이 직접 할 행동이면서, 상대 입장에게는 "이렇게 돕자"의 근거가 된다.
  var ROLE_GAP_READ = {
    F: { hi: { phenom: '관리자는 학교가 AI 활용 목표·지침·도구·연수를 갖췄다고 보지만, 교사들은 그렇게 느끼지 못합니다. 흔히 지침이 공문이나 회의에서는 결정됐지만, 교실까지 구체적으로 전달되지 않았을 때 이런 차이가 생깁니다.',
          leadDo: ['이미 정했다고 생각하는 AI 사용 지침·승인 도구 목록을 다시 꺼내, 교사들이 실제로 봤는지 메신저 투표나 손들기로 확인합니다.', '다음 교직원 회의에서 "우리 학교 AI 지침 5분 리마인드" 코너를 만들어 핵심만 다시 안내합니다.', '학년·교과 부장에게 안내가 교실까지 내려갔는지 점검을 맡깁니다.'],
          staffDo: ['학교 교육계획서나 업무 메신저 공지함에서 AI 활용 목표·지침을 직접 찾아봅니다.', '찾아도 없거나 애매하면, 그 사실 자체를 관리자에게 알려 "안내가 교실까지 오지 않았다"는 신호를 줍니다.', '승인된 AI 도구와 연수 신청 방법을 모르면 정보부장에게 직접 물어봅니다.'],
          together: ['학기 초 교직원 연수 때 AI 지침을 다시 설명하고 질문을 받는 15분을 넣습니다.', '지침을 한 장짜리 포스터로 만들어 교무실·교실에 붙여, "공문에만 있는 지침"을 "눈에 보이는 지침"으로 바꿉니다.'] },
        lo: { phenom: '교사들은 학교에 AI 지침과 도구가 있다고 느끼는데, 관리자는 아직 부족하다고 봅니다. 교사 개인이 자발적으로 찾아 쓰는 도구·방법이 앞서 있고, 공식 지침·예산·연수는 뒤따라가지 못한 경우가 흔합니다.',
          leadDo: ['교사들이 이미 쓰고 있는 AI 도구와 방법을 설문이나 메신저로 모아, 공식 지침에 반영할지 검토합니다.', '교사 개인 활용을 학교 공식 지침으로 끌어올리는 TF를 다음 학기 교육계획에 넣습니다.'],
          staffDo: ['내가 효과를 본 AI 활용 방법과 도구를 정리해 관리자에게 직접 제안합니다.', '같은 방법을 쓰는 동료를 모아 "이렇게 공식화해 달라"고 함께 건의합니다.', '아직 지침이 없는 부분(개인정보·저작권 등)은 스스로 보수적으로 쓰며 위험을 줄입니다.'],
          together: ['교사가 앞서 쓰는 사례를 모아 학교 공식 지침 초안을 함께 만듭니다.', '다음 학기 예산·연수 계획에 교사들이 요청한 도구를 반영합니다.'] } },
    P: { hi: { phenom: '관리자는 교사들이 수업과 업무에 AI를 활발히 쓰고 있다고 보는데, 실제 교사들은 그렇게 느끼지 못합니다. 몇몇 적극적인 교사의 사례가 전체처럼 비춰졌거나, "쓰라"는 권장과 "실제로 쓰는 것" 사이에 차이가 있을 수 있습니다.',
          leadDo: ['전체 교사 대상으로 "지난주 AI를 수업·업무에 쓴 적이 있나요?"를 익명으로 짧게 물어, 실제 활용률을 확인합니다.', '활용이 저조하면 "쓰라"는 공지 대신, 실제로 따라 할 수 있는 30분짜리 실습 연수를 마련합니다.'],
          staffDo: ['아직 안 써 봤다면, 이번 주 반복 업무 하나를 골라 AI로 처리해 봅니다.', '시간이 없어 못 쓰고 있다면, 그 이유(연수 부족, 도구 접근성 등)를 관리자에게 구체적으로 전달합니다.'],
          together: ['학년·교과별로 "이번 달 AI 활용 사례 하나" 공유 시간을 정례화합니다.', '활용률을 정기적으로 다시 진단해, 늘었는지 함께 확인합니다.'] },
        lo: { phenom: '교사들은 스스로 AI를 자주 쓴다고 느끼는데, 관리자는 그만큼 체감하지 못합니다. 교사의 개인 활용이 눈에 띄지 않는 방식(개인 업무, 수업 준비)으로 이뤄지고 있어서 관리자에게는 보이지 않을 수 있습니다.',
          leadDo: ['교사들의 AI 활용 사례를 직접 보고받을 자리(짧은 발표, 사례 공유 등)를 만듭니다.', '활용 사례를 수업 공개나 교직원 회의에서 소개하도록 권합니다.'],
          staffDo: ['내가 AI로 줄인 시간이나 개선한 결과를 짧게 기록해 두었다가 관리자에게 보여 줍니다.', '동료 교사와 활용 사례를 나누는 자리를 먼저 제안해 봅니다.'],
          together: ['교사 개인 활용 사례를 모으는 공유 채널(게시판, 폴더)을 만들어 누구나 보이게 합니다.', '우수 사례를 발굴해 학교 성과로 공식 인정합니다.'] } },
    W: { hi: { phenom: '관리자는 동료 교원끼리 AI 활용 기준이 맞춰지고 있다고 보는데, 교사들은 그렇게 느끼지 못합니다. 일부 협의회나 모임에서 논의된 내용이 전체로 퍼지지 않았을 수 있습니다.',
          leadDo: ['학년·교과 협의회에서 AI 활용 기준을 논의했는지, 결과가 공유 폴더에 남아 있는지 확인합니다.', '협의회 안건에 "AI 활용 기준 맞추기"를 정기적으로 넣도록 부장교사에게 요청합니다.'],
          staffDo: ['우리 학년·교과 모임에서 AI 사용 기준을 논의한 적이 있는지 동료에게 물어봅니다.', '없다면 다음 모임에서 짧게라도 기준을 맞춰 보자고 먼저 제안합니다.'],
          together: ['모임마다 "우리는 AI를 이렇게 쓰기로 했다"를 한 줄로 기록해 공유 폴더에 남깁니다.', '학기 말에 각 모임의 기준을 모아 비교해 봅니다.'] },
        lo: { phenom: '교사들은 동료와 AI 활용 기준을 맞추고 방법을 나누고 있다고 느끼는데, 관리자에게는 이런 움직임이 보이지 않습니다. 비공식적인 동료 간 공유가 공식 보고 체계 밖에서 일어나고 있을 수 있습니다.',
          leadDo: ['교사들끼리 이미 나누고 있는 활용법을 공식적으로 들어 보는 자리(짧은 발표회 등)를 마련합니다.', '좋은 방법은 학교 차원의 공유 자산(지도안, 활동지)으로 공식화합니다.'],
          staffDo: ['동료와 나눈 활용법을 간단히 정리해 관리자에게 보여 줍니다.', '효과를 본 방법은 다른 학년·교과에도 알려질 수 있게 공유 폴더에 올립니다.'],
          together: ['동료 간 비공식 공유를 공식 학습공동체 활동으로 인정하고 기록합니다.', '우수 협력 사례를 학교 성과로 외부에도 알립니다.'] } },
    E: { hi: { phenom: '관리자는 좋은 사례가 학교 전체로 퍼지고 있다고 보는데, 교사들은 그렇게 느끼지 못합니다. 일부 부서·학년의 사례가 전체 확산처럼 보고되었을 수 있습니다.',
          leadDo: ['최근 확산했다고 생각하는 사례가 실제로 몇 개 학년·교과에 닿았는지 확인합니다.', '확산 범위가 좁다면, 다음 학습공동체 주제를 그 사례로 정해 넓힙니다.'],
          staffDo: ['우리 학년·교과에 아직 닿지 않은 사례가 있다면, 관리자나 부장교사에게 공유를 요청합니다.', '우리가 가진 좋은 사례도 다른 학년·교과에 전달되도록 자청합니다.'],
          together: ['학기별로 확산된 사례 목록과 "어디까지 퍼졌는지"를 함께 점검합니다.', '확산이 안 된 부서를 찾아 이유를 묻고 지원합니다.'] },
        lo: { phenom: '교사들은 좋은 사례가 학교 전체로 퍼지고 있다고 느끼는데, 관리자는 아직 부족하다고 봅니다. 교사 간 자발적 확산은 있지만, 학교 차원의 공식 지표나 보고 체계로는 아직 잡히지 않고 있을 수 있습니다.',
          leadDo: ['교사들이 느끼는 확산 사례를 직접 들어 보는 설문이나 짧은 인터뷰를 진행합니다.', '확산 현황을 보여 줄 간단한 지표(활용 교사 수, 공유 횟수 등)를 만듭니다.'],
          staffDo: ['내가 보고 들은 확산 사례(다른 학년에서도 쓰더라)를 관리자에게 구체적으로 전달합니다.', '확산을 공식 지표로 남기자고 제안합니다.'],
          together: ['확산 현황을 보여 주는 게시판이나 공유 문서를 만들어 모두가 볼 수 있게 합니다.', '분기별로 확산 지표를 함께 검토합니다.'] } },
    N: { hi: { phenom: '관리자는 수업과 업무에 AI가 자연스럽게 녹아들었다고 보는데, 교사들은 아직 그렇게 느끼지 못합니다. 일부 시범 사례나 상위 보고 자료가 전체 모습처럼 보였을 수 있습니다.',
          leadDo: ['AI가 "자연스럽게 쓰인다"고 판단한 근거가 몇 개 교실의 사례인지 확인합니다.', '아직 AI를 수업·업무에 쓰지 않는 교사들의 어려움을 직접 들어 봅니다.'],
          staffDo: ['내 수업·업무에서 AI가 아직 낯설다면, 구체적으로 어떤 부분이 어려운지 관리자에게 전달합니다.', '다른 교과에서 AI를 자연스럽게 쓰는 수업을 참관해 봅니다.'],
          together: ['모든 교사가 AI를 수업·업무에서 최소 한 가지는 일상적으로 쓰는 "공통 출발선"을 정합니다.', '다음 학기 연수를 "자연스러운 활용"을 목표로 다시 설계합니다.'] },
        lo: { phenom: '교사들은 자기 수업·업무에서 AI가 이미 자연스럽게 쓰인다고 느끼는데, 관리자는 아직 학교 전체로 보기엔 이르다고 봅니다. 개인 차원의 내재화가 학교 차원의 내재화로 아직 이어지지 않았을 수 있습니다.',
          leadDo: ['AI를 자연스럽게 쓰는 교사들의 수업을 공개 수업이나 사례 발표로 끌어올립니다.', '이들의 방법을 학교 표준 절차(지도안 양식, 점검표 등)에 반영합니다.'],
          staffDo: ['내가 자연스럽게 하는 AI 활용을 글이나 짧은 영상으로 기록해 동료·관리자와 나눕니다.', '아직 낯설어하는 동료를 짝지어 돕는 멘토 역할을 자청합니다.'],
          together: ['개인 차원에서 자리 잡은 활용법을 학교 전체의 기본 절차로 공식화합니다.', '다음 진단에서 이 단계 점수가 올랐는지 함께 확인합니다.'] } }
  };
  // 관리자-교사 인식 차이를 '현상 → 나의 행동 → 상대를 돕는 행동 → 함께 내재화할 행동'으로 풀어 보여 준다.
  function roleGapAdvice(st, lead, staff, hi) {
    var R = ROLE_GAP_READ[st.key][hi ? 'hi' : 'lo'];
    var myRole = state.me && state.me.role, iAmLead = myRole === lead.rl, iAmStaff = myRole === staff.rl;
    function col(title, items, mine) {
      return '<div class="axr-rolewho' + (mine ? ' mine' : '') + '"><p class="axr-rolewho-h">' + title + (mine ? ' <span class="axr-metag">나</span>' : '') + '</p><ul class="aidx-list">' +
        items.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>';
    }
    var bridge = (!iAmLead && !iAmStaff && myRole) ? '<p class="aidx-small">' + esc(myRole) + '로서 두 쪽을 잇는 다리 역할을 할 수 있어요. 아래에서 한쪽씩 골라 전해 보세요.</p>' : '';
    return '<div class="axr-rolegap"><p><strong>무슨 현상인가요?</strong> ' + R.phenom + '</p>' + bridge +
      '<div class="axr-rolewhos">' + col(esc(josa(lead.rl, '이', '가')) + ' 할 일', R.leadDo, iAmLead) + col('교사가 할 일', R.staffDo, iAmStaff) + '</div>' +
      '<p class="axr-together"><strong>우리 학교가 함께 내재화하려면</strong></p><ul class="aidx-list">' + R.together.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></div>';
  }

  // ---------- 상태 ----------
  var state = { view: 'home', page: -1, answers: {}, role: '', job: '', freq: '', org: '', started: 0, tab: 'me', me: null, pool: null, peers: null };

  // ---------- 유틸 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cleanGroup(g) { return String(g || '').trim().replace(/[^\w가-힣-]/g, '').slice(0, 40); }
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function variance(a) { var m = mean(a); return a.length > 1 ? a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1) : 0; }
  function sd(a) { return Math.sqrt(variance(a)); }
  function r0(v) { return Math.round(v); }
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function signed(v) { var r = Math.round(v); return (r > 0 ? '+' : r < 0 ? '−' : '±') + Math.abs(r); }
  function level(v) { for (var i = 0; i < LEVELS.length; i++) if (v >= LEVELS[i].min) return LEVELS[i].t; return '시작'; }
  function lvlCls(t) { return { '주도': 'l4', '정착': 'l3', '형성': 'l2', '시작': 'l1' }[t]; }
  function nn(a) { return a.filter(function (v) { return v !== null; }); }
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장 불가 환경 */ } }
  function newId() {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(8), s = '';
    (window.crypto || window.msCrypto).getRandomValues(b);
    for (var i = 0; i < 8; i++) s += A[b[i] % A.length];
    return s;
  }
  function fmtId(id) { return id.slice(0, 4) + '-' + id.slice(4); }
  function josa(w, a, b) { var c = w.charCodeAt(w.length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); }
  function copyBtn(id, small) { return '<button type="button" class="aidx-copy' + (small ? ' small' : '') + '" data-act="copycode" data-code="' + fmtId(id) + '">복사</button>'; }
  // 비교 집단 이름: 학교 이름이 있으면 같은 학교, 없으면 링크의 그룹, 둘 다 없으면 전체
  function groupLabel(P) { return P.org ? '우리 학교 ' + P.org : P.group ? '학교(그룹) ' + P.group : '전체 응답자'; }
  // 같은 학교 판단: 띄어쓰기·대소문자·문장부호 차이는 같은 학교로 본다(apps-script.gs의 normOrg_와 같은 규칙).
  function normOrg(s) { return String(s || '').toLowerCase().replace(/[\s.,·()\[\]'"-]/g, ''); }
  function stageTitle(k) { return k ? STAGE_NAMES[k] + '까지 준비됐어요!' : '아직 1단계부터 준비가 필요해요'; }
  function sc(v) { return v === null ? '–' : r0(v); }

  // ---------- 점수 ----------
  // 단계 점수 0~100 = (응답한 문항 평균 − 1) × 25. '모르겠다'(0)는 빼고, 4문항 이상 응답해야 산출.
  function itemsScore(vals) {
    var ok = vals.filter(function (v) { return v > 0; });
    return ok.length >= Math.min(MIN_ITEMS, vals.length) ? (mean(ok) - 1) * 25 : null;
  }
  // 누적 규칙: 1단계부터 차례로 기준점(60) 이상인 단계까지를 '준비된 단계'로 본다. 판단 보류(null)에서 멈춘다.
  function stageOf(lv) {
    var k = 0;
    while (k < lv.length && lv[k] !== null && lv[k] >= CUT) k++;
    return k;
  }
  function score(a) {
    var lv = STAGES.map(function (_, s) { return itemsScore(a.slice(s * K, s * K + K)); });
    var unk = STAGES.map(function (_, s) { return a.slice(s * K, s * K + K).filter(function (v) { return v === 0; }).length; });
    return { lv: lv, unk: unk, stage: stageOf(lv), g: itemsScore(a.slice(NS)), a: a };
  }

  // ---------- 데이터 ----------
  function call(url, opts) {
    var ctl = window.AbortController ? new AbortController() : null, o = opts || {};
    if (ctl) { o.signal = ctl.signal; setTimeout(function () { ctl.abort(); }, 25000); }
    return fetch(url, o).then(function (r) { return r.json(); });
  }
  function localRows() { return load(LS_DATA) || []; }
  function submit(rec) {
    if (PREVIEW) { var rows = localRows(); rows.push(rec); save(LS_DATA, rows); return Promise.resolve(); }
    return call(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(rec) })
      .then(function (j) { if (!j.ok && j.error !== 'duplicate') throw new Error(j.error || '저장 실패'); });
  }
  // org가 있으면 같은 학교 응답만, 없으면 group(비면 전체).
  function fetchPool(group, me, org) {
    if (PREVIEW) {
      var rows = localRows().filter(function (r) { return org ? normOrg(r.org) === normOrg(org) : !group || (r.group || '') === group; }).map(function (r) {
        return { role: r.role, job: r.job || '', freq: r.freq || '', g: r.group || '', a: r.answers, mine: !!(me && r.id === me.id) };
      });
      return Promise.resolve(withMine(rows, me));
    }
    var u = ENDPOINT + '?action=all' + (org ? '&org=' + encodeURIComponent(org) : '&group=' + encodeURIComponent(group)) + (me ? '&me=' + encodeURIComponent(me.id) : '');
    return call(u).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return withMine(j.rows.map(function (r) { return { role: r.role, job: r.j || '', freq: r.f || '', g: r.g || '', a: r.a, mine: !!r.m }; }), me);
    });
  }
  function withMine(rows, me) {
    if (me && !rows.some(function (r) { return r.mine; })) rows.push({ role: me.role, job: me.job || '', freq: me.freq || '', g: me.group || '', a: me.answers, mine: true });
    return rows;
  }
  // 같은 학교급의 다른 학교 응답. 학교 이름 대신 학교 번호(s)만 받는다.
  function fetchPeers(job, org) {
    if (PREVIEW) {
      var ids = {}, k = 0;
      return Promise.resolve(localRows().filter(function (r) { var o = normOrg(r.org); return r.job === job && o && o !== normOrg(org); }).map(function (r) {
        var o = normOrg(r.org); if (!(o in ids)) ids[o] = ++k;
        return { role: r.role, job: r.job, freq: r.freq || '', a: r.answers, s: ids[o] };
      }));
    }
    return call(ENDPOINT + '?action=peers&job=' + encodeURIComponent(job) + '&org=' + encodeURIComponent(org)).then(function (j) {
      if (!j.ok) throw new Error(j.error || '불러오기 실패');
      return j.rows.map(function (r) { return { role: r.role, job: r.j || '', freq: r.f || '', a: r.a, s: r.s }; });
    });
  }
  function fetchOne(id) {
    if (PREVIEW) return Promise.resolve(localRows().filter(function (r) { return r.id === id; })[0] || null);
    return call(ENDPOINT + '?action=one&id=' + encodeURIComponent(id))
      .then(function (j) { return j.ok && j.row ? { id: j.row.id, group: j.row.group, role: j.row.role, job: j.row.j || '', freq: j.row.f || '', org: j.row.org || '', answers: j.row.a } : null; });
  }

  // ---------- 학교(집단) 집계 ----------
  function aggregate(rows) {
    var lvMean = STAGES.map(function (_, s) { var v = nn(rows.map(function (r) { return r.lv[s]; })); return v.length ? mean(v) : null; });
    var lvSd = STAGES.map(function (_, s) { return sd(nn(rows.map(function (r) { return r.lv[s]; }))); });
    var unkPct = STAGES.map(function (_, s) {
      var tot = 0, u = 0;
      rows.forEach(function (r) { for (var i = s * K; i < s * K + K; i++) { tot++; if (r.a[i] === 0) u++; } });
      return tot ? u / tot * 100 : 0;
    });
    var ready = STAGES.map(function (_, s) {
      var v = nn(rows.map(function (r) { return r.lv[s]; }));
      return v.length ? v.filter(function (x) { return x >= CUT; }).length / v.length * 100 : 0;
    });
    return { lvMean: lvMean, lvSd: lvSd, unkPct: unkPct, ready: ready, stage: stageOf(lvMean) };
  }
  // 집단 내 합의도 rwg(j): 균등분포 기대분산(5점 척도 = 2)과 문항 분산 평균을 비교. '모르겠다'는 뺀다.
  function rwgj(rows, from, to) {
    var J = to - from, vars = [];
    for (var i = from; i < to; i++) {
      var v = rows.map(function (r) { return r.a[i]; }).filter(function (x) { return x > 0; });
      if (v.length >= 2) vars.push(variance(v));
    }
    if (vars.length < J) return null;
    var ratio = mean(vars) / 2, k = J * (1 - ratio);
    if (ratio >= 1) return 0;
    return k / (k + ratio);
  }
  function alpha(rows, from, to) {
    var full = rows.filter(function (r) { return r.a.slice(from, to).every(function (v) { return v > 0; }); });
    if (full.length < 10) return null;
    var k = to - from, iv = 0;
    for (var i = from; i < to; i++) iv += variance(full.map(function (r) { return r.a[i]; }));
    var tv = variance(full.map(function (r) { return r.a.slice(from, to).reduce(function (s, v) { return s + v; }, 0); }));
    return tv > 0 ? k / (k - 1) * (1 - iv / tv) : null;
  }
  // 단계 순서 일치율: 다섯 단계 점수가 모두 있는 응답자 중, 앞 단계를 넘지 못했는데 뒤 단계를 넘은 경우가 없는 비율.
  function orderFit(rows) {
    var full = rows.filter(function (r) { return r.lv.every(function (v) { return v !== null; }); });
    if (full.length < 10) return null;
    var ok = full.filter(function (r) {
      var pass = r.lv.map(function (v) { return v >= CUT; });
      for (var j = 1; j < 5; j++) if (pass[j] && !pass[j - 1]) return false;
      return true;
    }).length;
    return { pct: ok / full.length * 100, n: full.length };
  }
  function pearson(x, y) {
    var mx = mean(x), my = mean(y), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
    return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
  }

  // ---------- 그림 ----------
  // 계단 그림: 다섯 단계를 왼쪽 아래에서 오른쪽 위로 쌓고, 준비된 단계까지 색을 채운다.
  function stairs(stage, label) {
    var W = 560, H = 236, sw = 100, sh = 30, x0 = 30, y0 = H - 22;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="axr-stairs" role="img" aria-label="' + esc(label) + '">';
    STAGES.forEach(function (st, i) {
      var x = x0 + i * sw, h = sh * (i + 1), y = y0 - h, on = i < stage, next = i === stage;
      s += '<rect x="' + x + '" y="' + y + '" width="' + (sw - 6) + '" height="' + h + '" rx="6" class="axr-step' + (on ? ' on' : next ? ' next' : '') + '"/>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 26) + '" text-anchor="middle" class="axr-snum">' + (i + 1) + '단계</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y - 9) + '" text-anchor="middle" class="axr-sname">' + st.name + '</text>';
      s += '<text x="' + (x + (sw - 6) / 2) + '" y="' + (y0 - 10) + '" text-anchor="middle" class="axr-sicon">' + st.icon + '</text>';
    });
    s += '<line x1="' + (x0 - 10) + '" y1="' + y0 + '" x2="' + (x0 + 5 * sw) + '" y2="' + y0 + '" class="axr-base"/>';
    return s + '</svg>';
  }
  // 단계별 막대: 내 점수(또는 학교 평균) 막대 + 비교 눈금 + 기준점 점선
  // 누적 판정에 맞춰, 병목 단계 뒤에서 60점을 넘은 단계는 '준비됨' 대신 '기준 넘음 · 판정 보류'로 표시한다.
  function stageBars(vals, cmp, cmpLabel, marks) {
    var bott = stageOf(vals);
    return '<div class="aidx-rank axr-bars">' + STAGES.map(function (st, i) {
      var v = vals[i], held = v !== null && v >= CUT && i > bott, st2 = v === null ? '' : held ? 'held' : v >= CUT ? 'good' : 'warn';
      return '<div class="aidx-rrow ' + st2 + '"><span class="aidx-rname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="aidx-rtrack">' + (v === null ? '' : '<span class="aidx-rbar" style="width:' + v + '%"></span>') +
        '<i class="aidx-rcut" style="left:' + CUT + '%"></i>' +
        (cmp && cmp[i] !== null ? '<i class="aidx-rmean" style="left:' + cmp[i] + '%" data-tip="' + esc(cmpLabel + ' ' + r0(cmp[i]) + '점') + '"></i>' : '') + '</span>' +
        '<span class="aidx-rval">' + sc(v) + '</span>' +
        '<span class="aidx-rtag"' + (held ? ' title="' + (bott + 1) + '단계가 60점에 못 미쳐, ' + (bott + 1) + '단계의 준비 상황을 먼저 확인한 뒤 판단합니다."' : '') + '>' + (held ? '판정 보류' : marks && marks[i] ? marks[i] : v === null ? '판단 보류' : v >= CUT ? '준비된 편' : '보완 필요') + '</span></div>';
    }).join('') + '</div>';
  }
  // 병목 단계보다 뒤 단계가 10점 이상 높으면 '확인해야 할 사항'으로 짚는다:
  // 병목 단계의 준비 상황을 더 꼼꼼히 확인하고(아래 제언), 앞선 뒤 단계에서 무엇이 실제로 적용되지 못하는지 확인하게 한다.
  var PLAN_HEAD = {
    F: '우리 학교의 기반을 어떻게 마련할 수 있는지 먼저 고민해 보세요!',
    P: '교원이 수업과 업무에 AI를 어떻게 쓰게 할 수 있는지 먼저 고민해 보세요!',
    W: '동료 교원과 어떻게 함께 맞추고 나눌 수 있는지 먼저 고민해 보세요!',
    E: '학교에 어떻게 확산할 수 있는지 먼저 고민해 보세요!',
    N: 'AI를 수업과 업무, 학교생활 전반에 어떻게 자연스럽게 녹여 낼 수 있는지 먼저 고민해 보세요!'
  };
  var AHEAD_CHECK = {
    P: '학교의 목표·지침·연수가 뒷받침하지 않는 가운데 교원이 각자 쓰고 있는 방법은 무엇인지',
    W: '동료끼리 맞추고 나누고 있지만 교원 개인의 활용이나 학교의 뒷받침이 따라오지 못하는 것은 무엇인지',
    E: '학교 안에 공유는 되고 있지만 실제 수업과 업무로 이어지지 않는 것은 무엇인지',
    N: '제도는 있으나 우리가 적용하지 못하는 것들이 무엇인지'
  };
  function orderNote(vals, who, subj) {
    var b = stageOf(vals);
    if (b >= 4 || vals[b] === null) return '';
    var ahead = [];
    for (var j = b + 1; j < 5; j++) if (vals[j] !== null && vals[j] >= vals[b] + GAP_NOTE) ahead.push(j);
    if (!ahead.length) return '';
    var bn = (b + 1) + '단계 ' + STAGES[b].name;
    return '<div class="aidx-note axr-order"><p><strong>확인해야 할 사항:</strong> ' + who + ' ' +
      ahead.map(function (j) { return (j + 1) + '단계 ' + STAGES[j].name + '(' + sc(vals[j]) + '점)'; }).join(', ') + josa(STAGES[ahead[ahead.length - 1]].name, '이', '가').slice(-1) +
      ' ' + bn + '(' + sc(vals[b]) + '점)보다 높습니다.</p>' +
      '<p>' + (subj || '우리 학교') + '의 ' + bn + ' 준비 상황을 더 꼼꼼하게 확인하고, 무엇을 해야 하는지 아래 제언에서 확인해 보세요.</p>' +
      ahead.map(function (j) { return '<p>그리고 ' + josa(STAGES[j].name, '과', '와') + ' 관련해서, ' + AHEAD_CHECK[STAGES[j].key] + ' 확인해 보세요.</p>'; }).join('') + '</div>';
  }
  // 점수 옆 수준 이름(시작·형성·정착·주도)이 무엇인지 표 위에 알려 준다. 준비 '단계'(1~5단계)와는 다른 구분이다.
  function levelLegend() {
    return '<div class="axr-lvlegend"><p><b>점수 옆 이름은 "수준"입니다.</b> 1~5단계(기반 마련 … AI 내재화)와는 다른 구분으로, 그 단계를 얼마나 갖추었다고 보았는지를 네 가지로 나눈 것입니다.</p><ul>' +
      '<li><span class="aidx-lv l1">시작</span> 0~39점 · 대체로 "그렇지 않다" 이하로 답함 · 아직 거의 갖추지 못함</li>' +
      '<li><span class="aidx-lv l2">형성</span> 40~59점 · "보통이다" 언저리 · 갖추기 시작했지만 아직 부족</li>' +
      '<li><span class="aidx-lv l3">정착</span> 60~79점 · "그렇다" 수준 · 갖추어짐(준비 기준 60점 이상)</li>' +
      '<li><span class="aidx-lv l4">주도</span> 80~100점 · "매우 그렇다" 수준 · 잘 갖추어져 다른 곳에 나눌 만함</li></ul></div>';
  }
  function kpi(k, v, s) { return '<div class="kpi"><span class="kpi-k">' + k + '</span><span class="kpi-v">' + v + '</span>' + (s ? '<span class="kpi-s">' + s + '</span>' : '') + '</div>'; }
  function lvlChip(v) { if (v === null) return ''; var t = level(v); return '<span class="aidx-lv ' + lvlCls(t) + '">' + t + '</span>'; }

  // ---------- 화면: 대문 ----------
  function previewNote() {
    return PREVIEW ? '<p class="aidx-preview">시험 모드: 응답 저장소가 아직 연결되지 않아, 응답이 이 브라우저에만 저장됩니다.</p>' : '';
  }
  function viewHome() {
    var me = load(LS_ME);
    root.innerHTML = previewNote() +
      '<section class="aidx-home">' +
      '<p class="aidx-lead">우리 학교는 AI를 전제로 가르치고 배우는 학교로 바뀔 준비가 얼마나 되어 있을까요?<br>기반 마련에서 AI 내재화까지, 다섯 단계로 학교 AIX 준비 성숙도를 진단합니다.</p>' +
      '<ul class="aidx-meta"><li class="beta">BETA</li><li>32문항</li><li>약 7분</li><li>익명</li></ul>' +
      (GROUP ? '<p class="aidx-group">응답 학교(그룹) <strong>' + esc(GROUP) + '</strong></p>' : '') +
      '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button></div>' +
      '<div class="aidx-actions sub">' +
      '<button type="button" class="aidx-btn" data-act="my">내가 본 우리 학교 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="compare">응답자 구분별 비교 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="peers">타 학교(학교급) 비교 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="group">우리 학교 종합 결과 보기</button>' +
      '<button type="button" class="aidx-btn" data-act="all">전체 응답학교 종합결과 보기</button></div>' +
      (me ? '<p class="aidx-small">이 기기에 저장된 내 결과 코드: <code>' + fmtId(me.id) + '</code> ' + copyBtn(me.id, true) + '</p>' : '') +
      '<div class="aidx-gate" id="axr-gate" role="alert" hidden><p><strong id="axr-gate-msg"></strong></p>' +
      '<button type="button" class="aidx-link" data-act="code">다른 기기에서 이미 응답했다면 결과 코드 입력</button></div>' +
      '<form class="aidx-code" id="axr-code" hidden><label for="axr-code-in">결과 코드</label>' +
      '<input id="axr-code-in" autocomplete="off" placeholder="XXXX-XXXX" maxlength="9">' +
      '<button type="submit" class="aidx-btn">결과 보기</button><span class="aidx-err" id="axr-code-err"></span></form>' +
      '</section>' +
      '<section class="aidx-model"><h2 class="aidx-h">무엇을 진단하나요</h2>' +
      '<p><strong>학교 AIX(AI 전환)</strong>는 AI 도구를 들여오는 데서 끝나지 않고, 교원의 수업 준비부터 수업과 평가, 학생의 배움과 학교 운영까지 AI를 전제로 다시 짜는 일입니다. ' +
      '이 진단은 학교·교육청용 AI 성숙도 모델(CoSN, SELFIE 등)이 공통으로 제시하는 <strong>기반 마련 → 교원 활용 → 공동 실천 → 학교 확산 → AI 내재화</strong>의 순서로, 준비가 어디까지 갖추어졌는지 봅니다.</p>' +
      '<ol class="aidx-flow">' + STAGES.map(function (st, i) {
        return '<li><span class="aidx-when"><b>' + (i + 1) + '</b>' + st.ref.replace(/는$/, '') + '</span>' +
          '<span class="aidx-ficon" aria-hidden="true">' + st.icon + '</span>' +
          '<strong class="aidx-fname">' + st.name + '</strong>' +
          '<span class="aidx-fq">' + st.q + '</span>' +
          '<span class="aidx-fex">예) ' + st.ex + '</span></li>';
      }).join('') + '</ol>' +
      '<p class="aidx-fsum"><span>단계별 6문항 → 30문항</span><span>+ 전반 인식 2문항</span><span>= 32문항</span></p>' +
      '<p class="aidx-small">앞 단계가 갖추어져야 다음 단계가 제대로 작동한다고 보고, 1단계부터 차례로 기준(60점)을 넘은 단계까지를 "준비된 단계"로 판정합니다.</p></section>';
  }

  // ---------- 화면: 설문 ----------
  function answered() { return Object.keys(state.answers).length; }
  function bgDone() { return BG.filter(function (b) { return state[b.key]; }).length; }
  function viewSurvey() {
    var p = state.page, h = '';
    var done = answered() + bgDone(), total = NI + BG.length;
    h += '<div class="aidx-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + done + '"><span style="width:' + (done / total * 100) + '%"></span></div>';
    h += '<p class="aidx-step">' + (p + 2) + ' / ' + (PAGES.length + 1) + '</p>';
    if (p === -1) {
      h += '<h2 class="aidx-h">응답하기 전에</h2>' +
        '<ol class="aidx-guide">' +
        '<li><span class="aidx-gicon" aria-hidden="true">📍</span><strong>지금 상태를 떠올리세요</strong><span>앞으로의 계획이 아니라, 최근 6개월 동안 직접 경험하거나 확인한 사실을 기준으로</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🔁</span><strong>주어가 바뀝니다</strong><span>우리 학교 → 나 → 나와 동료 교원 → 우리 학교 순서로, 쪽마다 문장의 주어가 다릅니다</span></li>' +
        '<li><span class="aidx-gicon" aria-hidden="true">🤷</span><strong>모르면 "잘 모르겠다"</strong><span>학교 전체에 관한 문항은 잘 모르면 짐작하지 말고 "잘 모르겠다"를 고르세요</span></li>' +
        '</ol>' +
        BG.map(function (b) {
          return '<fieldset class="aidx-role" id="bg-' + b.key + '"><legend>' + b.label + '</legend><div class="aidx-roles">' +
            b.opts.map(function (r) { return '<label><input type="radio" name="' + b.key + '" value="' + r + '"' + (state[b.key] === r ? ' checked' : '') + '><span>' + r + '</span></label>'; }).join('') +
            '</div></fieldset>' +
            // 학교급 바로 아래에 학교 이름(필수)
            (b.key === 'job' ? '<div class="aidx-org"><label for="axr-org-in">학교 이름</label>' +
              '<input id="axr-org-in" name="org" maxlength="40" autocomplete="organization" value="' + esc(state.org) + '">' +
              '<p class="aidx-hint">예) 대한초등학교 / 대한중학교 / 대한고등학교</p></div>' : '');
        }).join('');
    } else {
      var items = PAGES[p], st = STAGES[p];
      h += '<h2 class="aidx-h">' + (st ? (p + 1) + '단계 · ' + st.name : '전반 인식') + '</h2>' +
        '<p class="axr-pagehead">' + PAGE_HEAD[p] + ' 각 문장이 <strong>현재 상태</strong>와 얼마나 같은가요?</p>';
      var before = PAGES.slice(0, p).reduce(function (s, x) { return s + x.length; }, 0);
      h += '<ol class="aidx-items">' + items.map(function (it, j) {
        return '<li class="aidx-item" id="q-' + it.code + '"><p class="aidx-q"><span class="aidx-no">' + (before + j + 1) + '</span>' + esc(it.text) + '</p>' +
          '<div class="aidx-scale' + (it.unk ? ' axr-has-unk' : '') + '"><span class="aidx-end">' + SCALE[0] + '</span><div class="aidx-dots" role="radiogroup" aria-label="' + esc(it.text) + '">' + SCALE.map(function (lab, v) {
            return '<label title="' + lab + '"><input type="radio" name="' + it.code + '" value="' + (v + 1) + '" aria-label="' + (v + 1) + ' ' + lab + '"' + (state.answers[it.code] === v + 1 ? ' checked' : '') + '><span>' + (v + 1) + '</span></label>';
          }).join('') + '</div><span class="aidx-end">' + SCALE[4] + '</span>' +
          (it.unk ? '<label class="axr-unk"><input type="radio" name="' + it.code + '" value="0"' + (state.answers[it.code] === 0 ? ' checked' : '') + '><span>' + UNK + '</span></label>' : '') +
          '</div></li>';
      }).join('') + '</ol>';
    }
    var last = p === PAGES.length - 1;
    h += '<div class="aidx-nav"><button type="button" class="aidx-btn" data-act="prev">' + (p === -1 ? '처음으로' : '이전') + '</button>' +
      '<span class="aidx-err" id="axr-err"></span>' +
      '<button type="button" class="aidx-btn primary" data-act="next">' + (last ? '응답 제출' : '다음') + '</button></div>';
    root.innerHTML = previewNote() + '<section class="aidx-survey">' + h + '</section>';
  }
  function pageComplete() {
    if (state.page === -1) {
      // 화면 순서대로 확인: 직위 → 학교급 → 학교 이름 → AI 사용 빈도
      for (var i = 0; i < BG.length; i++) {
        if (!state[BG[i].key]) return 'bg:' + BG[i].label;
        if (BG[i].key === 'job' && !state.org.trim()) return 'org';
      }
      return null;
    }
    var miss = PAGES[state.page].filter(function (it) { return state.answers[it.code] === undefined; });
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
  function viewAnalyzing(msg) { root.innerHTML = '<section class="aidx-home"><div class="aidx-spin" aria-hidden="true"></div><p>' + esc(msg) + '</p></section>'; }
  function viewError(msg) {
    root.innerHTML = '<section class="aidx-home"><p class="aidx-err">' + esc(msg) + '</p><div class="aidx-actions"><button type="button" class="aidx-btn" data-act="home">처음으로</button></div></section>';
  }

  // ---------- 분석 실행 ----------
  function scored(r) { var s = score(r.a); s.role = r.role; s.job = r.job; s.freq = r.freq; s.g0 = r.g || ''; s.mine = r.mine; s.s = r.s; return s; }
  // 우리 학교 = 나와 같은 학교 이름으로 응답한 사람들(학교 이름이 없는 응답은 링크의 그룹). 같은 학교급의 다른 학교 응답도 함께 불러온다.
  function analyze(tab) {
    state.tab = tab;
    var me = state.me, org = me && normOrg(me.org) ? me.org : '', group = org ? '' : me ? (me.group || '') : GROUP;
    viewAnalyzing(tab === 'me' ? '응답을 분석하고 있습니다' : '학교 응답을 모으고 있습니다');
    var t0 = Date.now();
    // 다른 학교 응답은 학교급마다 받아 합친다. 학교 번호(s)는 학교급마다 따로 매겨지므로 앞에 학교급을 붙여 구분한다.
    var peersP = org ? Promise.all(JOBS.map(function (j) { return fetchPeers(j, org).then(function (rs) { rs.forEach(function (r) { r.s = j + ':' + r.s; }); return rs; }); }))
      .then(function (lists) { return [].concat.apply([], lists); }) : Promise.resolve([]);
    // 저장소에서 내 응답이 지워졌으면(관리자 정리 등) 이 기기에 남은 사본도 지우고 처음으로 돌아간다.
    var stillP = !PREVIEW && me ? fetchOne(me.id).catch(function () { return true; }) : Promise.resolve(true);
    Promise.all([fetchPool(group, me, org), peersP, stillP]).then(function (res) {
      if (!res[2]) {
        try { localStorage.removeItem(LS_ME); } catch (e) { /* 저장 불가 환경 */ }
        state.me = null; state.pool = null;
        root.innerHTML = '<section class="aidx-home"><p class="aidx-lead">이 기기에 저장된 내 응답(결과 코드 ' + fmtId(me.id) + ')이 응답 저장소에서 삭제되었습니다.</p>' +
          '<p>저장소가 정리되었거나 응답이 지워진 경우입니다. 결과를 보려면 다시 진단에 응답해 주세요.</p>' +
          '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="home">처음으로</button></div></section>';
        return;
      }
      state.pool = { group: group, org: org, rows: res[0].map(scored) };
      state.peers = res[1].map(scored);
      setTimeout(viewResult, Math.max(0, 700 - (Date.now() - t0)));
    }).catch(function () { viewError('응답을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.'); });
  }

  // ---------- 화면: 결과 ----------
  function tabLabel(full, short) { return '<span class="aidx-tl">' + full + '</span><span class="aidx-ts">' + short + '</span>'; }
  // 결과 탭: 내 응답 → 우리 학교 구성원별 → 같은 학교급 다른 학교 → 우리 학교 전체 → 응답한 모든 학교
  var RESULT_TABS = [['me', '내가 본 우리 학교', '나의 응답'], ['compare', '응답자 구분별 비교', '구분별'], ['peers', '타 학교(학교급) 비교', '타 학교'],
    ['group', '우리 학교 종합 결과', '우리 학교'], ['all', '전체 응답학교 종합결과', '전체 학교']];
  function viewResult() {
    root.innerHTML = previewNote() + window.DiagnosisPdf.toolbar() +
      '<div class="aidx-tabs aidx-tabs5" role="tablist">' +
      RESULT_TABS.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (state.tab === t[0]) + '">' + tabLabel(t[1], t[2]) + '</button>'; }).join('') + '</div>' +
      '<div role="tabpanel">' + ({ me: personal, compare: compareReport, peers: peerReport, group: function () { return companyReport(); }, all: allReport }[state.tab] || personal)() + '</div>' +
      '<p class="report-foot aidx-foot"><strong>BETA 버전</strong>입니다. 준비 기준점(60점)과 단계 순서는 타당화 전의 잠정 기준이며, 단계는 교원 인식을 바탕으로 한 추정입니다. 공식 성숙도 판정에는 문서·지표 같은 증거 확인을 함께 쓰세요. 점수 = (응답한 문항 평균 − 1) × 25, 0~100점, "잘 모르겠다"는 점수에서 제외. ' +
      '<button type="button" class="aidx-link" data-act="home">처음으로</button></p>';
    window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 });
  }

  // 나와 다른 응답자 비교: 단계별 차이(나 − 다른 응답자 평균), 표준화 차이, 차이가 가장 큰 단계와 문항
  function gapLabel(d) {
    if (d === null) return '–';
    var a = Math.abs(d);
    return a < GAP_NOTE ? '비슷함' : (d > 0 ? (a >= GAP_BIG ? '크게 높게 봄' : '높게 봄') : (a >= GAP_BIG ? '크게 낮게 봄' : '낮게 봄'));
  }
  // 단계마다 '나'와 비교 대상(동료 평균 등)의 점수를 두 줄 막대로 나란히 놓고, 차이를 문장으로 풀어 준다.
  function pairBars(mine, other, otherName, mineName) {
    mineName = mineName || '나';
    return '<div class="axr-pair">' + STAGES.map(function (st, i) {
      var a = mine[i], b = other[i], d = a === null || b === null ? null : a - b;
      var cls = d === null ? '' : Math.abs(d) < GAP_NOTE ? 'same' : d > 0 ? 'hi' : 'lo';
      var say = d === null ? '비교할 수 없음' : Math.abs(d) < GAP_NOTE ? '비슷하게 봐요' : otherName + '보다 ' + r0(Math.abs(d)) + '점 ' + (d > 0 ? '높게' : '낮게') + ' 봐요';
      return '<div class="axr-prow ' + cls + '"><span class="axr-pname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="axr-ptracks"><i class="axr-pcut" style="left:' + CUT + '%"></i>' +
        '<span class="axr-ptrack me"><span style="width:' + (a || 0) + '%"></span><b>' + sc(a) + '</b></span>' +
        '<span class="axr-ptrack ot"><span style="width:' + (b || 0) + '%"></span><b>' + sc(b) + '</b></span></span>' +
        '<span class="axr-psay">' + say + '</span></div>';
    }).join('') + '<p class="axr-plegend"><span class="me"></span>' + mineName + ' <span class="ot"></span>' + otherName + ' 평균 · 막대가 길수록 그 단계가 잘 갖추어졌다고 본 것 · 점선은 준비 기준 60점</p></div>';
  }
  function gapBars(diffs) {
    var R = 50; // 막대 끝 = ±50점
    return '<div class="axr-div">' + STAGES.map(function (st, i) {
      var d = diffs[i], w = d === null ? 0 : Math.min(Math.abs(d), R) / R * 50;
      var cls = d === null ? '' : Math.abs(d) < GAP_NOTE ? 'same' : d > 0 ? 'hi' : 'lo';
      return '<div class="axr-drow ' + cls + '"><span class="axr-dname">' + (i + 1) + '. ' + st.name + '</span>' +
        '<span class="axr-dtrack"><i class="axr-dzero"></i>' + (d === null ? '' : '<span class="axr-dbar" style="' + (d >= 0 ? 'left:50%' : 'right:50%') + ';width:' + w + '%" data-tip="' + esc(st.name + ' · 나 − 다른 응답자 = ' + signed(d) + '점') + '"></span>') + '</span>' +
        '<span class="axr-dval">' + (d === null ? '–' : signed(d)) + '</span><span class="axr-dtag">' + gapLabel(d) + '</span></div>';
    }).join('') + '<div class="axr-drow axr-daxis"><span></span><span class="axr-daxis-in"><i>← 내가 더 낮게 봄</i><i>0</i><i>내가 더 높게 봄 →</i></span><span></span><span></span></div></div>';
  }
  function itemMeanOf(rows, idx) { var v = rows.map(function (r) { return r.a[idx]; }).filter(function (x) { return x > 0; }); return v.length ? mean(v) : null; }

  // ---------- 종합 결과: 나의 준비도 → 우리 학교 준비도 → 나와 학교의 차이 → 행동 조언 → 같은 학교급 다른 학교와 비교 → 학교 행동 조언 ----------
  // 점수가 있는 단계를 높은 순으로 정렬해 강점 2개, 약점 2개를 고른다(단계가 적으면 겹치지 않게 줄인다).
  function strongWeak(lv) {
    var o = lv.map(function (v, s) { return { v: v, s: s }; }).filter(function (x) { return x.v !== null; }).sort(function (a, b) { return b.v - a.v; });
    return { strong: o.slice(0, 2), weak: o.slice(Math.max(2, o.length - 2)).reverse() };
  }
  // 한 단계 안에서 값이 가장 높은(또는 낮은) 문항. valOf(idx)가 null이면 뺀다.
  function pickItem(s, valOf, low) {
    var c = ITEMS.slice(s * K, s * K + K).map(function (it) { return { it: it, v: valOf(it.idx) }; }).filter(function (x) { return x.v !== null && x.v > 0; });
    c.sort(function (a, b) { return low ? a.v - b.v : b.v - a.v; });
    return c[0] || null;
  }
  function swPanel(title, sub, sw, valOf, scale) {
    function li(x, low) {
      var p = pickItem(x.s, valOf, low);
      return '<li><strong>' + STAGES[x.s].icon + ' ' + (x.s + 1) + '단계 ' + STAGES[x.s].name + '</strong> <span class="aidx-muted">' + r0(x.v) + '점</span> ' + lvlChip(x.v) +
        (p ? '<br><span class="aidx-muted">' + (low ? '가장 낮은 문항: ' : '가장 높은 문항: ') + esc(p.it.text) + ' (' + (scale ? f1(p.v) : p.v) + ')</span>' : '') + '</li>';
    }
    return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p class="panel-sub">' + sub + '</p>' +
      '<p class="aidx-small">강점</p><ul class="aidx-list">' + (sw.strong.length ? sw.strong.map(function (x) { return li(x, false); }).join('') : '<li>점수를 낼 수 있는 단계가 없습니다.</li>') + '</ul>' +
      '<p class="aidx-small">약점</p><ul class="aidx-list">' + (sw.weak.length ? sw.weak.map(function (x) { return li(x, true); }).join('') : '<li>강점과 겹쳐 따로 표시할 약점이 없습니다.</li>') + '</ul></div>';
  }
  // 행동 조언 카드 목록. who: 'me' | 'school'
  function adviceList(list) {
    return '<ol class="aidx-list axr-advice">' + list.map(function (x) {
      return '<li><span class="axr-who' + (x.who === 'school' ? ' school' : '') + '">' + (x.who === 'school' ? '학교' : '나') + '</span>' + x.t +
        '<br><span class="aidx-muted">근거: ' + x.why + '</span></li>';
    }).join('') + '</ol>';
  }
  // 후보를 차례로 보며 같은 문장은 한 번만 넣는다.
  function takeUnique(cands, n, used) {
    var out = [];
    cands.forEach(function (c) { if (out.length < n && c && c.t && !used[c.t]) { used[c.t] = 1; out.push(c); } });
    return out;
  }
  function weakestStage(lv) { var o = strongWeak(lv).weak; return o.length ? o[0].s : 0; }

  // 종합 결과 5·6번(우리 학교 수준, 같은 학교급·전체 학교 비교, 발전 전략 5가지). '타 학교 비교' 탭에서도 따로 보여 준다.
  function peerSections(P, me, S, sb, sbWhy) {
    var h = '';
    // 5. 우리 학교는 어느 수준인가: 같은 학교급 학교들, 전체 학교와 비교
    // 다른 학교는 응답이 MIN_SCHOOL명 이상인 학교만, 학교마다 같은 무게로 평균한다.
    function schoolsOf(list) {
      var by = {};
      list.forEach(function (r) { (by[r.s] = by[r.s] || []).push(r); });
      return Object.keys(by).map(function (k) { return by[k]; }).filter(function (rs) { return rs.length >= MIN_SCHOOL; }).map(aggregate);
    }
    function idxOf(lv) { var v = nn(lv); return v.length ? mean(v) : null; }
    function cmpOf(list) {
      if (!list.length) return null;
      var m = STAGES.map(function (_, s) { var v = nn(list.map(function (A) { return A.lvMean[s]; })); return v.length ? mean(v) : null; });
      var d = STAGES.map(function (_, s) { return S.lvMean[s] !== null && m[s] !== null ? S.lvMean[s] - m[s] : null; });
      var mine = idxOf(S.lvMean), ix = nn(list.map(function (A) { return idxOf(A.lvMean); }));
      // 우리 학교를 포함한 순위: 우리보다 높은 학교 수 + 1
      var rank = mine === null ? null : ix.filter(function (v) { return v > mine; }).length + 1;
      return { n: list.length, mean: m, diff: d, rank: rank, of: ix.length + 1, idx: idxOf(m) };
    }
    var peersAll = state.peers || [];
    var SL = P.org && me.job ? cmpOf(schoolsOf(peersAll.filter(function (r) { return r.job === me.job; }))) : null;
    var AL = P.org ? cmpOf(schoolsOf(peersAll)) : null;
    var myIdx = idxOf(S.lvMean);
    var posTxt = function (C) { return C && C.rank ? C.of + '곳 중 ' + C.rank + '위' : '–'; };
    h += '<section class="aidx-type"><p class="aidx-eyebrow">5 · 우리 학교는 어느 수준인가</p>' +
      '<h2>' + stageTitle(S.stage) + (myIdx !== null ? ' · 종합 ' + r0(myIdx) + '점(' + level(myIdx) + ')' : '') + '</h2>' +
      '<p>' + (SL ? '같은 학교급(' + esc(me.job) + ') ' + SL.of + '곳 가운데 <strong>' + SL.rank + '위</strong>' : '같은 학교급 비교는 다른 학교 응답이 모이면 나타납니다') +
      (AL ? ', 전체 학교 ' + AL.of + '곳 가운데 <strong>' + AL.rank + '위</strong>입니다.' : '.') + ' 종합 점수는 다섯 단계 평균입니다.</p></section>';
    h += '<div class="kpis aidx-kpis">' +
      kpi('준비된 단계', S.stage + '<small>/ 5단계</small>', STAGE_NAMES[S.stage]) +
      kpi('종합 점수', myIdx === null ? '–' : r0(myIdx) + '<small>/ 100</small>', myIdx === null ? '' : lvlChip(myIdx) + ' 다섯 단계 평균') +
      kpi('같은 학교급 안에서', posTxt(SL), SL ? '평균 ' + sc(SL.idx) + '점 · 우리 ' + signed(myIdx - SL.idx) + '점' : esc(me.job || '') + ' 비교 학교 없음') +
      kpi('전체 학교 안에서', posTxt(AL), AL ? '평균 ' + sc(AL.idx) + '점 · 우리 ' + signed(myIdx - AL.idx) + '점' : '비교 학교 없음') +
      '</div>' +
      '<details class="axr-kpi-help"><summary>이 숫자들은 무슨 뜻인가요?</summary><ul class="aidx-list">' +
      '<li><b>준비된 단계</b>: 우리 학교 응답자 평균으로 판정한 단계입니다. 1단계부터 차례로 60점을 넘은 단계까지 셉니다.</li>' +
      '<li><b>종합 점수</b>: 다섯 단계 점수를 평균한 값입니다(0~100점). 학교끼리 순위를 매길 때 이 점수를 씁니다.</li>' +
      '<li><b>같은 학교급 안에서</b>: 같은 학교급(초·중·고 등)에서 응답이 ' + MIN_SCHOOL + '명 이상인 다른 학교들과 종합 점수로 비교한 순위입니다.</li>' +
      '<li><b>전체 학교 안에서</b>: 학교급에 상관없이, 응답이 ' + MIN_SCHOOL + '명 이상인 모든 학교와 비교한 순위입니다.</li>' +
      '</ul></details>';
    function cmpPanel(title, C, emptyTxt, label) {
      if (!C) return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p>' + emptyTxt + '</p></div>';
      var o = C.diff.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return b.d - a.d; });
      var best = o[0], worst = o[o.length - 1];
      return '<div class="panel"><h3 class="panel-title">' + title + '</h3><p class="panel-sub">단계마다 우리 학교 평균과 다른 학교 ' + C.n + '곳의 평균(학교마다 같은 무게)을 나란히 놓았습니다</p>' +
        pairBars(S.lvMean, C.mean, label, '우리 학교') +
        '<p class="aidx-small">' + (best && best.d >= GAP_NOTE ? '앞선 단계: <strong>' + STAGES[best.s].name + '</strong> ' + signed(best.d) + '점 높음. ' : '뚜렷하게 앞선 단계는 없습니다. ') +
        (worst && worst.d <= -GAP_NOTE ? '뒤처진 단계: <strong>' + STAGES[worst.s].name + '</strong> ' + signed(Math.abs(worst.d)) + '점 낮음.' : '뚜렷하게 뒤처진 단계는 없습니다.') + '</p></div>';
    }
    h += '<section class="report-grid">' +
      cmpPanel('같은 학교급(' + esc(me.job || '–') + ') 학교들과 비교', SL, P.org && me.job ? '아직 같은 학교급에서 응답이 ' + MIN_SCHOOL + '명 이상 모인 다른 학교가 없습니다. 응답이 쌓이면 이 자리에 비교 결과가 나타납니다.' : '학교 이름과 학교급이 있는 응답에서만 비교할 수 있습니다.', '같은 학교급') +
      cmpPanel('전체 학교와 비교', AL, P.org ? '아직 응답이 ' + MIN_SCHOOL + '명 이상 모인 다른 학교가 없습니다.' : '학교 이름이 있는 응답에서만 비교할 수 있습니다.', '전체 학교') + '</section>';
    if (SL || AL) {
      h += '<div class="panel"><h3 class="panel-title">단계별 비교표</h3><p class="panel-sub">0~100점 · 차이 = 우리 학교 − 비교 학교 평균 · 다른 학교 이름은 보이지 않으며, 응답이 ' + MIN_SCHOOL + '명 미만인 학교는 뺍니다</p>' +
        '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>우리 학교</th><th>같은 학교급</th><th>차이</th><th>전체 학교</th><th>차이</th></tr></thead><tbody>' +
        STAGES.map(function (st, s) {
          var cell = function (C) {
            if (!C) return '<td>–</td><td>–</td>';
            var d = C.diff[s];
            return '<td>' + sc(C.mean[s]) + '</td><td class="' + (d === null ? '' : d >= GAP_NOTE ? 'up' : d <= -GAP_NOTE ? 'down' : '') + '">' + (d === null ? '–' : signed(d)) + '</td>';
          };
          return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(S.lvMean[s]) + '</strong></td>' + cell(SL) + cell(AL) + '</tr>';
        }).join('') + '</tbody></table></div></div>';
    }

    // 6. 발전 전략 5가지: 병목 단계 → 같은 학교급보다 뒤처진 단계 → 전체 학교보다 뒤처진 단계 → 병목 다음 단계 → 나머지 낮은 단계
    var lagOf = function (C) {
      if (!C) return null;
      var x = C.diff.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null && x.d <= -GAP_NOTE; }).sort(function (a, b) { return a.d - b.d; })[0];
      return x ? x.s : null;
    };
    var why = {};
    var stOrder = [sb]; why[sb] = sbWhy;
    [[lagOf(SL), SL, '같은 학교급'], [lagOf(AL), AL, '전체 학교']].forEach(function (x) {
      if (x[0] === null) return;
      stOrder.push(x[0]);
      if (!why[x[0]]) why[x[0]] = STAGES[x[0]].name + ' · ' + x[2] + ' 평균보다 ' + r0(Math.abs(x[1].diff[x[0]])) + '점 낮음';
    });
    if (sb + 1 < 5) { stOrder.push(sb + 1); if (!why[sb + 1]) why[sb + 1] = '병목 다음 단계 · ' + STAGES[sb + 1].name + ' 평균 ' + sc(S.lvMean[sb + 1]) + '점'; }
    S.lvMean.map(function (v, s) { return { v: v === null ? 999 : v, s: s }; }).sort(function (a, b) { return a.v - b.v; }).forEach(function (x) {
      stOrder.push(x.s); if (!why[x.s]) why[x.s] = STAGES[x.s].name + ' 평균 ' + sc(S.lvMean[x.s]) + '점';
    });
    stOrder = stOrder.filter(function (s, i) { return stOrder.indexOf(s) === i; });
    var quota = [2, 1, 1, 1, 1], plan = [];
    stOrder.forEach(function (s, i) {
      STRATEGIES[STAGES[s].key].slice(0, quota[i] || 0).forEach(function (g) { if (plan.length < 5) plan.push({ g: g, s: s }); });
    });
    // 단계 수가 적어 5개가 안 되면 우선순위 단계의 남은 전략으로 채운다
    stOrder.forEach(function (s) { STRATEGIES[STAGES[s].key].forEach(function (g) { if (plan.length < 5 && !plan.some(function (p) { return p.g === g; })) plan.push({ g: g, s: s }); }); });
    h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">6 · 우리 학교 발전 전략 5가지</p><h3>앞으로 무엇을 어떻게 할까</h3>' +
      '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계를 먼저, 그다음 다른 학교보다 뒤처진 단계를 우선했습니다. 전략마다 담당, 기간, 행동 요령, 점검 지표를 함께 제시합니다.</p></div>' +
      '<ol class="aidx-plan-list">' + plan.map(function (p, i) {
        var g = p.g;
        return '<li class="aidx-plan-card' + (i ? ' keep' : '') + '"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + STAGES[p.s].icon + ' ' + g.t + '</p>' +
          '<p class="aidx-small">근거: ' + why[p.s] + '</p>' +
          '<p class="aidx-small">담당: ' + g.who + ' · 기간: ' + g.when + '</p>' +
          '<ol class="aidx-list axr-steps">' + g.steps.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
          '<p class="aidx-small">점검 지표: ' + g.kpi + '</p></li>';
      }).join('') + '</ol></section>';
    return h;
  }
  function peerReport() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="report">결과 코드 입력</button></div></section>';
    }
    var S = aggregate(P.rows), sb = S.stage < 5 ? S.stage : weakestStage(S.lvMean);
    var sbWhy = (S.stage < 5 ? '우리 학교의 병목 단계' : '우리 학교에서 가장 낮은 단계') + ' · ' + STAGES[sb].name + ' 평균 ' + sc(S.lvMean[sb]) + '점';
    return '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + P.rows.length + '명' + (PREVIEW ? ' · 시험 모드: 이 브라우저의 응답만' : '') + '</p>' + peerSections(P, me, S, sb, sbWhy);
  }

  function personal() {
    var P = state.pool, me = P && P.rows.filter(function (r) { return r.mine; })[0];
    if (!me) {
      return '<section class="aidx-home"><p>아직 이 기기에 내 응답이 없습니다. 진단에 응답하거나 결과 코드를 입력하세요.</p>' +
        '<div class="aidx-actions"><button type="button" class="aidx-btn primary" data-act="start">진단 시작</button><button type="button" class="aidx-btn" data-act="report">결과 코드 입력</button></div></section>';
    }
    var others = P.rows.filter(function (r) { return !r.mine; }), no = others.length, enough = no >= MIN_N - 1;
    var O = no ? aggregate(others) : null;
    var diffs = STAGES.map(function (_, s) { return O && me.lv[s] !== null && O.lvMean[s] !== null ? me.lv[s] - O.lvMean[s] : null; });
    var unkStages = STAGES.map(function (st, s) { return st.unk ? s : -1; }).filter(function (s) { return s >= 0; });
    var myUnk = unkStages.reduce(function (t, s) { return t + me.unk[s]; }, 0), unkItems = unkStages.length * K;
    var othersUnk = no ? mean(others.map(function (r) { return unkStages.reduce(function (t, s) { return t + r.unk[s]; }, 0); })) : 0;
    var stageCnt = [0, 0, 0, 0, 0, 0]; others.forEach(function (r) { stageCnt[r.stage]++; });
    var modeStage = stageCnt.indexOf(Math.max.apply(null, stageCnt));
    var higher = others.filter(function (r) { return r.stage > me.stage; }).length, same = others.filter(function (r) { return r.stage === me.stage; }).length;
    var order = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); });
    var top = order[0], h = '';

    // 1. 내가 본 단계
    var bott = me.stage < 5 ? me.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">내 응답으로 본 우리 학교의 AIX 준비 단계</p>' +
      '<h2>' + stageTitle(me.stage) + '</h2><p>' + STAGE_DESC[me.stage] + '</p>' +
      (bott >= 0 ? '<p>다음 단계를 준비해 봅시다! 다음은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>이에요. "' + STAGES[bott].q + '"</p>' : '') +
      (no ? '<p>다른 응답자 ' + no + '명 가운데 <strong>' + r0(same / no * 100) + '%</strong>는 나와 같은 단계로, ' + r0(higher / no * 100) + '%는 더 높은 단계로, ' + r0((no - same - higher) / no * 100) + '%는 더 낮은 단계로 보았습니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(me.stage, '내가 본 준비 단계 ' + me.stage + '단계') + '</div></section>';
    if (!no) return h + '<p class="aidx-note">아직 다른 응답자가 없어 비교할 수 없습니다. 같은 학교(그룹) 링크로 다른 교원이 응답하면 인식 차이 분석이 나타납니다.</p>' + myPlan(me, null);
    if (!enough) h += '<p class="aidx-note">다른 응답자가 ' + no + '명입니다. ' + (MIN_N - 1) + '명 이상 모이면 비교가 안정됩니다. 지금은 참고용으로 보세요.</p>';

    // 2. 핵심 숫자
    var topAbs = top ? r0(Math.abs(top.d)) : 0;
    h += '<div class="kpis aidx-kpis">' +
      kpi('내가 본 우리 학교 단계', me.stage + '<small>/ 5단계</small>', me.stage ? STAGE_NAMES[me.stage] + '까지 준비된 편' : '아직 1단계부터 준비가 필요한 편') +
      kpi('다른 선생님들이 가장 많이 본 단계', modeStage + '<small>/ 5단계</small>', no + '명 중 ' + r0(stageCnt[modeStage] / no * 100) + '%가 이 단계로 봄 · ' + (modeStage === me.stage ? '나와 같음' : '나는 ' + me.stage + '단계')) +
      kpi('나와 생각이 가장 다른 단계', top ? STAGES[top.s].name : '–', top ? (topAbs < GAP_NOTE ? '차이 ' + topAbs + '점 · 비슷한 편' : '다른 선생님들보다 ' + topAbs + '점 ' + (top.d > 0 ? '높게' : '낮게') + ' 봄') : '비교할 단계 없음') +
      kpi('"잘 모르겠다"고 답한 문항', myUnk + '<small>/ ' + unkItems + '문항</small>', '다른 선생님 평균 ' + f1(othersUnk) + '개') +
      '</div>' +
      '<details class="axr-kpi-help"><summary>이 숫자들은 무슨 뜻인가요?</summary><ul class="aidx-list">' +
      '<li><b>내가 본 우리 학교 단계</b>: 내 응답만으로 판정한 우리 학교의 준비 단계입니다. 1단계부터 차례로 60점(문항 평균 3.4점, "그렇다" 수준)을 넘은 단계까지 셉니다. 우리 학교 전체의 판정은 "우리 학교 종합 결과" 탭에서 봅니다.</li>' +
      '<li><b>다른 선생님들이 가장 많이 본 단계</b>: 같은 학교 다른 선생님 ' + no + '명이 각자 응답으로 판정된 단계 가운데 가장 많이 나온 단계입니다. 내 단계와 같으면 나와 동료들이 학교를 비슷하게 보고 있다는 뜻입니다.</li>' +
      '<li><b>나와 생각이 가장 다른 단계</b>: 다섯 단계 가운데 내 점수와 다른 선생님들 평균 점수의 차이가 가장 큰 단계입니다. "낮게 봄"은 내가 동료들보다 그 단계를 덜 갖추어졌다고 본다는 뜻이고, "높게 봄"은 더 갖추어졌다고 본다는 뜻입니다. 차이가 ' + GAP_NOTE + '점 안이면 비슷한 편입니다.</li>' +
      '<li><b>"잘 모르겠다"고 답한 문항</b>: 학교 전체에 대해 묻는 ' + unkItems + '문항(1·4·5단계) 가운데 "잘 모르겠다"를 고른 수입니다. 동료들보다 많으면 그 내용이 나에게 충분히 안내되지 않았을 수 있습니다.</li>' +
      '</ul></details>';

    // 3. 단계별 인식 차이
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별로 나와 다른 선생님들 비교</h3><p class="panel-sub">단계마다 내 점수와 같은 학교 다른 선생님 ' + no + '명의 평균을 나란히 놓았습니다 · 차이가 ' + GAP_NOTE + '점 안이면 비슷하게 보는 것입니다</p>' + pairBars(me.lv, O.lvMean, '동료') + '</div>' +
      '<div class="panel"><h3 class="panel-title">다른 선생님들은 우리 학교를 몇 단계로 봤을까?</h3><p class="panel-sub">같은 학교 다른 선생님 ' + no + '명의 응답을 한 사람씩 판정해, 각 단계로 본 사람 수를 셌습니다 · <b>나</b> 표시가 내가 본 단계입니다</p>' +
      '<div class="axr-dist">' + STAGE_NAMES.map(function (nm, k) {
        var p = stageCnt[k] / no * 100;
        return '<div class="axr-distrow' + (k === me.stage ? ' me' : '') + '"><span>' + nm + (k === me.stage ? ' <b>나</b>' : '') + '</span><span class="axr-disttrack"><span style="width:' + p + '%"></span></span><span class="axr-distval">' + stageCnt[k] + '명 · ' + r0(p) + '%</span></div>';
      }).join('') + '</div>' +
      '<p class="aidx-small">나와 같은 ' + (me.stage ? me.stage + '단계' : '출발 전') + '로 본 선생님 <b>' + same + '명</b>, 나보다 높은 단계로 본 선생님 <b>' + higher + '명</b>, 낮은 단계로 본 선생님 <b>' + (no - same - higher) + '명</b>입니다. ' +
      (same >= Math.max(higher, no - same - higher) ? '동료들도 대체로 나와 비슷하게 보고 있습니다.' : higher > no - same - higher ? '동료들은 나보다 우리 학교를 더 준비된 쪽으로 보는 편입니다.' : '동료들은 나보다 우리 학교를 덜 준비된 쪽으로 보는 편입니다.') + '</p></div></section>';

    h += '<div class="panel"><h3 class="panel-title">단계별 비교표</h3>' + levelLegend() +
      '<ul class="aidx-list axr-colhelp"><li><b>나</b>: 내 응답으로 계산한 단계 점수(0~100점)와 그 수준</li><li><b>동료 평균 (흩어진 정도)</b>: 같은 학교 다른 선생님들의 평균 점수. 괄호 안 숫자(표준편차)가 클수록 선생님마다 생각이 많이 다르다는 뜻</li>' +
      '<li><b>차이</b>: 내 점수 − 동료 평균. −는 내가 더 낮게, +는 더 높게 본 것(±' + GAP_NOTE + '점 안은 비슷함)</li><li><b>차이의 크기</b>: 차이를 동료들의 흩어진 정도로 나눈 값. ±0.5보다 크면 동료들 사이에서도 눈에 띄게 다른 생각</li>' +
      '<li><b>나보다 낮게 본 동료</b>: 그 단계를 나보다 낮게 본 선생님의 비율. 10%면 동료 대부분이 나보다 높게 봤다는 뜻</li></ul>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>나</th><th>동료 평균 (흩어진 정도)</th><th>차이</th><th>차이의 크기</th><th>나보다 낮게 본 동료</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var col = nn(others.map(function (r) { return r.lv[s]; })), d = diffs[s], sdv = O.lvSd[s];
        var below = me.lv[s] === null || !col.length ? null : col.filter(function (v) { return v < me.lv[s]; }).length / col.length * 100;
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(me.lv[s]) + '</strong> ' + lvlChip(me.lv[s]) + '</td><td>' + sc(O.lvMean[s]) + ' (' + r0(sdv) + ')</td>' +
          '<td class="' + (d === null ? '' : d >= GAP_NOTE ? 'up' : d <= -GAP_NOTE ? 'down' : '') + '">' + (d === null ? '–' : signed(d)) + '</td>' +
          '<td>' + (d === null || !sdv ? '–' : f1(d / sdv)) + '</td><td>' + (below === null ? '–' : r0(below) + '%') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    // 4. 차이가 가장 큰 영역과 행동지침
    if (top && Math.abs(top.d) >= GAP_NOTE) {
      var st = STAGES[top.s], dir = top.d > 0 ? 'hi' : 'lo', R = GAP_READ[st.key][dir];
      var itemGaps = ITEMS.slice(top.s * K, top.s * K + K).map(function (it) {
        var om = itemMeanOf(others, it.idx), my = me.a[it.idx];
        return { it: it, my: my, om: om, d: my > 0 && om !== null ? my - om : null };
      });
      var big = itemGaps.filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 3);
      var unkHere = itemGaps.filter(function (x) { return x.my === 0; });
      var second = order[1] && Math.abs(order[1].d) >= GAP_NOTE ? order[1] : null;
      h += '<section class="aidx-gap ' + (dir === 'hi' ? 'ahead' : 'behind') + '"><p class="aidx-eyebrow">인식 차이가 가장 큰 영역</p>' +
        '<h3>' + st.icon + ' ' + (top.s + 1) + '단계 ' + st.name + ': 다른 응답자보다 ' + r0(Math.abs(top.d)) + '점 ' + (dir === 'hi' ? '높게' : '낮게') + ' 봅니다</h3>' +
        '<div class="aidx-gbars">' +
        '<div class="aidx-grow"><span>나</span><span class="aidx-gtrack"><span style="width:' + me.lv[top.s] + '%"></span></span><b>' + r0(me.lv[top.s]) + '</b></div>' +
        '<div class="aidx-grow act"><span><small>다른 응답자</small></span><span class="aidx-gtrack"><span style="width:' + O.lvMean[top.s] + '%"></span></span><b>' + r0(O.lvMean[top.s]) + '</b></div></div>' +
        '<p><strong>무엇을 뜻하나요?</strong> ' + R.why + '</p>' +
        (big.length ? '<p class="aidx-small">차이가 큰 문항 (나 / 다른 응답자 평균, 1~5점)</p><ul class="aidx-list">' + big.map(function (x) {
          return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">나 ' + x.my + ' / ' + f1(x.om) + ' (' + (x.d > 0 ? '+' : '−') + f1(Math.abs(x.d)) + ')</span></li>';
        }).join('') + '</ul>' : '') +
        (unkHere.length ? '<p class="aidx-small">이 단계에서 내가 "잘 모르겠다"고 답한 문항이 ' + unkHere.length + '개 있습니다. 이 문항들은 점수에서 빠졌으므로, 먼저 사실을 확인해 보세요.</p>' : '') +
        '<p class="aidx-small">행동지침</p><ol class="aidx-list axr-steps">' + R.act.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ol>' +
        (second ? '<p class="aidx-small">두 번째로 차이가 큰 단계는 <strong>' + STAGES[second.s].name + '</strong>(' + signed(second.d) + '점, ' + gapLabel(second.d) + ')입니다. ' + GAP_READ[STAGES[second.s].key][second.d > 0 ? 'hi' : 'lo'].why + '</p>' : '') +
        '</section>';
    } else {
      h += '<section class="aidx-gap match"><p class="aidx-eyebrow">인식 차이</p><h3>다른 응답자와 비슷하게 보고 있습니다</h3>' +
        '<p>모든 단계에서 차이가 ' + GAP_NOTE + '점 미만입니다. 학교의 상태를 다른 교원과 같은 눈으로 보고 있으므로, 학교 전체의 병목 단계를 함께 채우는 데 힘을 보태면 됩니다.</p></section>';
    }
    return h + myPlan(me, aggregate(P.rows));
  }

  // 내가 직접 해 볼 일: 개인 활용·업무 재설계 점수가 낮을 때, 그리고 학교 병목 단계
  function myPlan(me, A) {
    var tips = '';
    [1, 2].forEach(function (s) {
      if (me.lv[s] === null || me.lv[s] >= 80) return;
      var low = ITEMS.slice(s * K, s * K + K).filter(function (it) { return me.a[it.idx] > 0 && me.a[it.idx] <= 3; }).slice(0, 2);
      tips += '<li class="aidx-plan-card"><p class="aidx-plan-h">' + STAGES[s].icon + ' ' + STAGES[s].name + ' <span class="aidx-muted">' + sc(me.lv[s]) + '점</span></p>' +
        '<ul class="aidx-list">' + MY_TIPS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
        (low.length ? '<p class="aidx-small">아직 갖추지 못했다고 답한 것</p><ul class="aidx-list aidx-check">' + low.map(function (it) { return '<li>' + esc(it.text) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    });
    if (A && A.stage < 5) {
      var b = A.stage;
      tips += '<li class="aidx-plan-card keep"><p class="aidx-plan-h">' + STAGES[b].icon + ' 학교 전체의 병목 · ' + (b + 1) + '단계 ' + STAGES[b].name + '</p>' +
        '<p class="aidx-small">응답자 전체 평균으로 본 병목입니다. 동료와 학교에 이렇게 제안해 보세요.</p>' +
        '<ul class="aidx-list">' + ACTIONS[STAGES[b].key].slice(0, 2).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul></li>';
    }
    return tips ? '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">나의 행동 추천</p><h3>지금 내가 해 볼 수 있는 것</h3>' +
      '<p>교원 활용과 공동 실천은 내가 직접 바꾸거나 동료와 함께 바꿀 수 있는 부분이고, 나머지 단계는 학교에 제안할 부분입니다.</p></div><ol class="aidx-plan-list">' + tips + '</ol></section>' : '';
  }

  // P: 집단(기본은 우리 학교), whole: 전체 응답 학교로 볼 때 true
  function companyReport(P, whole) {
    P = P || state.pool;
    var rows = P.rows, n = rows.length, who = whole ? '전체 응답 학교' : '우리 학교';
    if (!n) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var A = aggregate(rows), h = '';
    h += '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명' + (PREVIEW ? ' (시험 모드: 이 브라우저의 응답만)' : '') + '</p>';
    if (n < MIN_N && !whole) h += '<p class="aidx-note axr-few"><strong>아직 응답 ' + n + '명입니다. 지금 학교 결과는 ' + (n === 1 ? '한 사람' : n + '명') + '의 인식입니다.</strong> ' + MIN_N + '명 이상, 학년·교과와 직위가 고르게 응답해야 학교 결과로 읽을 수 있습니다. 지금은 참고용으로 보세요.</p>';

    // 1. 한 줄 요약
    var bott = A.stage < 5 ? A.stage : -1;
    h += '<section class="aidx-type"><p class="aidx-eyebrow">교원 인식으로 본 ' + who + '의 AIX 준비 단계 · 응답 ' + n + '명 평균</p>' +
      '<h2>' + stageTitle(A.stage) + '</h2><p>' + STAGE_DESC[A.stage] + '</p>' +
      (bott >= 0 ? '<p>병목은 <strong>' + (bott + 1) + '단계 ' + STAGES[bott].name + '</strong>(평균 ' + sc(A.lvMean[bott]) + '점)입니다. 이 단계에서 "준비됨"(60점 이상)이라고 본 응답자는 ' + r0(A.ready[bott]) + '%입니다.</p>' : '') +
      '<div class="axr-stairs-box">' + stairs(A.stage, '학교 준비 단계 ' + A.stage + '단계') + '</div></section>';

    // 2. 핵심 숫자
    var g = nn(rows.map(function (r) { return r.g; }));
    var unkOrg = mean(STAGES.map(function (st, s) { return st.unk ? A.unkPct[s] : null; }).filter(function (v) { return v !== null; }));
    h += '<div class="kpis aidx-kpis">' +
      kpi('응답자', n + '<small>명</small>', esc(groupLabel(P))) +
      kpi('준비된 단계', A.stage + '<small>/ 5단계</small>', bott >= 0 ? '병목: ' + STAGES[bott].name : '전 단계 준비') +
      kpi('전반 인식', g.length ? r0(mean(g)) + '<small>/ 100</small>' : '–', 'AIX 의지·역량에 대한 인식 (G1·G2)') +
      kpi('"잘 모르겠다"', r0(unkOrg) + '<small>%</small>', '학교 주어 문항(1·4·5단계) 평균') +
      '</div>' +
      '<details class="axr-kpi-help"><summary>이 숫자들은 무슨 뜻인가요?</summary><ul class="aidx-list">' +
      '<li><b>응답자</b>: ' + who + '에서 이 진단에 응답한 교원 수입니다.</li>' +
      '<li><b>준비된 단계</b>: ' + who + ' 평균으로 판정한 단계입니다. 1단계부터 차례로 60점을 넘은 단계까지 세고, 처음으로 60점에 못 미친 단계를 병목이라고 부릅니다.</li>' +
      '<li><b>전반 인식</b>: "교원들은 AIX 전환을 해내려는 의지가 강하다" 등 두 문항(G1·G2)의 평균입니다. 단계 점수 계산에는 넣지 않고, 교원들의 전반적인 의지와 자신감을 참고로 보여 줍니다.</li>' +
      '<li><b>"잘 모르겠다"</b>: 학교 전체를 주어로 묻는 문항(1·4·5단계) 가운데 "잘 모르겠다"를 고른 응답 비율입니다. 높을수록 그 내용이 교원에게 충분히 안내되지 않았을 수 있습니다.</li>' +
      '</ul></details>';

    // 3. 단계별 프로파일
    h += '<section class="report-grid">' +
      '<div class="panel"><h3 class="panel-title">단계별 학교 평균</h3><p class="panel-sub">0~100점 · 점선은 준비 기준 60점</p>' +
      stageBars(A.lvMean, null, '', A.lvMean.map(function (v, i) { return v === null ? '판단 보류' : r0(A.ready[i]) + '% 준비'; })) +
      '<p class="aidx-small">오른쪽 비율은 그 단계를 60점 이상으로 본 응답자 비율입니다. 병목 뒤 단계는 60점을 넘어도 회색 "판정 보류"로 표시합니다(병목 단계의 준비 상황을 먼저 확인한 뒤 판단).</p>' + orderNote(A.lvMean, who + ' 평균에서', who) + '</div>' +
      '<div class="panel"><h3 class="panel-title">단계별 수준 분포</h3><p class="panel-sub">각 단계에서 시작·형성·정착·주도 수준으로 본 응답자 비율 · 정착(60점 이상)부터 준비된 편으로 봅니다</p>' +
      '<div class="legend">' + ['시작', '형성', '정착', '주도'].map(function (t) { return '<span class="lg"><span class="aidx-sw ' + lvlCls(t) + '"></span>' + t + '</span>'; }).join('') + '</div>' +
      '<div class="aidx-stack">' + STAGES.map(function (st, s) {
        var cnt = { '시작': 0, '형성': 0, '정착': 0, '주도': 0 }, m = 0;
        rows.forEach(function (r) { if (r.lv[s] !== null) { cnt[level(r.lv[s])]++; m++; } });
        return '<div class="aidx-srow"><span class="aidx-sname">' + (s + 1) + '. ' + st.name + '</span><div class="aidx-sbar">' + (m ? ['시작', '형성', '정착', '주도'].map(function (t) {
          var p = cnt[t] / m * 100;
          return p ? '<span class="' + lvlCls(t) + '" style="width:' + p + '%" data-tip="' + esc(st.name + ' · ' + t + ' ' + cnt[t] + '명 (' + Math.round(p) + '%)') + '">' + (p >= 9 ? Math.round(p) : '') + '</span>' : '';
        }).join('') : '') + '</div></div>';
      }).join('') + '</div></div></section>';

    // 4. 기초 통계
    h += '<div class="panel"><h3 class="panel-title">단계별 기초 통계</h3>' +
      '<p class="panel-sub">합의도 rwg(j)는 학교를 주어로 묻는 단계(1·4·5단계)에서, 신뢰도 α는 "모르겠다" 없이 응답한 사람이 10명 이상일 때 표시</p>' +
      '<ul class="aidx-list axr-colhelp"><li><b>평균·SD</b>: 그 단계 점수(0~100점)의 평균과 흩어진 정도입니다. SD가 클수록 교원마다 보는 눈이 다르다는 뜻입니다.</li>' +
      '<li><b>준비됨</b>: 그 단계를 60점 이상으로 본 응답자 비율입니다.</li><li><b>모르겠다</b>: "잘 모르겠다"를 고른 응답 비율입니다.</li>' +
      '<li><b>합의도(rwg(j))</b>: 교원들이 이 단계를 얼마나 비슷하게 보는지 나타냅니다. .70 이상이면 평균을 학교의 상태로 읽을 수 있습니다.</li>' +
      '<li><b>α(신뢰도)</b>: 그 단계 6문항이 서로 같은 내용을 재고 있는 정도입니다(참고용).</li></ul>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>단계</th><th>평균</th><th>SD</th><th>준비됨</th><th>모르겠다</th><th>합의도</th><th>α</th></tr></thead><tbody>' +
      STAGES.map(function (st, s) {
        var rw = st.unk && n >= MIN_N ? rwgj(rows, s * K, s * K + K) : null, al = alpha(rows, s * K, s * K + K);
        return '<tr><td>' + (s + 1) + '. ' + st.name + '</td><td><strong>' + sc(A.lvMean[s]) + '</strong></td><td>' + r0(A.lvSd[s]) + '</td><td>' + r0(A.ready[s]) + '%</td>' +
          '<td>' + (st.unk ? r0(A.unkPct[s]) + '%' : '–') + '</td><td>' + (rw === null ? '–' : f2(rw)) + '</td><td>' + (al === null ? '–' : f2(al)) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="aidx-small">합의도가 .70 이상이면 교원들이 학교 상태를 비슷하게 보고 있어 평균을 학교의 상태로 읽을 수 있습니다. 낮으면 학년·교과나 직위에 따라 경험이 다르다는 뜻이므로 "응답자 구분별 비교"를 함께 보세요. "모르겠다"가 30%를 넘는 단계는 학교가 그 내용을 교원에게 충분히 알리지 않았다는 신호입니다.</p></div>';

    // 5. 갖춘 것과 비어 있는 것
    var im = ITEMS.slice(0, NS).map(function (it) {
      var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; });
      return { it: it, m: v.length ? mean(v) : null };
    }).filter(function (x) { return x.m !== null; }).sort(function (a, b) { return b.m - a.m; });
    function itemList(list) { return '<ul class="aidx-list">' + list.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + STAGES[Math.floor(x.it.idx / K)].name + ' · ' + f1(x.m) + '</span></li>'; }).join('') + '</ul>'; }
    var unkTop = ITEMS.slice(0, NS).filter(function (it) { return it.unk; }).map(function (it) {
      return { it: it, p: rows.filter(function (r) { return r.a[it.idx] === 0; }).length / n * 100 };
    }).sort(function (a, b) { return b.p - a.p; }).slice(0, 3).filter(function (x) { return x.p > 0; });
    h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">가장 잘 갖춘 것과 가장 비어 있는 것</h3><p class="panel-sub">문항 평균 (1~5점, "모르겠다" 제외)</p>' +
      '<p class="aidx-small">가장 잘 갖춘 것</p>' + itemList(im.slice(0, 3)) +
      '<p class="aidx-small">가장 비어 있는 것</p>' + itemList(im.slice(-3).reverse()) + '</div>' +
      '<div class="panel"><h3 class="panel-title">교원이 잘 모르는 것</h3><p class="panel-sub">"잘 모르겠다" 응답 비율이 높은 문항</p>' +
      (unkTop.length ? '<ul class="aidx-list">' + unkTop.map(function (x) { return '<li>' + esc(x.it.text) + ' <span class="aidx-muted">' + r0(x.p) + '%</span></li>'; }).join('') + '</ul>'
        : '<p>"잘 모르겠다" 응답이 없습니다.</p>') + '</div></section>';

    // 6. 다음 단계로 가려면
    if (bott >= 0) {
      var ahead = [bott, bott + 1].filter(function (s) { return s < 5; });
      h += '<section class="aidx-plan"><div class="aidx-plan-top"><p class="aidx-eyebrow">다음 단계로 가려면</p><h3>' + PLAN_HEAD[STAGES[bott].key] + '</h3>' +
        '<p>앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작습니다. 병목 단계부터 우선순위를 두세요.</p></div>' +
        '<ol class="aidx-plan-list">' + ahead.map(function (s, i) {
          var low = ITEMS.slice(s * K, s * K + K).map(function (it) { var v = rows.map(function (r) { return r.a[it.idx]; }).filter(function (x) { return x > 0; }); return { it: it, m: v.length ? mean(v) : 9 }; })
            .sort(function (a, b) { return a.m - b.m; }).slice(0, 2);
          return '<li class="aidx-plan-card' + (i ? ' keep' : '') + '"><p class="aidx-plan-h"><span class="aidx-prio">' + (i + 1) + '</span>' + STAGES[s].icon + ' ' + (s + 1) + '단계 ' + STAGES[s].name +
            ' <span class="aidx-muted">평균 ' + sc(A.lvMean[s]) + '점 · 책임: ' + STAGES[s].owner + '</span></p>' +
            '<ul class="aidx-list">' + ACTIONS[STAGES[s].key].map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
            '<p class="aidx-small">점수가 가장 낮은 항목</p><ul class="aidx-list aidx-check">' + low.map(function (x) { return '<li>' + esc(x.it.text) + '</li>'; }).join('') + '</ul></li>';
        }).join('') + '</ol></section>';
    }

    // 7. 도구 점검 (타당화용)
    var fit = orderFit(rows);
    var both = rows.filter(function (r) { return r.g !== null && r.lv.every(function (v) { return v !== null; }); });
    var rg = both.length >= 10 ? pearson(both.map(function (r) { return mean(r.lv); }), both.map(function (r) { return r.g; })) : null;
    h += '<div class="panel"><h3 class="panel-title">진단 도구 점검</h3><p class="panel-sub">연구·관리자를 위한 참고 지표입니다(10명 이상일 때 표시). 몰라도 다른 결과를 읽는 데는 지장이 없습니다.</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>지표</th><th>값</th><th>뜻</th></tr></thead><tbody>' +
      '<tr><td>단계 순서 일치율</td><td>' + (fit ? r0(fit.pct) + '% (' + fit.n + '명)' : '–') + '</td><td>단계 순서를 거스른 응답이 없는 비율 (높을수록 순서 가정이 맞음)</td></tr>' +
      '<tr><td>단계 점수와 전반 인식의 상관</td><td>' + (rg === null ? '–' : 'r = ' + f2(rg)) + '</td><td>단계 점수가 AIX 의지·역량 인식과 함께 움직이는 정도</td></tr>' +
      '</tbody></table></div></div>';
    return h;
  }

  // 전체 응답학교 종합결과: 우리 학교 + 다른 학교(모든 학교급, 학교 이름 없이 번호로) 응답을 모아 본다.
  function allReport() {
    var mine = state.pool ? state.pool.rows : [], peers = state.peers || [];
    var rows = mine.concat(peers);
    if (!rows.length) return '<section class="aidx-home"><p>아직 응답이 없습니다.</p></section>';
    var map = {};
    mine.forEach(function (r) { (map.__mine = map.__mine || []).push(r); });
    peers.forEach(function (r) { (map[r.s] = map[r.s] || []).push(r); });
    var schools = Object.keys(map).map(function (k) { var rs = map[k], A = aggregate(rs); return { mine: k === '__mine', n: rs.length, job: rs[0].job || '기타', A: A }; })
      .filter(function (x) { return x.n >= MIN_SCHOOL; });
    var h = '<p class="aidx-context">학교 이름을 적고 응답한 모든 학교 · 응답 ' + rows.length + '명 · 학교 ' + Object.keys(map).length + '곳(그중 ' + MIN_SCHOOL + '명 이상 응답한 학교 ' + schools.length + '곳)' + (PREVIEW ? ' · 시험 모드: 이 브라우저의 응답만' : '') + '</p>';
    if (schools.length) {
      var cnt = [0, 0, 0, 0, 0, 0]; schools.forEach(function (x) { cnt[x.A.stage]++; });
      var mx = Math.max.apply(null, cnt), my = schools.filter(function (x) { return x.mine; })[0];
      h += '<section class="report-grid"><div class="panel"><h3 class="panel-title">학교별 준비 단계 분포</h3><p class="panel-sub">' + MIN_SCHOOL + '명 이상 응답한 학교 ' + schools.length + '곳이 각각 몇 단계로 판정되었는지 셌습니다' + (my ? ' · 진한 막대가 우리 학교의 단계' : '') + '</p>' +
        '<div class="aidx-hbars">' + STAGE_NAMES.map(function (nm, k) {
          return '<div class="aidx-hrow' + (my && my.A.stage === k ? ' is-mine' : '') + '"><span class="aidx-hname">' + nm + '</span><span class="aidx-htrack"><span style="width:' + (mx ? cnt[k] / mx * 100 : 0) + '%"></span></span><span class="aidx-hval">' + cnt[k] + '곳</span></div>';
        }).join('') + '</div></div>' +
        '<div class="panel"><h3 class="panel-title">학교급별 평균</h3><p class="panel-sub">학교마다 먼저 평균을 낸 뒤, 학교 수로 다시 평균했습니다(응답이 많은 학교가 더 크게 반영되지 않도록) · 0~100점</p><div class="table-wrap"><table class="aidx-table"><thead><tr><th>학교급</th><th>학교</th>' +
        STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '</tr></thead><tbody>' +
        JOBS.map(function (j) {
          var xs = schools.filter(function (x) { return x.job === j; }); if (!xs.length) return '';
          return '<tr><td>' + j + '</td><td>' + xs.length + '곳</td>' + STAGES.map(function (_, s) { var v = nn(xs.map(function (x) { return x.A.lvMean[s]; })); return '<td>' + (v.length ? r0(mean(v)) : '–') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div></div></section>';
    }
    return h + '<h3 class="aidx-subh">전체 응답자 종합</h3>' + companyReport({ group: '', org: '', rows: rows }, true);
  }

  function compareReport() {
    var P = state.pool, rows = P.rows, n = rows.length;
    var groups = ROLES.map(function (rl) { return { rl: rl, rs: rows.filter(function (r) { return r.role === rl; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
    var h = '<p class="aidx-context">' + esc(groupLabel(P)) + ' · 응답 ' + n + '명</p>';
    if (groups.length < 2) {
      return h + '<section class="aidx-home"><p>응답자 구분별 비교는 두 구분 이상에서 각각 ' + MIN_ROLE + '명 이상 응답해야 볼 수 있습니다. 응답자를 알아볼 수 없도록 인원이 적은 구분은 표시하지 않습니다.</p></section>';
    }
    var aggs = groups.map(function (x) { return { rl: x.rl, n: x.rs.length, A: aggregate(x.rs) }; });
    h += '<div class="panel"><h3 class="panel-title">응답자 구분별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시 · 마지막 열은 그 구분의 평균으로 판정한 준비 단계</p>' +
      '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>구분</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
      aggs.map(function (x) {
        return '<tr><td>' + x.rl + '</td><td>' + x.n + '</td>' + x.A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + x.A.stage + '단계</strong></td></tr>';
      }).join('') + '</tbody></table></div></div>';
    // 관리자(교감·교장)·부장교사와 교사의 인식 차이
    var staff = aggs.filter(function (x) { return x.rl === ROLES[0]; })[0];
    var lead = aggs.filter(function (x) { return x.rl === ROLES[2]; })[0] || aggs.filter(function (x) { return x.rl === ROLES[1]; })[0];
    if (staff && lead) {
      var diffs = STAGES.map(function (_, s) { return staff.A.lvMean[s] !== null && lead.A.lvMean[s] !== null ? lead.A.lvMean[s] - staff.A.lvMean[s] : null; });
      var big = diffs.map(function (d, s) { return { d: d, s: s }; }).filter(function (x) { return x.d !== null; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); })[0];
      var gapNotable = big && Math.abs(big.d) >= GAP_NOTE;
      h += '<section class="aidx-gap ' + (gapNotable ? 'ahead' : 'match') + '"><p class="aidx-eyebrow">' + josa(lead.rl, '과', '와') + ' 교사의 인식 차이</p>' +
        '<h3>' + (gapNotable ? josa(STAGES[big.s].name, '을', '를') + ' 두고 보는 눈이 ' + r0(Math.abs(big.d)) + '점 다릅니다' : '단계마다 인식 차이가 크지 않습니다') + '</h3>' +
        '<p class="panel-sub">단계마다 ' + esc(josa(lead.rl, '과', '와')) + ' 교사의 평균을 나란히 놓았습니다 · 차이가 ' + GAP_NOTE + '점 안이면 비슷하게 보는 것입니다</p>' +
        pairBars(lead.A.lvMean, staff.A.lvMean, '교사', lead.rl) +
        (gapNotable ? roleGapAdvice(STAGES[big.s], lead, staff, big.d > 0)
          : '<p>모든 단계에서 차이가 ' + GAP_NOTE + '점 미만입니다. 같은 상태를 비슷하게 보고 있어, 학교 평균을 공통의 출발점으로 삼을 수 있습니다.</p>') + '</section>';
    }
    // 학교급별, AI 사용 빈도별 단계 평균 (각 구분 MIN_ROLE명 이상만)
    [{ key: 'job', label: '학교급', opts: JOBS }, { key: 'freq', label: 'AI 사용 빈도', opts: FREQS }].forEach(function (dim) {
      var gs = dim.opts.map(function (o) { return { o: o, rs: rows.filter(function (r) { return r[dim.key] === o; }) }; }).filter(function (x) { return x.rs.length >= MIN_ROLE; });
      if (gs.length < 2) return;
      h += '<div class="panel"><h3 class="panel-title">' + dim.label + '별 단계 평균</h3><p class="panel-sub">' + MIN_ROLE + '명 이상인 구분만 표시</p>' +
        '<div class="table-wrap"><table class="aidx-table"><thead><tr><th>' + dim.label + '</th><th>n</th>' + STAGES.map(function (st, i) { return '<th>' + (i + 1) + '. ' + st.name + '</th>'; }).join('') + '<th>준비 단계</th></tr></thead><tbody>' +
        gs.map(function (x) { var A = aggregate(x.rs); return '<tr><td>' + x.o + '</td><td>' + x.rs.length + '</td>' + A.lvMean.map(function (v) { return '<td>' + sc(v) + '</td>'; }).join('') + '<td><strong>' + A.stage + '단계</strong></td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    });
    h += '<p class="aidx-small">응답 수가 적으면 차이가 커 보여도 우연일 수 있습니다. 표본이 작을 때는 참고용으로 보세요.</p>';
    return h;
  }

  // ---------- 이벤트 ----------
  function render() { if (state.view === 'home') viewHome(); else if (state.view === 'survey') viewSurvey(); }
  function go(view) { state.view = view; render(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 90 }); }

  root.addEventListener('input', function (e) {
    if (e.target.name === 'org') { state.org = e.target.value; state.pending = null; }
  });

  root.addEventListener('change', function (e) {
    var t = e.target;
    state.pending = null;
    if (t.name === 'role' || t.name === 'job' || t.name === 'freq') state[t.name] = t.value;
    else if (t.type === 'radio') {
      state.answers[t.name] = +t.value;
      var li = t.closest('.aidx-item'); if (li) li.classList.remove('is-miss');
    }
    var bar = root.querySelector('.aidx-progress');
    if (bar) { var done = answered() + bgDone(); bar.firstChild.style.width = (done / (NI + BG.length) * 100) + '%'; bar.setAttribute('aria-valuenow', done); }
  });

  root.addEventListener('click', function (e) {
    var tb = e.target.closest('[data-tab]');
    if (tb) { if (!state.pool) { analyze(tb.dataset.tab); return; } state.tab = tb.dataset.tab; viewResult(); return; }
    var b = e.target.closest('[data-act]'); if (!b) return;
    var act = b.dataset.act;
    if (act === 'start') { state.answers = {}; state.role = ''; state.job = ''; state.freq = ''; state.org = ''; state.pending = null; state.page = -1; state.started = Date.now(); go('survey'); }
    else if (act === 'home') { go('home'); }
    else if (act === 'pdf') { window.DiagnosisPdf.save({ root: root, button: b, title: '우리학교 AIX 전환 준비·성숙도 진단', code: state.me && state.me.id }); }
    else if (act === 'prev') { if (state.page === -1) go('home'); else { state.page--; go('survey'); } }
    else if (act === 'next') {
      var miss = pageComplete(), err = document.getElementById('axr-err');
      if (miss) {
        err.textContent = miss === 'org' ? '학교 이름을 적어 주세요.' : miss.indexOf('bg:') === 0 ? josa(miss.slice(3), '을', '를') + ' 골라 주세요.' : '응답하지 않은 문항이 있습니다.';
        if (miss === 'org') document.getElementById('axr-org-in').focus();
        else if (miss.indexOf('bg:') !== 0) {
          PAGES[state.page].forEach(function (it) { if (state.answers[it.code] === undefined) document.getElementById('q-' + it.code).classList.add('is-miss'); });
          document.getElementById('q-' + miss).scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return;
      }
      if (state.page < PAGES.length - 1) { state.page++; go('survey'); return; }
      var rec = state.pending || { id: newId(), group: GROUP, role: state.role, job: state.job, freq: state.freq, org: state.org.trim().slice(0, 40), answers: ITEMS.map(function (it) { return state.answers[it.code]; }), seconds: Math.round((Date.now() - state.started) / 1000) };
      state.pending = rec; b.disabled = true; err.textContent = '저장하는 중…';
      submit(rec).then(function () {
        state.me = rec; state.pending = null; state.pool = null; save(LS_ME, rec); viewDone();
      }).catch(function () { b.disabled = false; err.textContent = '저장하지 못했습니다. 잠시 뒤 응답 제출을 다시 눌러 주세요.'; });
    }
    else if (act === 'analyze') { analyze('me'); }
    else if (act === 'copycode') {
      var code = b.dataset.code;
      var ok = function () { b.textContent = '복사했습니다'; b.classList.add('is-done'); setTimeout(function () { b.textContent = '복사'; b.classList.remove('is-done'); }, 1800); };
      if (navigator.clipboard) navigator.clipboard.writeText(code).then(ok, function () { window.prompt('결과 코드를 복사하세요', code); });
      else window.prompt('결과 코드를 복사하세요', code);
    }
    else if (act === 'my' || act === 'report' || act === 'group' || act === 'peers' || act === 'all' || act === 'compare') {
      var me = load(LS_ME), tab = act === 'my' || act === 'report' ? 'me' : act;
      if (me) { state.me = me; state.pool = null; analyze(tab); return; }
      state.gateTab = tab;
      if (state.view !== 'home' || !document.getElementById('axr-gate')) go('home');
      document.getElementById('axr-gate-msg').textContent = ({ group: '우리 학교 종합 결과는', peers: '타 학교(학교급) 비교는', all: '전체 응답학교 종합결과는', compare: '응답자 구분별 비교는' }[tab] || '내 결과는') + ' 먼저 진단을 완료해야 볼 수 있습니다.';
      document.getElementById('axr-gate').hidden = false;
      document.getElementById('axr-code').hidden = true;
    }
    else if (act === 'code') { document.getElementById('axr-code').hidden = false; document.getElementById('axr-code-in').focus(); }
  });

  root.addEventListener('submit', function (e) {
    if (e.target.id !== 'axr-code') return;
    e.preventDefault();
    var id = document.getElementById('axr-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, ''), err = document.getElementById('axr-code-err');
    if (id.length !== 8) { err.textContent = '코드 8자리를 입력해 주세요.'; return; }
    err.textContent = '찾는 중…';
    fetchOne(id).then(function (rec) {
      if (!rec) { err.textContent = '해당 코드의 응답이 없습니다.'; return; }
      state.me = rec; state.pool = null; save(LS_ME, rec); analyze(state.gateTab || 'me');
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
