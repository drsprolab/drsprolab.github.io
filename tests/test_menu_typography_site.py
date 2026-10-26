"""Menu introduction typography stays slightly smaller, without shrinking article titles."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'


class MenuTypographyTest(unittest.TestCase):
    def test_menu_headers_have_scoped_slightly_smaller_titles_and_intros(self):
        for route in ('members', 'research', 'blog', 'project', 'institutes', 'highlights'):
            with self.subTest(route=route):
                html = (SITE / route / 'index.html').read_text()
                self.assertTrue(re.search(r'<header class="page-head page-head--menu">', html),
                                f'{route} must use the scoped menu header')
        css = (SITE / 'assets/css/style.css').read_text()
        self.assertIsNotNone(re.search(
            r'\.page-head--menu h1,\s*\.daily-index \.daily-hero h1\s*\{\s*font-size:\s*clamp\(27px, 4vw, 36px\);', css),
            'Menu headings must keep a modest responsive 27–36px size')
        self.assertIsNotNone(re.search(
            r'\.page-head--menu \.lede,\s*\.daily-index \.daily-hero > \.lede\s*\{\s*font-size:\s*16px;', css),
            'Only menu introduction text should be reduced to 16px')
        for article in (SITE / 'weekly-insight').glob('*/index.html'):
            if article.parent.name != 'lab':
                self.assertNotIn('page-head--menu', article.read_text())


if __name__ == '__main__':
    unittest.main()
