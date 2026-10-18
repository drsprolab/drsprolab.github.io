"""Build-time Research Map acceptance checks; run after jekyll build."""
import json
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / '_site'


class Elements(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.by_id = {}
        self.text = {}
        self.current = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        identifier = attrs.get('id')
        if identifier:
            self.by_id[identifier] = attrs
            if identifier.startswith('rm-s-'):
                self.current = identifier

    def handle_data(self, data):
        if self.current:
            self.text[self.current] = self.text.get(self.current, '') + data

    def handle_endtag(self, tag):
        if tag == 'dd':
            self.current = None


class ResearchMapSiteTest(unittest.TestCase):
    def test_page_and_graph_share_the_same_generated_version_and_counts(self):
        snapshot_path = SITE / 'assets/data/research-map.json'
        self.assertTrue(snapshot_path.exists(), 'Research Map is not generated during the site build')
        graph = json.loads(snapshot_path.read_text())
        page = Elements((SITE / 'index.html').read_text())
        root = page.by_id['rmap']
        self.assertEqual(root['data-version'], graph['version'])
        self.assertIn('research-map.json?v=' + graph['version'], root['data-graph'])
        for metric, key in [('papers', 'papers'), ('kws', 'keywords'), ('links', 'links'), ('visible', 'visible')]:
            self.assertEqual(int(page.text['rm-s-' + metric]), graph['stats'][key])
        self.assertEqual(graph['stats']['papers'], len(graph['papers']))
        self.assertEqual(graph['stats']['keywords'], len(graph['keywords']))
        self.assertEqual(graph['stats']['links'], len(graph['links']))
        self.assertEqual(graph['stats']['visible'], len(graph['papers']) + len(graph['keywords']))
        ids = {n['id'] for n in graph['papers'] + graph['keywords']}
        self.assertEqual(len(ids), graph['stats']['visible'])
        for link in graph['links']:
            self.assertIn(link['source'], ids)
            self.assertIn(link['target'], ids)


if __name__ == '__main__':
    unittest.main()
