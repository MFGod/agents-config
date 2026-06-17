#!/usr/bin/env python3
# FROZEN SOURCE
#
# Origin Repository: https://github.com/JuliusBrussee/caveman
# Origin File: skills/caveman-compress/scripts/detect.py
# Origin Commit/Tag: 25d22f864ad68cc447a4cb93aefde918aa4aec9f (main, 2026-06-12)
#
# Status: Modified
#
# This file is based on an external implementation.
# Before making changes:
# 1. Compare with the original source.
# 2. Verify that upstream behavior is preserved.
# 3. Check for upstream updates or fixes.
# 4. Document reasons for any divergence.
#
# Do not refactor, simplify, optimize, or rewrite this file
# without understanding the original implementation and its intent.
"""Detect whether a file is natural language (compressible) or not."""

from pathlib import Path

# Extensions that are natural language and safe to compress.
NATURAL_LANGUAGE_EXTENSIONS = {'.md', '.txt', '.markdown', '.rst', '.typ', '.typst', '.tex'}


def detect_file_type(filepath: Path) -> str:
    """Classify file as 'natural_language' or 'code'."""
    if filepath.suffix.lower() in NATURAL_LANGUAGE_EXTENSIONS:
        return 'natural_language'
    return 'code'


def should_compress(filepath: Path) -> bool:
    """Return True if the file is natural language and should be compressed."""
    return (
        filepath.is_file()
        and not filepath.name.endswith('.original.md')
        and detect_file_type(filepath) == 'natural_language'
    )


if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print('Usage: python detect.py <file1> [file2] ...')
        sys.exit(1)

    for path_str in sys.argv[1:]:
        p = Path(path_str).resolve()
        file_type = detect_file_type(p)
        compress = should_compress(p)
        print(f'  {p.name:30s} type={file_type:20s} compress={compress}')
