#!/usr/bin/env python3
"""Read verified Scopus author metrics using Elsevier's official API."""
import argparse
from datetime import date, datetime
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo


class ScopusError(ValueError):
    pass


def count(value):
    if isinstance(value, bool) or not re.fullmatch(r'[0-9]+', str(value)):
        raise ScopusError('Scopus returned a missing or invalid metric')
    return int(value)


def parse_scopus(payload, author_id):
    if not isinstance(payload, dict):
        raise ScopusError('Scopus API response must be a JSON object')
    entries = payload.get('author-retrieval-response')
    if not isinstance(entries, list) or len(entries) != 1 or not isinstance(entries[0], dict):
        raise ScopusError('Expected one Scopus author response')
    entry = entries[0]
    core = entry.get('coredata')
    if not isinstance(core, dict) or core.get('dc:identifier') != 'AUTHOR_ID:' + author_id:
        raise ScopusError('Scopus author ID could not be verified')
    result = {
        'citations': count(core.get('citation-count', core.get('citations-count'))),
        'h_index': count(entry.get('h-index', core.get('h-index'))),
        'documents': count(core.get('document-count')),
    }
    if result['citations'] < result['h_index'] ** 2 or result['documents'] < result['h_index']:
        raise ScopusError('Scopus metrics violate their definitions')
    return result


def read_config(text):
    result = {}
    for key in ('profile_url', 'author_id', 'checked_on', 'citations', 'h_index', 'documents'):
        lines = re.findall(r'^' + key + r':[ \t]*(.*)$', text, flags=re.MULTILINE)
        if len(lines) > 1 or (key in ('profile_url', 'author_id') and len(lines) != 1):
            raise ScopusError('Missing or duplicate Scopus configuration: ' + key)
        if not lines or not lines[0].strip():
            result[key] = None
        else:
            try:
                result[key] = json.loads(lines[0])
            except ValueError as error:
                raise ScopusError('Expected JSON-compatible scalar values in Scopus data') from error
    author_id = result['author_id']
    if not isinstance(author_id, str) or not re.fullmatch(r'[0-9]{9,12}', author_id):
        raise ScopusError('Scopus author ID must be a quoted, unmodified numeric identifier')
    profile = result['profile_url']
    if not isinstance(profile, str):
        raise ScopusError('Scopus profile URL must be a string')
    url = urllib.parse.urlparse(profile)
    if (url.scheme != 'https' or url.netloc != 'www.scopus.com'
            or url.path != '/authid/detail.uri'
            or urllib.parse.parse_qs(url.query).get('authorId') != [author_id]):
        raise ScopusError('Scopus profile URL and author ID do not match')
    for key in ('citations', 'h_index', 'documents'):
        if result[key] is not None and (type(result[key]) is not int or result[key] < 0):
            raise ScopusError('Invalid saved Scopus metric: ' + key)
    return result


def update_metrics(path, payload, checked_on, checked_at=None):
    path = Path(path)
    original = path.read_text(encoding='utf-8')
    saved = read_config(original)
    metrics = parse_scopus(payload, saved['author_id'])
    if any(saved[key] is not None and saved[key] > 0 and metrics[key] == 0 for key in metrics):
        raise ScopusError('Refusing an unexpected zero reset of established Scopus metrics')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', checked_on):
        raise ScopusError('Expected an ISO check date')
    date.fromisoformat(checked_on)
    updates = {'checked_on': checked_on, **metrics}
    if not re.search(r'^documents:', original, flags=re.MULTILINE):
        updates.pop('documents')
    if checked_at is not None:
        timestamp = datetime.fromisoformat(checked_at)
        if timestamp.utcoffset() is None or timestamp.astimezone(ZoneInfo('Asia/Seoul')).date().isoformat() != checked_on:
            raise ScopusError('Check time must be timezone-aware and match the check date')
        updates['checked_at'] = checked_at
    updated = original
    for key, value in updates.items():
        line = key + ': ' + json.dumps(value, ensure_ascii=False)
        if re.search(r'^' + key + ':', updated, flags=re.MULTILINE):
            updated = re.sub(r'^' + key + r':[ \t]*.*$', line, updated, count=1, flags=re.MULTILINE)
        else:
            updated = updated.rstrip('\n') + '\n' + line + '\n'
    if updated != original:
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                             prefix='.scopus-', suffix='.tmp', delete=False) as stream:
                temporary = Path(stream.name)
                stream.write(updated)
            os.replace(temporary, path)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    return {'changed': updated != original, 'author_id': saved['author_id'],
            'checked_on': checked_on, **metrics}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ScopusError('Authenticated Scopus API redirects are not permitted')


def fetch_author(author_id, api_key, institution_token=None):
    if not api_key:
        raise ScopusError('SCOPUS_API_KEY is not configured; existing Scopus values retained')
    if not isinstance(author_id, str) or not re.fullmatch(r'[0-9]{9,12}', author_id):
        raise ScopusError('Invalid Scopus author ID')
    if any(c in value for value in (api_key, institution_token or '') for c in '\r\n'):
        raise ScopusError('API credential headers must not contain newline characters')
    headers = {'Accept': 'application/json', 'X-ELS-APIKey': api_key}
    if institution_token:
        headers['X-ELS-Insttoken'] = institution_token
    url = 'https://api.elsevier.com/content/author/author_id/' + author_id + '?view=METRICS'
    request = urllib.request.Request(url, headers=headers)
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=30) as response:
            raw = response.read(2_000_001)
            if len(raw) > 2_000_000:
                raise ScopusError('Scopus API response exceeded the expected size')
            return json.loads(raw.decode('utf-8'))
    except urllib.error.HTTPError as error:
        raise ScopusError(f'Scopus API HTTP {error.code}; check API key and institutional entitlements') from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path,
                        default=Path(__file__).resolve().parents[1] / '_data/scopus_metrics.yml')
    parser.add_argument('--json', type=Path, help='Local test fixture; omit for the official API')
    args = parser.parse_args()
    try:
        saved = read_config(args.data.read_text(encoding='utf-8'))
        payload = json.loads(args.json.read_text(encoding='utf-8')) if args.json else fetch_author(
            saved['author_id'], os.environ.get('SCOPUS_API_KEY'), os.environ.get('SCOPUS_INST_TOKEN'))
        checked = datetime.now(ZoneInfo('Asia/Seoul'))
        checked_on = checked.date().isoformat()
        result = update_metrics(args.data, payload, checked_on, checked.isoformat(timespec='seconds'))
    except (ScopusError, OSError, ValueError) as error:
        print('Scopus update failed; previous metrics and check date retained: ' + str(error), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        try:
            with open(summary, 'a', encoding='utf-8') as stream:
                stream.write('## Scopus verified\n\n'
                             + f"Checked on: {checked_on} (Asia/Seoul)\n\n"
                             + f"Citations: {result['citations']} · h-index: {result['h_index']}"
                             + f" · Documents: {result['documents']}\n")
        except OSError as error:
            print('Warning: Scopus summary append failed: ' + str(error), file=sys.stderr)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
