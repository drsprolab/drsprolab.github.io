"""Rendered professor Research row acceptance test; run after Jekyll build."""
from html.parser import HTMLParser
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links = []
        self.current = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.current = {key: value or '' for key, value in attrs}
            self.current['text'] = ''

    def handle_data(self, data):
        if self.current is not None:
            self.current['text'] += data

    def handle_endtag(self, tag):
        if tag == 'a' and self.current is not None:
            self.links.append(self.current)
            self.current = None


class ProfessorResearchLinksTest(unittest.TestCase):
    def test_professor_english_name_has_dr_prefix_and_keeps_degree(self):
        html = (ROOT / '_site/members/index.html').read_text()
        name = re.search(r'<h3 class="profile-name">.*?<span>(.*?)</span>', html, re.S)
        assert name is not None
        self.assertEqual(name.group(1), 'Dr. Ji Hoon Song, Ph.D.')

    def test_professor_positions_use_a_scoped_slightly_smaller_font(self):
        css = (ROOT / '_site/assets/css/style.css').read_text()
        rule = re.search(r'\.profile-intro\s*>\s*\.plain\s*\{[^}]*font-size:\s*15px\s*;', css)
        self.assertIsNotNone(rule, 'Professor position list must use a scoped 15px font')

    def test_research_row_preserves_scholar_orcid_and_adds_existing_scopus_profile(self):
        html = (ROOT / '_site/members/index.html').read_text()
        row = re.search(r'<dt>Research</dt>\s*<dd>(.*?)</dd>', html, re.S)
        self.assertIsNotNone(row, 'Professor links row must be labelled Research')
        assert row is not None
        links = Links(row.group(1)).links
        self.assertEqual([link['text'] for link in links], ['Google Scholar', 'ORCID', 'Scopus'])
        profile = re.search(r'^profile_url:\s*"([^"]+)"',
                            (ROOT / '_data/scopus_metrics.yml').read_text(), re.M)
        assert profile is not None
        self.assertEqual([link['href'] for link in links], [
            'https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=en',
            'https://orcid.org/0000-0003-2784-2358', profile.group(1),
        ])
        for link in links:
            self.assertEqual(link['target'], '_blank')
            self.assertTrue({'noopener', 'noreferrer'} <= set(link['rel'].split()))
        self.assertNotIn('<dt>Links</dt>', html)


if __name__ == '__main__':
    unittest.main()
