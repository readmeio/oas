/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/test/unit/core/plugins/samples/fn.js}
 */
import * as RMOAS from '../../src/rmoas.types';
import sampleFromSchema from '../../src/samples';

describe('sampleFromSchema', () => {
  it('should be memoized', async () => {
    const schema: RMOAS.SchemaObject = {
      type: 'string',
      format: 'date-time',
    };

    const firstRun = sampleFromSchema(schema);

    await new Promise(r => setTimeout(r, 200));

    expect(sampleFromSchema(schema)).toStrictEqual(firstRun);
  });

  it('returns object with no readonly fields for parameter', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
        },
        readOnlyDog: {
          readOnly: true,
          type: 'string',
        },
      },
    };

    expect(sampleFromSchema(definition, { includeReadOnly: false })).toStrictEqual({
      id: 0,
    });
  });

  it('returns object with readonly fields for parameter, with includeReadOnly', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
        },
        readOnlyDog: {
          readOnly: true,
          type: 'string',
        },
      },
    };

    expect(sampleFromSchema(definition, { includeReadOnly: true })).toStrictEqual({
      id: 0,
      readOnlyDog: 'string',
    });
  });

  it('returns object without deprecated fields for parameter', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
        },
        deprecatedProperty: {
          deprecated: true,
          type: 'string',
        },
      },
    };

    expect(sampleFromSchema(definition)).toStrictEqual({
      id: 0,
    });
  });

  it('returns object without writeonly fields for parameter', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
        },
        writeOnlyDog: {
          writeOnly: true,
          type: 'string',
        },
      },
    };

    expect(sampleFromSchema(definition)).toStrictEqual({
      id: 0,
    });
  });

  it('returns object with writeonly fields for parameter, with includeWriteOnly', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        id: {
          type: 'integer',
        },
        writeOnlyDog: {
          writeOnly: true,
          type: 'string',
        },
      },
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual({
      id: 0,
      writeOnlyDog: 'string',
    });
  });

  it('returns object without any $$ref fields at the root schema level', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
      },
      example: {
        value: {
          message: 'Hello, World!',
        },
        $$ref: '#/components/examples/WelcomeExample',
      },
      $$ref: '#/components/schemas/Welcome',
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual({
      value: {
        message: 'Hello, World!',
      },
    });
  });

  it('returns object without any $$ref fields at nested schema levels', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
      },
      example: {
        a: {
          value: {
            message: 'Hello, World!',
          },
          $$ref: '#/components/examples/WelcomeExample',
        },
      },
      $$ref: '#/components/schemas/Welcome',
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual({
      a: {
        value: {
          message: 'Hello, World!',
        },
      },
    });
  });

  it('returns object with any $$ref fields that appear to be user-created', () => {
    const definition: RMOAS.SchemaObject = {
      type: 'object',
      properties: {
        message: {
          type: 'string',
        },
      },
      example: {
        $$ref: {
          value: {
            message: 'Hello, World!',
          },
          $$ref: '#/components/examples/WelcomeExample',
        },
      },
      $$ref: '#/components/schemas/Welcome',
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual({
      $$ref: {
        value: {
          message: 'Hello, World!',
        },
      },
    });
  });

  describe('primitive type handling', () => {
    it('should handle when an unknown type is detected', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        // @ts-expect-error We're testing the failure case for `png` not being a valid type.
        items: {
          type: 'png',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['Unknown Type: png']);
    });

    it('should return an undefined value for type=file', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        // @ts-expect-error We're testing the failure case for `file` not being a valid type.
        items: {
          type: 'file',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual([undefined]);
    });

    describe('type=boolean', () => {
      it('returns a boolean for a boolean', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'boolean',
        };

        expect(sampleFromSchema(definition)).toBe(true);
      });

      it('returns a default value for a boolean with a default present', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'boolean',
          default: false,
        };

        expect(sampleFromSchema(definition)).toBe(false);
      });
    });

    describe('type=number', () => {
      it('returns a number for a number with no format', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'number',
        };

        expect(sampleFromSchema(definition)).toBe(0);
      });

      it('returns a number for a number with format=float', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'number',
          format: 'float',
        };

        expect(sampleFromSchema(definition)).toBe(0.0);
      });
    });

    describe('type=string', () => {
      it('returns a date-time for a string with format=date-time', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'date-time',
        };

        // 0-20 chops off milliseconds
        // necessary because test latency can cause failures
        // it would be better to mock Date globally and expect a string - KS 11/18
        const expected = new Date().toISOString().substring(0, 20);

        expect(sampleFromSchema(definition)).toContain(expected);
      });

      it('returns a date for a string with format=date', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'date',
        };

        const expected = new Date().toISOString().substring(0, 10);

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a UUID for a string with format=uuid', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'uuid',
        };

        expect(sampleFromSchema(definition)).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
      });

      it('returns a hostname for a string with format=hostname', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'hostname',
        };

        expect(sampleFromSchema(definition)).toBe('example.com');
      });

      it('returns an IPv4 address for a string with format=ipv4', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'ipv4',
        };

        expect(sampleFromSchema(definition)).toBe('198.51.100.42');
      });

      it('returns an IPv6 address for a string with format=ipv6', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'ipv6',
        };

        expect(sampleFromSchema(definition)).toBe('2001:0db8:5b96:0000:0000:426f:8e17:642a');
      });

      it('returns an email for a string with format=email', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'email',
        };

        expect(sampleFromSchema(definition)).toBe('user@example.com');
      });
    });
  });

  describe('type=undefined', () => {
    it('should handle if an object is present but is missing type=object', () => {
      const definition: RMOAS.SchemaObject = {
        properties: {
          foo: {
            type: 'string',
          },
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        foo: 'string',
      });
    });

    it('should handle if an array is present but is missing type=array', () => {
      const definition: RMOAS.SchemaObject = {
        items: {
          type: 'string',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['string']);
    });

    // Techncally this is a malformed schema, but we should do our best to support it.
    it('should handle if an array if present but is missing `items`', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
      };

      expect(sampleFromSchema(definition)).toStrictEqual([]);
    });

    it("should handle a case where no type is present and the schema can't be determined to be an object or array", () => {
      const definition: RMOAS.SchemaObject = {
        type: 'object',
        properties: {
          foo: {
            format: 'date',
          },
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        foo: undefined,
      });
    });
  });

  describe('type=array', () => {
    it('returns array with sample of array type', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'integer',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual([0]);
    });

    it('returns string for example for array that has example of type string', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        example: 'dog',
      };

      expect(sampleFromSchema(definition)).toBe('dog');
    });

    it('returns array of examples for array that has examples', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        example: ['dog', 'cat'],
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['dog', 'cat']);
    });

    it('returns array of samples for oneOf type', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          oneOf: [
            {
              type: 'integer',
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual([0]);
    });

    it('returns array of samples for oneOf types', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['string', 0]);
    });

    it('returns array of samples for oneOf examples', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          oneOf: [
            {
              type: 'string',
              example: 'dog',
            },
            {
              type: 'integer',
              example: 1,
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['dog', 1]);
    });

    it('returns array of samples for anyOf type', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          anyOf: [
            {
              type: 'integer',
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual([0]);
    });

    it('returns array of samples for anyOf types', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          anyOf: [
            {
              type: 'string',
            },
            {
              type: 'integer',
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['string', 0]);
    });

    it('returns array of samples for anyOf examples', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
          anyOf: [
            {
              type: 'string',
              example: 'dog',
            },
            {
              type: 'integer',
              example: 1,
            },
          ],
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['dog', 1]);
    });

    it('returns null for a null example', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        foo: null,
      });
    });

    it('returns null for a null object-level example', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            nullable: true,
          },
        },
        example: {
          foo: null,
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        foo: null,
      });
    });
  });

  describe('additionalProperties', () => {
    it('returns object with additional props', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'object',
        properties: {
          dog: {
            type: 'string',
          },
        },
        additionalProperties: {
          type: 'string',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        additionalProp: 'string',
        dog: 'string',
      });
    });

    it('returns object with additional props=true', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'object',
        properties: {
          dog: {
            type: 'string',
          },
        },
        additionalProperties: true,
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        additionalProp: {},
        dog: 'string',
      });
    });

    it('returns object with 2 properties with no type passed but properties', () => {
      const definition: RMOAS.SchemaObject = {
        properties: {
          alien: {
            type: 'string',
          },
          dog: {
            type: 'integer',
          },
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        alien: 'string',
        dog: 0,
      });
    });

    it('returns object with additional props with no type passed', () => {
      const definition: RMOAS.SchemaObject = {
        additionalProperties: {
          type: 'string',
        },
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        additionalProp: 'string',
      });
    });
  });

  describe('enums', () => {
    it('returns default value when enum provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        default: 'one',
        enum: ['two', 'one'],
      };

      expect(sampleFromSchema(definition)).toBe('one');
    });

    it('returns example value when provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        default: 'one',
        example: 'two',
        enum: ['two', 'one'],
      };

      expect(sampleFromSchema(definition)).toBe('two');
    });

    it('sets first enum if provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        enum: ['one', 'two'],
      };

      expect(sampleFromSchema(definition)).toBe('one');
    });

    // @todo this should really return `['1', '2']` as the expected data
    it('returns array with default values', () => {
      const definition = {
        items: {
          enum: ['one', 'two'],
          type: 'string',
        },
        default: ['1', '2'],
      };

      expect(sampleFromSchema(definition)).toStrictEqual(['one']);
    });
  });

  describe('polymorphism', () => {
    it('should handle an allOf schema', () => {
      const definition: RMOAS.SchemaObject = {
        allOf: [
          {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              tag: {
                type: 'string',
              },
            },
          },
          {
            type: 'object',
            properties: {
              id: {
                type: 'integer',
                format: 'int64',
              },
            },
          },
        ],
      };

      expect(sampleFromSchema(definition)).toStrictEqual({
        name: 'string',
        tag: 'string',
        id: 0,
      });
    });

    it('should grab properties from allOf polymorphism', () => {
      const polymorphismSchema: RMOAS.SchemaObject = {
        allOf: [
          {
            type: 'object',
            properties: {
              param1: {
                allOf: [
                  {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'Owlbert',
                      },
                    },
                  },
                ],
                type: 'object',
              },
              param2: {
                allOf: [
                  {
                    type: 'object',
                    properties: {
                      description: {
                        type: 'string',
                        example: 'Mascot of ReadMe',
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      };

      expect(sampleFromSchema(polymorphismSchema)).toStrictEqual({
        param1: {
          name: 'Owlbert',
        },
        param2: {
          description: 'Mascot of ReadMe',
        },
      });
    });

    it('should grab first property from anyOf/oneOf polymorphism', () => {
      const polymorphismSchema: RMOAS.SchemaObject = {
        allOf: [
          {
            type: 'object',
            properties: {
              param1: {
                allOf: [
                  {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        example: 'Owlbert',
                      },
                    },
                  },
                ],
                type: 'object',
              },
              param2: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      position: {
                        type: 'string',
                        example: 'Chief Whimsical Officer',
                      },
                    },
                  },
                  {
                    type: 'object',
                    properties: {
                      description: {
                        type: 'string',
                        example: 'Mascot of ReadMe',
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      };

      expect(sampleFromSchema(polymorphismSchema)).toStrictEqual({
        param1: {
          name: 'Owlbert',
        },
        param2: {
          position: 'Chief Whimsical Officer',
        },
      });
    });
  });
});
