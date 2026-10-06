"""Execute the real collection shell with harmless collector stand-ins."""
import os
from pathlib import Path
import subprocess
import tempfile
import textwrap
import unittest

ROOT = Path(__file__).resolve().parents[1]


class PauseScopusTest(unittest.TestCase):
    def test_disabled_scopus_never_runs_while_scholar_still_runs(self):
        workflow = (ROOT / '.github/workflows/research-metrics.yml').read_text()
        shell = textwrap.dedent(workflow.split('id: collect', 1)[1].split('run: |', 1)[1]
                                .split('      - name: Publish', 1)[0])
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)
            executable = path / 'python'
            executable.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$COLLECTOR_CALLS"\nexit 0\n')
            executable.chmod(0o700)
            calls = path / 'calls.txt'
            env = {**os.environ, 'PATH': str(path) + os.pathsep + os.environ['PATH'],
                   'COLLECTOR_CALLS': str(calls), 'SCOPUS_UPDATES_ENABLED': 'false',
                   'GITHUB_OUTPUT': str(path / 'output'),
                   'GITHUB_STEP_SUMMARY': str(path / 'summary')}
            result = subprocess.run(['bash', '-e', '-o', 'pipefail', '-c', shell],
                                    env=env, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            invoked = calls.read_text()
            self.assertIn('scripts/update_scholar_metrics.py', invoked)
            self.assertNotIn('scripts/update_scopus_metrics.py', invoked)
            self.assertIn('Scopus updates paused', result.stdout)
            self.assertIn('failed=0', (path / 'output').read_text())


if __name__ == '__main__':
    unittest.main()
