#!/usr/bin/env python3
"""
Unit tests for caveman-compress: compress.py, validate.py, detect.py.
Run: python3 -m unittest test/test_compress.py
"""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

# Make 'scripts' package importable regardless of CWD.
sys.path.insert(0, str(Path(__file__).parent.parent / '.claude' / 'skills' / 'caveman-compress'))

from scripts.compress import is_sensitive_path, scan_for_secrets, strip_llm_wrapper
from scripts.detect import detect_file_type, should_compress
from scripts.validate import (
    extract_code_blocks,
    extract_headings,
    extract_urls,
    validate,
)


class TestScanForSecrets(unittest.TestCase):
    def test_detects_api_key_assignment(self):
        hits = scan_for_secrets('API_KEY=abcdefghijklmnop')
        self.assertEqual(len(hits), 1)

    def test_detects_bearer_token(self):
        hits = scan_for_secrets('Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')
        self.assertEqual(len(hits), 1)

    def test_detects_password_field(self):
        hits = scan_for_secrets('password: my_super_secret_123')
        self.assertEqual(len(hits), 1)

    def test_ignores_short_value_placeholder(self):
        # Values < 8 non-whitespace chars (null, N/A, etc.) must not be flagged
        hits = scan_for_secrets('API_KEY=null')
        self.assertEqual(len(hits), 0)

    def test_ignores_clean_text(self):
        hits = scan_for_secrets('# Normal README\nSome documentation here.')
        self.assertEqual(len(hits), 0)

    def test_multiple_secrets_on_different_lines(self):
        text = 'token: abcdefghijklmno\nsecret: xyz12345678901'
        hits = scan_for_secrets(text)
        self.assertGreaterEqual(len(hits), 2)

    def test_redacts_value_in_output(self):
        hits = scan_for_secrets('API_KEY=supersecretvalue123')
        self.assertTrue(hits[0].endswith('****'))


class TestIsSensitivePath(unittest.TestCase):
    def test_blocks_env_file(self):
        self.assertTrue(is_sensitive_path(Path('.env')))

    def test_blocks_env_local(self):
        self.assertTrue(is_sensitive_path(Path('.env.local')))

    def test_blocks_credentials_json(self):
        self.assertTrue(is_sensitive_path(Path('credentials.json')))

    def test_blocks_id_rsa(self):
        self.assertTrue(is_sensitive_path(Path('id_rsa')))

    def test_blocks_pem_file(self):
        self.assertTrue(is_sensitive_path(Path('server.pem')))

    def test_blocks_ssh_dir(self):
        self.assertTrue(is_sensitive_path(Path('/home/user/.ssh/config')))

    def test_blocks_aws_dir(self):
        self.assertTrue(is_sensitive_path(Path('/home/user/.aws/credentials')))

    def test_blocks_token_in_name(self):
        self.assertTrue(is_sensitive_path(Path('github_token')))

    def test_blocks_secrets_md(self):
        self.assertTrue(is_sensitive_path(Path('secrets.md')))

    def test_allows_readme(self):
        self.assertFalse(is_sensitive_path(Path('README.md')))

    def test_allows_normal_md(self):
        self.assertFalse(is_sensitive_path(Path('my-notes.md')))

    def test_allows_claude_md(self):
        self.assertFalse(is_sensitive_path(Path('CLAUDE.md')))


class TestStripLLMWrapper(unittest.TestCase):
    def test_strips_markdown_fence(self):
        text = '```markdown\n# Hello\nworld\n```'
        self.assertEqual(strip_llm_wrapper(text), '# Hello\nworld')

    def test_strips_tilde_fence(self):
        text = '~~~markdown\n# Hello\n~~~'
        self.assertEqual(strip_llm_wrapper(text), '# Hello')

    def test_passthrough_when_no_fence(self):
        text = '# Hello\nworld'
        self.assertEqual(strip_llm_wrapper(text), text)

    def test_inner_code_blocks_preserved_after_strip(self):
        text = '```markdown\n# Title\n```python\nprint("hi")\n```\n```'
        result = strip_llm_wrapper(text)
        self.assertIn('```python', result)

    def test_no_strip_when_only_inner_fence(self):
        # A lone inner fence without outer wrapper must pass through unchanged
        text = '# Title\n```python\nprint("hi")\n```'
        self.assertEqual(strip_llm_wrapper(text), text)


class TestDetectFileType(unittest.TestCase):
    def test_md_is_natural_language(self):
        self.assertEqual(detect_file_type(Path('notes.md')), 'natural_language')

    def test_txt_is_natural_language(self):
        self.assertEqual(detect_file_type(Path('notes.txt')), 'natural_language')

    def test_rst_is_natural_language(self):
        self.assertEqual(detect_file_type(Path('docs.rst')), 'natural_language')

    def test_py_is_code(self):
        self.assertEqual(detect_file_type(Path('script.py')), 'code')

    def test_js_is_code(self):
        self.assertEqual(detect_file_type(Path('app.js')), 'code')

    def test_json_is_code(self):
        self.assertEqual(detect_file_type(Path('config.json')), 'code')


class TestShouldCompress(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _write(self, name, content='# content\n'):
        p = Path(self.tmpdir) / name
        p.write_text(content, encoding='utf-8')
        return p

    def test_regular_md_is_compressible(self):
        p = self._write('notes.md')
        self.assertTrue(should_compress(p))

    def test_original_md_backup_is_excluded(self):
        p = self._write('notes.original.md')
        self.assertFalse(should_compress(p))

    def test_py_file_is_not_compressible(self):
        p = self._write('script.py', 'print("hi")')
        self.assertFalse(should_compress(p))

    def test_nonexistent_file_returns_false(self):
        self.assertFalse(should_compress(Path(self.tmpdir) / 'ghost.md'))


class TestExtractors(unittest.TestCase):
    def test_extract_headings(self):
        text = '# Title\n## Section\n### Sub\n'
        headings = extract_headings(text)
        self.assertEqual(len(headings), 3)
        self.assertEqual(headings[0], ('#', 'Title'))

    def test_extract_urls(self):
        text = 'See https://example.com and https://github.com/org/repo'
        urls = extract_urls(text)
        self.assertIn('https://example.com', urls)
        self.assertIn('https://github.com/org/repo', urls)

    def test_extract_code_blocks_single(self):
        text = '# Title\n```python\nprint("hi")\n```\nAfter.'
        blocks = extract_code_blocks(text)
        self.assertEqual(len(blocks), 1)
        self.assertIn('print("hi")', blocks[0])

    def test_extract_nested_code_blocks(self):
        # Outer 4-backtick wraps inner 3-backtick; only outer block is top-level
        text = '````\n```python\ncode\n```\n````'
        blocks = extract_code_blocks(text)
        self.assertEqual(len(blocks), 1)
        self.assertIn('```python', blocks[0])


class TestValidate(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _pair(self, orig_content, comp_content):
        orig = Path(self.tmpdir) / 'orig.md'
        comp = Path(self.tmpdir) / 'comp.md'
        orig.write_text(orig_content, encoding='utf-8')
        comp.write_text(comp_content, encoding='utf-8')
        return orig, comp

    def test_valid_compression_passes(self):
        orig, comp = self._pair(
            '# Title\nSome long text here.\n\nhttps://example.com\n',
            '# Title\nShort.\n\nhttps://example.com\n',
        )
        result = validate(orig, comp)
        self.assertTrue(result.is_valid)

    def test_missing_url_fails(self):
        orig, comp = self._pair(
            '# Title\nhttps://example.com\n',
            '# Title\nno url here\n',
        )
        result = validate(orig, comp)
        self.assertFalse(result.is_valid)
        self.assertTrue(any('URL' in e for e in result.errors))

    def test_heading_count_mismatch_fails(self):
        orig, comp = self._pair(
            '# Title\n## Section\n',
            '# Title\n',
        )
        result = validate(orig, comp)
        self.assertFalse(result.is_valid)

    def test_code_block_removal_fails(self):
        orig, comp = self._pair(
            '# Title\n```python\nprint("hello")\n```\n',
            '# Title\ncode was here\n',
        )
        result = validate(orig, comp)
        self.assertFalse(result.is_valid)

    def test_url_inside_code_block_does_not_affect_validation(self):
        # URL inside code block must match exactly
        orig, comp = self._pair(
            '# Title\n```\nhttps://internal.example\n```\n',
            '# Title\n```\nhttps://internal.example\n```\n',
        )
        result = validate(orig, comp)
        self.assertTrue(result.is_valid)


if __name__ == '__main__':
    unittest.main()
