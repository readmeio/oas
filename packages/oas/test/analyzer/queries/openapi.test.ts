import type { OASDocument } from '../../../src/types.js';

import { describe, beforeAll, expect, it } from 'vitest';

import * as QUERIES from '../../../src/analyzer/queries/openapi.js';

function loadSpec(r: any) {
  return r.default as unknown as OASDocument;
}

describe('analyzer queries (OpenAPI)', () => {
  let additionalProperties: OASDocument;
  let callbacks: OASDocument;
  let circular: OASDocument;
  let complexNesting: OASDocument;
  let discriminators: OASDocument;
  let links: OASDocument;
  let parameterStyles: OASDocument;
  let petstore: OASDocument;
  let readme: OASDocument;
  let security: OASDocument;
  let serverVariables: OASDocument;
  let webhooks: OASDocument;

  beforeAll(async () => {
    additionalProperties = await import('@readme/oas-examples/3.0/json/schema-additional-properties.json').then(
      loadSpec,
    );
    complexNesting = await import('@readme/oas-examples/3.0/json/complex-nesting.json').then(loadSpec);
    callbacks = await import('@readme/oas-examples/3.0/json/callbacks.json').then(loadSpec);
    discriminators = await import('@readme/oas-examples/3.0/json/discriminators.json').then(loadSpec);
    links = await import('@readme/oas-examples/3.0/json/link-example.json').then(loadSpec);
    petstore = await import('@readme/oas-examples/3.0/json/petstore.json').then(loadSpec);
    readme = await import('@readme/oas-examples/3.0/json/readme.json').then(loadSpec);
    circular = await import('@readme/oas-examples/3.0/json/schema-circular.json').then(loadSpec);
    security = await import('@readme/oas-examples/3.0/json/security.json').then(loadSpec);
    serverVariables = await import('@readme/oas-examples/3.0/json/server-variables.json').then(loadSpec);

    parameterStyles = await import('@readme/oas-examples/3.1/json/parameters-style.json').then(loadSpec);
    webhooks = await import('@readme/oas-examples/3.1/json/webhooks.json').then(loadSpec);
  });

  describe('additionalProperties', () => {
    it('should discover `additionalProperties` usage within a definition that has it', () => {
      expect(QUERIES.additionalProperties(additionalProperties)).toStrictEqual([
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: $ref, simple`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: $ref, with $ref`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: false` and no other properties/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: true`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: { type: array, items: { type: integer } }`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: { type: integer }`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }` and custom title/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalPropeties` within an allOf/allOf/0/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalPropeties` within an allOf/allOf/1/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: $ref, simple`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: $ref, with $ref`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: true`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: array, items: { type: integer } }`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: integer }`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }` and custom title/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }`/additionalProperties',
      ]);
    });

    it('should discover `additionalProperties` usage within `$ref` pointers', () => {
      expect(QUERIES.additionalProperties(complexNesting)).toStrictEqual([
        '#/components/schemas/ObjectOfAdditionalPropertiesObjectPolymorphism/additionalProperties',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.additionalProperties(security)).toHaveLength(0);
    });
  });

  describe('callbacks', () => {
    it('should discover `callbacks` usage within a definition that has it', () => {
      expect(QUERIES.callbacks(callbacks)).toStrictEqual(['#/paths/~1streams/post/callbacks']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.callbacks(readme)).toHaveLength(0);
    });
  });

  describe('circularRefs', () => {
    it('should determine if a definition has circular refs when it does', async () => {
      await expect(QUERIES.circularRefs(circular)).resolves.toStrictEqual([
        '#/components/schemas/MultiPart/properties/parent',
        '#/components/schemas/ZoneOffset/properties/rules',
      ]);
    });

    it("should not find where it doesn't exist", async () => {
      await expect(QUERIES.circularRefs(readme)).resolves.toHaveLength(0);
    });
  });

  describe('discriminators', () => {
    it('should discover `discriminator` usage within a definition that has it', () => {
      expect(QUERIES.discriminators(discriminators)).toStrictEqual([
        '#/components/schemas/Pet/discriminator',
        '#/paths/~1discriminator-with-mapping/patch/requestBody/content/application~1json/schema/discriminator',
        '#/paths/~1discriminator-with-no-mapping/patch/requestBody/content/application~1json/schema/discriminator',
        '#/paths/~1improper-discriminator-placement/patch/requestBody/content/application~1json/schema/properties/connector_properties/discriminator',
        '#/paths/~1mapping-of-schema-names/patch/requestBody/content/application~1json/schema/discriminator',
        '#/paths/~1mapping-with-duplicate-schemas/patch/requestBody/content/application~1json/schema/discriminator',
        '#/paths/~1oneof-allof-top-level-disc/patch/requestBody/content/application~1json/schema/discriminator',
        '#/paths/~1potentially-undefined-formData/post/requestBody/content/application~1json/schema/discriminator',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.discriminators(readme)).toHaveLength(0);
    });
  });

  describe('links', () => {
    it('should discover `links` usage within a definition that has it', () => {
      expect(QUERIES.links(links)).toStrictEqual([
        '#/components/links',
        '#/paths/~12.0~1repositories~1{username}/get/responses/200/links',
        '#/paths/~12.0~1repositories~1{username}~1{slug}/get/responses/200/links',
        '#/paths/~12.0~1repositories~1{username}~1{slug}~1pullrequests~1{pid}/get/responses/200/links',
        '#/paths/~12.0~1users~1{username}/get/responses/200/links',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.links(readme)).toHaveLength(0);
    });
  });

  describe('mediaTypes', () => {
    it('should tally all of the media types used within a definition', () => {
      expect(QUERIES.mediaTypes(petstore)).toStrictEqual([
        'application/json',
        'application/x-www-form-urlencoded',
        'application/xml',
        'multipart/form-data',
      ]);
    });
  });

  describe('parameter serialization', () => {
    it('should discover parameter serialization usage within a definition that has it', () => {
      expect(QUERIES.parameterSerialization(parameterStyles)).toStrictEqual([
        '#/paths/~1anything~1headers~1simple/get/parameters/0',
        '#/paths/~1anything~1headers~1simple/get/parameters/1',
        '#/paths/~1anything~1headers~1simple/get/parameters/2',
        '#/paths/~1anything~1headers~1simple/post/parameters/0',
        '#/paths/~1anything~1headers~1simple/post/parameters/1',
        '#/paths/~1anything~1headers~1simple/post/parameters/2',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/get/parameters/0',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/get/parameters/1',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/get/parameters/2',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/post/parameters/0',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/post/parameters/1',
        '#/paths/~1anything~1path~1label~1{primitive}~1{array}~1{object}/post/parameters/2',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/get/parameters/0',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/get/parameters/1',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/get/parameters/2',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/post/parameters/0',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/post/parameters/1',
        '#/paths/~1anything~1path~1matrix~1{primitive}~1{array}~1{object}/post/parameters/2',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/get/parameters/0',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/get/parameters/1',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/get/parameters/2',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/post/parameters/0',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/post/parameters/1',
        '#/paths/~1anything~1path~1simple~1{primitive}~1{array}~1{object}/post/parameters/2',
        '#/paths/~1anything~1query~1deepObject/get/parameters/0',
        '#/paths/~1anything~1query~1form/get/parameters/0',
        '#/paths/~1anything~1query~1form/get/parameters/1',
        '#/paths/~1anything~1query~1form/get/parameters/2',
        '#/paths/~1anything~1query~1form/post/parameters/0',
        '#/paths/~1anything~1query~1form/post/parameters/1',
        '#/paths/~1anything~1query~1form/post/parameters/2',
        '#/paths/~1anything~1query~1pipeDelimited/get/parameters/0',
        '#/paths/~1anything~1query~1pipeDelimited/get/parameters/1',
        '#/paths/~1anything~1query~1spaceDelimited/get/parameters/0',
        '#/paths/~1anything~1query~1spaceDelimited/get/parameters/1',
        '#/paths/~1cookies#formExploded/get/parameters/0',
        '#/paths/~1cookies#formExploded/get/parameters/1',
        '#/paths/~1cookies#formExploded/get/parameters/2',
        '#/paths/~1cookies#formNonExploded/get/parameters/0',
        '#/paths/~1cookies#formNonExploded/get/parameters/1',
        '#/paths/~1cookies#formNonExploded/get/parameters/2',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.parameterSerialization(readme)).toHaveLength(0);
    });
  });

  describe('polymorphism', () => {
    it('should determine if a definition uses schema polymorphism', () => {
      expect(QUERIES.polymorphism(readme)).toStrictEqual([
        '#/components/responses/authForbidden/content/application~1json/schema',
        '#/components/responses/authUnauthorized/content/application~1json/schema',
        '#/components/schemas/docSchemaPost',
        '#/components/schemas/error_APIKEY_EMPTY',
        '#/components/schemas/error_APIKEY_MISMATCH',
        '#/components/schemas/error_APIKEY_NOTFOUND',
        '#/components/schemas/error_APPLY_INVALID_EMAIL',
        '#/components/schemas/error_APPLY_INVALID_JOB',
        '#/components/schemas/error_APPLY_INVALID_NAME',
        '#/components/schemas/error_CATEGORY_INVALID',
        '#/components/schemas/error_CATEGORY_NOTFOUND',
        '#/components/schemas/error_CHANGELOG_INVALID',
        '#/components/schemas/error_CHANGELOG_NOTFOUND',
        '#/components/schemas/error_CUSTOMPAGE_INVALID',
        '#/components/schemas/error_CUSTOMPAGE_NOTFOUND',
        '#/components/schemas/error_DOC_INVALID',
        '#/components/schemas/error_DOC_NOTFOUND',
        '#/components/schemas/error_ENDPOINT_NOTFOUND',
        '#/components/schemas/error_INTERNAL_ERROR',
        '#/components/schemas/error_PROJECT_NEEDSSTAGING',
        '#/components/schemas/error_PROJECT_NOTFOUND',
        '#/components/schemas/error_RATE_LIMITED',
        '#/components/schemas/error_REGISTRY_INVALID',
        '#/components/schemas/error_REGISTRY_NOTFOUND',
        '#/components/schemas/error_SPEC_FILE_EMPTY',
        '#/components/schemas/error_SPEC_ID_DUPLICATE',
        '#/components/schemas/error_SPEC_ID_INVALID',
        '#/components/schemas/error_SPEC_INVALID',
        '#/components/schemas/error_SPEC_INVALID_SCHEMA',
        '#/components/schemas/error_SPEC_NOTFOUND',
        '#/components/schemas/error_SPEC_TIMEOUT',
        '#/components/schemas/error_SPEC_VERSION_NOTFOUND',
        '#/components/schemas/error_UNEXPECTED_ERROR',
        '#/components/schemas/error_VERSION_CANT_DEMOTE_STABLE',
        '#/components/schemas/error_VERSION_CANT_REMOVE_STABLE',
        '#/components/schemas/error_VERSION_DUPLICATE',
        '#/components/schemas/error_VERSION_EMPTY',
        '#/components/schemas/error_VERSION_FORK_EMPTY',
        '#/components/schemas/error_VERSION_FORK_NOTFOUND',
        '#/components/schemas/error_VERSION_INVALID',
        '#/components/schemas/error_VERSION_NOTFOUND',
        '#/paths/~1api-specification/post/responses/400/content/application~1json/schema',
        '#/paths/~1api-specification~1{id}/put/responses/400/content/application~1json/schema',
        '#/paths/~1categories/post/requestBody/content/application~1json/schema',
        '#/paths/~1version/post/responses/400/content/application~1json/schema',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.polymorphism(petstore)).toHaveLength(0);
    });
  });

  describe('securityTypes', () => {
    it('should tally all of the security types used within a definition', () => {
      expect(QUERIES.securityTypes(security)).toStrictEqual(['apiKey', 'http', 'oauth2', 'openIdConnect']);
    });
  });

  describe('server variables', () => {
    it('should determine if a definition uses server variables when it does', () => {
      expect(QUERIES.serverVariables(serverVariables)).toStrictEqual(['#/servers/0', '#/servers/1', '#/servers/2']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.serverVariables(readme)).toHaveLength(0);
    });
  });

  describe('totalOperations', () => {
    it('should count the total operations used within a definition', () => {
      expect(QUERIES.totalOperations(readme)).toBe(36);
    });
  });

  describe('webhooks', () => {
    it('should determine if a definition uses webhooks when it does', () => {
      expect(QUERIES.webhooks(webhooks)).toStrictEqual(['#/webhooks/newPet']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.webhooks(readme)).toHaveLength(0);
    });
  });

  describe('xml', () => {
    it('should determine if a definition has xml', () => {
      expect(QUERIES.xml(petstore)).toStrictEqual([
        '#/components/schemas/Category',
        '#/components/schemas/Order',
        '#/components/schemas/Pet',
        '#/components/schemas/Pet/properties/photoUrls',
        '#/components/schemas/Pet/properties/tags',
        '#/components/schemas/Tag',
        '#/components/schemas/User',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1xml',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1xml',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1xml',
        '#/paths/~1store~1order/post/responses/200/content/application~1xml',
        '#/paths/~1store~1order~1{orderId}/get/responses/200/content/application~1xml',
        '#/paths/~1user~1login/get/responses/200/content/application~1xml',
        '#/paths/~1user~1{username}/get/responses/200/content/application~1xml',
      ]);
    });

    it('should discover `+xml` vendor suffixes', () => {
      expect(
        QUERIES.xml({
          paths: {
            '/anything': {
              get: {
                responses: {
                  '200': {
                    description: 'successful operation',
                    content: {
                      'text/plain+xml': {
                        schema: {
                          type: 'array',
                          items: {
                            type: 'string',
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        } as any),
      ).toStrictEqual(['#/paths/~1anything/get/responses/200/content/text~1plain+xml']);
    });

    it("should not find where it doesn't exist", () => {
      expect(QUERIES.xml(readme)).toHaveLength(0);
    });
  });
});
