import type { OASDocument } from '../../src/types.js';

import toBeAValidOpenAPIDefinition from 'jest-expect-openapi';
import { describe, expect, it } from 'vitest';

import { analyzer } from '../../src/analyzer/index.js';
import { OpenAPIReducer } from '../../src/reducer/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

// oxlint-disable-next-line vitest/require-hook
expect.extend({ toBeAValidOpenAPIDefinition });

describe('reducer (docusign circular refs)', () => {
  // Sanity check to ensure that this API definition does in fact contain circular references.
  it('should contain circular references', async () => {
    const analyzerResult = await analyzer(structuredClone(docusign) as OASDocument, ['circularRefs']);

    expect(analyzerResult.circularRefs).toStrictEqual({
      present: true,
      locations: [
        '#/components/requestBodies/bulkSendingList/content/application~1json/schema',
        '#/components/requestBodies/envelopeDefinition/content/application~1json/schema',
        '#/components/requestBodies/envelopeTemplate/content/application~1json/schema',
        '#/components/requestBodies/powerForm/content/application~1json/schema',
        '#/components/schemas/BulkSend/properties/bulkCopies/items',
        '#/components/schemas/DocumentGeneration/properties/docGenFormFields/items',
        '#/components/schemas/EnvelopeDocuments/properties/envelopeDocuments/items',
        '#/components/schemas/EnvelopeTransferRules/properties/envelopeTransferRules/items',
        '#/components/schemas/Envelopes/properties/envelopeDocuments/items',
        '#/components/schemas/Envelopes/properties/folders/items',
        '#/components/schemas/Envelopes/properties/powerForm',
        '#/components/schemas/Folders/properties/folders/items',
        '#/components/schemas/PowerForms/properties/envelopes/items',
        '#/components/schemas/TemplateDocuments/properties/templateDocuments/items',
        '#/components/schemas/Templates/properties/documents/items',
        '#/components/schemas/Templates/properties/envelopeDocuments/items',
        '#/components/schemas/Templates/properties/folders/items',
        '#/components/schemas/Templates/properties/powerForm',
        '#/components/schemas/Templates/properties/powerForms/items',
        '#/components/schemas/bulkSendingCopy/properties/docGenFormFields/items',
        '#/components/schemas/bulkSendingCopyDocGenFormFieldRowValue/properties/docGenFormFieldList/items',
        '#/components/schemas/bulkSendingList/properties/bulkCopies/items',
        '#/components/schemas/bulksendingCopyDocGenFormField/properties/rowValues/items',
        '#/components/schemas/compositeTemplate/properties/document',
        '#/components/schemas/compositeTemplate/properties/inlineTemplates/items',
        '#/components/schemas/docGenFormField/properties/rowValues/items',
        '#/components/schemas/docGenFormFieldRequest/properties/docGenFormFields/items',
        '#/components/schemas/docGenFormFieldResponse/properties/docGenFormFields/items',
        '#/components/schemas/docGenFormFieldRowValue/properties/docGenFormFieldList/items',
        '#/components/schemas/docGenFormFields/properties/docGenFormFieldList/items',
        '#/components/schemas/document/properties/docGenFormFields/items',
        '#/components/schemas/envelope/properties/envelopeDocuments/items',
        '#/components/schemas/envelope/properties/folders/items',
        '#/components/schemas/envelope/properties/powerForm',
        '#/components/schemas/envelopeDefinition/properties/compositeTemplates/items',
        '#/components/schemas/envelopeDefinition/properties/documents/items',
        '#/components/schemas/envelopeDefinition/properties/envelopeDocuments/items',
        '#/components/schemas/envelopeDefinition/properties/folders/items',
        '#/components/schemas/envelopeDefinition/properties/powerForm',
        '#/components/schemas/envelopeDocument/properties/docGenFormFields/items',
        '#/components/schemas/envelopeDocumentsResult/properties/envelopeDocuments/items',
        '#/components/schemas/envelopeTemplate/properties/documents/items',
        '#/components/schemas/envelopeTemplate/properties/envelopeDocuments/items',
        '#/components/schemas/envelopeTemplate/properties/folders/items',
        '#/components/schemas/envelopeTemplate/properties/powerForm',
        '#/components/schemas/envelopeTemplate/properties/powerForms/items',
        '#/components/schemas/envelopeTemplateResults/properties/envelopeTemplates/items',
        '#/components/schemas/envelopeTemplateResults/properties/folders/items',
        '#/components/schemas/envelopeTransferRule/properties/toFolder',
        '#/components/schemas/envelopeTransferRuleInformation/properties/envelopeTransferRules/items',
        '#/components/schemas/envelopeTransferRuleRequest/properties/toFolder',
        '#/components/schemas/envelopesInformation/properties/envelopes/items',
        '#/components/schemas/envelopesInformation/properties/folders/items',
        '#/components/schemas/folder/properties/folders/items',
        '#/components/schemas/folderItemsResponse/properties/folders/items',
        '#/components/schemas/foldersRequest/properties/folders/items',
        '#/components/schemas/foldersResponse/properties/folders/items',
        '#/components/schemas/inlineTemplate/properties/documents/items',
        '#/components/schemas/inlineTemplate/properties/envelope',
        '#/components/schemas/powerForm/properties/envelopes/items',
        '#/components/schemas/powerFormsRequest/properties/powerForms/items',
        '#/components/schemas/powerFormsResponse/properties/powerForms/items',
        '#/components/schemas/templateDocumentsResult/properties/templateDocuments/items',
        '#/paths/~1v2.1~1accounts~1{accountId}~1bulk_send_lists/post/responses/201/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1bulk_send_lists~1{bulkSendListId}/get/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1bulk_send_lists~1{bulkSendListId}/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1bulk_send_lists~1{bulkSendListId}/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes/get/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1status/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1transfer_rules/post/responses/201/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1transfer_rules/put/requestBody/content/application~1json/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1transfer_rules/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1transfer_rules~1{envelopeTransferRuleId}/put/requestBody/content/application~1json/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1transfer_rules~1{envelopeTransferRuleId}/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}/get/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}/put/requestBody/content/application~1json/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1docGenFormFields/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1documents/delete/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1documents/delete/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1documents/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1documents/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1envelopes~1{envelopeId}~1documents~1{documentId}/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1folders~1{folderId}/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1powerforms/delete/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1powerforms/post/responses/201/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1powerforms~1{powerFormId}/get/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1powerforms~1{powerFormId}/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1powerforms~1{powerFormId}/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}/get/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents/delete/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents/delete/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents/put/responses/200/content/*~1*/schema',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents~1{documentId}/put/requestBody',
        '#/paths/~1v2.1~1accounts~1{accountId}~1templates~1{templateId}~1documents~1{documentId}/put/responses/200/content/*~1*/schema',
      ],
    });
  }, 20_000);

  describe('and we have an operation that does not contain any circular references (but lives in a file that does)', () => {
    it('should have reduced and preserved all used references', async () => {
      const reduced = OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/edit', 'post')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      const analyzerResult = await analyzer(structuredClone(reduced), ['circularRefs']);
      expect(analyzerResult.circularRefs).toStrictEqual({
        present: false,
        locations: [
          // This endpoint didn't have any circular references before we reduced it and shouldn't
          // have any after.
        ],
      });

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
    }, 20_000);
  });

  describe('and we have an operation that contains circular references', () => {
    it('should have reduced and preserved all used references', async () => {
      const reduced = OpenAPIReducer.init(docusign as OASDocument)
        .byOperation('/v2.1/accounts/{accountId}/envelopes/{envelopeId}', 'get')
        .reduce();

      await expect(reduced).toBeAValidOpenAPIDefinition();

      const analyzerResult = await analyzer(structuredClone(reduced), ['circularRefs']);
      expect(analyzerResult.circularRefs).toStrictEqual({
        present: true,
        locations: [
          '#/components/schemas/docGenFormField/properties/rowValues/items',
          '#/components/schemas/docGenFormFieldRowValue/properties/docGenFormFieldList/items',
          '#/components/schemas/envelope/properties/envelopeDocuments/items',
          '#/components/schemas/envelope/properties/folders/items',
          '#/components/schemas/envelope/properties/powerForm',
          '#/components/schemas/envelopeDocument/properties/docGenFormFields/items',
          '#/components/schemas/folder/properties/folders/items',
          '#/components/schemas/powerForm/properties/envelopes/items',
        ],
      });

      expect(reduced.paths).toHaveProperty('/v2.1/accounts/{accountId}/envelopes/{envelopeId}');
      expect(reduced.paths?.['/v2.1/accounts/{accountId}/envelopes/{envelopeId}']).toStrictEqual({
        // This path has a common `parameters` property that we should have still retained.
        parameters: [],
        get: expect.objectContaining({
          operationId: 'Envelopes_GetEnvelope',
        }),
      });

      expect(Object.keys(reduced.components?.schemas || {})).toMatchSnapshot();
    }, 20_000);
  });
});
