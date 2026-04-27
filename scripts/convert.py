#!/usr/bin/env python3
"""
Convert inventory_database_joined.csv to JSON for IPA chart rendering.
"""

import csv
import json
from collections import defaultdict


def parse_csv(filepath):
    """Parse the CSV and return structured data."""
    # Structure: languages[lang][dialect] = {'consonants': {}, 'vowels': {}}
    languages = defaultdict(dict)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            lang = row['Language']
            dialect = row['Dialect'] or 'unspecified'
            segment = row['Segment']
            seg_type = row['Type']
            
            # Initialize dialect if needed
            if dialect not in languages[lang]:
                languages[lang][dialect] = {
                    'consonants': {},
                    'vowels': {
                        'monophthongs': {},
                        'diphthongs': defaultdict(list),
                        'triphthongs': []
                    }
                }
            
            if seg_type == 'consonant':
                place = row['Place_of_Articulation'] or 'unknown'
                manner = row['Manner'] or 'unknown'
                voicing = row['Voicing'] or 'unknown'
                aspiration = row['Aspiration'] or 'unaspirated'
                key = f"{voicing}_{aspiration}"
                
                cons = languages[lang][dialect]['consonants']
                if place not in cons:
                    cons[place] = {}
                if manner not in cons[place]:
                    cons[place][manner] = {}
                if key not in cons[place][manner]:
                    cons[place][manner][key] = []
                cons[place][manner][key].append(segment)
                
            elif seg_type == 'vowel':
                vowel_type = row['Vowel_Type'] or 'monophthong'
                vows = languages[lang][dialect]['vowels']

                if vowel_type == 'diphthong':
                    length = row['Length'] or 'unknown'
                    vows['diphthongs'][length].append(segment)
                    continue

                if vowel_type == 'triphthong':
                    vows['triphthongs'].append(segment)
                    continue

                height = row['Height'] or 'unknown'
                backness = row['Backness'] or 'unknown'
                rounding = row['Rounding'] or 'unknown'
                monophthongs = vows['monophthongs']

                if height not in monophthongs:
                    monophthongs[height] = {}
                if backness not in monophthongs[height]:
                    monophthongs[height][backness] = {}
                if rounding not in monophthongs[height][backness]:
                    monophthongs[height][backness][rounding] = []
                monophthongs[height][backness][rounding].append(segment)
    
    return languages


def convert_to_json(data):
    """Convert parsed data to JSON-serializable format."""
    result = {}
    
    for lang, lang_data in sorted(data.items()):
        result[lang] = {
            'dialects': {},
            'all_dialects': sorted(lang_data.keys())
        }
        
        # Process each dialect
        for dialect_key, dialect_data in lang_data.items():
            result[lang]['dialects'][dialect_key] = {
                'consonants': {},
                'vowels': {
                    'monophthongs': {},
                    'diphthongs': {},
                    'triphthongs': []
                }
            }
            
            # Process consonants for this dialect
            for place, manners in dialect_data.get('consonants', {}).items():
                result[lang]['dialects'][dialect_key]['consonants'][place] = {}
                for manner, voicing_data in manners.items():
                    result[lang]['dialects'][dialect_key]['consonants'][place][manner] = {}
                    for voicing_key, segments in voicing_data.items():
                        if segments:
                            result[lang]['dialects'][dialect_key]['consonants'][place][manner][voicing_key] = sorted(set(segments), key=lambda x: str(x))
            
            # Process vowels for this dialect
            vowels = dialect_data.get('vowels', {})
            monophthongs = vowels.get('monophthongs', {})

            for height, backnesses in monophthongs.items():
                result[lang]['dialects'][dialect_key]['vowels']['monophthongs'][height] = {}
                for backness, roundings in backnesses.items():
                    result[lang]['dialects'][dialect_key]['vowels']['monophthongs'][height][backness] = {}
                    for rounding, segments in roundings.items():
                        if segments:
                            result[lang]['dialects'][dialect_key]['vowels']['monophthongs'][height][backness][rounding] = sorted(set(segments), key=lambda x: str(x))

            for length, segments in vowels.get('diphthongs', {}).items():
                if segments:
                    result[lang]['dialects'][dialect_key]['vowels']['diphthongs'][length] = sorted(set(segments), key=lambda x: str(x))

            triphthongs = vowels.get('triphthongs', [])
            if triphthongs:
                result[lang]['dialects'][dialect_key]['vowels']['triphthongs'] = sorted(set(triphthongs), key=lambda x: str(x))
    
    return result


def main():
    input_file = 'data/inventory_database_joined.csv'
    output_file = 'docs/data/inventory.json'
    
    print(f"Parsing {input_file}...")
    data = parse_csv(input_file)
    
    print(f"Found {len(data)} languages")
    
    print("Converting to JSON structure...")
    json_data = convert_to_json(data)
    
    print(f"Writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)
    
    print("Done!")
    print(f"Output: {output_file}")


if __name__ == '__main__':
    main()
