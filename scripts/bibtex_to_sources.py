#!/usr/bin/env python3
"""
Convert BibTeX exports from Zotero to sources.json for IPA charts.

Usage:
    python3 scripts/bibtex_to_sources.py path/to/exported.bib
"""

import csv
import json
import re
import sys
import unicodedata
from collections import defaultdict

from source_utils import split_source_cell


OUTPUT_FIELDS = [
    'type',
    'key',
    'author',
    'title',
    'year',
    'journal',
    'volume',
    'number',
    'pages',
    'publisher',
    'booktitle',
    'editor',
    'address',
    'doi',
    'url',
]


def clean_bibtex_value(value):
    """Clean a BibTeX field value for display and matching."""
    value = re.sub(r'\s+', ' ', value.strip())
    value = value.replace(r'\&', '&')
    value = re.sub(r'\\[a-zA-Z]+\s*', '', value)
    value = value.replace('{', '').replace('}', '')
    return value.strip()


def find_entry_end(content, start):
    """Return the index after the closing brace for an entry."""
    depth = 0
    for idx in range(start, len(content)):
        char = content[idx]
        if char == '{':
            depth += 1
        elif char == '}':
            depth -= 1
            if depth == 0:
                return idx + 1
    return len(content)


def parse_field_value(fields, start):
    """Parse one BibTeX field value starting just after '='."""
    idx = start
    while idx < len(fields) and fields[idx].isspace():
        idx += 1

    if idx >= len(fields):
        return '', idx

    if fields[idx] == '{':
        depth = 1
        value_start = idx + 1
        idx += 1
        while idx < len(fields) and depth > 0:
            if fields[idx] == '{':
                depth += 1
            elif fields[idx] == '}':
                depth -= 1
            idx += 1
        return fields[value_start:idx - 1], idx

    if fields[idx] == '"':
        value_start = idx + 1
        idx += 1
        escaped = False
        while idx < len(fields):
            if fields[idx] == '"' and not escaped:
                return fields[value_start:idx], idx + 1
            escaped = fields[idx] == '\\' and not escaped
            if fields[idx] != '\\':
                escaped = False
            idx += 1
        return fields[value_start:idx], idx

    value_start = idx
    while idx < len(fields) and fields[idx] not in ',\n':
        idx += 1
    return fields[value_start:idx], idx


def parse_fields(fields):
    """Parse BibTeX fields with nested braces."""
    parsed = {}
    idx = 0

    while idx < len(fields):
        match = re.search(r'([A-Za-z][A-Za-z0-9_-]*)\s*=', fields[idx:])
        if not match:
            break

        field_name = match.group(1).lower()
        value_start = idx + match.end()
        value, idx = parse_field_value(fields, value_start)
        parsed[field_name] = clean_bibtex_value(value)

        while idx < len(fields) and fields[idx] != ',':
            idx += 1
        if idx < len(fields) and fields[idx] == ',':
            idx += 1

    return parsed


def parse_bibtex(filepath):
    """Parse a BibTeX file and return entries keyed by citation key."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    entries = {}
    idx = 0

    while True:
        match = re.search(r'@([A-Za-z]+)\s*\{\s*([^,\s]+)\s*,', content[idx:])
        if not match:
            break

        entry_start = idx + match.start()
        fields_start = idx + match.end()
        entry_end = find_entry_end(content, entry_start + match.group(0).find('{'))
        entry_type = match.group(1).lower()
        citation_key = match.group(2).strip()
        fields = content[fields_start:entry_end - 1]

        entry = {'type': entry_type, 'key': citation_key}
        entry.update(parse_fields(fields))
        entries[citation_key] = entry
        idx = entry_end

    return entries


def normalize_label(value):
    """Normalize labels for citation matching."""
    if not value:
        return ''
    value = unicodedata.normalize('NFKD', value)
    value = ''.join(char for char in value if not unicodedata.combining(char))
    value = value.lower()
    return re.sub(r'[^a-z0-9]+', '', value)


def author_surnames(author):
    """Return normalized surnames from a BibTeX author field."""
    surnames = []
    for name in re.split(r'\s+and\s+', author or ''):
        name = name.strip()
        if not name:
            continue
        if ',' in name:
            surname = name.split(',', 1)[0].strip()
        else:
            surname = name.split()[-1]
        normalized = normalize_label(surname)
        if normalized:
            surnames.append(normalized)
    return surnames


def unique_match(entries):
    """Return an entry if a match list is unique, otherwise None."""
    if len(entries) == 1:
        return entries[0]
    return None


def get_csv_sources(csv_filepath):
    """Extract unique individual source labels from the joined inventory CSV."""
    sources = set()
    with open(csv_filepath, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            for source in split_source_cell(row.get('Source', '')):
                sources.add(source)
    return sorted(sources, key=normalize_label)


def build_indexes(bibtex_entries):
    """Build source matching indexes from parsed BibTeX entries."""
    key_index = {}
    author_index = defaultdict(list)
    author_year_index = defaultdict(list)

    for key, entry in bibtex_entries.items():
        key_index[normalize_label(key)] = entry
        year = entry.get('year', '')
        surnames = author_surnames(entry.get('author', ''))
        if not surnames:
            continue

        first_surname = surnames[0]
        author_index[first_surname].append(entry)
        if year:
            author_year_index[f'{first_surname}{year}'].append(entry)

    return key_index, author_index, author_year_index


def match_sources(bibtex_entries, csv_sources):
    """Match CSV source labels to BibTeX entries."""
    matched = {}
    unmatched = []
    ambiguous = {}
    key_index, author_index, author_year_index = build_indexes(bibtex_entries)

    for csv_source in csv_sources:
        normalized_source = normalize_label(csv_source)

        if normalized_source in key_index:
            matched[csv_source] = key_index[normalized_source]
            continue

        author_year_match = re.match(r'^(.+?)(\d{4})$', normalized_source)
        if author_year_match:
            entry = unique_match(author_year_index.get(normalized_source, []))
            if entry:
                matched[csv_source] = entry
                continue
            if author_year_index.get(normalized_source):
                ambiguous[csv_source] = author_year_index[normalized_source]
                continue

        entry = unique_match(author_index.get(normalized_source, []))
        if entry:
            matched[csv_source] = entry
            continue
        if author_index.get(normalized_source):
            ambiguous[csv_source] = author_index[normalized_source]
            continue

        unmatched.append(csv_source)

    return matched, unmatched, ambiguous


def create_sources_json(matched_entries, csv_sources, output_filepath):
    """Create sources.json."""
    result = {}

    for source in csv_sources:
        entry = matched_entries.get(source)
        if entry:
            result[source] = {
                field: entry.get(field, '')
                for field in OUTPUT_FIELDS
                if entry.get(field, '')
            }
        else:
            result[source] = {
                'author': '',
                'title': '',
                'year': '',
                '_missing': True,
                '_note': 'Please fill in manually',
            }

    with open(output_filepath, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return result


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/bibtex_to_sources.py path/to/exported.bib")
        sys.exit(1)

    bibtex_path = sys.argv[1]
    csv_path = 'data/inventory_database_joined.csv'
    output_path = 'docs/data/sources.json'

    print(f"Parsing BibTeX: {bibtex_path}")
    bibtex_entries = parse_bibtex(bibtex_path)
    print(f"  Found {len(bibtex_entries)} entries")

    print(f"\nExtracting sources from: {csv_path}")
    csv_sources = get_csv_sources(csv_path)
    print(f"  Found {len(csv_sources)} unique sources")

    print("\nMatching sources...")
    matched, unmatched, ambiguous = match_sources(bibtex_entries, csv_sources)
    print(f"  Matched: {len(matched)}")
    print(f"  Unmatched: {len(unmatched)}")
    print(f"  Ambiguous: {len(ambiguous)}")

    if unmatched:
        print("\n  Unmatched sources:")
        for source in unmatched:
            print(f"    - {source}")

    if ambiguous:
        print("\n  Ambiguous sources:")
        for source, entries in ambiguous.items():
            keys = ', '.join(entry.get('key', '') for entry in entries)
            print(f"    - {source}: {keys}")

    print(f"\nWriting to: {output_path}")
    create_sources_json(matched, csv_sources, output_path)
    print("Done!")


if __name__ == '__main__':
    main()
