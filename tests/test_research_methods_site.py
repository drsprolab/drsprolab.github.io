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
        html = (SITE / 'index.html').read_text()
        self.assertIn('<footer class="site-footer">', html)
        self.assertLess(html.index('논문작성법(기초)'), html.index('연구방법선택(중급)'))
        self.assertLess(html.index('연구방법선택(중급)'), html.index('나의 연구 발전시키기(실습)'))

if __name__ == '__main__':
    unittest.main()
