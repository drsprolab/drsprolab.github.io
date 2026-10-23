import json, os, html, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import charts as C
C.ME, C.CMP = '#1f5a9e', '#c99a3e'
C.FONT = 'font-family="Noto Sans KR, sans-serif"'
D = os.path.dirname(os.path.abspath(__file__))
items = json.load(open(os.path.join(D, 'items.json'), encoding='utf-8'))
E = html.escape

STAGES = [
    ('F', '기반 마련', '우리 회사는', '회사는 AX를 시작할 바탕을 깔았나?', True, '경영진·지원 부서'),
    ('P', '개인 활용', '나는', '나는 업무에 AI를 쓰고 있나?', False, '구성원 개인'),
    ('W', '업무 재설계', '우리 팀은', '팀의 일하는 방식이 AI를 넣어 바뀌었나?', False, '팀 리더·팀원'),
    ('E', '전사 확산', '우리 회사는', '좋은 사례가 회사 전체로 퍼지고 있나?', True, '경영진·IT·현업 부서'),
    ('N', 'AI 내재화', '우리 회사의 업무 체계는', 'AI가 회사의 업무 체계에 녹아들었나?', True, '전사'),
]
FOCUS = {  # 문항이 재는 것(핵심어)
    'F1': '목표의 구체성', 'F2': '자원 배정', 'F3': '사용 지침', 'F4': '승인 도구', 'F5': '직무별 교육', 'F6': '역할 변화 설명',
    'P1': '반복 업무 활용', 'P2': '과업 적합성 판단', 'P3': '요청의 구체화', 'P4': '결과 검증', 'P5': '정보 보호', 'P6': '효과 확인',
    'W1': '과업 분담', 'W2': '사람 검토 단계', 'W3': '절차 재설계', 'W4': '전후 지표', 'W5': '방법의 공유 자산화', 'W6': '오류 공동 검토',
    'E1': '사례 확산 체계', 'E2': '기능 재사용', 'E3': '데이터 통합', 'E4': '데이터 품질', 'E5': '전사 성과 지표', 'E6': '평가·보상 반영',
    'N1': '감독 아래 자동 처리', 'N2': '사람-AI 공동 설계', 'N3': '시스템 책임자', 'N4': '위험 정기 점검', 'N5': 'AI 기반 의사결정', 'N6': '고객 서비스 혁신',
    'G1': 'AX 의지', 'G2': 'AX 역량',
}

def item_rows(codes):
    out = []
    for c, t in items:
        if c[0] in codes:
            out.append(f'<tr><td>{c}</td><td>{E(t)}</td><td class="fc">{FOCUS[c]}</td></tr>')
    return ''.join(out)

def item_table(keys):
    h = ''
    for k in keys:
        st = [s for s in STAGES if s[0] == k]
        if st:
            i = STAGES.index(st[0]); s = st[0]
            head = f'{i+1}단계 · {s[1]} <span class="ref">주어 “{s[2]}” · {"‘잘 모르겠다’ 있음" if s[4] else "‘잘 모르겠다’ 없음"}</span>'
        else:
            head = '전반 인식 <span class="ref">주어 “우리 회사(구성원)는” · ‘잘 모르겠다’ 있음 · 단계 판정에는 쓰지 않음</span>'
        h += f'<h4 class="ih">{head}</h4><table class="std items"><tr><th style="width:9%">코드</th><th>문항</th><th style="width:20%">재는 것</th></tr>{item_rows(k)}</table>'
    return h

ORBIT = '''<svg class="orbit" viewBox="0 0 200 200" fill="none">
<circle cx="100" cy="100" r="96" stroke="#5d7396" stroke-width=".8"/><circle cx="100" cy="100" r="68" stroke="#5d7396" stroke-width=".8"/>
<circle cx="100" cy="100" r="42" stroke="#5d7396" stroke-width=".8"/><circle cx="100" cy="100" r="19" fill="#c99a3e"/>
<circle cx="100" cy="32" r="3" fill="#cdd6e4"/><circle cx="168" cy="82" r="3" fill="#c99a3e"/><circle cx="23" cy="120" r="2.5" fill="#9fb0c8"/>
<circle cx="58" cy="172" r="3" fill="#9fb0c8"/><circle cx="153" cy="150" r="2.5" fill="#9fb0c8"/></svg>'''

RH = 'AX 전환 준비도 진단 (기업용) · 문항과 구조'

def page(no, title, lead, body, folio, head=None):
    num = f'<span class="no">{no}</span>' if no != '◆' else '<span class="dia">◆</span>'
    return f'''<section class="page"><div class="run-head">{head or RH}</div>
<h2 class="chap">{num}{title}</h2><p class="lead">{lead}</p>{body}<div class="folio">{folio}</div></section>'''

stair = ''.join(
    f'<div class="step"><span class="en">{i+1}단계 · {s[2]}</span><div class="h">{s[1]}</div>{s[3]}</div>' + ('<div class="arrow">▶</div>' if i < 4 else '')
    for i, s in enumerate(STAGES))

pages = []

# 1. 표지
pages.append(f'''<section class="page cover">
<span class="tag">PRO AnalytiX Lab · In progress 진단 · BETA</span>
<h1>AX 전환 준비도 진단<br><span class="hl">(기업용)</span> 문항과 구조</h1>
<div class="sub">목적 · 5단계 구조 · 32문항 · 점수와 판정 규칙 · 결과 화면의 활용,<br>우리 회사가 AI를 전제로 일하는 회사로 바뀔 준비를 재는 방법</div>
<div class="rule"></div>
<div class="quote">AI 도구를 들여오면 AX가 끝나는가?<br>사람이 일하는 방식에서 <span class="hl">회사의 업무 체계</span>까지<br>AI를 전제로 다시 짜는 것이 <span class="hl">AX</span>다.</div>
{ORBIT}
<div class="foot">한양대학교 PRO AnalytiX Lab · hrdpro.hanyang.ac.kr/in-progress/ax-readiness · 2026. 10. 23.</div>
</section>''')

# 2. 한눈에 보기 + 목차
pages.append(page('◆', '진단 한눈에 보기', '무엇을, 누구에게, 어떻게 묻고, 결과를 어디에 쓰는가', f'''
<table class="std"><tr><th style="width:22%">항목</th><th>내용</th></tr>
<tr><td>목적</td><td>구성원 인식으로 우리 회사의 <b>AX 준비 단계</b>와 <b>병목 단계</b>를 찾고, 다음 단계로 가기 위한 <b>행동</b>을 정한다.</td></tr>
<tr><td>대상</td><td>회사 구성원 전체 — <b>실무자(팀원) · 팀장·파트장 · 임원·경영진</b>. 부서·직급이 고르게 응답할수록 회사를 잘 대표한다.</td></tr>
<tr><td>구성</td><td><b>5단계 × 6문항 = 30문항</b> + 전반 인식 2문항 = <b>32문항</b>, 5점 동의 척도. 배경 문항 3개(직급·직무군·AI 사용 빈도).</td></tr>
<tr><td>소요·방식</td><td>약 7분 · 익명 · 웹 응답. 회사 전용 링크(<b>?group=회사코드</b>)로 응답을 한 회사로 묶는다.</td></tr>
<tr><td>판정</td><td>단계 점수 0~100점. 1단계부터 차례로 <b>60점 이상</b>인 단계까지를 “준비된 단계”로 본다(누적 규칙).</td></tr>
<tr><td>결과</td><td>① 내가 본 우리 회사 ② 우리 회사 분석결과 ③ 응답자 구분별 비교 — 세 화면과 PDF 저장.</td></tr>
</table>
<h3>목차</h3>
<ol class="toc">
<li><span class="no">01</span><span class="t">진단의 목적과 관점<span class="d">AX의 정의 · 왜 단계로 보는가 · 참고한 성숙도 모델</span></span><span class="pg">3</span></li>
<li><span class="no">02</span><span class="t">진단의 구조<span class="d">5단계 · 단계별 주어 설계 · ‘잘 모르겠다’ · 배경 문항</span></span><span class="pg">4</span></li>
<li><span class="no">03</span><span class="t">32개 문항<span class="d">단계별 문항과 각 문항이 재는 것</span></span><span class="pg">5</span></li>
<li><span class="no">04</span><span class="t">점수와 판정 규칙<span class="d">단계 점수 · 누적 판정 · 수준 · 인식 차이 · 품질 지표</span></span><span class="pg">7</span></li>
<li><span class="no">05</span><span class="t">결과 화면의 구조<span class="d">세 개의 결과 화면과 각 구성 요소</span></span><span class="pg">8</span></li>
<li><span class="no">06</span><span class="t">결과의 활용<span class="d">운영 절차 · 역할별 활용 · 해석상 유의점</span></span><span class="pg">9</span></li>
<li><span class="no">07</span><span class="t">결과 예시<span class="d">가상 수치로 본 결과 화면 · 계단 · 방사형 · 막대 · 인식 차이</span></span><span class="pg">10</span></li>
</ol>''', 2))

# 3. 목적과 관점
pages.append(page('01', '진단의 목적과 관점', 'AX는 도구 도입이 아니라 일하는 방식과 업무 체계의 재설계다', f'''
<div class="box def"><span class="label">AX (AI Transformation, AI 전환)</span>
<p>AX는 AI 도구를 들여오는 데서 끝나지 않고, <b>사람이 일하는 방식</b>부터 <b>회사의 업무 체계</b>까지 <b>AI를 전제로 다시 짜는 일</b>이다.</p></div>
<div class="box mine"><span class="label">이 진단이 답하려는 질문</span>
<p>“우리 회사는 AI를 전제로 일하는 회사로 바뀔 준비가 <b>어디까지</b> 되어 있는가? 그리고 <b>무엇부터</b> 채워야 하는가?”</p></div>
<h3>왜 ‘단계’로 보는가</h3>
<p>여러 기업 AI 성숙도 모델은 공통으로 <b>기반 → 개인 → 팀 → 전사 → 내재화</b>의 순서를 제시한다. 앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작다. 그래서 이 진단은 점수의 총합보다 <b>어느 단계에서 막혀 있는가(병목)</b>를 먼저 본다.</p>
<div class="cards c3">
<div class="card"><div class="q">어디까지 왔나?</div><div class="h">준비 단계</div>1단계부터 차례로 기준을 넘은 단계까지</div>
<div class="card gold"><div class="q">어디서 막혔나?</div><div class="h">병목 단계</div>처음으로 기준에 못 미친 단계</div>
<div class="card fill"><div class="q">무엇을 할까?</div><div class="h">행동</div>병목 단계와 그다음 단계의 <b>구체 행동</b></div>
</div>
<div class="caption">그림 1-1 | 진단이 내놓는 세 가지 답</div>
<h3>참고한 성숙도 모델</h3>
<table class="std"><tr><th style="width:22%">단계</th><th>참고 모형과 근거</th></tr>
<tr><td>1 기반 마련</td><td>MIT CISR 1단계 · McKinsey 경영진 의지 · NIST AI RMF 거버넌스 · 기보 기초·준비</td></tr>
<tr><td>2 개인 활용</td><td>Microsoft 1국면(AI 비서) · Gartner Active · 개인 변화 준비도(Holt 외, 2007)</td></tr>
<tr><td>3 업무 재설계</td><td>McKinsey 업무 흐름 재설계 · MIT CISR 2단계 · Microsoft 2국면 · 일 설계(Parker &amp; Grote, 2022)</td></tr>
<tr><td>4 전사 확산</td><td>MIT CISR 3단계 · McKinsey 성과 측정 · Cisco 데이터 · Gartner Operational · 기보 확산</td></tr>
<tr><td>5 AI 내재화</td><td>MIT CISR 4단계 · Microsoft 3국면 · NIST AI RMF · Gartner Transformational · 기보 선도</td></tr>
</table>
<div class="box note"><span class="title">주의 — 진단의 성격</span>이 진단은 <b>구성원 인식</b>으로 준비 단계를 추정한다. 다섯 단계 구성은 위 모형들의 공통 순서를 바탕으로 이 진단을 위해 구성한 것이며, 특정 모형 하나를 그대로 옮긴 것이 아니다.</div>''', 3))

# 4. 구조
pages.append(page('02', '진단의 구조', '다섯 단계 · 단계마다 주어를 바꿔 묻는다', f'''
<div class="flow">{stair}</div>
<div class="flow-note">그림 2-1 | 다섯 단계와 각 단계의 핵심 질문 — 앞 단계가 갖추어져야 다음 단계가 작동한다</div>
<h3>단계별 상태 정의</h3>
<table class="std"><tr><th style="width:16%">단계</th><th>준비된 상태</th><th style="width:19%">주로 책임질 곳</th></tr>
<tr><td>1 기반 마련</td><td>회사가 AX <b>목표</b>를 밝히고, <b>자원·사용 지침·공식 도구·기초 교육</b>으로 출발선을 마련했다.</td><td>경영진·지원 부서</td></tr>
<tr><td>2 개인 활용</td><td>구성원 각자가 반복 업무에 AI를 쓰고, 요청을 구체화하며, <b>결과를 확인</b>하고 효과를 설명할 수 있다.</td><td>구성원 개인</td></tr>
<tr><td>3 업무 재설계</td><td>팀이 과업을 AI와 사람에게 나누고, <b>사람 검토 단계</b>를 둔 채 <b>절차 자체</b>를 바꾸어 효과를 지표로 확인한다.</td><td>팀 리더·팀원</td></tr>
<tr><td>4 전사 확산</td><td>검증된 사례가 다른 부서로 퍼지고, <b>공통 플랫폼과 통합 데이터</b> 위에서 재사용하며, 성과를 <b>전사 지표·평가</b>에 반영한다.</td><td>경영진·IT·현업</td></tr>
<tr><td>5 AI 내재화</td><td>사람과 AI의 역할을 <b>처음부터 함께 설계</b>한 프로세스에서 AI가 감독 아래 일하고, 의사결정과 고객 서비스에 AI가 들어가 있다.</td><td>전사</td></tr>
</table>
<h3>설계 원칙</h3>
<ul class="numlist">
<li><b>주어 통일</b> — 한 단계 안의 문항은 주어를 같게 한다. 개인 활용은 “나는”, 업무 재설계는 “우리 팀은”, 나머지는 “우리 회사는”으로 묻는다. 응답자가 <b>자기가 직접 아는 범위</b>를 기준으로 답하게 하기 위해서다.</li>
<li><b>‘잘 모르겠다’</b> — 구성원이 직접 알기 어려운 회사 수준 단계(1·4·5단계)와 전반 인식 문항에만 둔다. 점수에서는 빼고, <b>‘모르겠다’ 비율</b>을 따로 보고한다. 비율이 높으면 회사가 그 내용을 구성원에게 알리지 않았다는 신호다.</li>
<li><b>행동 문항</b> — “중요하다고 생각한다”가 아니라 “제시했다·운영한다·확인한다”처럼 <b>있는지 없는지 확인할 수 있는 행동과 제도</b>로 묻는다.</li>
<li><b>배경 문항은 최소한</b> — 직급(4) · 직무군(6) · 최근 한 달 AI 사용 빈도(5)만 묻고, 개인을 알아볼 수 있는 정보는 묻지 않는다. 비교 분석의 보조 변수로만 쓴다.</li>
</ul>
<div class="box note"><span class="title">응답 척도</span>1 전혀 그렇지 않다 · 2 그렇지 않다 · 3 보통이다 · 4 그렇다 · 5 매우 그렇다 · (해당 문항만) 잘 모르겠다. 문항은 단계 순서대로 한 화면에 한 단계씩 제시한다.</div>''', 4))

# 5-6. 문항
pages.append(page('03', '32개 문항 (1)', '1~3단계: 회사의 출발선 · 나의 활용 · 팀의 일하는 방식', item_table('FPW'), 5))
pages.append(page('03', '32개 문항 (2)', '4~5단계와 전반 인식: 회사 전체로의 확산과 업무 체계로의 내재화', item_table(['E', 'N', 'G']) +
  '<div class="box note"><span class="title">전반 인식(G1·G2)의 역할</span>단계 판정에는 쓰지 않는다. 단계 점수와 함께 움직이는지(상관)를 보아 <b>진단이 제대로 작동하는지 확인</b>하는 데 쓰고, 회사 결과에 “AX 의지·역량에 대한 인식”으로 따로 보여 준다.</div>', 6))

# 7. 점수와 판정
pages.append(page('04', '점수와 판정 규칙', '평균을 0~100점으로 바꾸고, 앞 단계부터 차례로 판정한다', '''
<div class="box def"><span class="label">단계 점수</span>
<p>단계 점수 = (응답한 문항 평균 − 1) × 25 &nbsp;→&nbsp; <b>0~100점</b>. ‘잘 모르겠다’는 빼고 계산하며, 한 단계 6문항 가운데 <b>4문항 이상</b> 응답해야 점수를 낸다(미만이면 판단 보류).</p></div>
<div class="flow">
<div class="step"><div class="h">1단계</div>60점 이상?</div><div class="arrow">▶</div>
<div class="step"><div class="h">2단계</div>60점 이상?</div><div class="arrow">▶</div>
<div class="step"><div class="h">3단계</div>60점 이상?</div><div class="arrow">▶</div>
<div class="step"><div class="h">4단계</div>60점 이상?</div><div class="arrow">▶</div>
<div class="step"><div class="h">5단계</div>60점 이상?</div></div>
<div class="flow-note">그림 4-1 | 누적 판정 — 처음으로 60점에 못 미친 단계에서 멈춘다. 그 단계가 <b>병목</b>이다</div>
<table class="std"><tr><th style="width:24%">규칙</th><th>내용</th></tr>
<tr><td>준비된 단계</td><td>1단계부터 차례로 기준점(<b>60점</b>) 이상인 단계까지. 예) 1·2단계 60점 이상, 3단계 52점 → “2단계까지 준비됨”, 병목 = 3단계 업무 재설계. 뒤 단계 점수가 높아도 앞에서 멈춘다.</td></tr>
<tr><td>회사의 단계</td><td>응답자들의 <b>단계별 평균 점수</b>에 같은 누적 규칙을 적용한다.</td></tr>
<tr><td>수준 이름</td><td>80점 이상 <b>주도</b> · 60~79 <b>정착</b> · 40~59 <b>형성</b> · 40 미만 <b>시작</b></td></tr>
<tr><td>인식 차이</td><td>나 − 다른 응답자 평균. <b>±10점</b> 안은 비슷함, 10점 이상은 눈여겨볼 차이, <b>20점</b> 이상은 큰 차이. 표준화 차이(차이 ÷ SD)가 ±0.5 이상이면 뚜렷한 차이.</td></tr>
<tr><td>최소 인원</td><td>회사 결과와 비교는 <b>5명</b> 이상부터 안정. 응답자 구분별 비교는 각 구분 <b>3명</b> 이상만 표시(응답자 보호).</td></tr>
</table>
<h3>결과를 믿을 수 있는지 보는 지표</h3>
<table class="std"><tr><th style="width:24%">지표</th><th>계산</th><th style="width:30%">읽는 법</th></tr>
<tr><td>합의도 rwg(j)</td><td>회사 주어 단계(1·4·5)에서 문항 분산 평균을 균등분포 기대분산(5점 척도 = 2)과 비교</td><td><b>.70 이상</b>이면 평균을 회사의 상태로 읽을 수 있다</td></tr>
<tr><td>신뢰도 α</td><td>단계 6문항의 내적 일관성. ‘모르겠다’ 없이 응답한 10명 이상일 때</td><td>높을수록 한 단계의 문항이 같은 것을 잰다</td></tr>
<tr><td>단계 순서 일치율</td><td>다섯 단계 점수가 모두 있는 응답자 중, 앞 단계를 넘지 못했는데 뒤 단계를 넘은 경우가 없는 비율</td><td>높을수록 단계 순서 가정이 맞다</td></tr>
<tr><td>단계-전반 인식 상관</td><td>다섯 단계 평균과 G1·G2 점수의 상관 r</td><td>단계 점수가 의지·역량 인식과 함께 움직이는 정도</td></tr>
</table>
<div class="box note"><span class="title">주의 — 잠정 기준</span>기준점 60점과 단계 순서는 <b>타당화 전의 잠정 기준</b>이다. 응답이 쌓이면 위 지표로 점검해 조정한다.</div>''', 7))

# 8. 결과 화면
pages.append(page('05', '결과 화면의 구조', '응답 → 점수 → 단계 판정 → 세 개의 결과 화면', '''
<div class="flow">
<div class="step"><div class="h">응답</div>32문항 + 배경 3문항<span class="en">결과 코드 발급</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">점수</div>단계별 0~100점<span class="en">‘모르겠다’ 제외</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">판정</div>준비 단계 · 병목<span class="en">누적 규칙</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">비교</div>나 ↔ 회사 ↔ 직급<span class="en">같은 회사 링크끼리</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">행동</div>개인 · 팀 · 회사<span class="en">단계별 행동 목록</span></div></div>
<div class="flow-note">그림 5-1 | 결과가 만들어지는 흐름</div>
<table class="std"><tr><th style="width:18%">화면</th><th>구성 요소</th><th style="width:27%">무엇에 쓰나</th></tr>
<tr><td>① 내가 본 우리 회사<span class="en">개인 결과</span></td><td>내가 본 준비 단계(계단 그림) · 핵심 숫자(내 단계, 다른 응답자가 가장 많이 본 단계, 인식 차이가 가장 큰 단계, ‘모르겠다’ 수) · <b>단계별 인식 차이</b> 막대 · 다른 응답자의 단계 분포 · 단계별 비교표(표준화 차이, 위치) · 차이가 가장 큰 단계의 풀이 · <b>지금 내가 해 볼 수 있는 것</b></td><td>내 인식이 동료와 어디서 다른지 알고, 개인이 할 행동을 정한다</td></tr>
<tr><td>② 우리 회사 분석결과<span class="en">회사 결과</span></td><td>회사의 준비 단계와 <b>병목</b> · 핵심 숫자(응답자, 준비된 단계, 전반 인식, ‘모르겠다’ 비율) · 단계별 회사 평균 · 단계별 수준 분포 · 기초 통계(평균, SD, 준비됨 비율, 합의도, α) · <b>가장 잘 갖춘 것과 가장 비어 있는 것</b>(문항 단위) · 구성원이 잘 모르는 것 · <b>다음 단계로 가려면</b>(병목과 그다음 단계의 행동) · 진단 도구 점검</td><td>회사가 어느 단계에 있고 무엇부터 채울지 정한다</td></tr>
<tr><td>③ 응답자 구분별 비교<span class="en">직급·직무·빈도</span></td><td>직급별 단계 평균과 판정 단계 · <b>경영진·리더와 실무자의 인식 차이</b>(가장 큰 단계) · 직무군별 · AI 사용 빈도별 단계 평균</td><td>위아래, 부서 사이의 체감 차이를 찾고 소통 지점을 정한다</td></tr>
</table>
<h3>행동 제안은 어떻게 고르나</h3>
<ul class="dots">
<li><b>회사</b>: 병목 단계와 그다음 단계에 대해, 그 단계에서 평균이 가장 낮은 문항 2개와 단계별 행동 목록(단계마다 3개)을 보여 준다.</li>
<li><b>개인</b>: 내가 직접 바꿀 수 있는 개인 활용·업무 재설계 가운데 80점 미만인 단계마다 개인 행동 3개와 “아직 갖추지 못했다고 답한 것”을, 이어서 회사 전체의 병목에 대해 팀과 회사에 제안할 행동 2개를 보여 준다. 인식 차이가 가장 큰 단계는 “내가 더 높게 봄 / 더 낮게 봄”에 맞춘 풀이와 행동 3개를 따로 보여 준다.</li>
<li>모든 결과 화면은 <b>PDF로 저장</b>해 회의 자료로 쓸 수 있다.</li>
</ul>''', 8))

# 9. 활용
pages.append(page('06', '결과의 활용', '진단 → 결과 공유 회의 → 병목 과제 실행 → 재진단', '''
<h3>운영 절차</h3>
<div class="flow">
<div class="step"><div class="h">① 준비</div>회사 코드를 정해 전용 링크 배포<span class="en">?group=회사코드</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">② 응답</div>부서·직급이 고르게 응답<span class="en">최소 5명, 권장 30명 이상</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">③ 공유</div>회사 결과를 함께 읽는 회의<span class="en">병목·모르겠다·인식 차이</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">④ 실행</div>병목 단계 과제 2~3개<span class="en">책임자·기한·지표</span></div><div class="arrow">▶</div>
<div class="step"><div class="h">⑤ 재진단</div>3~6개월 뒤 같은 링크<span class="en">단계 이동 확인</span></div></div>
<div class="flow-note">그림 6-1 | 진단 결과를 실행으로 잇는 순환 — 권장 인원과 주기는 운영 제안이다</div>
<h3>누가 무엇을 보나</h3>
<table class="std"><tr><th style="width:18%">역할</th><th>먼저 볼 결과</th><th style="width:36%">이어서 할 일</th></tr>
<tr><td>경영진</td><td>회사의 준비 단계와 병목 · 1·4·5단계 점수 · 경영진과 실무자의 인식 차이</td><td>병목 단계에 자원과 책임자를 배정하고, AX 목표를 다시 알린다</td></tr>
<tr><td>HR·AX 담당</td><td>‘모르겠다’ 비율 · 가장 비어 있는 문항 · 합의도 · 직무군별 차이</td><td>지침·도구·교육의 전달 경로를 고치고, 직무별 프로그램을 설계한다</td></tr>
<tr><td>팀장</td><td>3단계 업무 재설계 점수 · 직급별 차이 · 다음 단계로 가려면</td><td>팀 과업 목록에서 AI가 맡을 부분과 사람 검토 단계를 정한다</td></tr>
<tr><td>구성원</td><td>내가 본 우리 회사 · 인식 차이가 가장 큰 단계</td><td>지금 내가 해 볼 수 있는 것 가운데 하나를 이번 주에 실행한다</td></tr>
</table>
<h3>결과를 이렇게 읽는다</h3>
<ul class="situations">
<li><b>‘모르겠다’가 30%를 넘는 단계</b>제도가 없어서인지, 있는데 알려지지 않아서인지 먼저 가린다. 후자라면 새 제도보다 <b>공지 방식</b>을 바꾼다.</li>
<li><b>합의도가 .70보다 낮은 단계</b>회사 평균 하나로 읽지 않는다. 응답자 구분별 비교에서 <b>어느 직급·직무가 다르게 보는지</b> 확인한다.</li>
<li><b>뒤 단계 점수가 앞 단계보다 높은 경우</b>판정은 앞 단계에서 멈춘다. 일부 부서의 앞선 사례가 회사 전체의 바탕 없이 돌아가고 있을 수 있다.</li>
</ul>
<div class="box note"><span class="title">해석상 유의점</span>이 진단은 BETA다. 단계는 <b>구성원 인식</b>으로 추정한 것이므로, 공식 성숙도 판정에는 문서·지표 같은 <b>증거 확인</b>을 함께 쓴다. 응답은 익명이며, 결과 코드는 응답자 본인만 결과를 다시 볼 수 있게 하는 용도다.</div>''', 9))


NAMES = [st[1] for st in STAGES]
ME_V, CO_V = [72, 80, 63, 44, 36], [67, 65, 52, 38, 32]
DIFF = [a - b for a, b in zip(ME_V, CO_V)]
def lv(v): return '주도' if v >= 80 else '정착' if v >= 60 else '형성' if v >= 40 else '시작'
def sg(d): return ('+' if d > 0 else '−' if d < 0 else '±') + str(abs(d))
pages.append(page('07', '결과 예시 (1)', '응답자 한 사람이 받는 결과 화면을 가상 수치로 재구성했다', f'''
<div class="box note"><span class="title">예시의 전제</span>같은 회사 응답 <b>40명</b>, 결과를 보는 사람은 <b>팀장·파트장</b> 한 명이라고 가정한다. 모든 수치는 이해를 돕기 위한 <b>가상 예시</b>이며 실제 진단 결과가 아니다.</div>
<div class="exfigs"><div>{C.stairs(NAMES, 2)}<div class="caption">그림 7-1 | 회사의 준비 단계 — 2단계까지 준비, 3단계가 병목</div></div>
<div>{C.radar(NAMES, [('나', ME_V, C.ME), ('우리 회사 평균', CO_V, C.CMP)])}<div class="caption">그림 7-2 | 단계별 점수 방사형 — 나와 회사 평균</div></div></div>
<h3>판정은 이렇게 나온다</h3>
<div class="cards c2">
<div class="card fill"><div class="q">우리 회사</div><div class="h">2단계 · 개인 활용까지 준비됨</div>병목은 <b>3단계 업무 재설계</b>(평균 52점). 이 단계에서 “준비됨”(60점 이상)이라고 본 응답자는 33%다.</div>
<div class="card gold"><div class="q">나</div><div class="h">3단계 · 업무 재설계까지 준비됨</div>회사 판정보다 <b>한 단계 높게</b> 보고 있다. 나의 다음 관문은 4단계 전사 확산(44점)이다.</div>
</div>
<div class="box key"><span class="title">한 줄 해석</span>회사는 <b>기반과 개인 활용은 갖추었지만</b>, 팀 단위로 일하는 방식을 바꾸는 데서 막혀 있다. 전사 확산·내재화보다 <b>업무 재설계</b>를 먼저 채운다.</div>''', 10))
rows = ''.join(f'<tr><td>{i+1}. {NAMES[i]}</td><td>{ME_V[i]}</td><td>{CO_V[i]}</td><td>{sg(DIFF[i])}</td><td>{lv(CO_V[i])}</td></tr>' for i in range(5))
pages.append(page('07', '결과 예시 (2)', '나와 회사의 차이를 읽고, 행동으로 옮긴다', f'''
<div class="exfigs"><div>{C.bars(NAMES, [('나', ME_V, C.ME), ('우리 회사 평균', CO_V, C.CMP)])}<div class="caption">그림 7-3 | 단계별 점수 비교(0~100점)</div></div>
<div>{C.diverging(NAMES, DIFF)}<div class="caption">그림 7-4 | 단계별 인식 차이(나 − 회사 평균)</div></div></div>
<table class="std"><tr><th>단계</th><th>나</th><th>우리 회사 평균</th><th>차이</th><th>회사 수준</th></tr>{rows}</table>
<div class="caption">표 7-1 | 단계별 비교표 예시</div>
<p>인식 차이가 가장 큰 단계는 <b>개인 활용(+15점)</b>이다. 나는 팀의 AI 활용을 회사 평균보다 좋게 보고 있다. 앞서 있는 팀이라면, 그 방법을 정리해 <b>다른 팀에 공유할 근거</b>가 된다.</p>
<div class="cards c2">
<div class="card"><div class="q">회사가 할 일 · 병목 3단계</div><div class="h">업무 재설계</div>팀별 과업 목록에서 <b>AI가 맡을 과업과 사람 검토 단계</b>를 표시한다.<br>팀 업무 절차서에 <b>AI 사용·검토 단계</b>를 적어 넣는다.</div>
<div class="card gold"><div class="q">내가 할 일</div><div class="h">앞선 방법 나누기</div>우리 팀이 AI를 쓰는 방식을 <b>문서로 정리해 공유</b>한다.<br>효과를 <b>숫자(시간·오류 수)</b>로 남겨 확산의 근거로 쓴다.</div>
</div>''', 11))
out = f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>AX 전환 준비도 진단 (기업용) · 문항과 구조</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="course.css">
<style>
.items {{ font-size: 8.3pt; margin-bottom: 3mm; }}
.items td {{ padding: 1.15mm 2.6mm; line-height: 1.5; }}
.items th {{ padding: 1.6mm 2.6mm; }}
.items td.fc {{ color: var(--gold-deep); font-weight: 500; }}
h4.ih {{ color: var(--navy); font-size: 10pt; margin: 3mm 0 1.2mm; }}
h4.ih .ref {{ font-weight: 400; color: var(--muted); font-size: 7.8pt; margin-left: 6px; }}
.flow .step {{ padding: 2.4mm 1.6mm; }}
.exfigs {{ display: flex; gap: 4mm; align-items: flex-end; margin: 4mm 0 2mm; }}
.exfigs > div {{ flex: 1; text-align: center; }}
.exfigs svg {{ max-width: 100%; height: auto; }}
</style></head><body class="handout">
{''.join(pages)}
</body></html>'''
open(os.path.join(D, 'ax-readiness-structure.html'), 'w', encoding='utf-8').write(out)
print('ok')
