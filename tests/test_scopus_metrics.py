"""Scopus API adapter tests. Payload numbers are synthetic, never live metrics."""
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
SCRIPT = ROOT / 'scripts/update_scopus_metrics.py'


def payload(author='25655456100'):
    return {'author-retrieval-response': [{'coredata': {
        'dc:identifier': 'AUTHOR_ID:' + author,
        'citation-count': '4123', 'cited-by-count': '3001', 'document-count': '95'},
        'h-index': '31'}]}


class ScopusMetricsTest(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SCRIPT.is_file(), 'Scopus API adapter is missing')
        spec = importlib.util.spec_from_file_location('scopus_updater', SCRIPT)
        assert spec is not None and spec.loader is not None
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)

    def test_citation_count_is_not_confused_with_citing_document_count(self):
        actual = self.module.parse_scopus(payload(), '25655456100')
        self.assertEqual(actual, {'citations': 4123, 'h_index': 31, 'documents': 95})

    def test_valid_response_populates_initial_blank_fields_and_check_date(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scopus.yml'
            path.write_text('profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations:\nh_index:\ndocuments:\n')
            result = self.module.update_metrics(path, payload(), '2026-10-05')
            text = path.read_text()
            self.assertIn('citations: 4123', text)
            self.assertIn('h_index: 31', text)
            self.assertIn('documents: 95', text)
            self.assertIn('checked_on: "2026-10-05"', text)
            self.assertTrue(result['changed'])

    def test_cli_summary_append_failure_keeps_successful_update_successful(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scopus.yml'
            path.write_text('profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations: 4000\nh_index: 30\ndocuments: 90\nchecked_on: "2000-01-01"\n', encoding='utf-8')
            fixture = Path(directory) / 'author.json'
            fixture.write_text(json.dumps(payload()), encoding='utf-8')
            summary = Path(directory) / 'summary'
            summary.mkdir()  # Opening a directory for append raises a real OSError.
            before = datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
            completed = subprocess.run(
                [sys.executable, str(SCRIPT), '--data', str(path), '--json', str(fixture)],
                env={'GITHUB_STEP_SUMMARY': str(summary)},
                capture_output=True, text=True, check=False)
            after = datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
            result = json.loads(completed.stdout)
            saved_text = path.read_text(encoding='utf-8')
            saved = self.module.read_config(saved_text)
            self.assertTrue(result['changed'])
            self.assertEqual({key: saved[key] for key in ('citations', 'h_index', 'documents')},
                             {'citations': 4123, 'h_index': 31, 'documents': 95})
            self.assertIn(saved['checked_on'], (before, after))
            self.assertEqual(saved['checked_on'], result['checked_on'])
            timestamp = json.loads(next(line.split(': ', 1)[1] for line in saved_text.splitlines()
                                        if line.startswith('checked_at: ')))
            self.assertEqual(datetime.fromisoformat(timestamp).isoformat(), timestamp)
            self.assertTrue(timestamp.endswith('+09:00'))
            self.assertEqual(datetime.fromisoformat(timestamp).date().isoformat(), saved['checked_on'])
            self.assertEqual(completed.returncode, 0, completed.stderr)
            self.assertIn('warning', completed.stderr.lower())
            self.assertIn('summary', completed.stderr.lower())
            self.assertNotIn('previous metrics and check date retained', completed.stderr)

    def test_error_wrong_author_and_missing_metrics_preserve_existing_values(self):
        original = 'profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations: 4123\nh_index: 31\ndocuments: 95\nchecked_on: "2026-10-04"\n'
        missing = payload()
        del missing['author-retrieval-response'][0]['h-index']
        for data in ({'service-error': {'status': 'UNAUTHORIZED'}}, payload('12345678900'), missing):
            with self.subTest(data=data), tempfile.TemporaryDirectory() as directory:
                path = Path(directory) / 'scopus.yml'
                path.write_text(original)
                with self.assertRaises(self.module.ScopusError):
                    self.module.update_metrics(path, data, '2026-10-05')
                self.assertEqual(path.read_text(), original)

    def test_zero_reset_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scopus.yml'
            original = 'profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations: 4123\nh_index: 31\ndocuments: 95\nchecked_on: "2026-10-04"\n'
            path.write_text(original)
            zero = payload()
            zero['author-retrieval-response'][0]['coredata'].update({'citation-count': '0', 'document-count': '0'})
            zero['author-retrieval-response'][0]['h-index'] = '0'
            with self.assertRaises(self.module.ScopusError):
                self.module.update_metrics(path, zero, '2026-10-05')
            self.assertEqual(path.read_text(), original)

    def test_missing_api_key_is_not_replaced_with_synthetic_metrics(self):
        with self.assertRaises(self.module.ScopusError):
            self.module.fetch_author('25655456100', None)

    def test_profile_url_and_author_id_must_match(self):
        data = 'profile_url: "https://www.scopus.com/authid/detail.uri?authorId=12345678900"\nauthor_id: "25655456100"\n'
        with self.assertRaises(self.module.ScopusError):
            self.module.read_config(data)

    def test_credential_headers_use_https_and_do_not_enter_the_url(self):
        from unittest.mock import MagicMock, patch as mock_patch
        context = MagicMock()
        context.__enter__.return_value.read.return_value = json.dumps(payload()).encode()
        opener = MagicMock()
        opener.open.return_value = context
        with mock_patch.object(self.module.urllib.request, 'build_opener', return_value=opener):
            self.module.fetch_author('25655456100', 'unit-test-api-key', 'unit-test-institution-token')
        request = opener.open.call_args.args[0]
        self.assertTrue(request.full_url.startswith('https://api.elsevier.com/'))
        self.assertEqual(self.module.urllib.parse.parse_qs(
            self.module.urllib.parse.urlparse(request.full_url).query), {'view': ['METRICS']})
        self.assertNotIn('unit-test', request.full_url)
        self.assertEqual(request.get_header('X-els-apikey'), 'unit-test-api-key')
        self.assertEqual(request.get_header('X-els-insttoken'), 'unit-test-institution-token')

    def test_authenticated_redirects_are_rejected(self):
        with self.assertRaises(self.module.ScopusError):
            self.module.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.example')

    def test_success_records_the_actual_timezone_aware_check_time(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scopus.yml'
            path.write_text('profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations:\nh_index:\ndocuments:\n')
            self.module.update_metrics(path, payload(), '2026-10-05', checked_at='2026-10-05T09:15:00+09:00')
            self.assertIn('checked_at: "2026-10-05T09:15:00+09:00"', path.read_text())

    def test_credential_newlines_cannot_leak_via_header_errors(self):
        with self.assertRaises(self.module.ScopusError):
            self.module.fetch_author('25655456100', 'test-value\nwith-newline')

    def test_removed_documents_field_is_not_reintroduced(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'scopus.yml'
            path.write_text('profile_url: "https://www.scopus.com/authid/detail.uri?authorId=25655456100"\nauthor_id: "25655456100"\ncitations:\nh_index:\n')
            self.module.update_metrics(path, payload(), '2026-10-05')
            self.assertNotIn('documents:', path.read_text())

    def test_non_object_api_response_is_rejected(self):
        with self.assertRaises(self.module.ScopusError):
            self.module.parse_scopus(None, '25655456100')


if __name__ == '__main__':
    unittest.main()
