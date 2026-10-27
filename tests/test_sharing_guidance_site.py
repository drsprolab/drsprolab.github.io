"""Every rendered sharing/citation notice must use the lab's logo blue."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'
NOTICE = ('이곳에 있는 모든 자료는 누구나 읽고, 공감하고, 학습하고, 공유할 수 있습니다. '
          '또한 연구실의 지적 자산이므로 공유할 시에는 출처를 밝혀 주시길 바랍니다.')
CITATION = '출처: 한양대학교 교육공학과 송지훈 교수 PRO-AnalytiX (PRO-AX) Lab'


class Notices(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.notices = []
        self.current = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'p':
            self.current = {'attrs': dict(attrs), 'text': ''}

    def handle_data(self, data):
        if self.current is not None:
            self.current['text'] += data

    def handle_endtag(self, tag):
        if tag == 'p' and self.current is not None:
            if self.current['text'].startswith(NOTICE):
                self.notices.append(self.current)
            self.current = None


class SharingGuidanceSiteTest(unittest.TestCase):
    def test_all_existing_notices_and_citations_use_logo_blue_without_changing_text(self):
        pages = []
        count = 0
        for path in sorted(SITE.rglob('*.html')):
            html = path.read_text(encoding='utf-8')
            if NOTICE not in html:
                continue
            notices = Notices(html).notices
            self.assertTrue(notices, f'No sharing paragraph parsed: {path.relative_to(SITE)}')
            pages.append(path)
            for notice in notices:
                with self.subTest(page=str(path.relative_to(SITE))):
                    attrs = notice['attrs']
                    self.assertIn('data-sharing-guidance', attrs)
                    style = (attrs.get('style') or '').replace(' ', '').rstrip(';')
                    self.assertEqual(style, 'color:var(--lab-brand-blue,#2457f5)')
                    self.assertEqual(notice['text'], NOTICE + CITATION)
                    self.assertTrue(attrs.get('class'), 'Keep contextual spacing/size classes')
                count += 1
        self.assertGreater(len(pages), 0, 'Build the site before testing sharing notices')
        self.assertGreaterEqual(count, len(pages))


if __name__ == '__main__':
    unittest.main()
