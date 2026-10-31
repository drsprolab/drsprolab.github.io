"""Check the generated educational pages and shared navigation, not the templates."""
import json
import os
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = Path(os.environ.get('RESEARCH_METHODS_SITE', ROOT / '_site'))
DATA = json.loads((ROOT / '_data/research_methods.json').read_text())

class Markup(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids = []
        self.hrefs = []
        self.classes = []
        self.feed(html)
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.classes.extend(attrs.get('class', '').split())
        if 'id' in attrs:
            self.ids.append(attrs['id'])
        if tag == 'a':
            self.hrefs.append(attrs.get('href', ''))

class ResearchMethodsSite(unittest.TestCase):
    def test_catalog_and_nineteen_detail_pages(self):
        catalog = (SITE / 'research-help/methods/index.html').read_text()
        parsed = Markup(catalog)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        self.assertEqual(catalog.count('class="rm-method-card"'), 19)
        self.assertNotIn('<footer class="site-footer">', catalog)
        for step in ['나의 연구 목적 적기', '제시된 분석방법과 이유 읽기',
                     '사례와 예시를 통해 비교하기', '내 연구에 맞는 분석방법 확인하기']:
            self.assertIn(step, catalog)
        self.assertIn('양적 연구는 변수와 모형을', catalog)
        self.assertIn('질적 연구는 참여자·경험자료와 해석 절차를', catalog)
        self.assertIn('문헌 연구는 검색 대상·선정 기준·추출 항목과 종합 방법을', catalog)
        for term in ['연구문제', '이론', '개념·구성개념', '변수', '조작적 정의',
                     '연구설계', '모집단·표본', '측정', '신뢰도', '타당도', '자료수집·분석']:
            self.assertIn(f'<dt>{term}</dt>', catalog)
        self.assertIn('Social Science Research: Principles, Methods, and Practices', catalog)
        self.assertIn('Research Methods in Psychology', catalog)
        catalog_terms = catalog.split('<details class="rm-primer" id="method-terms">', 1)[1].split('</details>', 1)[0]
        for specialized in ['X·Y·M·W', '잠재변수·잠재집단', '교차지연 경로', '부트스트랩 신뢰구간']:
            self.assertNotIn(specialized, catalog_terms)
        for m in DATA['methods']:
            relative = f"/research-help/methods/{m['id']}/"
            self.assertIn(relative, parsed.hrefs)
            html = (SITE / relative.strip('/') / 'index.html').read_text()
            page = Markup(html)
            self.assertIn('rm-method-detail', html)
            self.assertNotIn('rm-detail', page.classes)
            self.assertNotIn('<footer class="site-footer">', html)
            self.assertEqual(len(page.ids), len(set(page.ids)), m['id'])
            self.assertEqual(html.count('class="rm-case"'), 2)
            self.assertEqual(html.count('SSCI 목록 대조</span>'), 3)
            self.assertEqual(html.count('type="radio"'), 9)
            self.assertIn('어떤 자료와 변수로, 어떤 구조를 분석하나요?', html)
            if m['category'] == 'quantitative':
                self.assertIn('결과변수(Y), 설명변수(X)', html)
            elif m['category'] == 'qualitative':
                self.assertIn('누구의 어떤 경험·행동·이야기', html)
            else:
                self.assertIn('검색원·검색식·기간·포함 기준', html)
            self.assertIn(f"{m['name']}에서 처음 볼 용어를 확인하세요 (절차·분석·해석)", html)
            self.assertGreaterEqual(len(m['glossary']), 10)
            self.assertEqual(html.count('class="rm-glossary-stage"'), 4)
            self.assertIn('아래 분석 순서와 점검표도 함께 확인하세요', html)
            self.assertEqual({term['stage'] for term in m['glossary']},
                             {'question', 'design', 'analysis', 'interpretation'})
            for term in m['glossary']:
                self.assertIn(term['term'], html)
                self.assertIn(term['definition'], html)
            for ref in m['references']:
                self.assertIn(f'#ref-{ref}', page.hrefs)
            self.assertNotIn('자료수집·분석</dt>', html)
            self.assertIn(m['selection']['decision'], html)
            for condition in m['selection']['conditions']:
                self.assertIn(condition['title'], html)
                self.assertIn(condition['explanation'], html)
            for comparison in m['selection']['compare']:
                self.assertIn(comparison['criterion'], html)
            for c in m['cases']:
                self.assertIn(c['output'], html)
            for ref in m['references']:
                self.assertIn(DATA['references'][ref]['url'], page.hrefs)
            for anchor in ['purpose','data','outputs','ultimate','cases','self-check','references']:
                self.assertIn(anchor, page.ids)
            self.assertNotIn('<dd></dd>', html)
    def test_shared_tabs_and_menu_order(self):
        for path in ['research-help/index.html','research-help/basics/index.html','research-help/methods/index.html']:
            html = (SITE / path).read_text()
            tabs = re.search(r'<nav class="tabs"[\s\S]*?</nav>', html).group(0)
            urls = Markup(tabs).hrefs
            self.assertEqual(urls, ['/research-help/basics/','/research-help/methods/','/research-help/'])
            self.assertEqual(tabs.count('aria-current="page"'), 1)
        basics = (SITE / 'research-help/basics/index.html').read_text()
        self.assertIn('실제 연구 주제와 연결되어 연구문제를 이해하는 데 필요하다면 사용할 수 있습니다', basics)
        self.assertIn('AI·디지털 시대와 무관한 변수를 연구하면서 도입을 거창하게 보이려고', basics)
        self.assertIn('연구가 부족하다는 사실만으로 연구 필요성을 주장하는 것은 지양합니다', basics)
        self.assertRegex(basics, r'<mark class="rhb-key">“이 주제는 많이 연구되지 않았다”')
        self.assertIn('실제 자료에서 어떤 문항이나 지표로 측정할지 밝히는 것이 조작적 정의의 핵심입니다', basics)
        self.assertRegex(basics, r'<mark class="rhb-key">내 연구목적과 모형에서 개념이 어떤 역할을 하는지')
        self.assertIn('연구문제와 연구가설을 모두 작성할 필요는 없습니다', basics)
        self.assertIn('본인 연구의 방법과 방향에 맞게 필요한 형식을 선택해 작성하세요', basics)
        self.assertIn('추정치·효과크기·신뢰구간·검정 결과를 보고하고', basics)
        self.assertIn('통계적 유의성이 곧 실질적으로 중요한 효과나 인과관계를 뜻하지는 않습니다', basics)
        self.assertRegex(basics, r'<mark class="rhb-key">연구결과에는 자료와 분석으로 확인된 내용을 중심으로 제시합니다')
        self.assertIn('유의하지 않은 결과도 곧 관계가 없거나 연구가 의미 없다는 뜻은 아닙니다', basics)
        self.assertIn('자료로 확인되지 않은 이유를 사실처럼 단정하지 마세요', basics)
        self.assertRegex(basics, r'<mark class="rhb-key">서론에서 제시한 연구목적과 연구문제를 기준으로')
        self.assertIn('한계를 쓸 때는 연구 전에 고려했거나 연구 과정에서 보완하려 한 방법을 함께 밝히세요', basics)
        self.assertIn('표본·측정도구·연구설계·자료수집의 실제 한계를 감추지 말고', basics)
        self.assertNotIn('표본이나 측정도구의 한계는 언급해서는 안 됩니다', basics)
        html = (SITE / 'index.html').read_text()
        self.assertIn('<footer class="site-footer">', html)
        self.assertLess(html.index('논문작성법(기초)'), html.index('연구방법선택(중급)'))
        self.assertLess(html.index('연구방법선택(중급)'), html.index('나의 연구 발전시키기(실습)'))

if __name__ == '__main__':
    unittest.main()
