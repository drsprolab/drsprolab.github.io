"""Weekly Scholar update tests (network-free; synthetic values are test fixtures)."""
from datetime import datetime
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/update_scholar_metrics.py'


def scholar_html(name='Ji Hoon Song', citations='7,321', h='43', i10='84'):
    return f'''<html><div id="gsc_prf_in">{name}</div>
<table id="gsc_rsb_st"><tr><th></th><th>All</th><th>Since 2021</th></tr>
<tr><td><a>Citations</a></td><td class="gsc_rsb_std">{citations}</td><td class="gsc_rsb_std">3592</td></tr>
<tr><td><a>h-index</a></td><td class="gsc_rsb_std">{h}</td><td class="gsc_rsb_std">32</td></tr>
<tr><td><a>i10-index</a></td><td class="gsc_rsb_std">{i10}</td><td class="gsc_rsb_std">68</td></tr></table></html>'''


class ScholarMetricsTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.is_file(), 'Weekly Scholar updater has not been implemented')
        spec = importlib.util.spec_from_file_location('scholar_updater', SCRIPT)
        assert spec is not None and spec.loader is not None
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)

    def test_parser_selects_all_time_column(self):
        metrics = self.module.parse_scholar(scholar_html(), expected_name='Ji Hoon Song')
        self.assertEqual(metrics, {'citations': 7321, 'h_index': 43, 'i10_index': 84})

    def test_failed_collection_preserves_existing_data_and_date(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metrics.yml'
            original = 'profile_url: "https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=ko"\nchecked_on: "2026-10-04"\ncitations: 7200\nh_index: 42\ni10_index: 82\n'
            path.write_text(original)
            with self.assertRaises(self.module.ScholarError):
                self.module.update_metrics(path, '<html>CAPTCHA</html>', '2026-10-05', 'Ji Hoon Song')
            self.assertEqual(path.read_text(), original)

    def test_success_updates_metrics_and_check_date_preserving_extra_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metrics.yml'
            path.write_text('profile_url: "https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=ko"\nchecked_on: "2026-10-04"\ncitations: 7200\nh_index: 42\ni10_index: 82\n# Keep this comment\nsource_note: "manual provenance"\n')
            result = self.module.update_metrics(path, scholar_html(), '2026-10-05', 'Ji Hoon Song')
            text = path.read_text()
            self.assertIn('checked_on: "2026-10-05"', text)
            self.assertIn('citations: 7321', text)
            self.assertIn('h_index: 43', text)
            self.assertIn('i10_index: 84', text)
            self.assertIn('# Keep this comment', text)
            self.assertIn('source_note: "manual provenance"', text)
            self.assertTrue(result['changed'])

    def test_cli_summary_append_failure_keeps_successful_update_successful(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metrics.yml'
            path.write_text('profile_url: "https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=ko"\nchecked_on: "2000-01-01"\ncitations: 7200\nh_index: 42\ni10_index: 82\n', encoding='utf-8')
            fixture = Path(directory) / 'profile.html'
            fixture.write_text(scholar_html(), encoding='utf-8')
            summary = Path(directory) / 'summary'
            summary.mkdir()  # Opening a directory for append raises a real OSError.
            before = datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), '--data', str(path), '--html', str(fixture)],
                env={'GITHUB_STEP_SUMMARY': str(summary)},
                capture_output=True, text=True, check=False)
            after = datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
            result = json.loads(completed.stdout)
            saved = self.module.read_metric_fields(path.read_text(encoding='utf-8'))
            self.assertTrue(result['changed'])
            self.assertEqual({key: saved[key] for key in ('citations', 'h_index', 'i10_index')},
                             {'citations': 7321, 'h_index': 43, 'i10_index': 84})
            self.assertIn(saved['checked_on'], (before, after))
            self.assertEqual(saved['checked_on'], result['checked_on'])
            self.assertIn('checked_at: ' + json.dumps(result['checked_at']), path.read_text(encoding='utf-8'))
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertIn('warning', completed.stderr.lower())
            self.assertIn('summary', completed.stderr.lower())
            self.assertNotIn('previous metrics and check date retained', completed.stderr)

    def test_zero_reset_is_rejected_without_advancing_date(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metrics.yml'
            original = 'profile_url: "https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=ko"\nchecked_on: "2026-10-04"\ncitations: 7200\nh_index: 42\ni10_index: 82\n'
            path.write_text(original)
            with self.assertRaises(self.module.ScholarError):
                self.module.update_metrics(path, scholar_html(citations='0', h='0', i10='0'), '2026-10-05', 'Ji Hoon Song')
            self.assertEqual(path.read_text(), original)

    def test_blocked_wrong_profile_and_incomplete_table_are_rejected(self):
        for html in ('<html>CAPTCHA</html>', scholar_html(name='Other Author'),
                     scholar_html().replace('i10-index', 'Unknown metric'),
                     scholar_html(citations='not available')):
            with self.subTest(html=html[:50]), self.assertRaises(self.module.ScholarError):
                self.module.parse_scholar(html, 'Ji Hoon Song')

    def test_korean_labels_and_bidi_name_are_supported(self):
        html = scholar_html(name='\u202aJi Hoon Song\u202c').replace('Citations', '서지정보')
        self.assertEqual(self.module.parse_scholar(html, 'Ji Hoon Song')['citations'], 7321)

    def test_duplicate_rows_are_rejected(self):
        html = scholar_html().replace('</table>', '<tr><td>h-index</td><td class="gsc_rsb_std">43</td><td class="gsc_rsb_std">32</td></tr></table>')
        with self.assertRaises(self.module.ScholarError):
            self.module.parse_scholar(html, 'Ji Hoon Song')

    def test_h_index_tooltip_uses_the_updated_value(self):
        text = (ROOT / '_includes/kw-network.html').read_text()
        self.assertNotIn('42편 이상의 논문이 각각 42회', text)
        self.assertIn('title="{{ scholar.h_index }}편 이상의 논문이 각각 {{ scholar.h_index }}회', text)

    def test_existing_daily_workflow_updates_only_metrics_and_dispatches_deploy(self):
        workflow = ROOT / '.github/workflows/research-metrics.yml'
        self.assertTrue(workflow.is_file(), 'Weekly cloud schedule is missing')
        text = workflow.read_text()
        self.assertIn("cron: '0 0 * * *'", text)
        self.assertIn('git add -- _data/scholar_metrics.yml', text)
        self.assertIn('gh workflow run jekyll.yml --ref main', text)
        self.assertIn("github.event_name == 'schedule'", text)
        self.assertNotIn('continue-on-error:', text)

    def test_updater_script_is_not_published_as_a_site_asset(self):
        text = (ROOT / '_config.yml').read_text()
        self.assertIn('  - scripts', text)

    def test_success_records_the_actual_timezone_aware_check_time(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'metrics.yml'
            path.write_text('profile_url: "https://scholar.google.com/citations?user=wrbbVIQAAAAJ&hl=ko"\nchecked_on: "2026-10-04"\ncitations: 7200\nh_index: 42\ni10_index: 82\n')
            self.module.update_metrics(path, scholar_html(), '2026-10-05', 'Ji Hoon Song', checked_at='2026-10-05T09:15:00+09:00')
            self.assertIn('checked_at: "2026-10-05T09:15:00+09:00"', path.read_text())


if __name__ == '__main__':
    unittest.main()
