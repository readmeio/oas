import petstore from '@readme/oas-examples/3.0/json/petstore.json';
import { describe, beforeEach, it, expect } from 'vitest';

import * as extensions from '../src/extensions.js';
import Oas from '../src/index.js';

describe('extension defaults', () => {
  it.each([
    ['CODE_SAMPLES'],
    ['EXPLORER_ENABLED'],
    ['HEADERS'],
    ['METRICS_ENABLED'],
    ['PARAMETER_ORDERING'],
    ['PROXY_ENABLED'],
    ['SAMPLES_LANGUAGES'],
    ['SIMPLE_MODE'],
  ])('%s should have a default value', extension => {
    expect(extensions.extensionDefaults).toHaveProperty(extensions[extension]);
  });
});

describe('#getExtension', () => {
  it("should not throw an exception if `Oas` doesn't have an API definition", () => {
    const oas = Oas.init(undefined);
    expect(oas.getExtension(extensions.SAMPLES_LANGUAGES)).toHaveLength(7);
  });

  it("should not throw an exception if `Operation` doesn't have an API definition", () => {
    const oas = Oas.init(undefined);
    const operation = oas.operation('/pet', 'post');
    expect(oas.getExtension(extensions.SAMPLES_LANGUAGES, operation)).toHaveLength(7);
  });

  describe('oas-level extensions', () => {
    it('should use the default extension value if the extension is not present', () => {
      const oas = Oas.init(petstore);
      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES)).toStrictEqual([
        'shell',
        'node',
        'ruby',
        'php',
        'python',
        'java',
        'csharp',
      ]);
    });

    it('should locate an extensions under `x-readme`', () => {
      const oas = Oas.init({
        ...petstore,
        'x-readme': {
          [extensions.SAMPLES_LANGUAGES]: ['swift'],
        },
      });

      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES)).toStrictEqual(['swift']);
    });

    it('should locate an extensions listed at the root', () => {
      const oas = Oas.init({ ...petstore, [`x-${extensions.EXPLORER_ENABLED}`]: false });
      expect(oas.getExtension(extensions.EXPLORER_ENABLED)).toBe(false);
    });

    it('should not throw if `x-readme` is not an object', () => {
      const oas = Oas.init({
        ...petstore,
        'x-readme': true,
      });

      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES)).toHaveLength(7);
    });

    it('should not pick up the `code-samples` extension', () => {
      const oas = Oas.init({
        ...petstore,
        'x-readme': {
          [extensions.CODE_SAMPLES]: [
            {
              name: 'Custom cURL snippet',
              language: 'curl',
              code: 'curl -X POST https://api.example.com/v2/alert',
            },
          ],
        },
      });

      expect(oas.getExtension(extensions.CODE_SAMPLES)).toBeUndefined();
    });

    it("should support extensions that we don't own", () => {
      const oas = Oas.init({
        ...petstore,
        'x-tag-groups': ['buster'],
      });

      expect(oas.getExtension('x-tag-groups')).toStrictEqual(['buster']);
    });
  });

  describe('operation-level', () => {
    let oas: Oas;

    beforeEach(() => {
      oas = Oas.init(petstore);
    });

    it('should use the default extension value if the extension is not present', () => {
      const operation = oas.operation('/pet', 'post');

      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES, operation)).toStrictEqual([
        'shell',
        'node',
        'ruby',
        'php',
        'python',
        'java',
        'csharp',
      ]);
    });

    it('should locate an extensions under `x-readme`', () => {
      const operation = oas.operation('/pet', 'post');
      operation.schema['x-readme'] = {
        [extensions.SAMPLES_LANGUAGES]: ['swift'],
      };

      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES, operation)).toStrictEqual(['swift']);
    });

    it('should locate an extensions listed at the root', () => {
      const operation = oas.operation('/pet', 'post');
      operation.schema[`x-${extensions.EXPLORER_ENABLED}`] = false;

      expect(oas.getExtension(extensions.EXPLORER_ENABLED, operation)).toBe(false);
    });

    it('should not throw if `x-readme` is not an object', () => {
      const operation = oas.operation('/pet', 'post');
      operation.schema['x-readme'] = true;

      expect(oas.getExtension(extensions.SAMPLES_LANGUAGES)).toHaveLength(7);
    });

    it("should support extensions that we don't own", () => {
      const operation = oas.operation('/pet', 'post');
      operation.schema['x-amazon-apigateway-importexport-version'] = '1.0';

      expect(oas.getExtension('x-amazon-apigateway-importexport-version', operation)).toBe('1.0');
    });
  });
});

describe('#validateExtension', () => {
  it('should validate that `x-readme` is an object', () => {
    expect(() => {
      Oas.init({ 'x-readme': [] }).validateExtension(extensions.EXPLORER_ENABLED);
    }).toThrow(/must be of type "Object"/);

    expect(() => {
      Oas.init({ 'x-readme': false }).validateExtension(extensions.EXPLORER_ENABLED);
    }).toThrow(/must be of type "Object"/);

    expect(() => {
      Oas.init({ 'x-readme': null }).validateExtension(extensions.EXPLORER_ENABLED);
    }).toThrow(/must be of type "Object"/);
  });

  describe.each([
    [
      'CODE_SAMPLES',
      [
        {
          name: 'Custom cURL snippet',
          language: 'curl',
          code: 'curl -X POST https://api.example.com/v2/alert',
          install: 'brew install curl',
        },
      ],
      false,
      'Array',
    ],
    ['EXPLORER_ENABLED', true, 'false', 'Boolean'],
    ['HEADERS', [{ key: 'X-API-Key', value: 'abc123' }], false, 'Array'],
    [
      'PARAMETER_ORDERING',
      ['query', 'header', 'body', 'path', 'cookie', 'form'],
      ['query', 'header', 'body', 'path', 'cookie', 'formData'],
      'Array',
    ],
    ['PROXY_ENABLED', true, 'yes', 'Boolean'],
    ['METRICS_ENABLED', false, 'no', 'Boolean'],
    ['SAMPLES_LANGUAGES', ['swift'], {}, 'Array'],
    ['SIMPLE_MODE', true, 'absolutely not', 'Boolean'],
  ])('%s', (extension, validValue, invalidValue, expectedType) => {
    describe('should allow valid extensions', () => {
      it('should allow at the root level', () => {
        const oas = Oas.init({ [`x-${extensions[extension]}`]: validValue });
        expect(() => {
          oas.validateExtension(extensions[extension]);
        }).not.toThrow();
      });

      it('should allow if nested in `x-readme`', () => {
        const oas = Oas.init({
          'x-readme': {
            [extensions[extension]]: validValue,
          },
        });

        expect(() => {
          oas.validateExtension(extensions[extension]);
        }).not.toThrow();
      });
    });

    describe('should fail on invalid extension values', () => {
      it('should error if at the root level', () => {
        const oas = Oas.init({ [`x-${extensions[extension]}`]: invalidValue });

        expect(() => {
          oas.validateExtension(extensions[extension]);
        }).toThrow(
          extension === 'PARAMETER_ORDERING'
            ? '"x-parameter-ordering" must contain 6 items comprised of: path, query, body, cookie, form, and header'
            : `"x-${extensions[extension]}" must be of type "${expectedType}"`,
        );
      });

      it('should error if nested in `x-readme`', () => {
        const oas = Oas.init({
          'x-readme': {
            [extensions[extension]]: invalidValue,
          },
        });

        expect(() => {
          oas.validateExtension(extensions[extension]);
        }).toThrow(
          extension === 'PARAMETER_ORDERING'
            ? '"x-readme.parameter-ordering" must contain 6 items comprised of: path, query, body, cookie, form, and header'
            : `"x-readme.${extensions[extension]}" must be of type "${expectedType}"`,
        );
      });

      if (extension === 'PARAMETER_ORDERING') {
        describe.each([
          [[]],
          [['PATH', 'query', 'body', 'cookie', 'formData', 'header']],
          [['path', 'query', 'body', 'cookie', 'form', 'form', 'header']],
        ])('all available parameters are not present: %s', ordering => {
          it('should throw at the root level', () => {
            const oas = Oas.init({ [`x-${extensions.PARAMETER_ORDERING}`]: ordering });

            expect(() => {
              oas.validateExtension(extensions.PARAMETER_ORDERING);
            }).toThrow(
              '"x-parameter-ordering" must contain 6 items comprised of: path, query, body, cookie, form, and header',
            );
          });

          it('should error if nested in `x-readme`', () => {
            const oas = Oas.init({
              'x-readme': {
                [extensions.PARAMETER_ORDERING]: ordering,
              },
            });

            expect(() => {
              oas.validateExtension(extensions.PARAMETER_ORDERING);
            }).toThrow(
              '"x-readme.parameter-ordering" must contain 6 items comprised of: path, query, body, cookie, form, and header',
            );
          });
        });
      }
    });
  });

  describe('should allow unknown extensions', () => {
    it('should allow at the root level', () => {
      const oas = Oas.init({ 'x-tag-groups': ['buster'] });

      expect(() => {
        oas.validateExtension('x-tag-groups' as any);
      }).not.toThrow();
    });
  });
});
