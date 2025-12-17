import { describe, expect, it } from 'vitest';

import { getParameterContentType } from '../../src/lib/get-parameter-content-type.js';

describe('#getParameterContentType', () => {
  it('should return undefined for an empty array', () => {
    expect(getParameterContentType([])).toBeUndefined();
  });

  it('should return the content type when there is only one', () => {
    expect(getParameterContentType(['application/json'])).toBe('application/json');
    expect(getParameterContentType(['application/xml'])).toBe('application/xml');
    expect(getParameterContentType(['text/plain'])).toBe('text/plain');
  });

  it('should prioritize `application/json` when present with other content types', () => {
    expect(getParameterContentType(['application/json', 'application/xml'])).toBe('application/json');
    expect(getParameterContentType(['application/xml', 'application/json'])).toBe('application/json');
    expect(getParameterContentType(['text/plain', 'application/json', 'application/xml'])).toBe('application/json');
  });

  it('should prioritize JSON-like content types when present', () => {
    expect(getParameterContentType(['application/xml', 'application/vnd.github.v3.star+json'])).toBe(
      'application/vnd.github.v3.star+json',
    );
    expect(getParameterContentType(['text/plain', 'application/x-json', 'application/xml'])).toBe('application/x-json');
    expect(getParameterContentType(['application/xml', 'text/json', 'text/plain'])).toBe('text/json');
  });

  it('should return the first JSON-like content type when multiple JSON-like types are present', () => {
    expect(getParameterContentType(['application/json', 'application/vnd.api+json'])).toBe('application/json');
    expect(getParameterContentType(['application/vnd.api+json', 'application/json'])).toBe('application/vnd.api+json');
    expect(getParameterContentType(['text/x-json', 'application/json', 'text/json'])).toBe('text/x-json');
  });

  it('should return the first content type when no JSON-like content types are present', () => {
    expect(getParameterContentType(['application/xml', 'text/plain'])).toBe('application/xml');
    expect(getParameterContentType(['text/plain', 'application/xml'])).toBe('text/plain');
    expect(getParameterContentType(['multipart/form-data', 'application/xml', 'text/plain'])).toBe(
      'multipart/form-data',
    );
  });

  it('should handle various content type combinations', () => {
    // JSON first, then XML
    expect(getParameterContentType(['application/json', 'application/xml', 'text/plain'])).toBe('application/json');

    // XML first, then JSON (should still prioritize JSON)
    expect(getParameterContentType(['application/xml', 'application/json', 'text/plain'])).toBe('application/json');

    // Only non-JSON types
    expect(getParameterContentType(['application/xml', 'text/plain', 'multipart/form-data'])).toBe('application/xml');

    // JSON-like but not application/json
    expect(getParameterContentType(['application/xml', 'application/vnd.api+json', 'text/plain'])).toBe(
      'application/vnd.api+json',
    );
  });
});
