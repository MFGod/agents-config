#!/usr/bin/env python3
# FROZEN SOURCE
#
# Origin Repository: https://github.com/JuliusBrussee/caveman
# Origin File: skills/caveman-compress/scripts/compress.py
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
"""
Caveman Memory Compression Orchestrator

Usage:
    python scripts/compress.py <filepath>
"""

import os
import re
import subprocess
from pathlib import Path
from typing import List

from .detect import should_compress
from .validate import validate

MAX_RETRIES = 2
MAX_FILE_SIZE = 500_000  # 500 KB — cap before shipping file contents to the API

OUTER_FENCE_REGEX = re.compile(
    r"\A\s*(`{3,}|~{3,})[^\n]*\n(.*)\n\1\s*\Z", re.DOTALL
)

# Filenames and paths that almost certainly hold secrets or PII. Compressing
# them ships raw bytes to the Anthropic API — a third-party data boundary that
# developers on sensitive codebases cannot cross. detect.py already skips .env
# by extension, but credentials.md / secrets.txt / ~/.aws/credentials would
# slip through the natural-language filter. This is a hard refuse before read.
SENSITIVE_BASENAME_REGEX = re.compile(
    r"(?ix)^("
    r"\.env(\..+)?"
    r"|\.netrc"
    r"|credentials(\..+)?"
    r"|secrets?(\..+)?"
    r"|passwords?(\..+)?"
    r"|id_(rsa|dsa|ecdsa|ed25519)(\.pub)?"
    r"|authorized_keys"
    r"|known_hosts"
    r"|.*\.(pem|key|p12|pfx|crt|cer|jks|keystore|asc|gpg)"
    r")$"
)

SENSITIVE_PATH_COMPONENTS = frozenset({".ssh", ".aws", ".gnupg", ".kube", ".docker"})

SENSITIVE_NAME_TOKENS = (
    "secret", "credential", "password", "passwd",
    "apikey", "accesskey", "token", "privatekey",
)

# Content-level pattern: key=value or key: value pairs that look like real secrets.
# Requires value ≥8 non-whitespace chars to filter out short placeholders (null, N/A, empty).
# Bearer prefix: "Authorization: Bearer <token>" — optional Bearer\s+ before the token value.
CONTENT_SECRET_REGEX = re.compile(
    r"(?i)(?:api[-_]?key|token|secret|password|bearer|authorization|private[-_]?key)"
    r"\s*[=:]\s*(?:Bearer\s+)?[\"']?\S{8,}",
)


def scan_for_secrets(text: str) -> List[str]:
    """Return list of lines that look like they contain credential values."""
    hits = []
    for i, line in enumerate(text.splitlines(), 1):
        if CONTENT_SECRET_REGEX.search(line):
            redacted = re.sub(r"(\S{4})\S+", r"\1****", line.strip())
            hits.append(f"  line {i}: {redacted}")
    return hits


def is_sensitive_path(filepath: Path) -> bool:
    """Heuristic denylist for files that must never be shipped to a third-party API."""
    name = filepath.name
    if SENSITIVE_BASENAME_REGEX.match(name):
        return True
    lowered_parts = {p.lower() for p in filepath.parts}
    if lowered_parts & SENSITIVE_PATH_COMPONENTS:
        return True
    # Normalize separators so "api-key" and "api_key" both match "apikey".
    lower = re.sub(r"[_\-\s.]", "", name.lower())
    return any(tok in lower for tok in SENSITIVE_NAME_TOKENS)


def strip_llm_wrapper(text: str) -> str:
    """Strip outer ```markdown ... ``` fence when it wraps the entire output."""
    m = OUTER_FENCE_REGEX.match(text)
    if m:
        return m.group(2)
    return text


# ---------- Claude Calls ----------


def call_claude(prompt: str) -> str:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        try:
            import anthropic

            client = anthropic.Anthropic(api_key=api_key, timeout=120.0)
            msg = client.messages.create(
                model=os.environ.get("CAVEMAN_MODEL", "claude-sonnet-4-6"),
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            )
            return strip_llm_wrapper(msg.content[0].text.strip())
        except ImportError:
            pass  # anthropic not installed, fall back to CLI
    # Fallback: use claude CLI (handles desktop auth)
    try:
        result = subprocess.run(
            ["claude", "--print"],
            input=prompt,
            text=True,
            capture_output=True,
            check=True,
            timeout=120,
        )
        return strip_llm_wrapper(result.stdout.strip())
    except subprocess.TimeoutExpired:
        raise RuntimeError("Claude call timed out after 120 seconds")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"Claude call failed:\n{e.stderr}")
    except FileNotFoundError:
        raise RuntimeError(
            "claude CLI not found in PATH and ANTHROPIC_API_KEY is not set. "
            "Install the Claude CLI or set ANTHROPIC_API_KEY."
        )


def build_compress_prompt(original: str) -> str:
    return f"""
Compress this markdown into caveman format.

STRICT RULES:
- Do NOT modify anything inside ``` code blocks
- Do NOT modify anything inside inline backticks
- Preserve ALL URLs exactly
- Preserve ALL headings exactly
- Preserve file paths and commands
- Return ONLY the compressed markdown body — do NOT wrap the entire output in a ```markdown fence or any other fence. Inner code blocks from the original stay as-is; do not add a new outer fence around the whole file.

Only compress natural language.

TEXT:
{original}
"""


def build_fix_prompt(original: str, compressed: str, errors: List[str]) -> str:
    errors_str = "\n".join(f"- {e}" for e in errors)
    return f"""You are fixing a caveman-compressed markdown file. Specific validation errors were found.

CRITICAL RULES:
- DO NOT recompress or rephrase the file
- ONLY fix the listed errors — leave everything else exactly as-is
- The ORIGINAL is provided as reference only (to restore missing content)
- Preserve caveman style in all untouched sections

ERRORS TO FIX:
{errors_str}

HOW TO FIX:
- Missing URL: find it in ORIGINAL, restore it exactly where it belongs in COMPRESSED
- Code block mismatch: find the exact code block in ORIGINAL, restore it in COMPRESSED
- Heading mismatch: restore the exact heading text from ORIGINAL into COMPRESSED
- Do not touch any section not mentioned in the errors

ORIGINAL (reference only):
{original}

COMPRESSED (fix this):
{compressed}

Return ONLY the fixed compressed file. No explanation.
"""


# ---------- Core Logic ----------


def compress_file(filepath: Path, force_compress: bool = False) -> bool:
    # Resolve and validate path
    filepath = filepath.resolve()
    if not filepath.exists():
        raise FileNotFoundError(f"File not found: {filepath}")
    if filepath.stat().st_size > MAX_FILE_SIZE:
        raise ValueError(f"File too large to compress safely (max 500KB): {filepath}")

    # Refuse files that look like they contain secrets or PII. Compressing ships
    # the raw bytes to the Anthropic API — a third-party boundary — so we fail
    # loudly rather than silently exfiltrate credentials or keys. Override is
    # intentional: the user must rename the file if the heuristic is wrong.
    if is_sensitive_path(filepath):
        raise ValueError(
            f"Refusing to compress {filepath}: filename looks sensitive "
            "(credentials, keys, secrets, or known private paths). "
            "Compression sends file contents to the Anthropic API. "
            "Rename the file if this is a false positive."
        )

    print(f"Processing: {filepath}")

    if not should_compress(filepath):
        print("Skipping (not natural language)")
        return False

    original_text = filepath.read_text(errors="ignore")

    # Content-level secret scan: detect credential-looking values in the file body.
    # Path heuristic (above) catches filenames like secrets.md, but misses docs
    # that happen to contain an inline API key or token. Sending those to the
    # Anthropic API would cross a third-party data boundary unintentionally.
    if not force_compress:
        secret_hits = scan_for_secrets(original_text)
        if secret_hits:
            print("⚠️  Potential secrets detected in file content:")
            for hit in secret_hits[:5]:
                print(hit)
            if len(secret_hits) > 5:
                print(f"  ... and {len(secret_hits) - 5} more")
            print(
                "\nCompression sends the full file to the Anthropic API.\n"
                "Abort if the file contains real credentials.\n"
                "Pass --force-compress to skip this check."
            )
            raise ValueError(
                f"Refusing to compress {filepath}: potential secrets in content. "
                "Use --force-compress to override."
            )
    backup_path = filepath.with_name(filepath.stem + ".original.md")

    if not original_text.strip():
        print("❌ Refusing to compress: file is empty or whitespace-only.")
        return False

    # Check if backup already exists to prevent accidental overwriting
    if backup_path.exists():
        print(f"⚠️ Backup file already exists: {backup_path}")
        print("The original backup may contain important content.")
        print("Aborting to prevent data loss. Please remove or rename the backup file if you want to proceed.")
        return False

    # Step 1: Compress
    print("Compressing with Claude...")
    compressed = call_claude(build_compress_prompt(original_text))

    if compressed is None or not compressed.strip():
        print("❌ Compression aborted: Claude returned an empty response.")
        print("   Original file is untouched (no backup created).")
        return False

    if compressed.strip() == original_text.strip():
        print("❌ Compression aborted: output is identical to input.")
        print("   Likely causes: Claude refused, returned the prompt verbatim, or the file is")
        print("   already in caveman form. Original file is untouched (no backup created).")
        return False

    # Save original as backup, then verify the backup readback before
    # touching the input file. If the filesystem dropped bytes (encoding,
    # antivirus, disk full), unlink the bad backup and abort instead of
    # leaving the user with a corrupt backup + compressed primary.
    backup_path.write_text(original_text, encoding="utf-8")
    backup_readback = backup_path.read_text(errors="ignore")
    if backup_readback != original_text:
        print(f"❌ Backup write verification failed: {backup_path}")
        print("   In-memory original differs from on-disk backup. Aborting before touching the input file.")
        try:
            backup_path.unlink()
        except OSError:
            pass
        return False
    filepath.write_text(compressed, encoding="utf-8")

    # Step 2: Validate + Retry
    for attempt in range(MAX_RETRIES):
        print(f"\nValidation attempt {attempt + 1}")

        result = validate(backup_path, filepath)

        if result.is_valid:
            print("Validation passed")
            break

        print("❌ Validation failed:")
        for err in result.errors:
            print(f"   - {err}")

        if attempt == MAX_RETRIES - 1:
            # Restore original on failure
            filepath.write_text(original_text, encoding="utf-8")
            backup_path.unlink(missing_ok=True)
            print("❌ Failed after retries — original restored")
            return False

        print("Fixing with Claude...")
        compressed = call_claude(
            build_fix_prompt(original_text, compressed, result.errors)
        )
        filepath.write_text(compressed, encoding="utf-8")

    return True
