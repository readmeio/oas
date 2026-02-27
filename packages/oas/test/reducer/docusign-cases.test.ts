import type { OASDocument } from '../../src/types.js';

import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { OpenAPIReducer } from '../../src/reducer/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

expect.extend({ toBeAValidOpenAPIDefinition });

describe('reducer (docusign circular refs)', () => {
  // Sanity check to ensure that this API definition does in fact contain circular references.
  it('should contain circular references', { timeout: 10_000 }, async () => {
    const spec = new Oas(structuredClone(docusign) as OASDocument);
    await spec.dereference();

    expect(spec.getCircularReferences()).toStrictEqual([
      '#/components/schemas/docGenFormFieldRowValue/properties/docGenFormFieldList/items',
      '#/components/schemas/folder/properties/folders/items',
      '#/components/schemas/powerForm/properties/envelopes/items',
      '#/components/schemas/bulkSendingCopyDocGenFormFieldRowValue/properties/docGenFormFieldList/items',
    ]);
  });

  describe('and we have an operation that does not contain any circular references (but lives in a file that does)', () => {
    it('should have reduced and preserved all used references', { timeout: 10_000 }, async () => {
      const reduced = OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit', 'post')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      const oas = new Oas(structuredClone(reduced));
      await oas.dereference();
      expect(oas.getCircularReferences()).toStrictEqual([
        // This endpoint didn't have any circular references before we reduced it and shouldn't have
        // any after.
      ]);

      expect(reduced.paths).toHaveProperty('/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit');
      expect(reduced.paths?.['/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit']).toStrictEqual({
        // This path has a common `parameters` property that we should have still retained.
        parameters: [],
        post: expect.objectContaining({
          operationId: 'Views_PostEnvelopeEditView',
        }),
      });

      expect(reduced.components).toStrictEqual({
        requestBodies: {
          envelopeViewRequest: expect.any(Object),
        },
        schemas: {
          envelopeViewDocumentSettings: expect.any(Object),
          EnvelopeViews: expect.any(Object),
          envelopeViewEnvelopeCustomFieldSettings: expect.any(Object),
          envelopeViewRecipientSettings: expect.any(Object),
          envelopeViewRequest: expect.any(Object),
          envelopeViewSettings: expect.any(Object),
          envelopeViewTaggerSettings: expect.any(Object),
          envelopeViewTemplateSettings: expect.any(Object),
          errorDetails: expect.any(Object),
          paletteItemSettings: expect.any(Object),
          paletteSettings: expect.any(Object),
        },
      });
    });
  });

  describe('and we have an operation that contains circular references', () => {
    it('should have reduced and preserved all used references', { timeout: 10_000 }, async () => {
      const reduced = OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}', 'get')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      const oas = new Oas(structuredClone(reduced));
      await oas.dereference();
      expect(oas.getCircularReferences()).toStrictEqual([
        '#/components/schemas/docGenFormFieldRowValue/properties/docGenFormFieldList/items',
        '#/components/schemas/folder/properties/folders/items',
        '#/components/schemas/powerForm/properties/envelopes/items',
      ]);

      expect(reduced.paths).toHaveProperty('/v2.1/accounts/{accountId}/envelopes/{envelopeId}');
      expect(reduced.paths?.['/v2.1/accounts/{accountId}/envelopes/{envelopeId}']).toStrictEqual({
        // This path has a common `parameters` property that we should have still retained.
        parameters: [],
        get: expect.objectContaining({
          operationId: 'Envelopes_GetEnvelope',
        }),
      });

      expect(Object.keys(reduced.components?.schemas || {})).toMatchSnapshot();
    });
  });
});
