import type { MediaTypeObject, OASDocument } from '../../../src/types.js';

import { describe, expect, it } from 'vitest';

import { getMediaTypeExamples } from '../../../src/operation/lib/get-mediatype-examples.js';

describe('getMediaTypeExamples()', () => {
  describe('dereferencing `example`', () => {
    it('should resolve a top-level `$ref` on `example`', () => {
      const definition = {
        components: {
          examples: {
            UserPayload: {
              summary: 'User',
              value: { id: '42', name: 'Ada' },
            },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        example: { $ref: '#/components/examples/UserPayload' },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          value: {
            summary: 'User',
            value: { id: '42', name: 'Ada' },
          },
        },
      ]);
    });

    it('should deeply resolve `$ref` values inside an array on `example`', () => {
      const definition = {
        components: {
          examples: {
            Row: {
              value: { uuid: 'u1', email: 'row@example.com' },
            },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        example: [{ $ref: '#/components/examples/Row/value' }, { local: true }],
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          value: [{ uuid: 'u1', email: 'row@example.com' }, { local: true }],
        },
      ]);
    });

    it('should return no examples when `example` stays a `$ref` after dereferencing fails', () => {
      const definition = {
        components: { examples: {} },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        example: { $ref: '#/components/examples/DoesNotExist' },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([]);
    });

    it('should return no examples when a nested value still contains an unresolved `$ref`', () => {
      const definition = {
        components: { examples: {} },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        example: {
          items: [{ $ref: '#/components/examples/Missing' }],
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([]);
    });

    it('should leave a plain `example` value unchanged when it has no refs', () => {
      const definition = {} as unknown as OASDocument;

      const media: MediaTypeObject = {
        example: { count: 3, tags: ['a', 'b'] },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        { value: { count: 3, tags: ['a', 'b'] } },
      ]);
    });
  });

  describe('dereferencing `examples`', () => {
    it('should resolve a `$ref` wrapper around an Example Object', () => {
      const definition = {
        components: {
          examples: {
            Shared: {
              summary: 'Shared example',
              value: { ok: true },
            },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        examples: {
          primary: { $ref: '#/components/examples/Shared' },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'Shared example',
          title: 'primary',
          value: { ok: true },
        },
      ]);
    });

    it('should deeply resolve `$ref` inside `examples[].value`', () => {
      const definition = {
        components: {
          examples: {
            Embedded: {
              value: { id: 'emb-1' },
            },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        examples: {
          nested: {
            summary: 'Nested ref',
            value: [{ $ref: '#/components/examples/Embedded/value' }],
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'Nested ref',
          title: 'nested',
          value: [{ id: 'emb-1' }],
        },
      ]);
    });

    it('should drop an `examples` entry when `value` still contains a `$ref` after deep dereference', () => {
      const definition = {
        components: { examples: {} },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        examples: {
          bad: {
            value: { $ref: '#/components/examples/Nope' },
          },
          good: {
            value: { x: 1 },
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'good',
          title: 'good',
          value: { x: 1 },
        },
      ]);
    });

    it('should pass through `description` on Example Objects after dereferencing `value`', () => {
      const definition = {
        components: {
          examples: {
            Part: { value: { n: 2 } },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        examples: {
          withDesc: {
            description: 'Desc text',
            summary: 'Sum',
            value: { $ref: '#/components/examples/Part/value' },
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          description: 'Desc text',
          summary: 'Sum',
          title: 'withDesc',
          value: { n: 2 },
        },
      ]);
    });
  });

  describe('OpenAPI 3.2 `dataValue` and `serializedValue`', () => {
    const definition = {} as unknown as OASDocument;

    it('should support an example that only declares `dataValue`', () => {
      const media: MediaTypeObject = {
        examples: {
          basic: {
            summary: 'Basic search',
            dataValue: { query: 'status:active', limit: 25 },
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'Basic search',
          title: 'basic',
          value: { query: 'status:active', limit: 25 },
        },
      ]);
    });

    it('should prefer `value` over `dataValue` when both are present', () => {
      const media: MediaTypeObject = {
        examples: {
          both: {
            value: { source: 'value' },
            dataValue: { source: 'dataValue' },
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'both',
          title: 'both',
          value: { source: 'value' },
        },
      ]);
    });

    it('should deeply resolve `$ref` inside `dataValue`', () => {
      const refDefinition = {
        components: {
          examples: {
            Embedded: {
              value: { id: 'emb-1' },
            },
          },
        },
      } as unknown as OASDocument;

      const media: MediaTypeObject = {
        examples: {
          nested: {
            dataValue: [{ $ref: '#/components/examples/Embedded/value' }],
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, refDefinition)).toStrictEqual([
        {
          summary: 'nested',
          title: 'nested',
          value: [{ id: 'emb-1' }],
        },
      ]);
    });

    it('should drop an example when `dataValue` still contains a `$ref` after deep dereference', () => {
      const media: MediaTypeObject = {
        examples: {
          bad: {
            dataValue: { $ref: '#/components/examples/Nope' },
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, { components: {} } as unknown as OASDocument)).toStrictEqual(
        [],
      );
    });

    it('should fall back to `serializedValue`, returned as-is without parsing', () => {
      const media: MediaTypeObject = {
        examples: {
          serialized: {
            summary: 'Pre-serialized payload',
            serializedValue: '{"query":"status:active","limit":25}',
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'Pre-serialized payload',
          title: 'serialized',
          value: '{"query":"status:active","limit":25}',
        },
      ]);
    });

    it('should prefer `dataValue` over `serializedValue` when both are present', () => {
      const media: MediaTypeObject = {
        examples: {
          both: {
            dataValue: { source: 'dataValue' },
            serializedValue: '{"source":"serializedValue"}',
          },
        },
      };

      expect(getMediaTypeExamples('application/json', media, definition)).toStrictEqual([
        {
          summary: 'both',
          title: 'both',
          value: { source: 'dataValue' },
        },
      ]);
    });
  });
});
