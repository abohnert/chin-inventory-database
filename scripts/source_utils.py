"""Shared helpers for inventory source labels."""

import re


def split_source_cell(source):
    """Split a Source cell into individual citation labels."""
    if not source:
        return []

    parts = re.split(r'\s*[,;]\s*', source.strip())
    return [part for part in parts if part]
