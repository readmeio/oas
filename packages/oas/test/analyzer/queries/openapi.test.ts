import type { OASDocument } from '../../../src/types.js';

import callbacks from '@readme/oas-examples/3.0/json/callbacks.json' with { type: 'json' };
import complexNesting from '@readme/oas-examples/3.0/json/complex-nesting.json' with { type: 'json' };
import discriminators from '@readme/oas-examples/3.0/json/discriminators.json' with { type: 'json' };
import links from '@readme/oas-examples/3.0/json/link-example.json' with { type: 'json' };
import commonParameters from '@readme/oas-examples/3.0/json/parameters-common.json' with { type: 'json' };
import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import readmeLegacy from '@readme/oas-examples/3.0/json/readme-legacy.json' with { type: 'json' };
import additionalProperties from '@readme/oas-examples/3.0/json/schema-additional-properties.json' with { type: 'json' };
import circular from '@readme/oas-examples/3.0/json/schema-circular.json' with { type: 'json' };
import security from '@readme/oas-examples/3.0/json/security.json' with { type: 'json' };
import serverVariables from '@readme/oas-examples/3.0/json/server-variables.json' with { type: 'json' };
import parameterStyles from '@readme/oas-examples/3.1/json/parameters-style.json' with { type: 'json' };
import readme from '@readme/oas-examples/3.1/json/readme.json' with { type: 'json' };
import trainTravel from '@readme/oas-examples/3.1/json/train-travel.json' with { type: 'json' };
import webhooks from '@readme/oas-examples/3.1/json/webhooks.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';

import {
  analyzeAdditionalProperties,
  analyzeCallbacks,
  analyzeCircularRefs,
  analyzeCommonParameters,
  analyzeDiscriminators,
  analyzeFileSize,
  analyzeLinks,
  analyzeMediaTypes,
  analyzeParameterSerialization,
  analyzePolymorphism,
  analyzeRefNames,
  analyzeSecurityTypes,
  analyzeServerVariables,
  analyzeTotalOperations,
  analyzeWebhooks,
  analyzeXMLRequests,
  analyzeXMLResponses,
  analyzeXMLSchemas,
} from '../../../src/analyzer/index.js';
import Oas from '../../../src/index.js';
import responses from '../../__datasets__/responses.json' with { type: 'json' };

describe('analyzer queries (OpenAPI)', () => {
  describe('#analyzeAdditionalProperties()', () => {
    it('should discover `additionalProperties` usage within a definition that has it', () => {
      expect(analyzeAdditionalProperties(additionalProperties as OASDocument)).toStrictEqual([
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: $ref, simple`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: $ref, with $ref`/additionalProperties',
        '#/paths/~1post/post/requestBody/content/application~1json/schema/properties/object with `additionalProperties: anyOf` (polymorphic)/additionalProperties',
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
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: anyOf` (polymorphic)/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: true`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: array, items: { type: integer } }`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: integer }`/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }` and custom title/additionalProperties',
        '#/paths/~1post/post/responses/200/content/application~1json/schema/properties/object with `additionalProperties: { type: object, properties: ... }`/additionalProperties',
      ]);
    });

    it('should discover `additionalProperties` usage within `$ref` pointers', () => {
      expect(analyzeAdditionalProperties(complexNesting as OASDocument)).toStrictEqual([
        '#/components/schemas/ObjectOfAdditionalPropertiesObjectPolymorphism/additionalProperties',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeAdditionalProperties(security as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeCallbacks()', () => {
    it('should discover `callbacks` usage within a definition that has it', () => {
      expect(analyzeCallbacks(callbacks as OASDocument)).toStrictEqual(['#/paths/~1streams/post/callbacks']);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeCallbacks(readmeLegacy as OASDocument)).toHaveLength(0);
    });

    it('should not flag schema properties named `callbacks` as a callback', () => {
      expect(
        readme.paths['/branches/{branch}/reference'].post.requestBody.content['application/json'].schema.properties.api
          .properties.stats.properties,
      ).toHaveProperty('callbacks');

      expect(analyzeCallbacks(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeCircularRefs()', () => {
    it('should determine if a definition has circular refs when it does', async () => {
      await expect(analyzeCircularRefs(circular as OASDocument)).resolves.toStrictEqual([
        '#/components/schemas/MultiPart/properties/parent',
        '#/components/schemas/ZoneOffset/properties/rules',
      ]);
    });

    it("should not find where it doesn't exist", async () => {
      await expect(analyzeCircularRefs(readme as OASDocument)).resolves.toHaveLength(0);
    });
  });

  describe('#analyzeCommonParameters()', () => {
    it('should discover common parameters usage within a definition that has it', () => {
      expect(analyzeCommonParameters(commonParameters as OASDocument)).toStrictEqual([
        '#/paths/~1anything~1{id}/parameters',
        '#/paths/~1anything~1{id}~1override/parameters',
        '#/paths/~1anything~1{id}~1{action}/parameters',
        '#/paths/~1anything~1{id}~1{action}~1{id}/parameters',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeCommonParameters(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeDiscriminators()', () => {
    it('should discover `discriminator` usage within a definition that has it', () => {
      expect(analyzeDiscriminators(discriminators as OASDocument)).toStrictEqual([
        '#/components/schemas/BaseVehicle/discriminator',
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
      expect(analyzeDiscriminators(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeFileSize()', () => {
    it('should calculate the size of the definition in its raw form', async () => {
      await expect(analyzeFileSize(trainTravel as OASDocument)).resolves.toStrictEqual({
        raw: 0.03,
        dereferenced: 0.15,
      });
    });
  });

  describe('#analyzeLinks()', () => {
    it('should discover `links` usage within a definition that has it', () => {
      expect(analyzeLinks(links as OASDocument)).toStrictEqual([
        '#/components/links',
        '#/paths/~12.0~1repositories~1{username}/get/responses/200/links',
        '#/paths/~12.0~1repositories~1{username}~1{slug}/get/responses/200/links',
        '#/paths/~12.0~1repositories~1{username}~1{slug}~1pullrequests~1{pid}/get/responses/200/links',
        '#/paths/~12.0~1users~1{username}/get/responses/200/links',
      ]);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeLinks(readmeLegacy as OASDocument)).toHaveLength(0);
    });

    it('should not flag schema properties named `links` as a link', () => {
      expect(
        readme.paths['/images'].post.responses[201].content['application/json'].schema.properties.data.properties,
      ).toHaveProperty('links');

      expect(analyzeLinks(readme as OASDocument)).toStrictEqual([]);
    });
  });

  describe('#analyzeMediaTypes()', () => {
    it('should tally all of the media types used within a definition', () => {
      expect(analyzeMediaTypes(petstore as OASDocument)).toStrictEqual([
        'application/json',
        'application/x-www-form-urlencoded',
        'application/xml',
        'multipart/form-data',
      ]);
    });
  });

  describe('#analyzeParameterSerialization()', () => {
    it('should discover parameter serialization usage within a definition that has it', () => {
      expect(analyzeParameterSerialization(parameterStyles as unknown as OASDocument)).toStrictEqual([
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
      expect(analyzeParameterSerialization(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzePolymorphism()', () => {
    it('should determine if a definition uses schema polymorphism', () => {
      expect(analyzePolymorphism(readme as OASDocument)).toMatchSnapshot();
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzePolymorphism(petstore as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeRefNames()', () => {
    it('should detect usage of `x-readme-ref-name` for defining reference names', async () => {
      const oas = Oas.init(petstore);
      // Need to dereference it for this extension to be added
      await oas.dereference();

      expect(analyzeRefNames(oas.api)).toStrictEqual([
        '#/components/requestBodies/Pet/content/application~1json/schema/properties/category/x-readme-ref-name',
        '#/components/requestBodies/Pet/content/application~1json/schema/properties/tags/items/x-readme-ref-name',
        '#/components/requestBodies/Pet/content/application~1json/schema/x-readme-ref-name',
        '#/components/requestBodies/Pet/content/application~1xml/schema/properties/category/x-readme-ref-name',
        '#/components/requestBodies/Pet/content/application~1xml/schema/properties/tags/items/x-readme-ref-name',
        '#/components/requestBodies/Pet/content/application~1xml/schema/x-readme-ref-name',
        '#/components/requestBodies/UserArray/content/application~1json/schema/items/x-readme-ref-name',
        '#/components/schemas/ApiResponse/x-readme-ref-name',
        '#/components/schemas/Category/x-readme-ref-name',
        '#/components/schemas/Order/x-readme-ref-name',
        '#/components/schemas/Pet/properties/category/x-readme-ref-name',
        '#/components/schemas/Pet/properties/tags/items/x-readme-ref-name',
        '#/components/schemas/Pet/x-readme-ref-name',
        '#/components/schemas/Tag/x-readme-ref-name',
        '#/components/schemas/User/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1json/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1json/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1xml/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1xml/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet/post/requestBody/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1json/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1json/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1xml/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1xml/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet/put/requestBody/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1json/schema/items/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1json/schema/items/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1json/schema/items/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1xml/schema/items/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1xml/schema/items/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1findByStatus/get/responses/200/content/application~1xml/schema/items/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1json/schema/items/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1json/schema/items/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1json/schema/items/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1xml/schema/items/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1xml/schema/items/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1findByTags/get/responses/200/content/application~1xml/schema/items/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1json/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1json/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1xml/schema/properties/category/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1xml/schema/properties/tags/items/x-readme-ref-name',
        '#/paths/~1pet~1{petId}/get/responses/200/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1pet~1{petId}~1uploadImage/post/responses/200/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1store~1order/post/requestBody/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1store~1order/post/responses/200/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1store~1order/post/responses/200/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1store~1order~1{orderId}/get/responses/200/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1store~1order~1{orderId}/get/responses/200/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1user/post/requestBody/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1user~1createWithArray/post/requestBody/content/application~1json/schema/items/x-readme-ref-name',
        '#/paths/~1user~1createWithList/post/requestBody/content/application~1json/schema/items/x-readme-ref-name',
        '#/paths/~1user~1{username}/get/responses/200/content/application~1json/schema/x-readme-ref-name',
        '#/paths/~1user~1{username}/get/responses/200/content/application~1xml/schema/x-readme-ref-name',
        '#/paths/~1user~1{username}/put/requestBody/content/application~1json/schema/x-readme-ref-name',
      ]);
    });
  });

  describe('#analyzeSecurityTypes()', () => {
    it('should tally all of the security types used within a definition', () => {
      expect(analyzeSecurityTypes(security as OASDocument)).toStrictEqual([
        'apiKey',
        'http',
        'oauth2',
        'openIdConnect',
      ]);
    });
  });

  describe('#analyzeServerVariables()', () => {
    it('should determine if a definition uses server variables when it does', () => {
      expect(analyzeServerVariables(serverVariables)).toStrictEqual(['#/servers/0', '#/servers/1', '#/servers/2']);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeServerVariables(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeTotalOperations()', () => {
    it('should count the total operations used within a definition', () => {
      expect(analyzeTotalOperations(readme as OASDocument)).toBe(54);
    });
  });

  describe('#analyzeWebhooks()', () => {
    it('should determine if a definition uses webhooks when it does', () => {
      expect(analyzeWebhooks(webhooks as OASDocument)).toStrictEqual(['#/webhooks/newPet']);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeWebhooks(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeXMLRequests()', () => {
    it('should determine if a definition has XML payloads', () => {
      expect(analyzeXMLRequests(trainTravel as OASDocument)).toStrictEqual([
        '#/paths/~1bookings/post/requestBody/content/application~1xml',
      ]);
    });

    it('should discover `+xml` vendor suffixes', () => {
      expect(
        analyzeXMLRequests({
          paths: {
            '/anything': {
              post: {
                requestBody: {
                  required: true,
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
        } as any),
      ).toStrictEqual(['#/paths/~1anything/post/requestBody/content/text~1plain+xml']);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeXMLRequests(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeXMLResponses()', () => {
    it('should determine if a definition has XML responses', () => {
      expect(analyzeXMLResponses(petstore as OASDocument)).toStrictEqual([
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
        analyzeXMLResponses({
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
      expect(analyzeXMLResponses(readme as OASDocument)).toHaveLength(0);
    });
  });

  describe('#analyzeXMLSchemas()', () => {
    it('should determine if a definition uses the XML object', () => {
      expect(analyzeXMLSchemas(trainTravel as OASDocument)).toStrictEqual([
        '#/components/schemas/Booking',
        '#/components/schemas/Problem',
        '#/components/schemas/Station',
        '#/components/schemas/Trip',
        '#/components/schemas/Wrapper-Collection',
      ]);
    });

    it('should not detect the `+xml` vendor suffix as an XML object', () => {
      expect(analyzeXMLSchemas(responses as unknown as OASDocument)).toHaveLength(0);
    });

    it("should not find where it doesn't exist", () => {
      expect(analyzeXMLSchemas(readme as OASDocument)).toHaveLength(0);
    });
  });
});
