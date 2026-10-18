"""Exercise real Jekyll rebuilds with isolated synthetic papers, never source publications."""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

from test_research_map_site import Elements

ROOT = Path(__file__).resolve().parents[1]


class ResearchMapRebuildTest(unittest.TestCase):
    def test_add_edit_remove_paper_rebuilds_metrics_keywords_links_and_version(self):
        with tempfile.TemporaryDirectory(prefix='research-map-rebuild-') as directory:
            source = Path(directory)
            for subdir in ['_plugins', '_includes', '_data', 'assets/data']:
                (source / subdir).mkdir(parents=True, exist_ok=True)
            for relative in ['_plugins/research_map.rb', '_includes/kw-network.html',
                             '_data/scholar_metrics.yml', '_data/scopus_metrics.yml',
                             'assets/data/research-map.liquid']:
                shutil.copyfile(ROOT / relative, source / relative)
            (source / '_config.yml').write_text('baseurl: /fixture\nexclude: []\n')
            (source / 'index.html').write_text('---\nlayout: null\n---\n{% include kw-network.html %}')
            (source / '_data/keyword_map.json').write_text(json.dumps([
                {'field': '조직행동', 'en': 'Behavior', 'group': 'HRD', 'keywords': [
                    {'name': '리더십', 'en': 'Leadership', 'patterns': ['leadership']}
                ]}
            ]))

            def build(papers):
                (source / '_data/publications.json').write_text(json.dumps(papers))
                run = subprocess.run(['bundle', 'exec', 'jekyll', 'build', '--source', str(source),
                                      '--destination', str(source / '_site')], cwd=ROOT,
                                     capture_output=True, text=True, timeout=90)
                self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
                graph = json.loads((source / '_site/assets/data/research-map.json').read_text())
                page = Elements((source / '_site/index.html').read_text())
                self.assertEqual(page.by_id['rmap']['data-version'], graph['version'])
                self.assertTrue(page.by_id['rmap']['data-graph'].startswith('/fixture/assets/'))
                self.assertEqual([int(page.text['rm-s-' + key]) for key in ['papers', 'kws', 'links', 'visible']],
                                 [graph['stats'][key] for key in ['papers', 'keywords', 'links', 'visible']])
                return graph

            first = {'year': 2026, 'citation': 'Synthetic A (2026). Quantum mentoring and leadership.'}
            second = {'year': 2026, 'citation': 'Synthetic B (2026). Leadership through quantum mentoring.'}
            baseline = build([first])
            self.assertEqual(baseline['stats'], {'papers': 1, 'keywords': 0, 'links': 0, 'visible': 1})
            added = build([first, second])
            self.assertEqual(added['stats'], {'papers': 2, 'keywords': 2, 'links': 4, 'visible': 4})
            self.assertEqual({keyword['name'] for keyword in added['keywords']}, {'Leadership', 'quantum mentoring'})
            self.assertNotEqual(baseline['version'], added['version'])
            edited = build([first, {'year': 2026, 'citation': 'Synthetic B (2026). Quiet workplace.'}])
            self.assertEqual(edited['stats'], {'papers': 2, 'keywords': 0, 'links': 0, 'visible': 2})
            self.assertNotEqual(added['version'], edited['version'])
            self.assertEqual(build([first]), baseline)


if __name__ == '__main__':
    unittest.main()
