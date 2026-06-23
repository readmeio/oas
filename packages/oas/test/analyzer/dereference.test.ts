import type { OASDocument } from '../../src/types.js';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { describe, expect, it, vi } from 'vitest';

import { dereferenceOas } from '../../src/analyzer/dereference.js';
import dereferenceHandling3_1Spec from '../__datasets__/3-1-dereference-handling.json' with { type: 'json' };
import primitiveComponentsSpec from '../__datasets__/3-1-primitive-components.json' with { type: 'json' };
import circularSpec from '../__datasets__/circular.json' with { type: 'json' };
import invalidComponentSchemaNamesSpec from '../__datasets__/invalid-component-schema-names.json' with { type: 'json' };
import pathItemsComponentSpec from '../__datasets__/pathitems-component.json' with { type: 'json' };

describe('#dereferenceOas()', () => {
  it('should not fail on a empty, null or undefined API definitions', async () => {
    await expect(dereferenceOas({} as OASDocument)).resolves.toMatchObject({ circularRefs: [] });
  });

  it('should dereference the current OAS', async () => {
    expect(petstoreSpec.paths?.['/pet']?.post?.requestBody).toStrictEqual({
      $ref: '#/components/requestBodies/Pet',
    });

    const { api: spec } = await dereferenceOas(structuredClone(petstoreSpec) as OASDocument);

    expect(spec.components?.schemas?.Pet).toBeDefined();
    expect(spec.paths?.['/pet']?.post?.requestBody).toStrictEqual({
      content: {
        'application/json': {
          schema: spec.components?.schemas?.Pet,
        },
        'application/xml': {
          schema: spec.components?.schemas?.Pet,
        },
      },
      description: 'Pet object that needs to be added to the store',
      required: true,
    });
  });

  it('should support primitive component schemas', async () => {
    const { api: spec } = await dereferenceOas(structuredClone(primitiveComponentsSpec) as unknown as OASDocument);

    expect(spec.components?.schemas?.primitive).toBe(true);
  });

  it('should support `$ref` pointers existing alongside `description` in OpenAPI 3.1 definitions', async () => {
    const { api: spec } = await dereferenceOas(structuredClone(dereferenceHandling3_1Spec) as unknown as OASDocument);

    expect(spec.paths?.['/']?.get?.parameters).toStrictEqual([
      {
        description: 'This is an overridden description on the number parameter.',
        in: 'query',
        name: 'number',
        required: false,
        schema: { type: 'integer' },
      },
    ]);

    expect(spec.paths?.['/']?.get?.responses).toStrictEqual({
      '200': {
        description: 'OK',
        content: {
          '*/*': {
            schema: {
              description: 'This is an overridden description on the response.',
              summary: 'This is an overridden summary on the response.',
              type: 'object',
              properties: { foo: { type: 'string' }, bar: { type: 'number' } },
            },
          },
        },
      },
    });
  });

  it('should be able to handle a circular schema without erroring', async () => {
    const { api: spec } = await dereferenceOas(structuredClone(circularSpec) as unknown as OASDocument);

    // $refs should remain in the OAS because they're circular and are ignored.
    expect(spec.paths?.['/']?.get).toStrictEqual({
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  dateTime: { type: 'string', format: 'date-time' },
                  offsetAfter: { $ref: '#/components/schemas/offset' },
                  offsetBefore: { $ref: '#/components/schemas/offset' },
                },
              },
            },
          },
        },
      },
    });
  });

  it('should be able to handle a schema with specification-invalid component names without erroring', async () => {
    const { api: spec } = await dereferenceOas(
      structuredClone(invalidComponentSchemaNamesSpec) as unknown as OASDocument,
    );

    expect(spec.paths?.['/pet']?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          schema: {
            properties: {
              name: {
                example: 'doggie',
                type: 'string',
              },
            },
          },
        },
      },
    });
  });

  it('should be able to handle OpenAPI 3.1 `pathItem` reference objects', async () => {
    const { api: spec } = await dereferenceOas(structuredClone(pathItemsComponentSpec) as unknown as OASDocument);

    expect(spec.paths?.['/pet/:id']?.put).toStrictEqual({
      tags: ['pet'],
      summary: 'Update a pet',
      description: 'This operation will update a pet in the database.',
      responses: {
        '400': {
          description: 'Invalid id value',
        },
      },
      security: [
        {
          apiKey: [],
        },
      ],
    });
  });

  describe('blocking', () => {
    it('should only dereference once when called multiple times', async () => {
      const api = structuredClone(petstoreSpec) as OASDocument;
      const spy = vi.fn<never>();

      await Promise.all([
        dereferenceOas(api, { cb: spy }),
        dereferenceOas(api, { cb: spy }),
        dereferenceOas(api, { cb: spy }),
      ]);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(api.paths?.['/pet']?.post?.requestBody).not.toStrictEqual({
        $ref: '#/components/requestBodies/Pet',
      });
    });

    it('should only **ever** dereference once', async () => {
      const api = structuredClone(petstoreSpec) as OASDocument;
      const spy = vi.fn<never>();

      await dereferenceOas(api, { cb: spy });

      expect(api.paths?.['/pet']?.post?.requestBody).not.toStrictEqual({
        $ref: '#/components/requestBodies/Pet',
      });

      await dereferenceOas(api, { cb: spy });

      expect(api.paths?.['/pet']?.post?.requestBody).not.toStrictEqual({
        $ref: '#/components/requestBodies/Pet',
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
