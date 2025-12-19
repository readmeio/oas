import { describe, expect, it } from 'vitest';
import { createOasForOperation } from '../../__fixtures__/create-oas.js';

describe('#getResponseAsJSONSchema() content type override', () => {
  it('should respect the preferContentType option if provided', () => {
    const oas = createOasForOperation({
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { json: { type: 'string' } },
              },
            },
            'application/xml': {
              schema: {
                type: 'object',
                properties: { xml: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    // Default behavior (prefers JSON)
    const defaultSchema = operation.getResponseAsJSONSchema('200');
    expect(defaultSchema[0].schema.properties.json).toBeDefined();

    // With override
    const xmlSchema = operation.getResponseAsJSONSchema('200', { preferContentType: 'application/xml' });
    expect(xmlSchema[0].schema.properties.xml).toBeDefined();
  });

  it('should fall back to default logic if provided preferContentType does not exist', () => {
    const oas = createOasForOperation({
      responses: {
        200: {
          description: 'OK',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { json: { type: 'string' } },
              },
            },
          },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    const schema = operation.getResponseAsJSONSchema('200', { preferContentType: 'application/xml' });
    expect(schema[0].schema.properties.json).toBeDefined();
  });
});
