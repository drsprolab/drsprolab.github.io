"""In progress 진단마다 '설문 문항과 구조' 설명서 PDF를 두 가지로 만든다. 둘 다 Ⅵ장(결과 예시)에 가상 결과 그림을 넣는다.
- 실무자용: 의견서 형식(개조식, Ⅰ~Ⅵ장, 회색 머리행 표, Pretendard·명조) → assets/files/<slug>-structure.pdf
- 보고용: 남색·금색 보고서 형식(표지, 한눈에 보기, 01~06장) → assets/files/<slug>-structure-report.pdf
  (ax-readiness의 보고용은 손으로 다듬은 판을 tools/diagnosis-docs/report/build.py로 따로 만든다)

사용: python3 tools/diagnosis-docs/build.py [slug ...]
- 문항은 각 진단의 JS·HTML·JSON에서 그대로 읽어 오므로, 문항을 고친 뒤 다시 실행하면 PDF도 맞춰진다.
- 새 진단을 In progress에 올리면 여기에 spec을 추가하고, 카드에 두 내려받기 버튼을 단다(README.md).
- HTML 중간본은 tools/diagnosis-docs/out/ 에 남긴다.
- Google Chrome(헤드리스)으로 인쇄한다. 글꼴(Pretendard, Noto Serif KR)은 CDN에서 불러온다.
"""
import html, os, re, subprocess, sys, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import charts as C

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
E = html.escape
TODAY = datetime.date.today()
DATE = f'{TODAY.year}. {TODAY.month}. {TODAY.day}.'


def items_of(js):
    s = open(os.path.join(ROOT, 'assets/js', js), encoding='utf-8').read()
    return re.findall(r"^\s*\['([A-Z]\d)', '(.*?)'\],?$", s, re.M)


# ---------- 문서 조각 ----------
def sq(t, *kids):  # □ 항목과 ○ 하위 항목
    return f'<div class="sq">□ {t}</div>' + ''.join(kids)


def ci(t, *kids):
    return f'<div class="ci">○ {t}</div>' + ''.join(kids)


def da(t):
    return f'<div class="da">- {t}</div>'


def note(t):
    return f'<div class="nt">※ {t}</div>'


def table(head, rows, widths=None, cls=''):
    cols = ''.join(f'<col style="width:{w}">' for w in widths) if widths else ''
    h = ''.join(f'<th>{x}</th>' for x in head)
    b = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in r) + '</tr>' for r in rows)
    return f'<table class="op {cls}"><colgroup>{cols}</colgroup><thead><tr>{h}</tr></thead><tbody>{b}</tbody></table>'


def item_table(items, groups, focus_col=True):
    """groups: [(코드 접두, '구분 이름', {코드: 재는 것})]. 구분마다 표 안에 구분 행을 넣어, 쪽이 바뀌어도 행 단위로 나뉘게 한다."""
    rows = []
    for pre, name, focus in groups:
        rows.append(f'<tr class="gh"><td colspan="3">{name}</td></tr>')
        rows += [f'<tr><td class="cd">{c}</td><td>{E(t)}</td>' + (f'<td class="fc">{focus.get(c, "")}</td>' if focus_col else '') + '</tr>' for c, t in items if c[0] == pre]
    if not focus_col:
        rows = [r.replace('colspan="3"', 'colspan="2"') for r in rows]
    return ('<table class="op items"><colgroup><col style="width:8%"><col>' + ('<col style="width:18%">' if focus_col else '') + '</colgroup>'
            '<thead><tr><th>코드</th><th>문항</th>' + ('<th>측정 내용</th>' if focus_col else '') + '</tr></thead><tbody>' + ''.join(rows) + '</tbody></table>')


def fig(svg, cap):
    return f'<figure class="fg">{svg}<figcaption>{cap}</figcaption></figure>'


def figs(*fs):
    return '<div class="fgs">' + ''.join(fs) + '</div>'


def lvl(v):
    return '주도' if v >= 80 else '정착' if v >= 60 else '형성' if v >= 40 else '시작'


def sgn(d):
    return ('+' if d > 0 else '−' if d < 0 else '±') + str(abs(d))


def doc(title, sub, chapters):
    body = ''.join(f'<section class="ch{" newpage" if h.startswith("Ⅵ") else ""}"><h2>{h}</h2>{c}</section>' for h, c in chapters)
    return f'''<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{E(title)}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&display=swap">
<style>{CSS}</style></head><body>
<header class="hd"><h1>{E(title)}</h1><p class="sub">{sub}</p></header>
<p class="date">{DATE}</p>{body}
<p class="org">PRO AnalytiX Lab · 한양대학교 · hrdpro.hanyang.ac.kr</p>
</body></html>'''


CSS = '''
@page { size: A4; margin: 20mm 18mm 18mm; @bottom-center { content: "- " counter(page) " -"; font: 8.5pt Pretendard, sans-serif; color: #444; } }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; }
body { font-family: "Noto Serif KR", "AppleMyungjo", serif; font-size: 10.3pt; line-height: 1.75; color: #111; word-break: keep-all; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.hd { border-top: 2.4pt solid #111; border-bottom: 0.8pt solid #111; padding: 9mm 0 6mm; text-align: center; }
.hd h1 { font-family: Pretendard, sans-serif; font-weight: 700; font-size: 19pt; letter-spacing: -0.02em; margin: 0 0 3mm; }
.hd .sub { font-family: Pretendard, sans-serif; font-size: 9.6pt; color: #222; margin: 0; }
.date { text-align: right; margin: 4mm 0 2mm; font-size: 10pt; }
.ch { margin-top: 7mm; }
.ch:first-of-type { margin-top: 5mm; }
.ch.newpage { break-before: page; margin-top: 0; }
h2 { font-family: Pretendard, sans-serif; font-weight: 700; font-size: 13.5pt; margin: 0 0 3mm; padding-bottom: 2.4mm; border-bottom: 0.8pt solid #111; break-after: avoid; }
h3 { font-family: Pretendard, sans-serif; font-weight: 700; font-size: 11.2pt; margin: 5mm 0 2mm; break-after: avoid; }
.sq { margin: 1.6mm 0 0.6mm; padding-left: 1.25em; text-indent: -1.25em; }
.ci { padding-left: 2.6em; text-indent: -1.3em; margin: 0.4mm 0; }
.da { padding-left: 3.7em; text-indent: -0.9em; margin: 0.2mm 0; }
.nt { font-size: 9pt; color: #333; padding-left: 1.2em; text-indent: -1.2em; margin: 1.2mm 0; }
table.op { width: 100%; border-collapse: collapse; margin: 2.5mm 0 3mm; font-size: 9.3pt; line-height: 1.6; }
table.op th { font-family: Pretendard, sans-serif; font-weight: 600; background: #e9ebee; border-top: 1.2pt solid #111; border-bottom: 0.6pt solid #999; padding: 2mm 2.2mm; text-align: center; }
table.op td { border-bottom: 0.6pt solid #bbb; padding: 2mm 2.6mm; vertical-align: middle; }
table.op th + th, table.op td + td { border-left: 0.6pt solid #bbb; }
table.op tbody tr:last-child td { border-bottom: 1.2pt solid #111; }
table.op td:first-child { font-family: Pretendard, sans-serif; font-weight: 600; text-align: center; background: #f6f7f8; }
table.op tr { break-inside: avoid; }
table.op thead { display: table-header-group; }
table.items td.cd { font-family: Pretendard, sans-serif; text-align: center; color: #333; }
table.items tr.gh td { background: #f1f2f4; font-family: Pretendard, sans-serif; font-weight: 700; text-align: left; padding: 1.6mm 2.6mm; break-after: avoid; }
table.items tr.gh td span { font-weight: 400; color: #444; font-size: 8.6pt; }
table.items td.fc { font-family: Pretendard, sans-serif; font-size: 8.8pt; text-align: center; }
table.items td.cd { background: #f6f7f8; font-weight: 600; }
.cap { font-family: Pretendard, sans-serif; font-weight: 600; font-size: 9.3pt; text-align: center; margin: 3mm 0 0; break-after: avoid; }
.flow { display: flex; align-items: stretch; gap: 1.6mm; margin: 2.5mm 0 1mm; font-family: Pretendard, sans-serif; font-size: 8.6pt; break-inside: avoid; }
.flow div { flex: 1; border: 0.8pt solid #111; padding: 2mm 1.5mm; text-align: center; line-height: 1.45; }
.flow div b { display: block; font-size: 9.6pt; margin-bottom: 0.6mm; }
.flow span { align-self: center; font-size: 9pt; }
.fgs { display: flex; gap: 4mm; justify-content: space-between; align-items: flex-end; margin: 3mm 0 1mm; break-inside: avoid; }
.fg { margin: 0; flex: 1; text-align: center; break-inside: avoid; }
.fg svg { max-width: 100%; height: auto; }
.fg figcaption { font-family: Pretendard, sans-serif; font-weight: 600; font-size: 9.3pt; margin-top: 1.5mm; }
.ex { border: 0.8pt solid #111; padding: 2.5mm 4mm; margin: 2.5mm 0; break-inside: avoid; }
.org { margin-top: 9mm; padding-top: 2.5mm; border-top: 0.6pt solid #999; font-family: Pretendard, sans-serif; font-size: 8.6pt; color: #444; text-align: right; }
b { font-weight: 600; }
'''


def flow(steps):
    return '<div class="flow">' + '<span>→</span>'.join(f'<div><b>{a}</b>{b}</div>' for a, b in steps) + '</div>'


# ---------- 공통: 5단계 준비도 진단 (기업용·학교용) ----------
def readiness(spec):
    items = items_of(spec['js'])
    S = spec['stages']
    stage_rows = [[f'{i+1}단계<br>{s[0]}', f'“{s[1]}”', s[2], s[3], s[4]] for i, s in enumerate(S)]
    groups = [(k, f'{i+1}단계 · {S[i][0]} <span>(주어 “{S[i][1]}”)</span>', spec['focus']) for i, k in enumerate('FPWEN')] + [('G', '전반 인식', spec['focus'])]
    U = spec['unit']  # '회사' 또는 '학교'
    ch = []
    ch.append(('Ⅰ. 진단 개요',
        sq('진단 목적', *[ci(t) for t in spec['purpose']]) +
        sq('진단 대상: ' + spec['target']) +
        sq('진단 구성', ci('5단계 준비도 30문항(단계별 6문항)과 전반 인식 2문항, 총 <b>32문항</b>, 5점 동의 척도'),
           ci('배경 문항: ' + spec['bg'] + '. 개인을 식별할 수 있는 정보는 묻지 않음'),
           ci('소요 시간 약 7분, 익명 웹 응답, 응답 직후 결과 확인(결과 코드 발급)')) +
        sq('작성 방식: 진단의 관점 → 구조 → 문항 → 점수와 판정 → 결과의 구성과 활용 → 결과 예시 순으로 정리하고, 각 장의 기준이 실제 진단 화면의 계산 방식과 일치하도록 작성함')))
    ch.append(('Ⅱ. 진단의 관점과 구조',
        '<h3>1. 진단의 관점</h3>' +
        sq(spec['view'][0], *[ci(t) for t in spec['view'][1:]]) +
        '<h3>2. 5단계 구조</h3>' +
        flow([(f'{i+1}단계', s[0]) for i, s in enumerate(S)]) +
        '<p class="cap">&lt;표 1&gt; 단계별 문항 주어, 핵심 질문, 준비된 상태, 책임 주체</p>' +
        table(['단계', '문항 주어', '핵심 질문', '준비된 상태', '주로 책임질 곳'], stage_rows, ['13%', '14%', '19%', '38%', '16%']) +
        '<h3>3. 설계 원칙</h3>' +
        sq('주어 통일: 한 단계 안의 문항은 주어를 같게 하여, 응답자가 <b>직접 아는 범위</b>를 기준으로 답하게 함',
           ci(spec['subject_note'])) +
        sq('‘잘 모르겠다’ 선택지: ' + spec['unk_note'],
           ci('점수 계산에서는 제외하고, 단계별 ‘모르겠다’ 비율을 따로 보고함'),
           ci(f'비율이 높은 단계는 {U}가 그 내용을 구성원에게 충분히 알리지 않았다는 신호로 해석함')) +
        sq('행동·제도 문항: “중요하다고 생각한다”가 아닌 “제시했다·운영한다·확인한다”처럼 <b>있는지 없는지 확인할 수 있는</b> 행동과 제도로 물음') +
        sq('참고 모형: ' + spec['basis_intro'], *[ci(f'({i+1}단계) {b}') for i, b in enumerate(spec['basis'])])))
    ch.append(('Ⅲ. 진단 문항',
        sq('응답 척도: 1 전혀 그렇지 않다 · 2 그렇지 않다 · 3 보통이다 · 4 그렇다 · 5 매우 그렇다 · (해당 문항만) 잘 모르겠다') +
        sq('제시 순서: 단계 순서대로 한 화면에 한 단계씩, 마지막 화면에 전반 인식 문항') +
        '<p class="cap">&lt;표 2&gt; 단계별 진단 문항과 측정 내용</p>' + item_table(items, groups) +
        note('전반 인식(G1·G2)은 단계 판정에 쓰지 않음. 단계 점수와 함께 움직이는지(상관)를 보아 진단이 제대로 작동하는지 확인하고, 결과에 “' + spec.get('gname', 'AX') + ' 의지·역량에 대한 인식”으로 따로 보여 줌')))
    ch.append(('Ⅳ. 점수 산출과 판정',
        '<p class="cap">&lt;표 3&gt; 점수 산출과 판정 기준</p>' +
        table(['구분', '산출·판정 기준', '비고'], [
            ['단계 점수', '(응답한 문항 평균 − 1) × 25 → <b>0~100점</b>', '‘잘 모르겠다’ 제외, 6문항 중 4문항 이상 응답 시 산출(미만은 판단 보류)'],
            ['준비된 단계', '1단계부터 차례로 기준점 <b>60점</b> 이상인 단계까지(누적 판정)', '처음으로 60점에 못 미친 단계가 <b>병목</b>'],
            [f'{U}의 단계', f'같은 {U} 응답자들의 <b>단계별 평균 점수</b>에 같은 누적 규칙 적용', spec['unit_note']],
            ['수준 이름', '80점 이상 주도 · 60~79 정착 · 40~59 형성 · 40 미만 시작', '단계 점수와 종합 점수에 공통 적용'],
            ['인식 차이', '나 − 다른 응답자 평균. ±10점 안은 비슷함, 10점 이상 주목, 20점 이상 큰 차이', '표준화 차이(차이 ÷ SD) ±0.5 이상이면 뚜렷한 차이'],
            ['최소 인원', f'{U} 결과·비교는 5명 이상부터 안정. 응답자 구분별 비교는 구분마다 3명 이상만 표시' + spec.get('min_extra', ''), '응답자 보호와 결과 안정성'],
        ], ['16%', '50%', '34%']) +
        sq('예시: 1·2단계 60점 이상, 3단계 52점이면 “2단계까지 준비됨”, 병목은 3단계. 4단계 점수가 높더라도 판정은 3단계에서 멈춤') +
        '<p class="cap">&lt;표 4&gt; 결과의 신뢰성을 확인하는 지표</p>' +
        table(['지표', '계산', '읽는 법'], [
            ['합의도 rwg(j)', f'{U} 주어 단계(1·4·5단계)의 문항 분산 평균을 균등분포 기대분산(5점 척도 = 2)과 비교', '.70 이상이면 평균을 ' + U + '의 상태로 읽을 수 있음'],
            ['신뢰도 α', '단계 6문항의 내적 일관성(‘모르겠다’ 없이 응답한 10명 이상일 때)', '높을수록 한 단계의 문항이 같은 것을 잼'],
            ['단계 순서 일치율', '앞 단계를 넘지 못했는데 뒤 단계를 넘은 응답이 없는 비율', '높을수록 단계 순서 가정이 맞음'],
            ['단계–전반 인식 상관', '다섯 단계 평균과 G1·G2 점수의 상관 r', '단계 점수가 의지·역량 인식과 함께 움직이는 정도'],
        ], ['18%', '50%', '32%']) +
        note('기준점 60점과 단계 순서는 타당화 전의 잠정 기준이며, 응답이 쌓이면 위 지표로 점검해 조정함')))
    ch.append(('Ⅴ. 결과의 구성과 활용',
        '<h3>1. 결과 화면의 구성</h3>' +
        flow(spec['flow']) +
        '<p class="cap">&lt;표 5&gt; 결과 화면별 주요 내용과 활용</p>' +
        table(['결과 화면', '주요 내용', '활용'], spec['tabs'], ['18%', '56%', '26%']) +
        sq('행동 제안 산출 방식', *[ci(t) for t in spec['advice']]) +
        sq('모든 결과 화면은 PDF 결과 보고서로 저장하여 회의 자료로 활용할 수 있음') +
        '<h3>2. 활용 절차</h3>' +
        sq('운영 절차', *[ci(t) for t in spec['steps']]) +
        '<p class="cap">&lt;표 6&gt; 역할별 결과 활용</p>' +
        table(['역할', '먼저 볼 결과', '이어서 할 일'], spec['roles'], ['16%', '42%', '42%']) +
        '<h3>3. 해석상 유의 사항</h3>' +
        sq('‘모르겠다’가 30%를 넘는 단계: 제도가 없어서인지, 있는데 알려지지 않아서인지 먼저 가리고, 후자라면 새 제도보다 공지 방식을 바꿈') +
        sq(f'합의도가 .70보다 낮은 단계: {U} 평균 하나로 읽지 않고, 응답자 구분별 비교에서 어느 구분이 다르게 보는지 확인함') +
        sq('뒤 단계 점수가 앞 단계보다 높은 경우: 판정은 앞 단계에서 멈춤. 일부의 앞선 사례가 바탕 없이 운영되고 있을 수 있음') +
        sq('이 진단은 BETA임. 단계는 <b>구성원 인식</b>으로 추정한 것이므로, 공식 성숙도 판정에는 문서·지표 같은 증거 확인을 함께 사용함')))
    ch.append(('Ⅵ. 결과 예시', readiness_example(spec)))
    glance = [('목적', spec['purpose'][0]), ('대상', spec['target']),
              ('구성', '5단계 × 6문항 = 30문항 + 전반 인식 2문항 = <b>32문항</b>, 5점 동의 척도, 약 7분 · 익명'),
              ('판정', '단계 점수 0~100점. 1단계부터 차례로 <b>60점 이상</b>인 단계까지를 “준비된 단계”로 봄(누적 판정)'),
              ('결과', ' · '.join(re.sub('<br>', ' ', t[0]) for t in spec['tabs']))]
    return spec['title'] + ' 문항과 구조', spec['sub'], glance, ch


AXR = dict(
    js='ax-readiness.js', unit='회사', title='AX 전환 준비도 진단 (기업용)',
    sub='진단 목적 · 5단계 구조 · 32문항 · 점수와 판정 · 결과의 구성과 활용',
    purpose=['구성원 인식으로 우리 회사의 <b>AX 준비 단계</b>와 <b>병목 단계</b>를 찾음',
             '나와 동료, 경영진과 실무자의 <b>인식 차이</b>를 확인함',
             '병목 단계부터 개인·팀·회사가 할 <b>행동</b>을 정함'],
    target='회사 구성원 전체(실무자·팀장·파트장·임원·경영진). 회사 전용 링크(?group=회사코드)로 응답을 한 회사로 묶음',
    bg='직급(실무자·팀장·파트장·임원·경영진·기타), 직무군(6개), 최근 한 달 업무 AI 사용 빈도(5단계)',
    view=['AX(AI 전환)는 AI 도구 도입에서 끝나지 않고, 사람이 일하는 방식부터 회사의 업무 체계까지 AI를 전제로 다시 짜는 일임',
          '여러 기업 AI 성숙도 모델은 공통으로 기반 → 개인 → 팀 → 전사 → 내재화의 순서를 제시함',
          '앞 단계가 비어 있으면 뒤 단계에 투자해도 효과가 작으므로, 점수의 총합보다 <b>어느 단계에서 막혀 있는가(병목)</b>를 먼저 봄'],
    stages=[('기반 마련', '우리 회사는', '회사는 AX를 시작할 바탕을 깔았나?', '회사가 AX 목표를 밝히고 자원·사용 지침·공식 도구·기초 교육으로 출발선을 마련함', '경영진·지원 부서'),
            ('개인 활용', '나는', '나는 업무에 AI를 쓰고 있나?', '구성원 각자가 반복 업무에 AI를 쓰고, 요청을 구체화하며, 결과를 확인하고 효과를 설명함', '구성원 개인'),
            ('업무 재설계', '우리 팀은', '팀의 일하는 방식이 AI를 넣어 바뀌었나?', '팀이 과업을 AI와 사람에게 나누고 사람 검토 단계를 둔 채 절차를 바꾸어 효과를 지표로 확인함', '팀 리더·팀원'),
            ('전사 확산', '우리 회사는', '좋은 사례가 회사 전체로 퍼지고 있나?', '검증된 사례가 다른 부서로 퍼지고, 통합 데이터 위에서 기능을 재사용하며, 성과를 전사 지표·평가에 반영함', '경영진·IT·현업'),
            ('AI 내재화', '우리 회사의 업무 체계는', 'AI가 회사의 업무 체계에 녹아들었나?', '사람과 AI의 역할을 처음부터 함께 설계한 프로세스에서 AI가 감독 아래 일하고, 의사결정과 고객 서비스에 AI가 들어감', '전사')],
    subject_note='개인 활용은 “나는”, 업무 재설계는 “우리 팀은”, 기반 마련·전사 확산은 “우리 회사는”, AI 내재화는 “우리 회사의 업무 체계는”으로 물음',
    unk_note='구성원이 직접 알기 어려운 회사 수준 단계(1·4·5단계)와 전반 인식 문항에만 둠',
    basis_intro='아래 모형들의 공통 순서를 바탕으로 이 진단을 위해 구성함(특정 모형 하나를 그대로 옮긴 것이 아님)',
    basis=['MIT CISR 1단계 · McKinsey 경영진 의지 · NIST AI RMF 거버넌스 · 기보 기초·준비',
           'Microsoft 1국면(AI 비서) · Gartner Active · 개인 변화 준비도(Holt 외, 2007)',
           'McKinsey 업무 흐름 재설계 · MIT CISR 2단계 · Microsoft 2국면 · 일 설계(Parker &amp; Grote, 2022)',
           'MIT CISR 3단계 · McKinsey 성과 측정 · Cisco 데이터 · Gartner Operational · 기보 확산',
           'MIT CISR 4단계 · Microsoft 3국면 · NIST AI RMF · Gartner Transformational · 기보 선도'],
    focus={'F1': '목표의 구체성', 'F2': '자원 배정', 'F3': '사용 지침', 'F4': '승인 도구', 'F5': '직무별 교육', 'F6': '역할 변화 설명',
           'P1': '반복 업무 활용', 'P2': '과업 적합성 판단', 'P3': '요청의 구체화', 'P4': '결과 검증', 'P5': '정보 보호', 'P6': '효과 확인',
           'W1': '과업 분담', 'W2': '사람 검토 단계', 'W3': '절차 재설계', 'W4': '전후 지표', 'W5': '방법의 공유', 'W6': '오류 공동 검토',
           'E1': '사례 확산 체계', 'E2': '기능 재사용', 'E3': '데이터 통합', 'E4': '데이터 품질', 'E5': '전사 성과 지표', 'E6': '평가 반영',
           'N1': '감독 아래 자동 처리', 'N2': '사람–AI 공동 설계', 'N3': '시스템 책임자', 'N4': '위험 정기 점검', 'N5': 'AI 기반 의사결정', 'N6': '고객 서비스 혁신',
           'G1': 'AX 의지', 'G2': 'AX 역량'},
    unit_note='같은 회사 링크(group)로 응답한 사람끼리 집계',
    flow=[('응답', '32문항 + 배경 3문항'), ('점수', '단계별 0~100점'), ('판정', '준비 단계 · 병목'), ('비교', '나 · 회사 · 직급'), ('행동', '개인 · 팀 · 회사')],
    tabs=[['내가 본<br>우리 회사', '내가 본 준비 단계(계단 그림), 핵심 숫자(내 단계, 다른 응답자가 가장 많이 본 단계, 인식 차이가 가장 큰 단계, ‘모르겠다’ 수), 단계별 인식 차이, 다른 응답자의 단계 분포, 단계별 비교표(표준화 차이·위치), 차이가 가장 큰 단계의 풀이, 지금 내가 해 볼 수 있는 것', '내 인식이 동료와 어디서 다른지 알고 개인 행동을 정함'],
          ['우리 회사<br>분석결과', '회사의 준비 단계와 병목, 핵심 숫자(응답자·준비된 단계·전반 인식·‘모르겠다’ 비율), 단계별 회사 평균과 수준 분포, 기초 통계(평균·SD·준비됨 비율·합의도·α), 가장 잘 갖춘 것과 가장 비어 있는 것(문항), 구성원이 잘 모르는 것, 다음 단계로 가려면, 진단 도구 점검', '회사가 어느 단계에 있고 무엇부터 채울지 정함'],
          ['응답자<br>구분별 비교', '직급별 단계 평균과 판정 단계, 경영진·리더와 실무자의 인식 차이(가장 큰 단계), 직무군별·AI 사용 빈도별 단계 평균', '위아래·부서 간 체감 차이와 소통 지점을 찾음']],
    advice=['(회사) 병목 단계와 그다음 단계에 대해, 평균이 가장 낮은 문항 2개와 단계별 행동 목록(단계마다 3개)을 제시함',
            '(개인) 개인 활용·업무 재설계 가운데 80점 미만인 단계마다 개인 행동 3개와 “아직 갖추지 못했다고 답한 것”을, 이어서 회사 병목에 대해 팀과 회사에 제안할 행동 2개를 제시함',
            '(인식 차이) 차이가 가장 큰 단계는 “내가 더 높게 봄 / 더 낮게 봄”에 맞춘 풀이와 행동 3개를 제시함'],
    steps=['① 준비: 회사 코드를 정해 전용 링크(?group=회사코드)를 배포함',
           '② 응답: 부서·직급이 고르게 응답하도록 안내함(최소 5명, 권장 30명 이상)',
           '③ 공유: 회사 결과를 함께 읽는 회의를 열어 병목·‘모르겠다’·인식 차이를 확인함',
           '④ 실행: 병목 단계 과제 2~3개를 책임자·기한·지표와 함께 정함',
           '⑤ 재진단: 3~6개월 뒤 같은 링크로 다시 진단해 단계 이동을 확인함'],
    roles=[['경영진', '회사의 준비 단계와 병목, 1·4·5단계 점수, 경영진과 실무자의 인식 차이', '병목 단계에 자원과 책임자를 배정하고 AX 목표를 다시 알림'],
           ['HR·AX 담당', '‘모르겠다’ 비율, 가장 비어 있는 문항, 합의도, 직무군별 차이', '지침·도구·교육의 전달 경로를 고치고 직무별 프로그램을 설계함'],
           ['팀장', '3단계 업무 재설계 점수, 직급별 차이, 다음 단계로 가려면', '팀 과업 목록에서 AI가 맡을 부분과 사람 검토 단계를 정함'],
           ['구성원', '내가 본 우리 회사, 인식 차이가 가장 큰 단계', '지금 내가 해 볼 수 있는 것 가운데 하나를 이번 주에 실행함']],
)

AXR['ex'] = dict(who='팀장·파트장', n=40, me=[72, 80, 63, 44, 36], grp=[67, 65, 52, 38, 32], ready=33,
    gap_read='나는 팀의 AI 활용 상태를 회사 평균보다 좋게 보고 있음. 앞서 있는 팀이라면 방법을 정리해 다른 팀에 공유할 근거가 됨',
    read2='회사 전체로는 기반 마련·개인 활용은 갖추었으나(60점 이상), 팀 단위 업무 재설계에서 막혀 있음. 전사 확산·AI 내재화 투자보다 업무 재설계를 먼저 채워야 함',
    advice=[('회사가 할 일(병목: 3단계 업무 재설계)', ['팀별로 과업 목록을 만들고, AI에게 맡길 과업과 사람이 확인할 단계를 표시함', '팀 업무 절차서에 AI를 쓰는 단계와 검토 단계를 적어 넣음']),
            ('내가 할 일', ['우리 팀이 AI를 쓰는 방식을 문서로 정리해 다른 팀에 공유함', '효과를 숫자(걸린 시간, 오류 수)로 남겨 전사 확산의 근거로 씀'])])

AIXS = dict(
    js='aix-school.js', unit='학교', gname='AIX', title='우리학교 AIX 전환 준비·성숙도 진단',
    sub='진단 목적 · 5단계 구조 · 32문항 · 점수와 판정 · 학교 간 비교 · 결과의 구성과 활용',
    purpose=['교원 인식으로 우리 학교의 <b>AIX 준비 단계</b>와 <b>병목 단계</b>를 찾음',
             '나와 우리 학교, 우리 학교와 <b>같은 학교급·전체 학교</b>의 차이를 확인함',
             '교원 개인이 할 일과 학교가 할 일을 나누어 <b>행동 조언</b>과 <b>발전 전략</b>을 제시함'],
    target='학교 교원(교사·부장교사·교감·교장·기타 교원). 학교 이름(필수)으로 같은 학교 응답을 묶음',
    bg='직위(교사·부장교사·교감·교장·기타 교원), 학교급(초·중·고·특수·기타), 최근 한 달 AI 사용 빈도(5단계), 학교 이름',
    view=['AIX(AI 전환)는 AI 도구 도입에서 끝나지 않고, 교원의 수업·업무부터 학교의 교육과정과 운영까지 AI를 전제로 다시 짜는 일임',
          'K-12 생성형 AI 성숙도 모델과 국제 지침은 공통으로 기반 → 교원 → 협의회 → 학교 → 내재화의 순서를 제시함',
          '앞 단계가 비어 있으면 뒤 단계의 성과가 작으므로, 총점보다 <b>어느 단계에서 막혀 있는가(병목)</b>를 먼저 봄'],
    stages=[('기반 마련', '우리 학교는', '학교는 AIX를 시작할 바탕을 깔았나?', '학교가 AI 활용 교육 목표를 세우고 지침·승인 도구·기반 시설·연수를 갖추며, 방침을 교원과 함께 정함', '교장·교감, 학교 운영위원회'),
            ('교원 활용', '나는', '나는 수업과 업무에 AI를 쓰고 있나?', '교원 각자가 수업 준비와 업무에 AI를 쓰고, 요청을 구체화하며, 내용과 학생 정보를 확인하고 효과를 확인함', '교원 개인'),
            ('수업·평가 재설계', '우리 협의회는', '협의회의 수업과 평가가 AI를 고려해 바뀌었나?', '학년·교과 협의회가 AI와 교사의 역할을 나누어 수업을 설계하고, 학생 AI 사용 범위와 평가 방식을 바꾸며, 효과와 문제 사례를 함께 확인함', '학년·교과 협의회'),
            ('학교 확산', '우리 학교는', '좋은 수업이 학교 전체로 퍼지고 있나?', '교원 학습공동체와 수업 공개로 사례가 퍼지고, 행정에도 AI가 쓰이며, 데이터를 보호 기준 안에서 활용하고 효과를 학교 차원에서 점검함', '교감·부장교사, 교원 학습공동체'),
            ('AI 내재화', '우리 학교는', 'AI가 학교의 가르침과 배움에 녹아들었나?', '학생 AI 리터러시가 교육과정에 편성되고, AI 기반 수업과 맞춤 지도가 일상이 되며, 위험 점검·형평성 지원·운영 의사결정이 AI를 전제로 이루어짐', '학교 전체')],
    subject_note='교원 활용은 “나는”, 수업·평가 재설계는 “우리 협의회는”, 기반 마련·학교 확산·AI 내재화는 “우리 학교는”으로 물음',
    unk_note='교원이 직접 알기 어려운 학교 수준 단계(1·4·5단계)와 전반 인식 문항에만 둠',
    basis_intro='아래 모형과 지침의 공통 순서를 바탕으로 이 진단을 위해 구성함(특정 모형 하나를 그대로 옮긴 것이 아님)',
    basis=['CoSN K-12 Gen AI 성숙도 Emerging · 미국 교육부 AI 툴킷 · UNESCO 생성형 AI 지침 · SELFIE 리더십·인프라',
           'UNESCO 교사 AI 역량 프레임워크 · Plante Moran 2단계(학생 사용 전 교원 사용) · 개인 변화 준비도(Holt 외)',
           'SELFIE 교수학습·평가 · TeachAI 학업 윤리 · Plante Moran 3단계(사용 공개·과정 중시) · UNESCO 인간 주도성',
           'SELFIE 협력·전문성 개발 · CoSN Developing · Plante Moran 3단계 · AI 중점학교 사례 공유',
           'CoSN Mature · Plante Moran 4단계 · OECD·EC AILit · UNESCO 학생 AI 역량 · AI 중점학교 요건'],
    focus={'F1': '교육 목표', 'F2': '기반 시설', 'F3': '학교 지침', 'F4': '승인 도구 안내', 'F5': '교원 연수', 'F6': '교원 의견 수렴',
           'P1': '반복 업무 활용', 'P2': '과업 적합성 판단', 'P3': '요청의 구체화', 'P4': '내용 정확성 확인', 'P5': '학생 정보 보호', 'P6': '효과 확인',
           'W1': 'AI–교사 역할 구분', 'W2': '학생 사용 범위', 'W3': '평가 방식 변경', 'W4': '학습 효과 확인', 'W5': '수업 방법 공유', 'W6': '문제 사례 검토',
           'E1': '교원 학습공동체', 'E2': '수업 사례 공유', 'E3': '행정 업무 공통화', 'E4': '학습 데이터 공동 활용', 'E5': '자체 평가 점검', 'E6': '학부모 안내',
           'N1': '학생 AI 리터러시 편성', 'N2': '학생의 학습 도구 활용', 'N3': 'AI 기반 맞춤 지도', 'N4': '위험 정기 점검', 'N5': '활용 기회 형평성', 'N6': 'AI 기반 운영 의사결정',
           'G1': 'AIX 의지', 'G2': 'AIX 역량'},
    unit_note='학교 이름을 정규화(띄어쓰기·기호 제거)해 같은 학교끼리 집계',
    min_extra='. 다른 학교는 3명 이상 응답한 학교만 비교에 넣고 이름 대신 번호로 표시',
    flow=[('응답', '32문항 + 배경·학교 이름'), ('점수', '단계별 0~100점'), ('판정', '준비 단계 · 병목'), ('비교', '나 · 우리 학교 · 타 학교'), ('행동', '조언 5 · 전략 5')],
    tabs=[['종합 결과', '① 나의 준비도(강점·약점 단계와 문항) ② 우리 학교의 준비도(같은 학교 응답 기반 강점·약점) ③ 나와 우리 학교의 차이 ④ 행동 조언 5가지(나 3 · 학교 2, 근거 제시) ⑤ 우리 학교의 수준(같은 학교급·전체 학교 중 순위) ⑥ 우리 학교 발전 전략 5가지(담당·기간·행동 요령·점검 지표)', '한 장으로 나와 학교의 위치와 할 일을 확인함'],
          ['타 학교 비교', '같은 학교급 학교들과 전체 학교 가운데 우리 학교의 단계·종합 점수·순위, 단계별 비교표, 발전 전략 5가지', '학교 간 차이를 근거로 우선 과제를 정함'],
          ['내가 본<br>우리 학교', '내가 본 준비 단계, 다른 교원과의 단계별 인식 차이와 분포, 차이가 가장 큰 단계의 풀이, 지금 내가 해 볼 수 있는 것', '나의 인식을 점검하고 개인 행동을 정함'],
          ['우리 학교<br>분석결과', '학교의 준비 단계와 병목, 단계별 평균·수준 분포·기초 통계, 가장 잘 갖춘 것과 비어 있는 것, 교원이 잘 모르는 것, 다음 단계로 가려면', '학교 차원의 우선순위를 정함'],
          ['응답자<br>구분별 비교', '직위별 단계 평균, 관리자와 교사의 인식 차이, AI 사용 빈도별 단계 평균', '관리자–교사 간 체감 차이를 확인함']],
    advice=['(행동 조언) 나 3가지는 나의 약한 단계(교원 활용·수업 재설계)와 나–학교 차이가 가장 큰 단계에서, 학교 2가지는 학교 병목 단계의 행동 목록에서 고르며 각 항목에 근거를 표시함',
            '(발전 전략) 병목 단계 → 같은 학교급보다 뒤처진 단계 → 전체 학교보다 뒤처진 단계 → 다음 단계 순으로 우선순위를 정해 5가지를 고르고, 각 전략에 담당·기간·행동 요령 3단계·점검 지표를 제시함'],
    steps=['① 준비: 교직원 회의에서 진단 목적을 안내하고 링크를 배포함(학교 이름은 정확히 같게 입력)',
           '② 응답: 교사·부장교사·관리자가 고르게 응답하도록 안내함(최소 5명, 권장 교원의 절반 이상)',
           '③ 공유: 학교 결과와 타 학교 비교를 교원 협의회에서 함께 읽음',
           '④ 실행: 발전 전략 5가지 가운데 2~3개를 학교 교육계획에 담당·기한·지표와 함께 반영함',
           '⑤ 재진단: 학기 말 또는 다음 학년도 초에 다시 진단해 단계 이동을 확인함'],
    roles=[['교장·교감', '우리 학교의 단계·병목, 같은 학교급 중 순위, 관리자–교사 인식 차이', '병목 단계에 예산·시간·담당을 배정하고 학교 지침을 정비함'],
           ['부장교사', '수업·평가 재설계와 학교 확산 점수, 가장 비어 있는 문항', '협의회·학습공동체의 실행 과제를 정하고 사례 공유를 운영함'],
           ['교사', '종합 결과의 나의 준비도와 행동 조언, 나–학교 차이', '행동 조언 가운데 하나를 이번 주 수업이나 업무에서 실행함'],
           ['교육청·지원 기관', '여러 학교의 단계 분포와 공통 병목', '학교급별 연수·도구·지침 지원의 우선순위를 정함']],
)


# ---------- 공통: AI 활용 역량 진단 (기본형·학교용) ----------
def readiness_example(spec):
    ex, U = spec['ex'], spec['unit']
    names = [st[0] for st in spec['stages']]
    me, gp = ex['me'], ex['grp']
    stage = lambda v: next((i for i, x in enumerate(v) if x < 60), 5)
    ms, gs = stage(me), stage(gp)
    diffs = [a - b for a, b in zip(me, gp)]
    big = max(range(5), key=lambda i: abs(diffs[i]))
    G = f'우리 {U} 평균'
    h = sq(f'아래는 응답자 한 사람({ex["who"]})이 받는 결과 화면을 <b>가상 수치</b>로 재구성한 예시임. 같은 {U} 응답 {ex["n"]}명을 가정함') + note('수치는 이해를 돕기 위한 가상 예시이며 실제 진단 결과가 아님')
    h += '<h3>1. 준비 단계와 단계별 점수</h3>'
    h += figs(fig(C.stairs(names, gs), f'[그림 1] {U}의 준비 단계(계단 그림)'), fig(C.radar(names, [('나', me, C.ME), (G, gp, C.CMP)]), f'[그림 2] 단계별 점수 방사형: 나와 {G}'))
    h += sq(f'판정 예시', ci(f'({U}) {gs}단계까지 준비됨. 병목은 {gs + 1}단계 {names[gs]}(평균 {gp[gs]}점)이며, 이 단계에서 “준비됨”(60점 이상)이라고 본 응답자는 {ex["ready"]}%임'),
               ci(f'(나) {ms}단계까지 준비됨으로 봄. {U} 판정보다 {"한 단계 높게" if ms > gs else "같게" if ms == gs else "낮게"} 보고 있음'))
    h += '<h3>2. 나와 ' + U + '의 인식 차이</h3>'
    h += figs(fig(C.bars(names, [('나', me, C.ME), (G, gp, C.CMP)]), '[그림 3] 단계별 점수 비교(0~100점)'), fig(C.diverging(names, diffs), f'[그림 4] 단계별 인식 차이(나 − {G})'))
    rows = [[f'{i + 1}. {names[i]}', str(me[i]), str(gp[i]), sgn(diffs[i]), lvl(gp[i])] for i in range(5)]
    h += '<p class="cap">&lt;표 7&gt; 단계별 비교표 예시</p>' + table(['단계', '나', G, '차이', f'{U} 수준'], rows, ['26%', '14%', '20%', '16%', '24%'])
    h += sq('해석 예시', ci(f'인식 차이가 가장 큰 단계는 {names[big]}({sgn(diffs[big])}점)로, ' + ex['gap_read']), ci(ex['read2']))
    if 'rank' in ex:
        h += '<h3>3. 다른 학교와의 비교</h3>'
        h += figs(fig(C.ranking(ex['rank'], ex['avg'], ex['avg_label']), '[그림 5] 같은 학교급 학교의 종합 점수(학교 이름은 번호로 표시)'))
        h += sq('비교 예시', *[ci(t) for t in ex['rank_read']])
    h += '<h3>' + ('4' if 'rank' in ex else '3') + '. 행동 제안 예시</h3>'
    h += '<div class="ex">' + ''.join(sq(t, *[ci(x) for x in xs]) for t, xs in ex['advice']) + '</div>'
    return h


def competency_example(spec):
    ex = spec['ex']
    names = [d[0] for d in spec['domains']]
    me, gp = ex['me'], ex['grp']
    total = round(sum(me) / 5)
    diffs = [a - b for a, b in zip(me, gp)]
    lo, hi = me.index(min(me)), me.index(max(me))
    G = ex['grp_label']
    h = sq(f'아래는 응답자 한 사람({ex["who"]})이 받는 결과 화면을 <b>가상 수치</b>로 재구성한 예시임. 비교 집단 응답 {ex["n"]}명을 가정함') + note('수치는 이해를 돕기 위한 가상 예시이며 실제 진단 결과가 아님')
    h += '<h3>1. 영역별 역량 프로파일</h3>'
    h += figs(fig(C.radar(names, [('나', me, C.ME), (G, gp, C.CMP)]), f'[그림 1] 영역별 점수 방사형: 나와 {G}'), fig(C.bars(names, [('나', me, C.ME), (G, gp, C.CMP)]), '[그림 2] 영역별 점수 비교(0~100점)'))
    h += sq('판정 예시', ci(f'종합 {total}점({lvl(total)}), 태도 {ex["att"]}점. 가장 높은 영역은 {names[hi]}({me[hi]}점), 가장 낮은 영역은 {names[lo]}({me[lo]}점)'),
            ci(f'AI 활용 유형: <b>{ex["type"]}</b> — {ex["type_why"]}'))
    h += '<h3>2. 비교 집단과의 차이</h3>'
    h += figs(fig(C.diverging(names, diffs), f'[그림 3] 영역별 차이(나 − {G})'), fig(C.bars(['실천(종합)', '태도'], [('나', [total, ex['att']], C.ME)], cut=60), '[그림 4] 실천과 태도'))
    rows = [[names[i], str(me[i]), str(gp[i]), sgn(diffs[i]), lvl(me[i])] for i in range(5)]
    h += '<p class="cap">&lt;표 7&gt; 영역별 비교표 예시</p>' + table(['영역', '나', G, '차이', '나의 수준'], rows, ['26%', '14%', '20%', '16%', '24%'])
    h += sq('해석 예시', *[ci(t) for t in ex['read']])
    if 'rank' in ex:
        h += '<h3>3. 다른 학교와의 비교</h3>'
        h += figs(fig(C.ranking(ex['rank'], ex['avg'], ex['avg_label']), '[그림 5] 같은 학교급 학교의 종합 점수(학교 이름은 학교 A·B·C로 표시)'))
        h += sq('비교 예시', *[ci(t) for t in ex['rank_read']])
    h += '<h3>' + ('4' if 'rank' in ex else '3') + '. 행동 제안 예시</h3>'
    h += '<div class="ex">' + ''.join(sq(t, *[ci(x) for x in xs]) for t, xs in ex['advice']) + '</div>'
    return h


def competency(spec):
    items = items_of(spec['js'])
    D = spec['domains']
    groups = [(k, D[i][0], spec['focus']) for i, k in enumerate('DLVRH')] + [('T', '태도', spec['focus'])]
    ch = []
    ch.append(('Ⅰ. 진단 개요',
        sq('진단 목적', *[ci(t) for t in spec['purpose']]) +
        sq('진단 대상: ' + spec['target']) +
        sq('진단 구성', ci('실천 5개 영역 25문항(영역별 5문항)과 태도 6문항, 총 <b>31문항</b>, 5점 동의 척도'),
           ci('배경 문항: ' + spec['bg']),
           ci('소요 시간 약 6분, 익명 웹 응답, 응답 직후 결과 확인(결과 코드 발급)')) +
        sq('작성 방식: 진단의 관점 → 구조 → 문항 → 점수와 유형 판정 → 결과의 구성과 활용 → 결과 예시 순으로 정리하고, 각 장의 기준이 실제 진단 화면의 계산 방식과 일치하도록 작성함')))
    ch.append(('Ⅱ. 진단의 관점과 구조',
        '<h3>1. 진단의 관점</h3>' +
        sq('AI 활용 역량은 AI를 “얼마나 많이 쓰는가”가 아니라, AI와 일하는 과정에서 <b>판단하고, 지휘하고, 확인하고, 책임지는</b> 행동이 습관으로 자리 잡았는가로 봄',
           ci('지식이나 자신감이 아닌 <b>실제 행동</b>의 빈도와 습관을 물음'),
           ci('AI 사용의 흐름(맡기기 전 → 맡길 때 → 결과를 받으면 → 내기 전 → 쓰는 내내)에 따라 다섯 영역을 둠'),
           ci('행동과 별도로, 바람직한 AI 사용에 대한 <b>태도</b>를 6문항으로 함께 봄')) +
        '<h3>2. 5개 실천 영역</h3>' +
        flow([(d[1], d[0]) for d in D]) +
        '<p class="cap">&lt;표 1&gt; 영역별 핵심 질문, 정의, 놓쳤을 때의 위험</p>' +
        table(['영역', '사용 시점', '핵심 질문', '정의', '놓쳤을 때의 위험'], [[d[0], d[1], d[2], d[3], d[4]] for d in D], ['15%', '12%', '17%', '36%', '20%']) +
        '<h3>3. 설계 원칙</h3>' +
        sq('행동 문항: 모든 실천 문항은 “~한다”로 끝나는 구체적 행동으로 물어, 응답자가 자신의 실제 습관을 떠올리게 함') +
        sq('영역 섞어 제시: 한 화면에 영역별 1문항씩 섞어 제시하여(D1·L1·V1·R1·H1 …) 같은 영역 문항에 비슷하게 답하는 경향을 줄임') +
        sq(spec['level_note'])))
    ch.append(('Ⅲ. 진단 문항',
        sq('응답 척도: 1 전혀 그렇지 않다 · 2 그렇지 않다 · 3 보통이다 · 4 그렇다 · 5 매우 그렇다') +
        '<p class="cap">&lt;표 2&gt; 영역별 진단 문항과 측정 내용</p>' + item_table(items, groups) +
        note('태도(T1~T6)는 종합 점수에 넣지 않고 따로 산출하며, 나의 결과에서 태도 점수와 실천(종합) 점수의 차이를 함께 보여 줌')))
    ch.append(('Ⅳ. 점수 산출과 유형 판정',
        '<p class="cap">&lt;표 3&gt; 점수 산출 기준</p>' +
        table(['구분', '산출 기준', '비고'], [
            ['영역 점수', '(영역 5문항 평균 − 1) × 25 → <b>0~100점</b>', '5개 실천 영역 각각 산출'],
            ['종합 점수', '5개 실천 영역 점수의 평균', '태도는 제외'],
            ['태도 점수', '(태도 6문항 평균 − 1) × 25', '종합과 별도로 표시'],
            ['수준 이름', '80점 이상 주도 · 60~79 정착 · 40~59 형성 · 40 미만 시작', '정착 기준점 60점(잠정)'],
            ['위치', '비교 집단 안에서의 상위 백분위(상위 n%)', '비교 집단 응답 5명 이상일 때 표시'],
        ] + spec['score_extra'], ['16%', '52%', '32%']) +
        '<p class="cap">&lt;표 4&gt; AI 활용 유형 판정 규칙(위에서부터 차례로 적용)</p>' +
        table(['유형', '판정 조건', '특징'], [
            ['AI 드림팀 캡틴', '종합 80점 이상이고 가장 낮은 영역도 70점 이상', '다섯 영역이 모두 습관이 된 상태'],
            ['AI 새내기 탐험가', '종합 40점 미만', '출발선, 성장 폭이 가장 큰 단계'],
            ['질주하는 스피드레이서', f'{D[1][0]} 65점 이상이고 {D[2][0]}가 {D[1][0]}보다 20점 이상 낮음', '잘 시키지만 확인 없이 달리기 쉬움'],
            ['손맛 지키는 장인', f'{D[4][0]} 65점 이상이고 {D[1][0]}가 {D[4][0]}보다 20점 이상 낮음', '자기 실력은 지키지만 AI에게 잘 맡기지 않음'],
            ['오각형 꿈나무', '가장 높은 영역과 가장 낮은 영역의 차이 12점 미만', '고르게 성장 중, 대표 강점은 아직 없음'],
            ['영역 대표 유형', '위에 해당하지 않으면 가장 높은 영역의 유형: 냉철한 전략가(' + D[0][0] + ') · AI 조련사(' + D[1][0] + ') · AI 팩트체크 탐정(' + D[2][0] + ') · 디지털 양심 지킴이(' + D[3][0] + ') · 생각 근육 트레이너(' + D[4][0] + ')', '가장 두드러진 강점 영역'],
        ], ['20%', '50%', '30%'])))
    ch.append(('Ⅴ. 결과의 구성과 활용',
        '<h3>1. 결과 화면의 구성</h3>' +
        flow(spec['flow']) +
        '<p class="cap">&lt;표 5&gt; 결과 화면별 주요 내용과 활용</p>' +
        table(['결과 화면', '주요 내용', '활용'], spec['tabs'], ['18%', '56%', '26%']) +
        sq('행동 제안 산출 방식', *[ci(t) for t in spec['advice']]) +
        sq('모든 결과 화면은 PDF 결과 보고서로 저장하여 상담·연수·회의 자료로 활용할 수 있음') +
        '<h3>2. 활용 절차</h3>' +
        sq('운영 절차', *[ci(t) for t in spec['steps']]) +
        '<p class="cap">&lt;표 6&gt; 활용 주체별 결과 활용</p>' +
        table(['활용 주체', '먼저 볼 결과', '이어서 할 일'], spec['roles'], ['16%', '42%', '42%']) +
        '<h3>3. 해석상 유의 사항</h3>' +
        sq('자기 보고 응답이므로 실제 행동보다 높게 응답할 수 있음. 개인 평가나 인사·성적 자료로 쓰지 않음') +
        sq('응답 수가 적은 집단의 평균과 차이는 참고용으로 보고, 차이 검정(p &lt; .05)으로 의미 있는 차이인지 함께 확인함') +
        sq('이 진단은 BETA임. 수준 기준점(60점)과 유형 규칙은 타당화 전의 잠정 기준임')))
    ch.append(('Ⅵ. 결과 예시', competency_example(spec)))
    glance = [('목적', spec['purpose'][0]), ('대상', spec['target']),
              ('구성', '실천 5개 영역 × 5문항 = 25문항 + 태도 6문항 = <b>31문항</b>, 5점 동의 척도, 약 6분 · 익명'),
              ('판정', '영역 점수 0~100점, 종합 = 5개 영역 평균. 수준(주도·정착·형성·시작)과 AI 활용 유형 10가지'),
              ('결과', ' · '.join(re.sub('<br>', ' ', t[0]) for t in spec['tabs']))]
    return spec['title'] + ' 문항과 구조', spec['sub'], glance, ch


FOCUS_C = {'D1': '틀렸을 때의 피해', 'D2': '확인 가능성', 'D3': 'AI 정확도 경험', 'D4': '직접 하는 효율', 'D5': '다른 선택지 검토',
           'L1': '용도 전달', 'L2': '조건 제시', 'L3': '구체적 재요청', 'L4': '단계별 확인', 'L5': '권한 범위 확인',
           'V1': '수치 원출처 확인', 'V2': '출처 실재 확인', 'V3': '근거·주장 구분', 'V4': '확증 편향 경계', 'V5': '완료 결과 확인',
           'R1': '개인정보 보호', 'R2': '설명 책임', 'R3': 'AI 사용 공개', 'R4': '차별 표현 점검', 'R5': '저작권 확인',
           'H1': '먼저 생각하기', 'H2': '기본기 유지', 'H3': '배움 성찰', 'H4': 'AI 없이 수행 가능성', 'H5': '내 표현으로 다시 쓰기',
           'T1': '위임 판단 태도', 'T2': '사람 판단 우선', 'T3': '확인의 가치', 'T4': '사용자 책임', 'T5': '자발적 공개', 'T6': '직접 익힘의 가치'}

AIXS['ex'] = dict(who='교사, 가상중학교', n=30, me=[62, 74, 58, 40, 30], grp=[65, 63, 50, 36, 28], ready=30,
    gap_read='나는 교원 활용 수준을 우리 학교 평균보다 높게 보고 있음. 학교 안에서 앞서 있는 쪽이므로 동료와 활용 방법을 나누는 역할을 맡을 수 있음',
    read2='우리 학교는 기반 마련·교원 활용은 갖추었으나(60점 이상), 협의회 단위의 수업·평가 재설계에서 막혀 있음',
    rank=[('학교 A', 56, False), ('우리 학교', 48, True), ('학교 B', 45, False), ('학교 C', 39, False)], avg=47, avg_label='중학교 평균 47점',
    rank_read=['우리 학교는 같은 학교급(중학교) 4곳 가운데 2위이며, 학교급 평균보다 1점 높음', '1위 학교와의 차이는 8점이며, 가장 크게 뒤처진 단계는 수업·평가 재설계임'],
    advice=[('나의 행동 조언(3가지 중 예시)', ['협의회에서 다음 단원 과제 하나의 학생 AI 사용 허용 범위를 함께 정하자고 제안함', '내가 써 본 수업 준비 활용법을 동료 교사에게 짧게 공유함']),
            ('우리 학교 발전 전략(5가지 중 예시)', ['[담당] 교감·부장교사 [기간] 1학기 — 학년·교과 협의회별로 과제마다 AI 사용 범위를 정하고, 과정 중심 평가 사례를 1건 이상 만듦. [점검 지표] AI 사용 범위가 정해진 과제 비율'])])

AIDX = dict(
    js='ai-diagnosis.js', title='기본 AI 활용 역량 진단',
    sub='진단 목적 · 5개 실천 영역 · 31문항 · 점수와 유형 판정 · 결과의 구성과 활용',
    purpose=['AI에게 무엇을 맡기고, 어떻게 지휘하고, 결과를 어떻게 확인하는지 <b>실제 행동</b>으로 AI 활용 역량을 진단함',
             '나의 <b>강점·보완점</b>과 <b>AI 활용 유형</b>을 확인하고, 다음 4주의 행동 과제를 정함',
             '그룹(수업·부서·연수 단위)의 역량 프로파일과 구분별 차이를 분석함'],
    target='학생·교사(교수)·직장인 누구나. 그룹 링크(?group=그룹코드)로 수업·부서·연수 단위 응답을 묶음',
    bg='응답자 구분(학생·교사(교수)·직장인·기타)',
    domains=[('위임 판단', '맡기기 전', '이 일을 AI에게 맡길까?', '일의 위험, 확인 가능성, 효율을 따져 AI를 쓸지, 얼마나 쓸지 정함', '과의존·과소의존'),
             ('AI 협업 지휘', '맡길 때', '어떻게 맡길까?', '목적과 조건을 전달하고, 단계를 나눠 진행하며, AI가 행동할 범위를 정함', '엉뚱한 결과, 과도한 권한 위임'),
             ('검증', '결과를 받으면', '결과를 믿어도 될까?', '사실, 근거, 출처, 완료 여부를 원자료로 확인함', '허위 정보 수용, 확증 편향'),
             ('책임 있는 사용', '내보내기 전', '이대로 내보내도 될까?', '개인정보, 저작권, 공정성, 사용 공개를 지키고 결과를 내 책임으로 다룸', '정보 유출, 표절, 차별'),
             ('인간 역량 지키기', '쓰는 내내', '내 힘은 그대로인가?', '스스로 먼저 생각하고, 기본기를 유지하며, 사용 습관을 돌아보고 배움', '사고력 약화, 기술 퇴화')],
    level_note='대상 범용성: 학생·교사·직장인이 모두 답할 수 있도록 특정 직무 상황을 피하고, 예시는 괄호 안에 넣음',
    focus=FOCUS_C, score_extra=[],
    flow=[('응답', '31문항 + 구분'), ('점수', '영역별 0~100점'), ('유형', '10가지 유형'), ('비교', '나 · 그룹 · 구분'), ('행동', '다음 4주 과제')],
    tabs=[['나의<br>분석결과', 'AI 활용 유형(이름·설명·자주 하는 말), 종합 점수와 수준, 나와 그룹의 영역별 비교(레이더), 기초 통계, 한눈에 보는 나의 강점과 약점, 다음 4주 이것부터 해 보세요', '나의 강점과 보완점을 알고 행동 과제를 정함'],
          ['우리 그룹<br>분석결과', '영역별 그룹 프로파일, 영역별 수준 분포, 영역별 기초 통계, AI 활용 유형 분포, 그룹이 잘하는 행동과 놓치는 행동(문항), 응답자 구분별 평균', '수업·연수·부서의 공통 보완 영역을 찾음'],
          ['응답자<br>그룹별 비교', '학생·교사·직장인 등 구분별 영역 프로파일과 요약(응답 수·종합 평균·대표 유형), 영역별 평균 비교와 일원분산분석(F, p)', '집단 간 의미 있는 차이를 확인함']],
    advice=['기준에 못 미친 영역을 낮은 순으로 최대 3개 골라, 영역마다 행동 팁 3개와 “지금 덜 하고 있는 행동”(3점 이하로 답한 문항 최대 2개)을 다음 4주 과제로 제시함',
            '가장 강한 영역은 “강점 살리기” 카드로 유지할 행동을 제시하고, 태도와 실천의 차이를 함께 풀이함'],
    steps=['① 준비: 그룹 코드를 정해 그룹 링크(?group=그룹코드)를 배포함',
           '② 응답: 수업·연수 시작 전에 응답하게 함(그룹 비교는 5명 이상부터 안정)',
           '③ 공유: 그룹 결과에서 공통으로 놓치는 행동을 함께 확인함',
           '④ 실행: 개인별 4주 실천 과제를 정하고, 수업·연수 내용을 보완 영역에 맞춤',
           '⑤ 재진단: 4주~한 학기 뒤 같은 링크로 다시 진단해 변화를 확인함'],
    roles=[['개인', '나의 유형, 강점과 약점, 다음 4주 과제', '과제 하나를 정해 4주 동안 실천하고 다시 진단함'],
           ['교수자·강사', '그룹 프로파일, 그룹이 놓치는 행동, 유형 분포', '수업·연수에서 보완 영역의 실습 비중을 높임'],
           ['기관 담당자', '응답자 그룹별 비교와 차이 검정', '집단별 맞춤 교육과 지침을 설계함']],
)

AIDX['ex'] = dict(who='직장인', n=24, grp_label='우리 그룹 평균', me=[72, 58, 45, 80, 66], grp=[63, 60, 55, 68, 58], att=78,
    type='디지털 양심 지킴이', type_why='가장 높은 영역이 책임 있는 사용이고, 다른 유형 조건(드림팀·스피드레이서·장인·오각형)에 해당하지 않음',
    read=['검증이 그룹 평균보다 10점 낮고, 기준(60점)에도 못 미침. 다음 4주 과제의 첫 번째 영역이 됨', '태도(78점)가 실천(64점)보다 14점 높음. 중요하다고 생각하는 만큼 행동으로 옮기지 못하는 부분이 있음'],
    advice=[('다음 4주, 이것부터(검증 45점 → 60점)', ['AI가 제시한 수치는 쓰기 전에 원래 출처에서 한 번 확인함', 'AI가 알려 준 논문·기사가 실제로 있는지 검색해 봄']),
            ('강점 살리기(책임 있는 사용)', ['개인정보·저작권을 살피는 나의 습관을 동료에게 알려 그룹 전체의 수준을 높임'])])

TADX = dict(
    js='teacher-ai-diagnosis.js', title='나와 우리학교 AI 역량 수준 진단',
    sub='진단 목적 · 5개 실천 영역 · 31문항 · 점수와 유형 판정 · 학교 간 비교 · 결과의 구성과 활용',
    purpose=['중·고등학교 구성원(학생·교사·보직교사·행정직원)의 AI 활용 역량을 <b>실제 행동</b>으로 진단함',
             '나의 역량을 <b>우리 학교, 같은 학교급의 다른 학교, 전체 응답자</b>와 비교함',
             '우리 학교의 강점과 보완점을 찾고 우선순위 과제를 제시함'],
    target='학생·교사·보직교사(부장·교감·교장 포함)·행정직원. 학교급과 소속 학교(필수)를 입력해 같은 학교끼리 묶음',
    bg='응답자 구분(학생·교사·보직교사·행정직원), 학교급(초·중·고·기타), 소속 학교 이름',
    domains=[('맡길지 판단', '맡기기 전', '이 일을 AI에게 맡길까?', '틀렸을 때의 피해, 내가 확인할 수 있는지, 걸리는 시간을 따져 AI를 쓸지, 얼마나 쓸지 정함', 'AI를 너무 믿거나 아예 피하기'),
             ('요청하기', '맡길 때', '어떻게 부탁할까?', '목적과 조건을 알려 주고, 단계를 나눠 진행하며, AI에게 줄 권한의 범위를 정함', '엉뚱한 결과, 너무 많은 권한 주기'),
             ('확인하기', '결과를 받으면', '이 답을 믿어도 될까?', '사실, 근거, 출처, 완성 여부를 직접 확인함', '틀린 정보를 그대로 믿기'),
             ('책임 있게 쓰기', '내기 전', '이대로 내도 될까?', '개인정보와 저작권을 지키고, 차별 표현을 살피며, AI 사용을 밝히고 결과를 내 책임으로 다룸', '개인정보 유출, 표절, 차별'),
             ('내 힘 지키기', '쓰는 내내', '내 실력은 그대로인가?', '스스로 먼저 생각하고, 기본 실력을 지키며, AI를 쓰는 습관을 돌아봄', '생각하는 힘과 기본 실력 약화')],
    level_note='학교 맥락 반영: 중·고등학생도 이해할 수 있는 낱말로 쓰고, 예시를 학교 상황(수행평가·가정통신문·교과서 등)으로 바꿈',
    focus=FOCUS_C,
    score_extra=[['학교 집계', '소속 학교 이름을 정규화(띄어쓰기·기호 제거)해 같은 학교 응답끼리 집계', '다른 학교는 3명 이상 응답한 학교만 비교, 이름 대신 학교 A·B·C로 표시']],
    flow=[('응답', '31문항 + 구분·학교'), ('점수', '영역별 0~100점'), ('유형', '10가지 유형'), ('비교', '나 · 우리 학교 · 타 학교'), ('행동', '우선순위 과제')],
    tabs=[['나의<br>역량 수준', 'AI 활용 유형, 종합 점수와 수준, 영역별 나의 수준 비교(우리 학교·전체), 영역별 점수, 한눈에 보는 나의 강점과 약점, 우선순위 3가지', '나의 강점과 보완점, 할 일을 정함'],
          ['우리 학교<br>역량 수준', '영역별 우리 학교 수준과 비교, 영역별 그룹 프로파일·수준 분포·기초 통계, 유형 분포, 잘하는 행동과 놓치는 행동, 학교 우선순위 5가지', '학교 차원의 보완 영역을 정함'],
          ['타학교 비교', '같은 학교급에서 3명 이상 응답한 학교끼리 종합 점수 순위, 1위 학교·학교급 평균과의 차이, 영역별 학교 비교표', '같은 학교급 안에서 우리 학교의 위치를 확인함'],
          ['학교급별 비교', '초·중·고 학교급별 영역 프로파일, 영역별 평균 비교와 일원분산분석(F, p)', '학교급 간 차이를 확인함'],
          ['전체 학교 수준', '참여 학교 수, 학교급별 응답 수와 평균, 전체 응답자의 영역 프로파일과 분포', '전체 수준과 우리 학교를 비교함']],
    advice=['(개인) 점수가 가장 낮은 영역 3개를 골라 우선순위 3가지로 제시함',
            '(학교) 우리 학교 영역 점수와 비교 집단과의 차이를 함께 보아 보완이 가장 필요한 영역부터 학교용 행동 5가지를 제시하고, 학교 전체가 덜 하고 있는 문항 3개를 함께 보여 줌'],
    steps=['① 준비: 학교 이름을 정확히 같게 입력하도록 안내하고 링크를 배포함(예: 대한중학교)',
           '② 응답: 학생·교사·보직교사·행정직원이 고르게 응답하도록 안내함(학교 결과는 5명 이상부터 안정)',
           '③ 공유: 우리 학교 결과와 타학교 비교를 교직원 회의·학생 자치회에서 함께 읽음',
           '④ 실행: 학교 우선순위 가운데 2~3개를 연수·수업·생활 지도에 반영함',
           '⑤ 재진단: 학기 말에 다시 진단해 변화를 확인함'],
    roles=[['학생·교사 개인', '나의 유형, 강점과 약점, 우선순위 3가지', '과제 하나를 정해 실천하고 다시 진단함'],
           ['교장·교감·부장', '우리 학교 역량 수준, 타학교 비교, 구분별 차이', '학교 우선순위를 연수 계획과 학교 지침에 반영함'],
           ['교육청·지원 기관', '학교급별 비교, 전체 학교 수준', '학교급별 지원 프로그램의 우선순위를 정함']],
)

TADX['ex'] = dict(who='교사, 가상중학교', n=36, grp_label='우리 학교 평균', me=[72, 58, 45, 80, 66], grp=[63, 60, 55, 68, 58], att=78,
    type='디지털 양심 지킴이', type_why='가장 높은 영역이 책임 있게 쓰기이고, 다른 유형 조건에 해당하지 않음',
    read=['확인하기가 우리 학교 평균보다 10점 낮고, 기준(60점)에도 못 미침. 우선순위 1번 영역이 됨', '태도(78점)가 실천(64점)보다 14점 높음'],
    rank=[('학교 A', 66, False), ('우리 학교', 61, True), ('학교 B', 58, False), ('학교 C', 52, False)], avg=59, avg_label='중학교 평균 59점',
    rank_read=['우리 학교는 같은 학교급(중학교) 4곳 가운데 2위이며, 학교급 평균보다 2점 높음', '1위 학교와의 차이는 5점'],
    advice=[('나의 우선순위(3가지 중 예시)', ['AI가 알려 준 숫자나 날짜는 교과서나 믿을 만한 자료에서 확인한 뒤 씀']),
            ('우리 학교 우선순위(5가지 중 예시)', ['수업·연수에서 AI 답의 출처를 확인하는 활동을 정례화함'])])


# ---------- 스타벅스 AI 기본 역량 진단 (매장용·본사용) ----------
def starbucks_items(page):
    s = open(os.path.join(ROOT, 'in-progress', page, 'index.html'), encoding='utf-8').read()
    var = 'storeQuestions' if page.endswith('store') else 'hqQuestions'
    block = s[s.index(f'const {var}=['):]
    block = block[:block.index('];')]
    return re.findall(r"\['([^']+)','([^']+)'\]", block)


def starbucks(spec):
    qs = starbucks_items(spec['page'])
    doms = list(dict.fromkeys(d for d, _ in qs))
    items, groups = [], []
    for k, d in enumerate(doms):
        pre = chr(65 + k)
        its = [t for dd, t in qs if dd == d]
        items += [(f'{pre}{i + 1}', t) for i, t in enumerate(its)]
        groups.append((pre, f'{k + 1}. {d}', {}))
    ex, short = spec['ex'], spec['short']
    ch = []
    ch.append(('Ⅰ. 진단 개요',
        sq('진단 목적', *[ci(t) for t in spec['purpose']]) +
        sq('진단 대상: ' + spec['target']) +
        sq('진단 구성', ci(f'6개 실천 영역 × 4문항 = <b>{len(qs)}문항</b>, 5점 행동 기준 척도(최근 3개월 실제 업무 경험 기준)'),
           ci('배경 문항: 직급·역할(4개), 직무군(' + spec['jobs_note'] + '), 최근 3개월 AI 사용 경험(주 1회 이상·가끔·거의 사용하지 않음)'),
           ci('소요 시간 7~10분, 영역마다 한 화면(4문항)씩 6화면')) +
        sq('작성 방식: 진단의 관점 → 구조 → 문항 → 점수 → 결과의 구성과 활용 → 결과 예시 순으로 정리함')))
    ch.append(('Ⅱ. 진단의 관점과 구조',
        '<h3>1. 진단의 관점</h3>' +
        sq('AI 기본 역량을 “AI를 아는가”가 아니라 <b>업무에서 AI를 올바르게 판단하고, 효과적으로 활용하며, 결과를 책임 있게 검증하는 행동</b>으로 봄',
           ci(spec['context']),
           ci('결과는 개인 · 직무 · 조직 세 수준으로 보고, 동일 직급·동일 직무 집단과 비교함')) +
        '<h3>2. 4개 역량 축과 6개 실천 영역</h3>' +
        flow([('과업 판단', 'AI가 잘할 일과 사람이 책임질 일 구분'), ('활용과 검증', '원하는 결과를 얻고 사실·품질 확인'), ('협업과 혁신', '좋은 활용법 공유, 일하는 방식 개선'), ('안전과 신뢰', '정보 보호·브랜드 기준 준수')]) +
        '<p class="cap">&lt;표 1&gt; 6개 실천 영역과 결과 화면의 표시 이름</p>' +
        table(['영역', '결과 화면 표시', '핵심 행동'], [[f'{k + 1}. {d}', short[k], spec['core'][k]] for k, d in enumerate(doms)], ['30%', '22%', '48%']) +
        '<h3>3. 응답자 구분</h3>' +
        table(['직급·역할', '설명', '직무군'], spec['roles'], ['22%', '34%', '44%'])))
    ch.append(('Ⅲ. 진단 문항',
        sq('응답 척도: 1 전혀 그렇지 않다 · 2 그렇지 않다 · 3 보통이다 · 4 그렇다 · 5 매우 그렇다') +
        sq('응답 기준: 최근 3개월 동안 실제 업무에서의 경험을 떠올려, 각 문장이 나의 업무 행동과 얼마나 일치하는지 응답함') +
        '<p class="cap">&lt;표 2&gt; 영역별 진단 문항</p>' +
        item_table(items, groups, focus_col=False)))
    ch.append(('Ⅳ. 점수 산출',
        '<p class="cap">&lt;표 3&gt; 점수 산출 기준(설계안)</p>' +
        table(['구분', '산출 기준', '비고'], [
            ['영역 점수', '영역 4문항 평균 → <b>1~5점</b>', '결과 화면의 역량 프로필에 표시'],
            ['종합 점수', '여섯 영역을 종합한 100점 만점 점수', '산출식은 개발 중(현재 결과 화면은 예시 값)'],
            ['강점·보완점', '점수가 가장 높은 행동 2개와 가장 낮은 행동 2개', '문항 단위로 표시'],
            ['비교', '동일 직무 · 동일 직급 · 회사 전체 평균과 비교', '충분한 응답이 쌓인 뒤 직급·직무별로 집계'],
            ['교육 우선순위', '중요도와 현재 수행수준의 차이, 미경험 비율을 종합한 요구도', '현재 설문은 수행수준만 물으므로, 요구도 산출에는 중요도 문항 추가가 필요함'],
        ], ['18%', '46%', '36%']) +
        note('이 진단은 BETA임. 현재 공개된 결과 화면은 설계 예시이며, 조직 전체 결과는 충분한 응답이 쌓인 뒤 직급·직무별로 집계함')))
    ch.append(('Ⅴ. 결과의 구성과 활용',
        '<h3>1. 결과 화면의 구성</h3>' +
        flow([('응답', '24문항 + 직급·직무·경험'), ('점수', '영역별 1~5점 · 종합'), ('진단', '강점·보완점'), ('비교', '직무 · 직급 · 회사 전체'), ('행동', '개인 할 일 · 교육 우선순위')]) +
        '<p class="cap">&lt;표 4&gt; 결과 화면의 구성 요소와 활용</p>' +
        table(['구성 요소', '주요 내용', '활용'], [
            ['나의 AI 활용 프로필', '직급·직무, 종합 점수', '나의 현재 위치를 확인함'],
            ['나의 역량 프로필', '여섯 영역의 현재 수준(1~5점)', '영역별 강약을 한눈에 봄'],
            ['강점과 보완점', '가장 잘하는 행동 2개, 보완할 행동 2개', '유지할 습관과 바꿀 습관을 정함'],
            ['나와 스타벅스 전체의 차이', '나 · 동일 직무 · 동일 직급 · 회사 전체 비교와 해석', '직무·직급 기준에서의 차이를 확인함'],
            ['내가 다음에 할 일', '실행 과제 3가지(이번 주 · 이번 달 · 분기 내)', '바로 실행할 행동을 정함'],
            ['교육팀을 위한 요구도 분석', '교육 주제·교육 포인트·요구도 순위(P1~P3)', '교육 과정의 우선순위를 정함'],
            ['조직이 지원하면 좋은 것', '직무별 프롬프트 라이브러리, 입력 기준·안전 가이드, 직무 사례 실습, 리더의 공유 장치', '조직 차원의 지원책을 설계함'],
        ], ['24%', '46%', '30%']) +
        '<h3>2. 활용 절차</h3>' +
        sq('운영 절차', *[ci(t) for t in spec['steps']]) +
        '<h3>3. 해석상 유의 사항</h3>' +
        sq('자기 보고 응답이므로 실제 행동보다 높게 응답할 수 있음. 개인 평가나 인사 자료로 쓰지 않고 학습 안내로 씀') +
        sq('응답 수가 적은 직급·직무의 평균은 참고용으로만 봄')))
    me, co, job, rank = ex['me'], ex['co'], ex['job'], ex['rank']
    diffs = [round(a - b, 1) for a, b in zip(me, co)]
    lo, hi = me.index(min(me)), me.index(max(me))
    h = sq(f'아래는 응답자 한 사람({ex["who"]})이 받는 결과 화면을 <b>가상 수치</b>로 재구성한 예시임') + note('수치는 이해를 돕기 위한 가상 예시이며 실제 진단 결과가 아님')
    h += '<h3>1. 나의 역량 프로필</h3>'
    h += figs(fig(C.radar(short, [('나', me, C.ME), ('회사 전체', co, C.CMP)], vmax=5, cut=3), '[그림 1] 영역별 점수 방사형(1~5점): 나와 회사 전체'),
              fig(C.bars(short, [('나', me, C.ME), ('회사 전체', co, C.CMP)], cut=3, vmax=5), '[그림 2] 영역별 점수 비교(기준선 3점)'))
    h += sq('진단 예시', ci(f'종합 점수 {ex["total"]}점. 가장 높은 영역은 {short[hi]}({me[hi]}점), 가장 낮은 영역은 {short[lo]}({me[lo]}점)'),
            ci('강점: ' + ' · '.join(ex['strong'])), ci('보완점: ' + ' · '.join(ex['weak'])))
    h += '<h3>2. 나와 스타벅스 전체의 차이</h3>'
    h += figs(fig(C.diverging(short, diffs, span=1.0, note=0.3), '[그림 3] 영역별 차이(나 − 회사 전체, 점)'))
    rows = [[short[k], f'{me[k]:.1f}', f'{job[k]:.1f}', f'{rank[k]:.1f}', f'{co[k]:.1f}'] for k in range(6)]
    h += '<p class="cap">&lt;표 5&gt; 나 · 동일 직무 · 동일 직급 · 회사 전체 비교 예시(1~5점)</p>' + table(['영역', '나', '동일 직무', '동일 직급', '회사 전체'], rows, ['28%', '18%', '18%', '18%', '18%'])
    h += sq('해석 예시', ci(ex['read']))
    h += '<h3>3. 행동과 교육 우선순위 예시</h3>'
    h += '<div class="ex">' + sq('내가 다음에 할 일', *[ci(t) for t in ex['todo']]) + '</div>'
    h += '<p class="cap">&lt;표 6&gt; 교육팀을 위한 요구도 우선순위 예시</p>' + table(['우선', '교육 주제', '교육 포인트', '요구도'], ex['edu'], ['10%', '30%', '44%', '16%'])
    ch.append(('Ⅵ. 결과 예시', h))
    glance = [('목적', spec['purpose'][0]), ('대상', spec['target']),
              ('구성', f'6개 실천 영역 × 4문항 = <b>{len(qs)}문항</b>, 5점 행동 기준 척도, 7~10분'),
              ('점수', '영역 점수 1~5점(영역 평균), 종합 점수(100점 만점, 산출식 개발 중)'),
              ('결과', '역량 프로필 · 강점과 보완점 · 직무·직급·회사 전체 비교 · 다음에 할 일 · 교육 우선순위')]
    return spec['title'] + ' 문항과 구조', spec['sub'], glance, ch


SB_STEPS = ['① 준비: 대상 조직과 응답 기간을 정하고 진단 링크를 안내함',
            '② 응답: 직급·직무가 고르게 응답하도록 안내함(직급·직무별 집계에는 충분한 응답 필요)',
            '③ 공유: 개인은 결과의 “내가 다음에 할 일”을 실행하고, 교육팀은 요구도 우선순위를 검토함',
            '④ 실행: 우선순위 상위 주제를 직무별 짧은 실습과 프롬프트 라이브러리로 운영함',
            '⑤ 재진단: 교육 후 같은 진단으로 영역 점수 변화를 확인함']
SB_EX = dict(total=79, me=[4.3, 3.8, 4.2, 2.9, 3.5, 4.6], co=[4.0, 3.7, 3.9, 3.5, 3.6, 4.2], job=[4.1, 3.9, 4.0, 3.3, 3.4, 4.4], rank=[3.9, 3.6, 3.8, 3.2, 3.5, 4.3],
             edu=[['P1', 'AI 결과 검증과 출처 확인', '사실·수치·근거를 직무 기준으로 점검', '4.8'], ['P2', '반복 업무 재설계', '자료 정리·분석·보고 흐름 개선', '4.4'], ['P3', '안전하고 책임 있는 AI 사용', '개인정보·내부정보·브랜드 기준·승인선', '4.1']],
             read='회사 전체보다 결과 검증은 0.6점 낮고, 안전·책임 사용은 0.4점 높음. 검증 습관을 보완하면 직무 전문성과 AI 활용을 안정적으로 연결할 수 있음')
SB_SHORT = ['과업 판단·도구 선택', '지시·프롬프트', '정보·데이터 활용', '결과 검증·개선', '협업·업무 혁신', '안전·책임 사용']

SBS = dict(page='starbucks-ai-store', title='스타벅스 AI 기본 역량 진단 (매장용)', short=SB_SHORT,
    sub='진단 목적 · 6개 실천 영역 · 24문항 · 점수 · 결과의 구성과 활용 · 결과 예시',
    purpose=['매장 파트너와 리더가 고객 응대·매장 운영·교대 협업에서 <b>AI를 판단하고 활용하고 검증하는 행동</b>을 진단함',
             '나의 강점·보완점을 확인하고, 동일 직급·직무와 비교함', '매장 교육의 우선순위와 조직 지원책을 정함'],
    target='바리스타 · 슈퍼바이저 · 점장 및 매장 관리자 · 지역 운영 리더', jobs_note='직급별 4개',
    context='고객 응대, 매장 운영, 교대 협업과 서비스 품질 등 <b>실제 매장 장면</b>을 중심으로 물음',
    core=['과업이 AI에 적합한지 판단하고, AI와 파트너의 책임을 구분함', '목적·매장 상황·대상 고객·결과 형식을 구체적으로 요청함', '고객 의견·운영 메모·매장 데이터를 정리하고 공식 자료와 대조함',
          '안내문·응대 문구와 수치를 서비스 원칙·원자료로 검토함', '인수인계·교육 내용을 정리하고 효과 있는 활용법을 공유함', '개인정보·내부정보를 지우고 승인된 도구를 허용 범위에서 씀'],
    roles=[['바리스타', '고객 응대 · 음료 제조 · 매장 업무', '고객 응대·매장 운영, 음료·푸드 품질, DT·딜리버리 운영, 리저브·커피 전문'],
           ['슈퍼바이저', '교대 운영 · 파트너 지원 · 현장 리딩', '교대 운영·인수인계, 파트너 코칭·교육, 재고·발주·폐기 관리, 서비스 품질 관리'],
           ['점장 및 매장 관리자', '매장 성과 · 인력 · 품질 관리', '매장 성과·손익, 인력·스케줄 관리, 고객 경험·VOC, 안전·위생·품질'],
           ['지역 운영 리더', '복수 매장 · 지역 성과 · 운영 지원', '지역 매장 운영, 점장 코칭·육성, 신규 매장·변화 지원, 지역 성과·품질 관리']],
    steps=SB_STEPS,
    ex=dict(SB_EX, who='슈퍼바이저 · 교대 운영·인수인계', strong=['업무 목적과 매장 상황을 구체적으로 설명하기', '개인정보·내부정보 지우고 입력하기'], weak=['AI가 제시한 수치를 원자료로 다시 확인하기', '반복 업무를 AI와 사람의 단계로 나누기'],
            todo=['[이번 주] AI로 만든 안내문을 쓰기 전에 공식 자료와 한 번 대조하기', '[이번 달] 교대 인수인계 하나를 “요청–확인–공유” 흐름으로 만들기', '[분기 내] 효과 있었던 요청문을 매장 동료와 공유하기']))

SBH = dict(page='starbucks-ai-hq', title='스타벅스 AI 기본 역량 진단 (본사용)', short=SB_SHORT,
    sub='진단 목적 · 6개 실천 영역 · 24문항 · 점수 · 결과의 구성과 활용 · 결과 예시',
    purpose=['전략·마케팅·상품·인사·재무·공급망·IT 등 본사 직무에서 <b>AI를 판단하고 활용하고 검증하는 행동</b>을 진단함',
             '나의 강점·보완점을 확인하고, 동일 직급·직무군과 비교함', '본사 교육의 우선순위와 조직 지원책을 정함'],
    target='본사 실무자 · 책임·시니어급 · 팀장 및 리더급 · 임원 및 경영진', jobs_note='12개 직무군',
    context='본사 전 직무가 <b>공통으로 답할 수 있는 업무 행동</b>으로 묻고, 직급·직무군별 차이를 비교함',
    core=['과업이 AI에 적합한지 판단하고, 위험이 큰 업무는 한계를 먼저 검토함', '목적·배경·대상·제약 조건·결과 형식을 구체적으로 요청함', '자료를 탐색하고 원문·출처를 확보하며, 사실·해석·가정을 구분함',
          '결과를 직무 기준으로 평가하고 수치를 별도 방법으로 확인함', '보고·기획 초안을 다듬고, 검증된 활용법을 템플릿으로 공유함', '개인정보·기밀·미공개 경영정보를 보호하고 최종 책임을 사람이 짐'],
    roles=[['본사 실무자', '담당 · 전문직 · 프로젝트 실무', '12개 직무군 공통'], ['책임·시니어급', '전문 과제 · 프로젝트 책임', '12개 직무군 공통'],
           ['팀장 및 리더급', '팀·파트 리딩 · 의사결정', '12개 직무군 공통'], ['임원 및 경영진', '사업·기능 전략 · 조직 의사결정', '12개 직무군 공통'],
           ['직무군(12)', '전략·기획·PMO, 브랜드·마케팅·CRM, 상품·메뉴·커피 R&amp;D, 영업·리테일 전략, 인사·조직문화·교육, 재무·회계·세무', '구매·공급망·물류, IT·데이터·디지털, 점포개발·부동산·시설, 품질·식품안전·고객서비스, 법무·컴플라이언스·감사, ESG·대외협력·커뮤니케이션']],
    steps=SB_STEPS,
    ex=dict(SB_EX, who='본사 실무자 · 전략·기획·PMO', strong=['업무 목적과 맥락을 구체적으로 설명하기', '좋은 활용 사례를 팀이 쓰도록 공유하기'], weak=['AI 답변의 근거·수치 확인하기', '반복 업무를 AI 활용 흐름으로 설계하기'],
            todo=['[이번 주] AI 답변을 바로 쓰지 말고 출처와 확인 기준을 한 줄 남기기', '[이번 달] 자료 정리·회의 기록·보고서 초안 중 하나를 재사용 가능한 템플릿으로 만들기', '[분기 내] 정보 보호와 브랜드 기준을 지킨 직무 사례 하나를 팀에 공유하기']))


# ---------- AI Agent 구축 및 활용에 대한 요구도 분석 ----------
def needs(spec):
    import json
    d = json.load(open(os.path.join(ROOT, 'assets/data/ai-agent-needs.json'), encoding='utf-8'))
    doms = d['domains']
    common = [x for x in doms if x['module'] == '공통']
    adv = [x for x in doms if x['module'] != '공통']
    n_c, n_a = sum(len(x['items']) for x in common), sum(len(x['items']) for x in adv)
    rows = []
    for x in doms:
        rows.append(f'<tr class="gh"><td colspan="3">{x["id"]}. {x["name"]} <span>({x["module"]})</span></td></tr>')
        rows += [f'<tr><td class="cd">{x["id"]}{i + 1:02d}</td><td>{E(it[0])}</td><td class="fc">{E(it[1])}</td></tr>' for i, it in enumerate(x['items'])]
    itab = ('<table class="op items"><colgroup><col style="width:9%"><col><col style="width:32%"></colgroup>'
            '<thead><tr><th>코드</th><th>수행행동(문항)</th><th>수행 증거 예시</th></tr></thead><tbody>' + ''.join(rows) + '</tbody></table>')
    ch = []
    ch.append(('Ⅰ. 조사 개요',
        sq('조사 목적', ci('대학생에게 <b>우선 가르칠 AI·AI Agent 기술</b>을 정하기 위해, 같은 수행행동의 <b>교육 필요성(중요도)</b>과 <b>현재 수행수준</b>을 짝지어 물음'),
           ci('결과를 Borich 요구도 · IPA · Locus for Focus로 분석해 교육 프로그램(P01~P07)의 우선순위를 정함')) +
        sq('조사 대상: 대학생(전공 계열·학년 구분)') +
        sq('조사 구성', ci(f'공통 {len(common)}개 영역 {n_c}문항 + Agent 심화 {len(adv)}개 영역 {n_a}문항 = 최대 <b>{n_c + n_a}문항</b>, 문항마다 중요도와 수행수준 두 번 응답'),
           ci('배경 문항: 전공 계열, 학년, 최근 4주 AI 사용 빈도, 직접 사용해 본 Agent 경험'),
           ci('Agent 심화는 Agent 사용 경험이 있거나 한 학기 안 교육 참여 의향이 보통 이상인 응답자에게만 제시')) +
        sq('개발 단계: ' + d['version'] + '. ' + d['design_note'])))
    ch.append(('Ⅱ. 조사의 관점과 구조',
        '<h3>1. 조사의 관점</h3>' +
        sq('요구(need)는 “바람직한 수준과 현재 수준의 차이”로 봄. 학생이 중요하다고 보는데 아직 잘 못하는 기술이 교육 우선순위가 됨',
           ci('중요도는 <b>향후 1년 안에 대학에서 배울 필요성</b>, 수행수준은 <b>최근 한 학기 실제로 해 본 정도</b>로 답함'),
           ci('각 문항은 한 가지 수행행동으로 쓰고, 그 행동을 확인할 수 있는 <b>수행 증거</b>를 함께 정의함')) +
        '<h3>2. 7개 기술 영역</h3>' +
        table(['영역', '모듈', '연결 교육 프로그램'], [[f'{x["id"]}. {x["name"]}', x['module'], next(p[1] for p in d['programs'] if p[0] == x['program'])] for x in doms], ['40%', '18%', '42%']) +
        '<h3>3. 응답 척도</h3>' +
        table(['구분', '척도', '분석 제외 응답'], [
            ['중요도', '1 전혀 필요하지 않다 · 2 별로 필요하지 않다 · 3 보통이다 · 4 필요하다 · 5 매우 필요하다', '판단하기 어렵다(98) · 해당 없음(99)'],
            ['수행수준', '1 혼자서는 하기 어렵다 · 2 단계별 안내가 필요하다 · 3 가끔 도움을 받아 할 수 있다 · 4 익숙한 과제는 혼자 할 수 있다 · 5 새로운 과제에도 혼자 적용할 수 있다', '직접 해 본 적 없음(97) · 판단하기 어렵다(98) · 해당 없음(99)'],
        ], ['14%', '56%', '30%'])))
    ch.append(('Ⅲ. 조사 문항', '<p class="cap">&lt;표 1&gt; 영역별 수행행동 문항과 수행 증거</p>' + itab +
        note('각 문항에 중요도와 수행수준을 모두 응답함. ‘직접 해 본 적 없음’은 따로 집계해 미경험 비율로 보고함(설계안)')))
    ch.append(('Ⅳ. 분석 방법',
        '<p class="cap">&lt;표 2&gt; 요구도 분석 방법(설계안)</p>' +
        table(['방법', '계산', '읽는 법'], [
            ['Borich 요구도', 'Σ(중요도 − 수행수준) × 중요도 평균 ÷ N', '값이 클수록 교육 요구가 큼. 문항·영역 순위로 제시'],
            ['IPA', 'x축 수행수준 평균, y축 중요도 평균, 각 평균으로 사분면 구분', '중요도 높고 수행수준 낮은 사분면 = <b>집중 개선</b>'],
            ['Locus for Focus', 'x축 중요도 평균, y축 (중요도 − 수행수준) 평균, 각 평균으로 사분면 구분', '오른쪽 위(HH) = 최우선 교육 대상'],
            ['최종 우선순위', 'Borich 상위 순위와 LFF 오른쪽 위 사분면에 함께 든 항목을 최우선으로 함', '세 방법이 일치하는 항목부터 교육 프로그램에 반영'],
        ], ['18%', '46%', '36%']) +
        sq('요구도는 같은 응답자의 중요도·수행수준 쌍으로 산출하며, 제외 응답(97·98·99)이 있는 쌍은 계산에서 뺌') +
        note('현재 화면은 검토용 시험 모드로 응답을 저장하거나 통계를 계산하지 않음. 실제 결과는 응답을 수집한 뒤 산출함')))
    prog = [[p[0], p[1], p[2], p[3], p[4], p[5]] for p in d['programs']]
    ch.append(('Ⅴ. 결과의 구성과 활용',
        '<h3>1. 결과 보고의 구성</h3>' +
        flow([('수집', '중요도·수행수준 쌍'), ('지표', 'Borich · IPA · LFF'), ('순위', '최우선 기술'), ('연결', '교육 프로그램 P01~P07'), ('평가', '산출물·평가 기준')]) +
        '<p class="cap">&lt;표 3&gt; 기술 영역과 연결된 교육 프로그램</p>' +
        table(['코드', '프로그램', '문항', '수준', '시간', '산출물'], prog, ['8%', '26%', '12%', '14%', '9%', '31%']) +
        '<h3>2. 활용 절차</h3>' +
        sq('운영 절차', ci('① 전문가 내용타당도 검토와 학생 인지면접으로 문항을 다듬음'), ci('② 예비조사로 척도를 점검하고 본조사를 실시함'),
           ci('③ Borich·IPA·LFF로 우선순위를 정하고 전공 계열·학년별 차이를 확인함'), ci('④ 우선순위 상위 영역의 프로그램부터 개설하고, 산출물로 학습 성과를 평가함')) +
        '<h3>3. 유의 사항</h3>' +
        sq('검증 전 개발안이므로 결과를 일반화하지 않음') + sq('Agent 심화 문항은 조건부 응답이므로 공통 문항과 응답자 수가 다름. 영역 비교 시 응답자 수를 함께 표시함')))
    ex = spec['ex']
    names = [f'{x["id"]}. {x["name"]}' for x in doms]
    shortn = [x['id'] for x in doms]
    tiny = [f'{x["id"]}. {t}' for x, t in zip(doms, spec['tiny'])]
    I, P = ex['I'], ex['P']
    gap = [round(a - b, 1) for a, b in zip(I, P)]
    bor = [round(g * i, 2) for g, i in zip(gap, I)]
    mi, mp, mg = round(sum(I) / len(I), 2), round(sum(P) / len(P), 2), round(sum(gap) / len(gap), 2)
    order = sorted(range(len(doms)), key=lambda k: -bor[k])
    top = [k for k in range(len(doms)) if I[k] >= mi and gap[k] >= mg]
    h = sq(f'아래는 대학생 {ex["n"]}명이 응답했다고 가정한 <b>가상 결과</b>로, 영역 평균으로 요구도 분석 결과를 재구성한 예시임') + note('수치는 이해를 돕기 위한 가상 예시이며 실제 조사 결과가 아님')
    h += '<h3>1. 중요도와 수행수준</h3>'
    h += figs(fig(C.bars(shortn, [('중요도', I, C.ME), ('수행수준', P, C.CMP)], cut=None, vmax=5), '[그림 1] 영역별 중요도와 수행수준(1~5점)'),
              fig(C.hbars([(tiny[k], bor[k], k in top) for k in order]), '[그림 2] Borich 요구도 순위(진한 막대 = LFF 오른쪽 위)'))
    h += '<h3>2. 사분면 분석</h3>'
    h += figs(fig(C.scatter([(shortn[k], P[k], I[k], k in top) for k in range(len(doms))], '수행수준 평균', '중요도 평균', (1.5, 4.0), (3.4, 4.7), mp, mi, ('유지', '집중 개선', '낮은 우선', '과잉'), shade='ul'), '[그림 3] IPA(점선 = 각 평균)'),
              fig(C.scatter([(shortn[k], I[k], gap[k], k in top) for k in range(len(doms))], '중요도 평균', '중요도 − 수행수준', (3.4, 4.7), (0.3, 2.0), mi, mg, ('HH 최우선', 'LH', 'LL', 'HL')), '[그림 4] Locus for Focus(점선 = 각 평균)'))
    rows = [[names[k], f'{I[k]:.1f}', f'{P[k]:.1f}', f'{gap[k]:.1f}', f'{bor[k]:.2f}', str(order.index(k) + 1)] for k in range(len(doms))]
    h += '<p class="cap">&lt;표 4&gt; 영역별 요구도 결과 예시</p>' + table(['영역', '중요도', '수행수준', '차이', 'Borich', '순위'], rows, ['36%', '12%', '12%', '12%', '14%', '14%'])
    h += sq('해석 예시', *[ci(t) for t in ex['read']])
    ch.append(('Ⅵ. 결과 예시', h))
    glance = [('목적', '대학생에게 우선 가르칠 AI·AI Agent 기술을 교육 필요성과 현재 수행수준의 차이로 정함'), ('대상', '대학생'),
              ('구성', f'공통 {n_c}문항 + Agent 심화 {n_a}문항(조건부), 문항마다 중요도·수행수준 응답'),
              ('분석', 'Borich 요구도 · IPA · Locus for Focus → 교육 프로그램 P01~P07 우선순위'),
              ('단계', d['version'] + ' · 전문가 검토와 예비조사 전')]
    return spec['title'] + ' 문항과 구조', spec['sub'], glance, ch


AGN = dict(tiny=['프롬프트', '검색·정보 확인', '결과물·데이터', 'AI 튜터 학습', '안전·책임 사용', 'Agent 활용', 'Agent 구성·시험'], title='AI Agent 구축 및 활용에 대한 요구도 분석', sub='조사 목적 · 7개 기술 영역 · 중요도 × 수행수준 · 분석 방법 · 결과 예시',
    ex=dict(n=200, I=[4.2, 4.5, 4.1, 3.8, 4.4, 3.9, 3.5], P=[3.4, 2.7, 2.8, 3.3, 3.6, 2.2, 1.8],
            read=['B(AI 검색과 정보 확인)와 C(결과물·데이터 작업)는 Borich 상위이면서 LFF 오른쪽 위에 들어, 공통 교육의 최우선 영역이 됨',
                  'F·G(Agent 활용·구성)는 차이는 크지만 중요도가 평균보다 낮아, 희망자 대상 심화 과정으로 운영함',
                  'A·E는 중요도가 높지만 이미 어느 정도 할 수 있어(차이 작음) 기초 과정에서 유지·보완함']))


# ---------- 보고용 문서 ----------
NUM = {'Ⅰ': '01', 'Ⅱ': '02', 'Ⅲ': '03', 'Ⅳ': '04', 'Ⅴ': '05', 'Ⅵ': '06'}
ORBIT = """<svg class="orbit" viewBox="0 0 200 200" fill="none"><circle cx="100" cy="100" r="96" stroke="#5d7396" stroke-width=".8"/><circle cx="100" cy="100" r="68" stroke="#5d7396" stroke-width=".8"/><circle cx="100" cy="100" r="42" stroke="#5d7396" stroke-width=".8"/><circle cx="100" cy="100" r="19" fill="#c99a3e"/><circle cx="100" cy="32" r="3" fill="#cdd6e4"/><circle cx="168" cy="82" r="3" fill="#c99a3e"/><circle cx="23" cy="120" r="2.5" fill="#9fb0c8"/><circle cx="58" cy="172" r="3" fill="#9fb0c8"/><circle cx="153" cy="150" r="2.5" fill="#9fb0c8"/></svg>"""


def doc_report(title, sub, glance, chapters):
    name = title.replace(' 문항과 구조', '')
    m = re.match(r'(.*?)\s*(\([^)]*\))$', name)
    h1 = f'{E(m.group(1))}<br><span class="hl">{E(m.group(2))}</span> 문항과 구조' if m else f'{E(name)}<br><span class="hl">문항과 구조</span>'
    toc = ''.join(f'<li><span class="no">{NUM[h[0]]}</span><span class="t">{h.split(". ", 1)[1]}</span></li>' for h, _ in chapters)
    gl = ''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k, v in glance)
    body = ''.join(f'<section class="ch{" newpage" if h.startswith("Ⅵ") else ""}"><h2><span class="no">{NUM[h[0]]}</span>{h.split(". ", 1)[1]}</h2>{c}</section>' for h, c in chapters)
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>{E(title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=Noto+Serif+KR:wght@400;600&display=swap">
<style>{RCSS}</style></head><body>
<section class="cover"><span class="tag">PRO AnalytiX Lab · In progress 진단 · 보고용</span><h1>{h1}</h1>
<div class="csub">{sub}</div><div class="rule"></div>{ORBIT}
<div class="foot">한양대학교 PRO AnalytiX Lab · hrdpro.hanyang.ac.kr · {DATE}</div></section>
<section class="glance"><h2><span class="dia">◆</span>한눈에 보기</h2><table class="op gl"><tbody>{gl}</tbody></table>
<h3>목차</h3><ol class="toc">{toc}</ol></section>{body}</body></html>"""


RCSS = """
@page { size: A4; margin: 18mm 17mm 16mm; @bottom-center { content: counter(page); font: 8pt "Noto Sans KR", sans-serif; color: #9aa1ab; } }
@page :first { margin: 0; @bottom-center { content: none; } }
* { box-sizing: border-box; }
html, body { margin: 0; background: #fff; }
body { font-family: "Noto Sans KR", "Apple SD Gothic Neo", sans-serif; font-size: 9.6pt; line-height: 1.65; color: #22262b; word-break: keep-all; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
b { color: #164e8c; font-weight: 700; }
.cover { width: 210mm; height: 297mm; position: relative; overflow: hidden; break-after: page; padding: 22mm 20mm; color: #fff;
  background: radial-gradient(ellipse at 85% 0%, #4a5f80 0%, rgba(74,95,128,0) 45%), linear-gradient(160deg, #1d3a66 0%, #1b2f52 55%, #15233f 100%); }
.cover .tag { display: inline-block; border: 1px solid #e5a93c; color: #e5a93c; border-radius: 999px; padding: 3px 12px; font-size: 9pt; font-family: "Noto Serif KR", serif; }
.cover h1 { font-size: 27pt; line-height: 1.32; margin: 30mm 0 6mm; font-weight: 700; }
.cover h1 .hl { color: #e5a93c; }
.cover .csub { font-family: "Noto Serif KR", serif; font-size: 10pt; color: #c9d2e0; line-height: 1.8; max-width: 140mm; }
.cover .rule { width: 34mm; height: 2px; background: linear-gradient(90deg, #e5a93c, rgba(229,169,60,0)); margin: 12mm 0; }
.cover .orbit { position: absolute; right: 12mm; bottom: 30mm; width: 70mm; height: 70mm; }
.cover .foot { position: absolute; left: 20mm; bottom: 14mm; font-family: "Noto Serif KR", serif; font-size: 7.5pt; color: #9fb0c8; }
.glance { break-after: page; }
h2 { font-size: 16pt; color: #164e8c; margin: 0 0 4mm; padding-bottom: 2.6mm; border-bottom: 1.5px solid #164e8c; font-weight: 700; break-after: avoid; }
h2 .no { color: #b8860b; margin-right: 8px; } h2 .dia { color: #b8860b; margin-right: 8px; }
h3 { color: #164e8c; font-size: 11.5pt; margin: 6mm 0 2.5mm; font-weight: 700; break-after: avoid; }
.ch { margin-top: 9mm; } .ch.newpage { break-before: page; margin-top: 0; }
.glance + .ch { margin-top: 0; }
.toc { list-style: none; margin: 3mm 0 0; padding: 0; }
.toc li { display: grid; grid-template-columns: 11mm 1fr; padding: 3mm 0; border-bottom: 1px solid #d9dee6; }
.toc .no { color: #b8860b; font-weight: 700; }
.sq { margin: 2mm 0 0.8mm; padding-left: 4.5mm; position: relative; font-weight: 500; color: #1b2f52; }
.sq::first-letter { color: transparent; }
.sq::before { content: ""; position: absolute; left: 0; top: 2.3mm; width: 2.2mm; height: 2.2mm; background: #b8860b; border-radius: 1px; }
.ci { padding-left: 9mm; text-indent: -3.5mm; margin: 0.5mm 0; color: #22262b; }
.ci::first-letter { color: #164e8c; }
.da { padding-left: 12mm; margin: 0.3mm 0; }
.nt { background: #fbf6ea; border: 1px solid #ecdcb5; border-radius: 4px; padding: 2.4mm 4mm; font-size: 8.8pt; margin: 2.5mm 0; color: #5a4a20; }
table.op { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 8.6pt; line-height: 1.55; }
table.op th { background: #164e8c; color: #fff; text-align: left; padding: 2.2mm 3mm; font-weight: 700; }
table.op td { padding: 2.1mm 3mm; border-bottom: 1px solid #e3e7ed; vertical-align: top; }
table.op tbody tr:nth-child(even) td { background: #f5f7fa; }
table.op td:first-child { color: #164e8c; font-weight: 700; }
table.op tr { break-inside: avoid; } table.op thead { display: table-header-group; }
table.gl td:first-child { width: 22%; }
table.items tr.gh td { background: #eef2f8 !important; color: #164e8c; font-weight: 700; }
table.items tr.gh td span { font-weight: 400; color: #5a6470; font-size: 8pt; }
table.items td.cd { color: #8a6408; font-weight: 700; text-align: center; }
table.items td.fc { color: #8a6408; font-size: 8.2pt; }
.cap { text-align: center; color: #5a6470; font-size: 8pt; margin: 3mm 0 0; break-after: avoid; }
.flow { display: flex; align-items: stretch; gap: 2mm; margin: 3mm 0; font-size: 8.2pt; break-inside: avoid; }
.flow div { flex: 1; border: 1px solid #164e8c; border-radius: 6px; padding: 2.6mm 2mm; text-align: center; line-height: 1.45; }
.flow div b { display: block; font-size: 10pt; margin-bottom: 0.6mm; }
.flow span { align-self: center; color: #b8860b; }
.fgs { display: flex; gap: 4mm; align-items: flex-end; margin: 3mm 0 1mm; break-inside: avoid; }
.fg { margin: 0; flex: 1; text-align: center; } .fg svg { max-width: 100%; height: auto; }
.fg figcaption { color: #5a6470; font-size: 8pt; margin-top: 1.5mm; }
.ex { background: #1b2f52; color: #fff; border-radius: 6px; padding: 3mm 5mm; margin: 3mm 0; break-inside: avoid; }
.ex .sq { color: #e5a93c; } .ex .ci { color: #fff; } .ex b { color: #e5a93c; }
"""


THEMES = {'practitioner': ('#2a6bb8', '#d9822b', 'font-family="Pretendard, sans-serif"', ''),
          'report': ('#1f5a9e', '#c99a3e', 'font-family="Noto Sans KR, sans-serif"', '-report')}
HANDMADE_REPORT = {'ax-readiness'}  # 보고용을 tools/diagnosis-docs/report/build.py로 따로 만드는 진단


DOCS = {'ax-readiness': (readiness, AXR), 'aix-school': (readiness, AIXS),
        'ai-competency': (competency, AIDX), 'teacher-ai-competency': (competency, TADX),
        'starbucks-ai-store': (starbucks, SBS), 'starbucks-ai-hq': (starbucks, SBH), 'ai-agent-needs': (needs, AGN)}


def main(slugs):
    os.makedirs(OUT, exist_ok=True)
    for slug in slugs or DOCS:
        fn, spec = DOCS[slug]
        for theme, (me, cmp_, font, suffix) in THEMES.items():
            if theme == 'report' and slug in HANDMADE_REPORT:
                continue
            C.ME, C.CMP, C.FONT = me, cmp_, font
            title, sub, glance, ch = fn(spec)
            page = doc(title, sub, ch) if theme == 'practitioner' else doc_report(title, sub, glance, ch)
            src = os.path.join(OUT, f'{slug}-structure{suffix}.html')
            open(src, 'w', encoding='utf-8').write(page)
            pdf = os.path.join(ROOT, 'assets/files', f'{slug}-structure{suffix}.pdf')
            subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--run-all-compositor-stages-before-draw',
                            '--virtual-time-budget=15000', f'--print-to-pdf={pdf}', 'file://' + src],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print('ok', pdf)


if __name__ == '__main__':
    main(sys.argv[1:])
