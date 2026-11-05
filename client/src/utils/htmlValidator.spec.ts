import { describe, it, expect } from 'vitest';
import { validateHtml } from './htmlValidator';

describe('validateHtml', () => {
  describe('valid HTML', () => {
    it('accepts plain text without HTML', () => {
      const result = validateHtml('Hello, world!');
      expect(result.valid).toBe(true);
    });

    it('accepts correctly closed allowed tags', () => {
      const result = validateHtml('<i>italic</i>');
      expect(result.valid).toBe(true);
    });

    it('accepts allowed tags with valid nesting', () => {
      const result = validateHtml('<i><strong>bold italic</strong></i>');
      expect(result.valid).toBe(true);
    });

    it('accepts multiple allowed tags', () => {
      const result = validateHtml('<i>italic</i> <strong>bold</strong> <code>code</code>');
      expect(result.valid).toBe(true);
    });

    it('accepts anchor tag with allowed attributes', () => {
      const result = validateHtml('<a href="https://example.com" title="Link">link</a>');
      expect(result.valid).toBe(true);
    });

    it('accepts empty string', () => {
      const result = validateHtml('');
      expect(result.valid).toBe(true);
    });
  });

  describe('invalid HTML - structure', () => {
    it('rejects missing closing tag', () => {
      const result = validateHtml('<i>unclosed');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing closing tag');
    });

    it('rejects mismatched closing tag', () => {
      const result = validateHtml('<i>text</strong>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Mismatched closing tag');
    });

    it('rejects incorrect nesting', () => {
      const result = validateHtml('<i><strong>text</i></strong>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Mismatched closing tag');
    });

    it('rejects unexpected closing tag', () => {
      const result = validateHtml('text</strong>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unexpected closing tag');
    });

    it('rejects deeply nested mismatched tags', () => {
      const result = validateHtml('<i><strong><code>text</i></strong></code>');
      expect(result.valid).toBe(false);
    });
  });

  describe('invalid HTML - disallowed content', () => {
    it('rejects disallowed HTML tag', () => {
      const result = validateHtml('<div>text</div>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed HTML tag');
    });

    it('rejects disallowed attribute', () => {
      const result = validateHtml('<i onclick="bad()">text</i>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed attribute');
    });

    it('rejects script tag', () => {
      const result = validateHtml('<script>alert("xss")</script>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed HTML tag');
    });

    it('rejects style tag', () => {
      const result = validateHtml('<style>body{}</style>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed HTML tag');
    });
  });

  describe('error messages for specific inputs', () => {
    it('reports disallowed div tag', () => {
      const result = validateHtml('<div>text</div>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed HTML tag: <div>');
    });

    it('reports disallowed img tag', () => {
      const result = validateHtml('<img src="x">');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Disallowed HTML tag: <img>');
    });

    it('reports disallowed attribute on anchor', () => {
      const result = validateHtml('<a href="https://example.com" class="bad">link</a>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Disallowed attribute: class on <a>");
    });

    it('reports disallowed attribute aria-label on anchor', () => {
      const result = validateHtml('<a href="https://example.com" aria-label="bad">link</a>');
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Disallowed attribute: aria-label on <a>");
    });

    it('accepts anchor with allowed href and title attributes', () => {
      const result = validateHtml('<a href="https://example.com" title="Link">link</a>');
      expect(result.valid).toBe(true);
    });

    it('accepts plain text without HTML', () => {
      const result = validateHtml('Just plain text');
      expect(result.valid).toBe(true);
    });

    it('rejects the combined problem example', () => {
      const result = validateHtml('<div>text</div><img src="x"><a href="https://example.com" class="bad" aria-label="worse">link</a>');
      expect(result.valid).toBe(false);
    });
  });
});