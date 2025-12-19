import { describe, expect, it } from 'vitest';
import { createOasForOperation } from '../__fixtures__/create-oas.js';

describe('Operation #selectedContentType', () => {
  it('should allow setting and getting a selected content type', () => {
    const oas = createOasForOperation({
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } },
          'application/xml': { schema: { type: 'object' } },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    expect(operation.getContentType()).toBe('application/json');

    operation.setContentType('application/xml');
    expect(operation.getContentType()).toBe('application/xml');
  });

  it('should respect selected content type in getRequestBody()', () => {
    const oas = createOasForOperation({
      requestBody: {
        description: 'Test Description',
        content: {
          'application/json': { schema: { type: 'object', properties: { json: { type: 'boolean' } } } },
          'application/xml': { schema: { type: 'object', properties: { xml: { type: 'boolean' } } } },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    // Default (should be JSON)
    const [defaultType] = operation.getRequestBody() as [string, any, string];
    expect(defaultType).toBe('application/json');

    // Select XML
    operation.setContentType('application/xml');
    const [selectedType, selectedSchema, description] = operation.getRequestBody() as [string, any, string];
    expect(selectedType).toBe('application/xml');
    expect(selectedSchema.schema.properties.xml).toBeDefined();
    expect(description).toBe('Test Description');
  });

  it('should return false if selected content type does not exist in getRequestBody()', () => {
    const oas = createOasForOperation({
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    operation.setContentType('application/xml');
    expect(operation.getRequestBody()).toBe(false);
  });

  it('should return available media types via getMediaTypes()', () => {
    const oas = createOasForOperation({
      requestBody: {
        content: {
          'application/json': { schema: { type: 'object' } },
          'application/xml': { schema: { type: 'object' } },
        },
      },
      responses: {
        200: {
          description: 'Success response',
          content: {
            'text/plain': { schema: { type: 'string' } },
          },
        },
      },
    });
    const operation = oas.operation('/', 'get');

    expect(operation.getMediaTypes()).toStrictEqual(['application/json', 'application/xml', 'text/plain']);
  });

  describe('no content type requirements', () => {
    it('should return an empty array if no media types are defined anywhere', () => {
      const oas = createOasForOperation({
        responses: {
          204: { description: 'No Content' },
        },
      });
      const operation = oas.operation('/', 'get');

      expect(operation.getMediaTypes()).toStrictEqual([]);
    });

    it('should not include Accept header if no response content exists', () => {
      const oas = createOasForOperation({
        requestBody: {
          content: { 'application/json': {} },
        },
        responses: {
          204: { description: 'No Content' },
        },
      });
      const operation = oas.operation('/', 'get');

      const headers = operation.getHeaders();
      expect(headers.request).not.toContain('Accept');
      expect(headers.request).toContain('Content-Type'); // Added because request body exists
    });
  });
});
