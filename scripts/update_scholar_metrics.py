#!/usr/bin/env python3
"""Read the all-time metrics from one public Google Scholar profile.

No API key or proxy is used. Missing metrics, identity mismatch, or a blocked
response are errors rather than zero-valued metrics.
"""
from html.parser import HTMLParser
import re
import unicodedata


class ScholarError(ValueError):
    pass


class ScholarParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.name_parts = []
        self.name_depth = 0
        self.name_tag = None
        self.table_depth = 0
        self.rows = []
        self.row = None
        self.cell = None
        self.cell_metric = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id') == 'gsc_prf_in':
            self.name_depth = 1
            self.name_tag = tag
        elif self.name_depth and tag == self.name_tag:
            self.name_depth += 1
        if tag == 'table':
            if self.table_depth:
                self.table_depth += 1
            elif attrs.get('id') == 'gsc_rsb_st':
                self.table_depth = 1
        if self.table_depth == 1:
            if tag == 'tr':
                self.row = []
            elif tag in ('td', 'th'):
                self.cell = []
                self.cell_metric = 'gsc_rsb_std' in (attrs.get('class') or '').split()

    def handle_endtag(self, tag):
        if self.name_depth and tag == self.name_tag:
            self.name_depth -= 1
        if self.table_depth == 1:
            if tag in ('td', 'th') and self.cell is not None:
                if self.row is not None:
                    self.row.append((''.join(self.cell).strip(), self.cell_metric))
                self.cell = None
            elif tag == 'tr' and self.row is not None:
                self.rows.append(self.row)
                self.row = None
        if tag == 'table' and self.table_depth:
            self.table_depth -= 1

    def handle_data(self, data):
        if self.name_depth:
            self.name_parts.append(data)
        if self.cell is not None:
            self.cell.append(data)


def normalized_name(value):
    value = ''.join(c for c in value if unicodedata.category(c) != 'Cf')
    return ' '.join(value.split()).casefold()


def parse_scholar(html, expected_name):
    parser = ScholarParser()
    parser.feed(html)
    if normalized_name(''.join(parser.name_parts)) != normalized_name(expected_name):
        raise ScholarError('Scholar profile identity could not be verified')
    aliases = {'citations': 'citations', '서지정보': 'citations', '인용': 'citations',
               'h-index': 'h_index', 'i10-index': 'i10_index'}
    result = {}
    for row in parser.rows:
        if not row:
            continue
        key = aliases.get(row[0][0].strip().casefold())
        if not key:
            continue
        values = [text for text, metric in row if metric]
        if key in result or len(values) != 2:
            raise ScholarError('Scholar metrics table layout is incomplete or ambiguous')
        value = values[0].replace(',', '').replace('\u00a0', '').strip()
        if not re.fullmatch(r'[0-9]+', value):
            raise ScholarError('Scholar returned a non-integer metric')
        result[key] = int(value)
    if set(result) != {'citations', 'h_index', 'i10_index'}:
        raise ScholarError('All-time Scholar metrics are missing; request may be blocked')
    if result['citations'] < result['h_index'] ** 2 or result['citations'] < result['i10_index'] * 10:
        raise ScholarError('Scholar metrics violate their definitions')
    return result


import argparse
from datetime import date, datetime
import json
import os
from pathlib import Path
import sys
import tempfile
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo


def read_metric_fields(text):
    result = {}
    for key in ('profile_url', 'checked_on', 'citations', 'h_index', 'i10_index'):
        matches = re.findall(r'^' + key + r':[ \t]*(.+)$', text, flags=re.MULTILINE)
        if len(matches) != 1:
            raise ScholarError('Missing or duplicate metric field: ' + key)
        try:
            result[key] = json.loads(matches[0])
        except ValueError as error:
            raise ScholarError('Metric fields require JSON-compatible scalar values: ' + key) from error
    for key in ('citations', 'h_index', 'i10_index'):
        if type(result[key]) is not int or result[key] < 0:
            raise ScholarError('Invalid saved metric: ' + key)
    if not isinstance(result['profile_url'], str):
        raise ScholarError('Profile URL must be a string')
    return result


def validate_profile_url(url):
    parsed = urllib.parse.urlparse(url)
    query = urllib.parse.parse_qs(parsed.query)
    users = query.get('user', [])
    if (parsed.scheme != 'https' or parsed.netloc != 'scholar.google.com'
            or parsed.path != '/citations' or len(users) != 1
            or not re.fullmatch(r'[A-Za-z0-9_-]{12}', users[0])):
        raise ScholarError('Expected one HTTPS Google Scholar citations profile')


def update_metrics(path, html, checked_on, expected_name):
    metrics = parse_scholar(html, expected_name)
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', checked_on):
        raise ScholarError('Expected an ISO check date')
    date.fromisoformat(checked_on)
    path = Path(path)
    original = path.read_text(encoding='utf-8')
    old = read_metric_fields(original)
    validate_profile_url(old['profile_url'])
    if any(old[key] > 0 and metrics[key] == 0 for key in metrics):
        raise ScholarError('Refusing an unexpected zero reset of established metrics')
    updates = {'checked_on': checked_on, **metrics}
    updated = original
    for key, value in updates.items():
        updated = re.sub(r'^' + key + r':[ \t]*.*$',
                         key + ': ' + json.dumps(value, ensure_ascii=False),
                         updated, count=1, flags=re.MULTILINE)
    if updated != original:
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent,
                                             prefix='.scholar-', suffix='.tmp', delete=False) as stream:
                temporary = Path(stream.name)
                stream.write(updated)
            os.replace(temporary, path)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    return {'changed': updated != original, 'profile_url': old['profile_url'], **updates}


def fetch_profile(url):
    validate_profile_url(url)
    request = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'ko,en;q=0.8'})
    with urllib.request.urlopen(request, timeout=30) as response:
        validate_profile_url(response.url)
        body = response.read(2_000_001)
        if len(body) > 2_000_000:
            raise ScholarError('Profile response exceeded the expected size')
        return body.decode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', type=Path,
                        default=Path(__file__).resolve().parents[1] / '_data/scholar_metrics.yml')
    parser.add_argument('--expected-name', default='Ji Hoon Song')
    parser.add_argument('--html', type=Path, help='Local test fixture; omit for the live profile')
    args = parser.parse_args()
    try:
        saved = read_metric_fields(args.data.read_text(encoding='utf-8'))
        html = args.html.read_text(encoding='utf-8') if args.html else fetch_profile(saved['profile_url'])
        checked_on = datetime.now(ZoneInfo('Asia/Seoul')).date().isoformat()
        result = update_metrics(args.data, html, checked_on, args.expected_name)
        print(json.dumps(result, ensure_ascii=False))
        summary = os.environ.get('GITHUB_STEP_SUMMARY')
        if summary:
            with open(summary, 'a', encoding='utf-8') as stream:
                stream.write('## Google Scholar verified\n\n'
                             + f"Checked on: {checked_on} (Asia/Seoul)\n\n"
                             + f"Citations: {result['citations']} · h-index: {result['h_index']}"
                             + f" · i10-index: {result['i10_index']}\n")
        return 0
    except (ScholarError, OSError, ValueError) as error:
        print('Scholar update failed; previous metrics and check date retained: ' + str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
