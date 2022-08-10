/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache-2.0
 * @see {@link https://github.com/swagger-api/swagger-ui/blob/master/test/unit/core/plugins/samples/fn.js}
 */
import type * as RMOAS from '../../src/rmoas.types';

import sampleFromSchema from '../../src/samples';

describe('sampleFromSchema', () => {
  it('should be memoized', async () => {
    const schema: RMOAS.SchemaObject = {
      type: 'string',
      format: 'date-time',
    };

    const firstRun = sampleFromSchema(schema);

    await new Promise(r => {
      setTimeout(r, 200);
    });

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

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition, { includeReadOnly: false })).toStrictEqual(expected);
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
          default: 'woof',
        },
      },
    };

    const expected = {
      id: 0,
      readOnlyDog: 'woof',
    };

    expect(sampleFromSchema(definition, { includeReadOnly: true })).toStrictEqual(expected);
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

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

    const expected = {
      id: 0,
      writeOnlyDog: 'string',
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual(expected);
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

    const expected = {
      value: {
        message: 'Hello, World!',
      },
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual(expected);
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

    const expected = {
      a: {
        value: {
          message: 'Hello, World!',
        },
      },
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual(expected);
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

    const expected = {
      $$ref: {
        value: {
          message: 'Hello, World!',
        },
      },
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual(expected);
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

      const expected = ['Unknown Type: png'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('should return an undefined value for type=file', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        // @ts-expect-error We're testing the failure case for `file` not being a valid type.
        items: {
          type: 'file',
        },
      };

      const expected = [undefined];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    describe('type=boolean', () => {
      it('returns a boolean for a boolean', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'boolean',
        };

        const expected = true;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a default value for a boolean with a default present', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'boolean',
          default: false,
        };

        const expected = false;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });
    });

    describe('type=number', () => {
      it('returns a number for a number with no format', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'number',
        };

        const expected = 0;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a number for a number with format=float', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'number',
          format: 'float',
        };

        const expected = 0.0;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a default value for a number with a default present', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'number',
          default: 123,
        };

        const expected = 123;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });
    });

    describe('type=string', () => {
      it('returns a date-time for a string with format=date-time', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'date-time',
        };

        // 2022-01-24T21:26:50.058Z
        expect(sampleFromSchema(definition)).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/);
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

        const expected = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a hostname for a string with format=hostname', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'hostname',
        };

        const expected = 'example.com';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an IPv4 address for a string with format=ipv4', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'ipv4',
        };

        const expected = '198.51.100.42';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an IPv6 address for a string with format=ipv6', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'ipv6',
        };

        const expected = '2001:0db8:5b96:0000:0000:426f:8e17:642a';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an email for a string with format=email', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          format: 'email',
        };

        const expected = 'user@example.com';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a default value for a string with a default present', () => {
        const definition: RMOAS.SchemaObject = {
          type: 'string',
          default: 'test',
        };

        const expected = 'test';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        foo: 'string',
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('should handle if an array is present but is missing type=array', () => {
      const definition: RMOAS.SchemaObject = {
        items: {
          type: 'string',
        },
      };

      const expected = ['string'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    // Techncally this is a malformed schema, but we should do our best to support it.
    it('should handle if an array if present but is missing `items`', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
      };

      const expected = [];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        foo: undefined,
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = [0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns string for example for array that has example of type string', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        example: 'dog',
      };

      const expected = 'dog';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns array of examples for array that has examples', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'array',
        items: {
          type: 'string',
        },
        example: ['dog', 'cat'],
      };

      const expected = ['dog', 'cat'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = [0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = ['string', 0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = ['dog', 1];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = [0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = ['string', 0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = ['dog', 1];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        foo: null,
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        foo: null,
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        additionalProp: 'string',
        dog: 'string',
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        additionalProp: {},
        dog: 'string',
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        alien: 'string',
        dog: 0,
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns object with additional props with no type passed', () => {
      const definition: RMOAS.SchemaObject = {
        additionalProperties: {
          type: 'string',
        },
      };

      const expected = {
        additionalProp: 'string',
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });
  });

  describe('enums', () => {
    it('returns default value when enum provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        default: 'one',
        enum: ['two', 'one'],
      };

      const expected = 'one';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns example value when provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        default: 'one',
        example: 'two',
        enum: ['two', 'one'],
      };

      const expected = 'two';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('sets first enum if provided', () => {
      const definition: RMOAS.SchemaObject = {
        type: 'string',
        enum: ['one', 'two'],
      };

      const expected = 'one';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = ['one'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        name: 'string',
        tag: 'string',
        id: 0,
      };

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
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

      const expected = {
        param1: {
          name: 'Owlbert',
        },
        param2: {
          description: 'Mascot of ReadMe',
        },
      };

      expect(sampleFromSchema(polymorphismSchema)).toStrictEqual(expected);
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

      const expected = {
        param1: {
          name: 'Owlbert',
        },
        param2: {
          position: 'Chief Whimsical Officer',
        },
      };

      expect(sampleFromSchema(polymorphismSchema)).toStrictEqual(expected);
    });
  });
});
