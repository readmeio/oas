import type { JSONSchema4, JSONSchema7, JSONSchema7Definition, JSONSchema7TypeName } from 'json-schema';
import type { SchemaObject } from '../../src/types.js';

import petstoreSpec from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { beforeAll, describe, expect, it } from 'vitest';

import Oas from '../../src/index.js';
import { toJSONSchema } from '../../src/lib/openapi-to-json-schema.js';
import requestbodyExampleQuirksSpec from '../__datasets__/requestbody-example-quirks.json' with { type: 'json' };
import { createOasForOperation } from '../__fixtures__/create-oas.js';
import { generateJSONSchemaFixture } from '../__fixtures__/json-schema.js';

let petstore: Oas;

beforeAll(async () => {
  petstore = Oas.init(structuredClone(petstoreSpec));
});

describe('`const` support', () => {
  it('should support top-level consts', () => {
    expect(toJSONSchema({ const: 'buster' })).toStrictEqual({ const: 'buster' });
  });

  it('should support const declarations in an object', () => {
    expect(
      toJSONSchema({
        properties: {
          name: {
            const: 'buster',
          },
        },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: {
        name: {
          const: 'buster',
        },
      },
    });
  });
});

describe('`type` support', () => {
  describe('mixed types', () => {
    it('should support mixed types', () => {
      expect(
        toJSONSchema({
          type: ['string', 'number'],
          description: 'tktk',
        }),
      ).toStrictEqual({
        type: ['string', 'number'],
        description: 'tktk',
      });
    });

    it('should remove duplicate entries', () => {
      expect(
        toJSONSchema({
          type: ['string', 'string'],
          description: 'tktk',
        }),
      ).toStrictEqual({ type: 'string', description: 'tktk' });
    });

    it('should turn a mixed type array containing one entry into a single type', () => {
      expect(toJSONSchema({ type: ['string'], description: 'tktk' })).toStrictEqual({
        type: 'string',
        description: 'tktk',
      });
    });

    describe('booleans', () => {
      it('should turn a mixed primitive type with a boolean into a oneOf', () => {
        expect(toJSONSchema({ type: ['string', 'boolean'], description: 'tktk' })).toStrictEqual({
          oneOf: [
            { type: 'string', description: 'tktk' },
            { type: 'boolean', description: 'tktk' },
          ],
        });
      });

      it('should turn a mixed primitive type with a boolean and an array into a oneOf', () => {
        expect(
          toJSONSchema({
            type: ['string', 'boolean', 'array'],
            description: 'tktk',
            items: {
              type: 'string',
            },
          }),
        ).toStrictEqual({
          oneOf: [
            { type: 'string', description: 'tktk' },
            { type: 'array', description: 'tktk', items: { type: 'string' } },
            { type: 'boolean', description: 'tktk' },
          ],
        });
      });
    });

    describe('non-primitive', () => {
      it('should explode a mixed non-primitive into a oneOf', () => {
        expect(
          toJSONSchema({
            description: 'tktk',
            type: ['object', 'array'],
            items: {
              type: 'string',
            },
            properties: {},
          }),
        ).toStrictEqual({
          oneOf: [
            { type: 'array', description: 'tktk', items: { type: 'string' } },
            { type: 'object', description: 'tktk', properties: {} },
          ],
        });
      });
    });

    describe('primitive and non-primitive', () => {
      it('should retain descriptions', () => {
        expect(
          toJSONSchema({
            description: 'tktk',
            type: ['string', 'number', 'array'],
            items: {
              type: 'string',
            },
          }),
        ).toStrictEqual({
          oneOf: [
            { description: 'tktk', type: ['string', 'number'] },
            { description: 'tktk', type: 'array', items: { type: 'string' } },
          ],
        });
      });

      it('should leave a non-primitive and null mixed type alone', () => {
        const schema: any = {
          type: ['object', 'null'],
          properties: {
            url: {
              type: ['string', 'null'],
            },
          },
        };

        expect(toJSONSchema(schema)).toStrictEqual(schema);
      });

      it('should move an array into a oneOf', () => {
        expect(
          toJSONSchema({
            type: ['string', 'number', 'array'],
            items: {
              type: 'string',
            },
          }),
        ).toStrictEqual({
          oneOf: [{ type: ['string', 'number'] }, { type: 'array', items: { type: 'string' } }],
        });
      });

      it('should move an object into a oneOf', () => {
        expect(
          toJSONSchema({
            type: ['string', 'null', 'object'],
            properties: {
              buster: {
                type: 'string',
              },
            },
          }),
        ).toStrictEqual({
          oneOf: [
            { type: ['string', 'null'] },
            {
              type: ['object', 'null'],
              properties: { buster: { type: 'string' } },
            },
          ],
        });
      });
    });
  });

  describe('null types', () => {
    it('should transform a null type into a stringified `null` value', () => {
      expect(toJSONSchema({ type: null } as any)).toStrictEqual({ type: 'null' });
    });

    it('should support null mixed types', () => {
      const expected = { type: ['string', 'number', 'null'], description: 'tktk' };

      expect(toJSONSchema({ type: ['string', 'number', 'null'], description: 'tktk' })).toStrictEqual(expected);
      expect(toJSONSchema({ type: ['string', 'number', null as any], description: 'tktk' })).toStrictEqual(expected);
    });

    describe('`nullable` translations', () => {
      it('should transform a primitive type into a mixed one if the schema is `nullable`', () => {
        expect(toJSONSchema({ type: 'string', nullable: true })).toStrictEqual({
          type: ['string', 'null'],
        });
      });

      it('should transform a primitive type in a nested object into a mixed null', () => {
        expect(
          toJSONSchema({
            type: 'object',
            properties: {
              buster: {
                type: 'string',
                nullable: true,
              },
            },
          }),
        ).toStrictEqual({
          type: 'object',
          properties: { buster: { type: ['string', 'null'] } },
        });
      });

      it('should correctly handle `nullable: false`', () => {
        expect(
          toJSONSchema({
            type: 'object',
            properties: {
              buster: {
                type: 'string',
                nullable: false,
              },
            },
          }),
        ).toStrictEqual({
          type: 'object',
          properties: { buster: { type: 'string' } },
        });
      });

      it('should not duplicate `null` into a schema type', () => {
        expect(toJSONSchema({ type: ['string', 'null'], nullable: true })).toStrictEqual({
          type: ['string', 'null'],
        });
      });

      it('should support complex mixed types', () => {
        expect(
          toJSONSchema({
            type: ['string', 'object'],
            nullable: true,
            properties: {
              buster: {
                type: 'string',
              },
            },
          }),
        ).toStrictEqual({
          oneOf: [
            { type: ['string', 'null'] },
            {
              type: ['object', 'null'],
              properties: { buster: { type: 'string' } },
            },
          ],
        });
      });
    });
  });
});

describe('`x-readme-ref-name`', () => {
  it('should preserve our `x-readme-ref-name` extension', () => {
    expect(
      toJSONSchema({
        type: 'object',
        properties: {
          id: { type: 'string', 'x-readme-ref-name': 'three' },
          'x-readme-ref-name': 'two',
        },
        'x-readme-ref-name': 'one',
      } as any),
    ).toStrictEqual({
      type: 'object',
      properties: {
        id: { type: 'string', 'x-readme-ref-name': 'three' },
        'x-readme-ref-name': 'two',
      },
      'x-readme-ref-name': 'one',
    });
  });
});

describe('$ref pointers', () => {
  it('should ignore $ref pointers', () => {
    expect(toJSONSchema({ $ref: '#/components/schemas/pet' })).toStrictEqual({ $ref: '#/components/schemas/pet' });
  });

  it('should preserve multiple sibling properties alongside a $ref pointer', () => {
    expect(
      toJSONSchema({
        $ref: '#/components/schemas/pet',
        description: 'A deprecated circular ref',
        deprecated: true,
        title: 'Best Friend',
        nullable: true,
      }),
    ).toStrictEqual({
      $ref: '#/components/schemas/pet',
      description: 'A deprecated circular ref',
      deprecated: true,
      title: 'Best Friend',
      nullable: true,
    });
  });

  it('should preserve sibling properties on nested $ref pointers in properties', () => {
    expect(
      toJSONSchema({
        type: 'object',
        properties: {
          bestFriend: {
            $ref: '#/components/schemas/pet',
            description: 'Optional reference to another pet',
          },
        },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: {
        bestFriend: {
          $ref: '#/components/schemas/pet',
          description: 'Optional reference to another pet',
        },
      },
    });
  });

  it('should preserve sibling properties on $ref pointers inside array items', () => {
    expect(
      toJSONSchema({
        type: 'object',
        properties: {
          friends: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/pet',
              description: 'A friend pet',
            },
          },
        },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: {
        friends: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/pet',
            description: 'A friend pet',
          },
        },
      },
    });
  });

  it('should preserve sibling properties on $ref pointers inside oneOf', () => {
    expect(
      toJSONSchema({
        type: 'object',
        properties: {
          value: {
            oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Expression', description: 'Nested expression' }],
          },
        },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { $ref: '#/components/schemas/Expression', description: 'Nested expression' }],
        },
      },
    });
  });

  it('should ignore $ref pointers that are deeply nested', () => {
    expect(
      toJSONSchema({
        type: 'object',
        properties: {
          id: {
            oneOf: [{ type: 'number' }, { $ref: '#/components/schemas/id' }],
          },
          breeds: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/breeds',
            },
          },
        },
      }),
    ).toStrictEqual({
      type: 'object',
      properties: {
        id: {
          oneOf: [{ type: 'number' }, { $ref: '#/components/schemas/id' }],
        },
        breeds: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/breeds',
          },
        },
      },
    });
  });
});

describe('general quirks', () => {
  it('should convert a `true` schema to an empty object', () => {
    expect(toJSONSchema(true)).toStrictEqual({});
  });

  it('should handle object property members that are named "properties"', () => {
    const schema: SchemaObject = {
      type: 'object',
      properties: {
        name: {
          type: 'string',
        },
        properties: {
          type: 'object',
          properties: {
            tktk: {
              type: 'integer',
            },
          },
        },
      },
    };

    // What we're testing here is that we don't add a `type: object` adjacent to the
    // `properties`-named object property.
    expect(Object.keys(toJSONSchema(schema).properties as SchemaObject)).toStrictEqual(['name', 'properties']);
  });

  describe('`type` funk', () => {
    it('should set a type to `object` if `type` is missing but `properties` is present', () => {
      const schema: SchemaObject = {
        properties: {
          name: {
            type: 'string',
          },
        },
      };

      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
        },
      });
    });

    it('should repair a malformed array that is missing `items` [README-8E]', () => {
      expect(toJSONSchema({ type: 'array' })).toStrictEqual({ type: 'array', items: {} });

      // Should work for a nested array as well.
      const schema: SchemaObject = toJSONSchema({
        type: 'array',
        items: {
          type: 'array',
        },
        description: '',
      });

      expect((schema as JSONSchema4 | JSONSchema7).items).toStrictEqual({
        type: 'array',
        items: {},
      });
    });

    it('should repair a malformed object that is typod as an array [README-6R]', () => {
      expect(
        toJSONSchema({ type: 'array', properties: { type: 'string' } } as {
          properties: { type: JSONSchema7Definition };
          type: JSONSchema7TypeName;
        }),
      ).toStrictEqual({
        type: 'object',
        properties: {
          type: 'string',
        },
      });

      // Should work for a nested object as well.
      const schema: SchemaObject = {
        type: 'array',
        items: {
          type: 'array',
          properties: {
            name: {
              type: 'string',
            },
          },
          required: ['name'],
        },
      };

      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'array',
        items: {
          type: 'object',
          properties: { name: { type: 'string' } },
          required: ['name'],
        },
      });
    });
  });

  describe('`type: object`', () => {
    it('should repair an object that has no `properties` or `additionalProperties`', () => {
      expect(toJSONSchema({ type: 'object' })).toStrictEqual({
        type: 'object',
        additionalProperties: true,
      });

      // Should work on for a nested object as well.
      const schema: SchemaObject = {
        type: 'object',
        properties: {
          host: {
            type: 'object',
          },
        },
      };

      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'object',
        properties: {
          host: {
            type: 'object',
            additionalProperties: true,
          },
        },
      });
    });
  });
});

describe('polymorphism / inheritance', () => {
  it.each([['allOf'], ['anyOf'], ['oneOf']])('should support nested `%s`', polyType => {
    const schema: SchemaObject = {
      properties: {
        nestedParam: {
          type: 'object',
          properties: {
            nestedParamProp: {
              [polyType]: [
                {
                  type: 'object',
                  properties: {
                    nestedNum: {
                      type: 'integer',
                    },
                  },
                },
                {
                  type: 'object',
                  properties: {
                    nestedString: {
                      type: 'string',
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };

    let expected: SchemaObject;
    if (polyType === 'allOf') {
      expected = {
        type: 'object',
        properties: {
          nestedNum: { type: 'integer' },
          nestedString: { type: 'string' },
        },
      };
    } else {
      expected = {
        [polyType]: [
          {
            type: 'object',
            properties: { nestedNum: { type: 'integer' } },
          },
          {
            type: 'object',
            properties: { nestedString: { type: 'string' } },
          },
        ],
      };
    }

    expect((toJSONSchema(schema).properties?.nestedParam as SchemaObject).properties?.nestedParamProp).toStrictEqual(
      expected,
    );
  });

  it.each([['allOf'], ['anyOf'], ['oneOf']])('should not add a missing `type` on an `%s` schema', polyType => {
    const schema: SchemaObject = {
      [polyType]: [
        {
          title: 'range_query_specs',
          type: 'object',
          properties: {
            gt: {
              type: 'integer',
            },
          },
        },
        {
          type: 'integer',
        },
      ],
    };

    expect(toJSONSchema(schema).type).toBeUndefined();
  });

  describe('quirks', () => {
    it("should eliminate an `allOf` from a schema if it can't be merged", () => {
      const schema: SchemaObject = {
        title: 'allOf with incompatible schemas',
        allOf: [
          {
            type: 'string',
          },
          {
            type: 'integer',
          },
        ],
      };

      expect(toJSONSchema(schema)).toStrictEqual({
        title: 'allOf with incompatible schemas',
      });
    });

    it('should hoist `properties` into a same-level `oneOf` and transform each option into an `allOf`', () => {
      const schema: SchemaObject = {
        type: 'object',
        oneOf: [
          { title: 'Primitive is required', required: ['primitive'] },
          { title: 'Boolean is required', required: ['boolean'] },
        ],
        properties: {
          primitive: {
            type: 'string',
          },
          boolean: {
            type: 'boolean',
          },
        },
      };

      const propertiesSchema = {
        type: 'object',
        properties: {
          primitive: { type: 'string' },
          boolean: { type: 'boolean' },
        },
      };

      // Though this test is testing merging these properites into an `allOf`, we always merge
      // `allOf`'s when we can so this expected result won't contain one.
      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'object',
        oneOf: [
          {
            title: 'Primitive is required',
            required: ['primitive'],
            ...propertiesSchema,
          },
          {
            title: 'Boolean is required',
            required: ['boolean'],
            ...propertiesSchema,
          },
        ],
      });
    });

    it('should hoist `items` into a same-level `oneOf` and transform each option into an `allOf`', () => {
      const schema: SchemaObject = {
        type: 'array',
        oneOf: [
          { title: 'Example', example: 'Pug' },
          { title: 'Alt Example', example: 'Buster' },
        ],
        items: {
          type: 'string',
        },
      };

      const itemsSchema = {
        type: 'array',
        items: { type: 'string' },
      };

      // Though this test is testing merging these properites into an `allOf`, we always merge
      // `allOf`'s when we can so this expected result won't contain one.
      expect(toJSONSchema(schema)).toStrictEqual({
        type: 'array',
        oneOf: [
          {
            title: 'Example',
            examples: ['Pug'],
            ...itemsSchema,
          },
          {
            title: 'Alt Example',
            examples: ['Buster'],
            ...itemsSchema,
          },
        ],
      });
    });

    it('should perform default resolution for unrecognized properties', () => {
      const schema: SchemaObject = toJSONSchema({
        additionalProperties: false,
        allOf: [
          {
            description: 'Represents a namespace (one).',
            properties: {
              namespace: {
                description: 'A name for a namespace.',
                type: 'string',
              },
              retentionInSeconds: {
                description: 'Retention period of underlying data, represented in seconds.',
                type: 'integer',
              },
            },
            required: ['namespace', 'retentionInSeconds'],
            type: 'object',
            'x-whatever': {
              something: 'one',
            },
          },
          {
            properties: {
              dataAccessPolicy: {
                additionalProperties: false,
                description: '__Beta__ Overrides the default data access policy.',
                properties: {
                  restrictDataAccess: {
                    description: 'Set a data access policy to override the default setting.',
                    type: 'boolean',
                  },
                },
                required: ['restrictDataAccess', 'policyType'],
                type: 'object',
                'x-whatever': {
                  somethingelse: 'two',
                },
              },
              groupId: {
                description: 'The access group the namespace is assigned to.',
                minimum: 0,
                type: 'integer',
              },
            },
            required: ['groupId'],
          },
        ],
        description: 'Represents a namespace (two).',
        type: 'object',
        'x-whatever': {
          yetanotherthing: 'three',
        },
      } as SchemaObject);

      expect(schema.properties).toBeDefined();
      expect(schema).toMatchSnapshot();
    });

    describe('adding missing `type` properties', () => {
      it("should not add a `type` to a shapeless-description that's part of an `allOf`", () => {
        const schema: SchemaObject = {
          type: 'object',
          properties: {
            petIds: {
              allOf: [{ type: 'array', items: { type: 'string' } }, { description: 'Parameter description' }],
            },
          },
        };

        expect(toJSONSchema(schema).properties?.petIds).toStrictEqual({
          type: 'array',
          description: 'Parameter description',
          items: { type: 'string' },
        });
      });

      it.each([['anyOf'], ['oneOf']])(
        "should not add a `type` to a shapeless-description that's part of an `%s`",
        polyType => {
          const schema: SchemaObject = {
            type: 'object',
            properties: {
              petIds: {
                [polyType]: [{ type: 'array', items: { type: 'string' } }, { description: 'Parameter description' }],
              },
            },
          };

          expect(toJSONSchema(schema).properties?.petIds[polyType][1]).toStrictEqual({
            description: 'Parameter description',
          });
        },
      );
    });
  });
});

describe('`enum` support', () => {
  it('should support enums', () => {
    expect(toJSONSchema({ type: 'string', enum: ['cat', 'dog'] })).toStrictEqual({
      type: 'string',
      enum: ['cat', 'dog'],
    });

    // Should support nested objects as well.
    const schema: SchemaObject = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          petType: {
            type: 'string',
            enum: ['cat', 'dog'],
          },
        },
        required: ['petType'],
      },
    };

    expect(toJSONSchema(schema)).toStrictEqual(schema);
  });

  it('should fitler out duplicate items from an enum', () => {
    expect(toJSONSchema({ type: 'string', enum: ['cat', 'cat', 'dog', 'dog', 'snake'] })).toStrictEqual({
      type: 'string',
      enum: ['cat', 'dog', 'snake'],
    });
  });
});

describe('`format` support', () => {
  it('should support format', () => {
    expect(toJSONSchema({ type: 'integer', format: 'int8' })).toStrictEqual({
      type: 'integer',
      format: 'int8',
    });

    // Should support nested objects as well.
    const schema: SchemaObject = {
      type: 'array',
      items: {
        type: 'integer',
        format: 'int8',
      },
    };

    expect(toJSONSchema(schema)).toStrictEqual({
      type: 'array',
      items: {
        type: 'integer',
        format: 'int8',
      },
    });
  });

  describe('does not generate constraints for non-numeric types', () => {
    it('should not add `minimum` and `maximum` to string', () => {
      expect(toJSONSchema({ type: 'string', format: 'uint64' })).toStrictEqual({
        type: 'string',
        format: 'uint64',
      });
    });
  });
});

describe('`title` support', () => {
  it('should support title', () => {
    const schema: SchemaObject = {
      oneOf: [
        {
          title: 'Dog',
          allOf: [
            {
              type: 'object',
              properties: {
                breed: {
                  type: 'string',
                  enum: ['Dingo', 'Husky', 'Retriever', 'Shepherd'],
                },
              },
            },
          ],
        },
      ],
    };

    expect(toJSONSchema(schema)).toStrictEqual(schema);
  });
});

describe('`description` support', () => {
  it('should support description', () => {
    const schema: SchemaObject = generateJSONSchemaFixture({ description: 'example description' });

    expect(toJSONSchema(schema)).toMatchSnapshot();
  });

  it('should support description in an `allOf` and should prioritize the one from the last schema', () => {
    const schema: SchemaObject = {
      allOf: [
        {
          type: 'object',
          properties: {
            uri: {
              type: 'string',
              description: 'first uri description',
            },
            robots: {
              type: 'string',
              description: 'first robots description',
            },
            meta: {
              type: 'string',
              description: 'only meta description',
            },
          },
        },
        {
          type: 'object',
          properties: {
            uri: {
              description: 'second uri description',
              readOnly: true,
            },
            robots: {
              description: 'second robots description',
              readOnly: true,
              deprecated: true,
            },
          },
        },
      ],
    };

    expect(toJSONSchema(schema)).toMatchSnapshot();
  });

  it('should add defaults for enums if default is present', () => {
    const oas = createOasForOperation({
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              description: 'Provides details about the CP codes available for your contract.\n',
              properties: {
                required_enum_default: {
                  type: 'string',
                  enum: ['CP', 'NON_CP'],
                  default: 'NON_CP',
                  description: 'Enumed property with a default: `NON_CP`\n',
                },
                optional_enum_default: {
                  type: 'string',
                  enum: ['CP', 'NON_CP'],
                  default: 'CP',
                  description: 'Enumed property with a default: `NON_CP`\n',
                },
                enum_no_default: {
                  type: 'string',
                  enum: ['CP', 'NON_CP'],
                  description: 'Enumed property without a default.\n',
                },
              },
              required: ['required_enum_default'],
            },
          },
        },
      },
    });

    expect(oas.operation('/', 'get').getParametersAsJSONSchema()?.[0].schema).toStrictEqual({
      $schema: 'http://json-schema.org/draft-04/schema#',
      type: 'object',
      description: 'Provides details about the CP codes available for your contract.\n',
      properties: {
        required_enum_default: {
          type: 'string',
          enum: ['CP', 'NON_CP'],
          default: 'NON_CP',
          description: 'Enumed property with a default: `NON_CP`\n',
        },
        optional_enum_default: {
          type: 'string',
          enum: ['CP', 'NON_CP'],
          default: 'CP',
          description: 'Enumed property with a default: `NON_CP`\n',
        },
        enum_no_default: {
          type: 'string',
          enum: ['CP', 'NON_CP'],
          description: 'Enumed property without a default.\n',
        },
      },
      required: ['required_enum_default'],
    });
  });
});

describe('`additionalProperties` support', () => {
  it.each([
    ['true', true],
    ['false', false],
    ['an empty object', true],
    ['an object containing a string', { type: 'string' } as { type: JSONSchema7TypeName }],
  ])('should support additionalProperties when set to `%s`', (tc, additionalProperties) => {
    const schema: SchemaObject = {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties,
      },
    };

    expect(toJSONSchema(schema)).toStrictEqual({
      type: 'array',
      items: {
        type: 'object',
        additionalProperties,
      },
    });
  });

  it('should support additionalProperties when set to an object that contains an array', () => {
    const schema: SchemaObject = {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                format: 'int8',
              },
            },
          },
        },
      },
    };

    expect((toJSONSchema(schema) as JSONSchema4 | JSONSchema7).items).toStrictEqual({
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              format: 'int8',
            },
          },
        },
      },
    });
  });
});

describe('`allowEmptyValue` support', () => {
  it('should support allowEmptyValue', () => {
    const schema: SchemaObject = generateJSONSchemaFixture({ default: '', allowEmptyValue: true });

    expect(toJSONSchema(schema)).toMatchSnapshot();
  });
});

describe('`minLength` / `maxLength` support', () => {
  it('should support maxLength and minLength', () => {
    const schema: SchemaObject = {
      type: 'integer',
      minLength: 5,
      maxLength: 20,
    };

    expect(toJSONSchema(schema)).toStrictEqual({
      type: 'integer',
      minLength: 5,
      maxLength: 20,
    });
  });
});

describe('`deprecated` support', () => {
  it('should support deprecated', () => {
    const schema: SchemaObject = {
      type: 'integer',
      deprecated: true,
    };

    expect(toJSONSchema(schema)).toStrictEqual({
      type: 'integer',
      deprecated: true,
    });
  });
});

describe('`example` / `examples` support', () => {
  describe.each([['example'], ['examples']])('defined within `%s`', exampleProp => {
    function createExample(value) {
      if (exampleProp === 'example') {
        return value;
      }

      return {
        // Since this doesn't have a `value` that we can use we should ignore it.
        distinctExternal: {
          externalValue: 'https://example.com/example.example',
        },
        distinctExample: {
          value,
        },
      };
    }

    it('should pick up an example alongside a property', () => {
      const schema: SchemaObject = toJSONSchema({
        type: 'string',
        [exampleProp]: createExample('dog'),
      });

      expect(schema.examples).toStrictEqual(['dog']);
    });

    it('should allow falsy booleans', () => {
      const schema: SchemaObject = toJSONSchema({
        type: 'boolean',
        [exampleProp]: createExample(false),
      });

      expect(schema.examples).toStrictEqual([false]);
    });

    describe('should ignore non-primitives', () => {
      it.each([
        ['array', [['dog']]],
        ['object', { type: 'dog' }],
      ])('%s', (testCase, value) => {
        const schema: SchemaObject = toJSONSchema({
          type: 'string',
          [exampleProp]: createExample(value),
        });

        expect(schema.examples).toBeUndefined();
      });
    });

    it('should prefer and inherit a parent example (if present)', () => {
      const obj = {
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            [exampleProp]: createExample(10),
          },
          name: {
            type: 'string',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
            },
            [exampleProp]: createExample(['hungry']),
          },
          tags: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
              },
              name: {
                type: 'object',
                properties: {
                  first: {
                    type: 'string',
                  },
                  last: {
                    type: 'string',
                  },
                },
              },
            },
            [exampleProp]: createExample({
              name: {
                last: 'dog',
              },
            }),
          },
        },
        [exampleProp]: createExample({
          id: 100,
          name: {
            first: 'buster',
          },
          categories: 'lazy',
          tags: {
            id: 50,
          },
        }),
      };

      expect(toJSONSchema(obj as SchemaObject)).toStrictEqual({
        type: 'object',
        properties: {
          id: {
            type: 'integer',
            examples: [10],
          },
          name: {
            type: 'string',
          },
          categories: {
            type: 'array',
            items: {
              type: 'string',
            },
            examples: ['hungry'],
          },
          tags: {
            type: 'object',
            properties: {
              id: {
                type: 'integer',

                // Quirk: This is getting picked up as `100` as `id` exists in the root example and
                // with the reverse search, is getting picked up over `tags.id`. This example
                // should actually be 50.
                examples: [100],
              },
              name: {
                type: 'object',
                properties: {
                  first: {
                    type: 'string',

                    // Quirk: This is getting picked up as `buster` as `name.first` exists in the
                    // root example and is geting picked up from the reverse example search. This
                    // property should not actually have an example present.
                    examples: ['buster'],
                  },
                  last: {
                    type: 'string',
                    examples: ['dog'],
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should function through the normal workflow of retrieving a json schema and feeding it an initial example', async () => {
      const operation = petstore.operation('/pet', 'post');
      await operation.dereference();

      const schema = operation.getParametersAsJSONSchema()?.[0].schema as SchemaObject;

      expect(schema.components).toBeUndefined();
      expect((schema.properties?.id as SchemaObject).examples).toStrictEqual([25]);

      // Not `buster` because `doggie` is set directly alongside `name` in the definition.
      expect((schema.properties?.name as SchemaObject).examples).toStrictEqual(['doggie']);
      expect(schema.properties?.photoUrls).toStrictEqual({
        type: 'array',
        items: {
          type: 'string',
          examples: ['https://example.com/photo.png'],
        },
      });
    });
  });

  it('should be able to pick up multiple primitive examples within an `example` prop', () => {
    const schema: SchemaObject = toJSONSchema({
      type: 'string',
      example: ['dog', 'cat', ['cow'], { horse: true }],
    });

    expect(schema.examples).toStrictEqual(['dog', 'cat']);
  });

  it('should be able to pick up multiple primitive examples within an `examples` prop', () => {
    const schema: SchemaObject = toJSONSchema({
      type: 'string',
      examples: {
        distinctName1: {
          value: 'dog',
        },
        distinctName2: {
          value: 'cat',
        },
      },
    } as unknown as SchemaObject);

    expect(schema.examples).toStrictEqual(['dog', 'cat']);
  });

  it('if multiple examples are present in `examples` it should always use the first in the list', async () => {
    const oas = Oas.init(structuredClone(requestbodyExampleQuirksSpec));
    const operation = oas.operation('/anything', 'post');
    await operation.dereference();

    const schema = operation.getParametersAsJSONSchema();

    expect(schema?.[0].schema.properties).toStrictEqual({
      paymentMethodId: {
        type: 'string',
        examples: ['brazil.5e98df1f-1701-499b-a739-4e5e70d51c9b'],
      },
      amount: { type: 'string', examples: [25000] },
      currency: { type: 'string', examples: ['brazil.BRL'] },
    });
  });

  describe('quirks', () => {
    it('should catch thrown jsonpointer errors', async () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0.0',
        },
        paths: {
          '/': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        taxInfo: {
                          type: 'object',
                          nullable: true,
                          properties: {
                            url: {
                              type: 'string',
                              nullable: true,
                            },
                          },
                        },
                        price: {
                          type: 'integer',
                          format: 'int8',
                        },
                      },
                      example: {
                        // When attempting to search for an example on `taxInfo.url` jsonpointer will
                        // throw an error because `taxInfo` here is null.
                        taxInfo: null,
                        price: 1,
                      },
                    },
                    example: {
                      taxInfo: null,
                      price: 1,
                    },
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
      });

      await oas.dereference();

      const schema = oas.operation('/', 'post').getParametersAsJSONSchema();

      expect(schema?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: {
          taxInfo: {
            type: ['object', 'null'],
            properties: {
              url: {
                type: ['string', 'null'],
              },
            },
          },
          price: {
            type: 'integer',
            format: 'int8',
            examples: [1],
          },
        },
      });
    });

    it('should not bug out if `examples` is an empty object', () => {
      const oas = new Oas({
        openapi: '3.0.0',
        info: {
          title: 'Test',
          version: '1.0.0',
        },
        paths: {
          '/': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        limit: {
                          type: 'integer',
                        },
                      },
                    },
                    examples: {},
                  },
                },
              },
              responses: {
                '200': {
                  description: 'Success',
                },
              },
            },
          },
        },
        components: {},
      });

      const schema = oas.operation('/', 'post').getParametersAsJSONSchema();

      expect(schema?.[0].schema).toStrictEqual({
        $schema: 'http://json-schema.org/draft-04/schema#',
        type: 'object',
        properties: { limit: { type: 'integer' } },
      });
    });
  });
});
