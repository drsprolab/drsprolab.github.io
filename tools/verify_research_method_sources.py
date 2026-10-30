#!/usr/bin/env python3
"""Recheck the selected references against an SSCI CSV; does not publish the CSV."""
import argparse
import csv
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('ssci_csv', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
data = json.loads((root / '_data/research_methods.json').read_text())
with args.ssci_csv.open(encoding='utf-8-sig', newline='') as f:
    rows = list(csv.DictReader(f))
by_issn = {r[k]: r for r in rows for k in ('ISSN', 'eISSN') if r.get(k)}
missing = []
for key, ref in data['references'].items():
    match = next((by_issn[i] for i in ref['issn'] if i in by_issn), None)
    if not match:
        missing.append(f"{key}: {ref['journal']} / {', '.join(ref['issn'])}")
print(f"Selected references: {len(data['references'])}; matched: {len(data['references']) - len(missing)}")
print('CSV SHA-256:', hashlib.sha256(args.ssci_csv.read_bytes()).hexdigest())
if missing:
    print('\n'.join(missing))
    raise SystemExit(1)
