#!/usr/bin/env python3
"""
Convert inventory_database_joined.csv to JSON for IPA chart rendering.
"""

import csv
import json
from collections import defaultdict


def parse_csv(filepath):
    """Parse the CSV and return structured data."""
    languages = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list)))))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            lang = row['Language']
            dialect = row['Dialect']
            segment = row['Segment']
            seg_type = row['Type']
            
            # Build language/dialect info
            if dialect and dialect not in languages[lang].get('dialects', []):
                if 'dialects' not in languages[lang]:
                    languages[lang]['dialects'] = []
                languages[lang]['dialects'].append(dialect)
            
            if seg_type == 'consonant':
                place = row['Place_of_Articulation'] or 'unknown'
                manner = row['Manner'] or 'unknown'
                voicing = row['Voicing'] or 'unknown'
                aspiration = row['Aspiration'] or 'unaspirated'
                
                # Use voicing+aspiration as key
                key = f"{voicing}_{aspiration}"
                languages[lang]['consonants'][place][manner][key].append(segment)
                
            elif seg_type == 'vowel':
                height = row['Height'] or 'unknown'
                backness = row['Backness'] or 'unknown'
                rounding = row['Rounding'] or 'unknown'
                
                languages[lang]['vowels'][height][backness][rounding].append(segment)
    
    return languages


def convert_to_json(data):
    """Convert parsed data to JSON-serializable format."""
    result = {}
    
    for lang, lang_data in sorted(data.items()):
        result[lang] = {
            'dialects': lang_data.get('dialects', []),
            'consonants': {},
            'vowels': {}
        }
        
        # Process consonants
        for place, manners in lang_data['consonants'].items():
            result[lang]['consonants'][place] = {}
            for manner, voicing_data in manners.items():
                result[lang]['consonants'][place][manner] = {}
                for voicing_key, segments in voicing_data.items():
                    if segments:
                        result[lang]['consonants'][place][manner][voicing_key] = sorted(set(segments), key=lambda x: str(x))
        
        # Process vowels
        for height, backnesses in lang_data['vowels'].items():
            result[lang]['vowels'][height] = {}
            for backness, roundings in backnesses.items():
                result[lang]['vowels'][height][backness] = {}
                for rounding, segments in roundings.items():
                    if segments:
                        result[lang]['vowels'][height][backness][rounding] = sorted(set(segments), key=lambda x: str(x))
    
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