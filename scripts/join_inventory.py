#!/usr/bin/env python3
"""Join inventory_database.csv with unique_segments.csv."""

import csv


INVENTORY_PATH = 'data/inventory_database.csv'
SEGMENTS_PATH = 'data/unique_segments.csv'
OUTPUT_PATH = 'data/inventory_database_joined.csv'


def read_segment_features(filepath):
    """Return IPA feature rows keyed by segment symbol."""
    with open(filepath, 'r', encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        return {
            row['unique_segments']: row
            for row in reader
        }, reader.fieldnames or []


def main():
    segment_features, feature_fields = read_segment_features(SEGMENTS_PATH)
    skipped_feature_fields = {'unique_segments', 'Type'}
    joined_feature_fields = [
        field for field in feature_fields
        if field not in skipped_feature_fields
    ]

    with open(INVENTORY_PATH, 'r', encoding='utf-8-sig', newline='') as input_file:
        reader = csv.DictReader(input_file)
        inventory_fields = reader.fieldnames or []
        output_fields = inventory_fields + joined_feature_fields

        with open(OUTPUT_PATH, 'w', encoding='utf-8', newline='') as output_file:
            writer = csv.DictWriter(output_file, fieldnames=output_fields)
            writer.writeheader()

            for row in reader:
                segment = row.get('Segment', '')
                feature_row = segment_features.get(segment, {})
                output_row = dict(row)

                for field in joined_feature_fields:
                    output_row[field] = feature_row.get(field, '')

                writer.writerow(output_row)

    print(f"Wrote {OUTPUT_PATH}")


if __name__ == '__main__':
    main()
