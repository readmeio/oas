import { describe, expect, it } from 'vitest';

import { convertOptionsForParser, normalizeArguments } from '../../src/util.js';

function resolvedFile(
  options?: Parameters<typeof convertOptionsForParser>[0],
  opts?: { allowFileResolution?: boolean },
) {
  return convertOptionsForParser(options, opts).resolve?.file;
}

describe('normalizeArguments()', () => {
  it('should treat a string as a path and leave schema undefined', () => {
    expect(normalizeArguments('./petstore.json')).toStrictEqual({
      path: './petstore.json',
      schema: undefined,
    });
  });

  it('should treat an object as an inline schema', () => {
    const schema = { openapi: '3.1.0' };

    expect(normalizeArguments(schema)).toStrictEqual({
      path: '',
      schema,
    });
  });
});

describe('convertOptionsForParser()', () => {
  it('should disable the file resolver by default', () => {
    expect(resolvedFile()).toBe(false);
  });

  it('should enable the stock file resolver when the source is a filesystem path', () => {
    expect(Boolean(resolvedFile({}, { allowFileResolution: true }))).toBe(true);
  });

  it('should still honor an explicit `resolve.file: false` on a filesystem path source', () => {
    expect(resolvedFile({ resolve: { file: false } }, { allowFileResolution: true })).toBe(false);
  });

  it('should enable the stock file resolver when `resolve.file` is explicitly true', () => {
    expect(Boolean(resolvedFile({ resolve: { file: true } }))).toBe(true);
  });

  it('should pass through a custom file resolver object', () => {
    const file = { canRead: () => false };

    expect(resolvedFile({ resolve: { file: file as unknown as boolean } })).toBe(file);
  });

  it('should not re-enable filesystem `$ref`s when only HTTP resolve options are supplied', () => {
    expect(resolvedFile({ resolve: { http: { timeout: 1000 } } })).toBe(false);
  });

  it('should keep the file resolver enabled for a path source when only HTTP options are supplied', () => {
    expect(Boolean(resolvedFile({ resolve: { http: { timeout: 1000 } } }, { allowFileResolution: true }))).toBe(true);
  });

  it('should default the HTTP timeout to 5s and always force `safeUrlResolver`', () => {
    const defaults = convertOptionsForParser();

    expect(defaults.resolve?.http).toMatchObject({
      timeout: 5000,
      safeUrlResolver: true,
    });

    expect(
      convertOptionsForParser({
        resolve: {
          http: {
            timeout: 250,
            // @ts-expect-error -- callers may try to disable this; we must ignore it
            safeUrlResolver: false,
          },
        },
      }).resolve?.http,
    ).toMatchObject({
      timeout: 250,
      safeUrlResolver: true,
    });
  });

  it('should preserve `$ref` sibling `summary` and `description` when dereferencing', () => {
    expect(convertOptionsForParser().dereference?.preservedProperties).toStrictEqual(['summary', 'description']);
  });

  it('should pass through an explicit `dereference.circular` setting', () => {
    expect(convertOptionsForParser({ dereference: { circular: false } }).dereference?.circular).toBe(false);
    expect(convertOptionsForParser({ dereference: { circular: 'ignore' } }).dereference?.circular).toBe('ignore');
  });
});
