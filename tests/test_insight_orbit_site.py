"""Weekly Insight orbit must use the same recent posts as its own archive."""
from html.parser import HTMLParser
import json
from pathlib import Path
import unittest

SITE = Path(__file__).resolve().parents[1] / '_site'


class Archive(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.orbit = None
        self.canvas = None
        self.cards = []
        self.in_script = False
        self.in_card = False
        self.in_badge = False
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        classes = (attrs.get('class') or '').split()
        if tag == 'script' and attrs.get('id') == 'banner-orbit-items':
            self.in_script = True
        if tag == 'canvas' and 'banner-orbit' in classes:
            self.canvas = attrs
        if tag == 'a' and 'inst' in classes:
            self.in_card = True
            self.cards.append([])
        if self.in_card and tag == 'span' and 'badge' in classes:
            self.in_badge = True

    def handle_endtag(self, tag):
        if tag == 'script':
            self.in_script = False
        if tag == 'a':
            self.in_card = False
        if tag == 'span':
            self.in_badge = False

    def handle_data(self, data):
        if self.in_script:
            self.orbit = json.loads(data)
        if self.in_badge:
            self.cards[-1].append(data)


class InsightOrbitTest(unittest.TestCase):
    def test_each_archive_uses_its_own_latest_six_published_articles(self):
        for relative in ('weekly-insight/index.html', 'weekly-insight/lab/index.html'):
            with self.subTest(page=relative):
                page = Archive(SITE / relative)
                self.assertEqual(page.orbit, page.cards[:6])
                if page.cards:
                    assert page.canvas is not None
                    self.assertEqual(page.canvas.get('data-priority'), 'recent')


if __name__ == '__main__':
    unittest.main()
