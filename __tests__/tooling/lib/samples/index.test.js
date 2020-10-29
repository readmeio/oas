/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache 2.0
 * @link https://github.com/swagger-api/swagger-ui/blob/master/test/unit/core/plugins/samples/fn.js
 */
const { sampleFromSchema } = require('../../../../tooling/lib/samples');

describe('sampleFromSchema', () => {
  it('returns object with no readonly fields for parameter', function () {
    const definition = {
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
      xml: {
        name: 'animals',
      },
    };

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition, { includeReadOnly: false })).toStrictEqual(expected);
  });

  it('returns object with readonly fields for parameter, with includeReadOnly', function () {
    const definition = {
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
      xml: {
        name: 'animals',
      },
    };

    const expected = {
      id: 0,
      readOnlyDog: 'string',
    };

    expect(sampleFromSchema(definition, { includeReadOnly: true })).toStrictEqual(expected);
  });

  it('returns object without deprecated fields for parameter', function () {
    const definition = {
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
      xml: {
        name: 'animals',
      },
    };

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition)).toStrictEqual(expected);
  });

  it('returns object without writeonly fields for parameter', function () {
    const definition = {
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
      xml: {
        name: 'animals',
      },
    };

    const expected = {
      id: 0,
    };

    expect(sampleFromSchema(definition)).toStrictEqual(expected);
  });

  it('returns object with writeonly fields for parameter, with includeWriteOnly', function () {
    const definition = {
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
      xml: {
        name: 'animals',
      },
    };

    const expected = {
      id: 0,
      writeOnlyDog: 'string',
    };

    expect(sampleFromSchema(definition, { includeWriteOnly: true })).toStrictEqual(expected);
  });

  it('returns object without any $$ref fields at the root schema level', function () {
    const definition = {
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

  it('returns object without any $$ref fields at nested schema levels', function () {
    const definition = {
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

  it('returns object with any $$ref fields that appear to be user-created', function () {
    const definition = {
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
      const definition = {
        type: 'array',
        items: {
          type: 'png',
        },
      };

      const expected = ['Unknown Type: png'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('should return an undefined value for type=file', () => {
      const definition = {
        type: 'array',
        items: {
          type: 'file',
        },
      };

      const expected = [undefined];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    describe('type=boolean', () => {
      it('returns a boolean for a boolean', () => {
        const definition = {
          type: 'boolean',
        };

        const expected = true;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a default value for a boolean with a default present', () => {
        const definition = {
          type: 'boolean',
          default: false,
        };

        const expected = false;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });
    });

    describe('type=number', () => {
      it('returns a number for a number with no format', () => {
        const definition = {
          type: 'number',
        };

        const expected = 0;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a number for a number with format=float', () => {
        const definition = {
          type: 'number',
          format: 'float',
        };

        const expected = 0.0;

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });
    });

    describe('type=string', () => {
      it('returns a date-time for a string with format=date-time', () => {
        const definition = {
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
        const definition = {
          type: 'string',
          format: 'date',
        };

        const expected = new Date().toISOString().substring(0, 10);

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a UUID for a string with format=uuid', () => {
        const definition = {
          type: 'string',
          format: 'uuid',
        };

        const expected = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns a hostname for a string with format=hostname', () => {
        const definition = {
          type: 'string',
          format: 'hostname',
        };

        const expected = 'example.com';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an IPv4 address for a string with format=ipv4', () => {
        const definition = {
          type: 'string',
          format: 'ipv4',
        };

        const expected = '198.51.100.42';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an IPv6 address for a string with format=ipv6', () => {
        const definition = {
          type: 'string',
          format: 'ipv6',
        };

        const expected = '2001:0db8:5b96:0000:0000:426f:8e17:642a';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });

      it('returns an email for a string with format=email', () => {
        const definition = {
          type: 'string',
          format: 'email',
        };

        const expected = 'user@example.com';

        expect(sampleFromSchema(definition)).toStrictEqual(expected);
      });
    });
  });

  describe('type=undefined', () => {
    it('should handle if an object is present but is missing type=object', () => {
      const definition = {
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
      const definition = {
        items: {
          type: 'string',
        },
      };

      const expected = ['string'];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it("should handle a case where no type is present and the schema can't be determined to be an object or array", () => {
      const definition = {
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
      const definition = {
        type: 'array',
        items: {
          type: 'integer',
        },
      };

      const expected = [0];

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns string for example for array that has example of type string', () => {
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
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
      const definition = {
        type: 'string',
        default: 'one',
        enum: ['two', 'one'],
      };

      const expected = 'one';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns example value when provided', () => {
      const definition = {
        type: 'string',
        default: 'one',
        example: 'two',
        enum: ['two', 'one'],
      };

      const expected = 'two';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('sets first enum if provided', () => {
      const definition = {
        type: 'string',
        enum: ['one', 'two'],
      };

      const expected = 'one';

      expect(sampleFromSchema(definition)).toStrictEqual(expected);
    });

    it('returns array with default values', function () {
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
});

/* describe("createXMLExample", function () {
  let sut = createXMLExample
  describe("simple types with xml property", function () {
    it("returns tag <newtagname>string</newtagname> when passing type string and xml:{name: \"newtagname\"}", function () {
      let definition = {
        type: "string",
        xml: {
          name: "newtagname"
        }
      }

      expect(sut(definition)).toEqual("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<newtagname>string</newtagname>")
    })

    it("returns tag <test:newtagname>string</test:newtagname> when passing type string and xml:{name: \"newtagname\", prefix:\"test\"}", function () {
      let definition = {
        type: "string",
        xml: {
          name: "newtagname",
          prefix: "test"
        }
      }

      expect(sut(definition)).toEqual("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<test:newtagname>string</test:newtagname>")
    })

    it("returns tag <test:tagname xmlns:sample=\"http://swagger.io/schema/sample\">string</test:tagname> when passing type string and xml:{\"namespace\": \"http://swagger.io/schema/sample\", \"prefix\": \"sample\"}", function () {
      let definition = {
        type: "string",
        xml: {
          namespace: "http://swagger.io/schema/sample",
          prefix: "sample",
          name: "name"
        }
      }

      expect(sut(definition)).toEqual("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<sample:name xmlns:sample=\"http://swagger.io/schema/sample\">string</sample:name>")
    })

    it("returns tag <test:tagname >string</test:tagname> when passing type string and xml:{\"namespace\": \"http://swagger.io/schema/sample\"}", function () {
      let definition = {
        type: "string",
        xml: {
          namespace: "http://swagger.io/schema/sample",
          name: "name"
        }
      }

      expect(sut(definition)).toEqual("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<name xmlns=\"http://swagger.io/schema/sample\">string</name>")
    })

    it("returns tag <newtagname>test</newtagname> when passing default value", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<newtagname>test</newtagname>"
      let definition = {
        type: "string",
        "default": "test",
        xml: {
          name: "newtagname"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns default value when enum provided", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<newtagname>one</newtagname>"
      let definition = {
        type: "string",
        "default": "one",
        "enum": ["two", "one"],
        xml: {
          name: "newtagname"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns example value when provided", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<newtagname>two</newtagname>"
      let definition = {
        type: "string",
        "default": "one",
        "example": "two",
        "enum": ["two", "one"],
        xml: {
          name: "newtagname"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("sets first enum if provided", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<newtagname>one</newtagname>"
      let definition = {
        type: "string",
        "enum": ["one", "two"],
        xml: {
          name: "newtagname"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })
  })

  describe("array", function () {
    it("returns tag <tagname>string</tagname> when passing string items", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<tagname>string</tagname>"
      let definition = {
        type: "array",
        items: {
          type: "string"
        },
        xml: {
          name: "tagname"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns tag <animal>string</animal> when passing string items with name", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animal>string</animal>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns tag <animals><animal>string</animal></animals> when passing string items with name", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>string</animal>\n</animals>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        xml: {
          wrapped: true,
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("return correct nested wrapped array", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<aliens>\n\t<dog>string</dog>\n</aliens>"
      let definition = {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "string"
          },
          xml: {
            name: "dog"
          }
        },
        xml: {
          wrapped: true,
          name: "aliens"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("return correct nested wrapped array with xml", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<aliens>\n\t<dogs>\n\t\t<dog>string</dog>\n\t</dogs>\n</aliens>"
      let definition = {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "string",
            xml: {
              name: "dog"
            }
          },
          xml: {
            name: "dogs",
            wrapped: true
          }
        },
        xml: {
          wrapped: true,
          name: "aliens"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds namespace to array", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<dog xmlns=\"test\">string</dog>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "dog",
            namespace: "test"
          }
        },
        xml: {
          name: "aliens",
          namespace: "test_new"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds prefix to array", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<test:dog>string</test:dog>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "dog",
            prefix: "test"
          }
        },
        xml: {
          name: "aliens",
          prefix: "test_new"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds prefix to array with no xml in items", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<test:dog>string</test:dog>"
      let definition = {
        type: "array",
        items: {
          type: "string"
        },
        xml: {
          name: "dog",
          prefix: "test"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds namespace to array with no xml in items", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<dog xmlns=\"test\">string</dog>"
      let definition = {
        type: "array",
        items: {
          type: "string"
        },
        xml: {
          name: "dog",
          namespace: "test"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds namespace to array with wrapped", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<aliens xmlns=\"test\">\n\t<dog>string</dog>\n</aliens>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "dog"
          }
        },
        xml: {
          wrapped: true,
          name: "aliens",
          namespace: "test"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("adds prefix to array with wrapped", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<test:aliens>\n\t<dog>string</dog>\n</test:aliens>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "dog"
          }
        },
        xml: {
          wrapped: true,
          name: "aliens",
          prefix: "test"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns wrapped array when type is not passed", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>string</animal>\n</animals>"
      let definition = {
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        xml: {
          wrapped: true,
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with default values", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animal>one</animal>\n<animal>two</animal>"
      let definition = {
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        "default": ["one", "two"],
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with default values with wrapped=true", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>one</animal>\n\t<animal>two</animal>\n</animals>"
      let definition = {
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        "default": ["one", "two"],
        xml: {
          wrapped: true,
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with default values", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animal>one</animal>"
      let definition = {
        items: {
          type: "string",
          "enum": ["one", "two"],
          xml: {
            name: "animal"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with default values with wrapped=true", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>1</animal>\n\t<animal>2</animal>\n</animals>"
      let definition = {
        items: {
          "enum": ["one", "two"],
          type: "string",
          xml: {
            name: "animal"
          }
        },
        "default": ["1", "2"],
        xml: {
          wrapped: true,
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with example values  with ", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>1</animal>\n\t<animal>2</animal>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          "animal": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "example": [
              "1",
              "2"
            ]
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array with example values  with wrapped=true", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<animal>1</animal>\n\t<animal>2</animal>\n</animals>"
      let definition = {
        type: "array",
        items: {
          type: "string",
          xml: {
            name: "animal"
          }
        },
        "example": [ "1", "2" ],
        xml: {
          wrapped: true,
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns array of objects with example values  with wrapped=true", function () {
      let expected = `<?xml version="1.0" encoding="UTF-8"?>\n<users>\n\t<user>\n\t\t<id>1</id>\n\t\t<name>Arthur Dent</name>\n\t</user>\n\t<user>\n\t\t<id>2</id>\n\t\t<name>Ford Prefect</name>\n\t</user>\n</users>`
      let definition = {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "id": {
              "type": "integer"
            },
            "name": {
              "type": "string"
            }
          },
          "xml": {
            "name": "user"
          }
        },
        "xml": {
          "name": "users",
          "wrapped": true
        },
        "example": [
          {
            "id": 1,
            "name": "Arthur Dent"
          },
          {
            "id": 2,
            "name": "Ford Prefect"
          }
        ]
      }

      expect(sut(definition)).toEqual(expected)
    })

})

  describe("object", function () {
    it("returns object with 2 properties", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<aliens>\n\t<alien>string</alien>\n\t<dog>0</dog>\n</aliens>"
      let definition = {
        type: "object",
        properties: {
          alien: {
            type: "string"
          },
          dog: {
            type: "integer"
          }
        },
        xml: {
          name: "aliens"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with integer property and array property", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<aliens>string</aliens>\n\t<dog>0</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          aliens: {
            type: "array",
            items: {
              type: "string"
            }
          },
          dog: {
            type: "integer"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns nested objects", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<aliens>\n\t\t<alien>string</alien>\n\t</aliens>\n\t<dog>string</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          aliens: {
            type: "object",
            properties: {
              alien: {
                type: "string",
                xml: {
                  name: "alien"
                }
              }
            }
          },
          dog: {
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with no readonly fields for parameter", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<id>0</id>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer"
          },
          dog: {
            readOnly: true,
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition, { includeReadOnly: false })).toEqual(expected)
    })

    it("returns object with readonly fields for parameter, with includeReadOnly", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<id>0</id>\n\t<dog>string</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer"
          },
          dog: {
            readOnly: true,
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition, { includeReadOnly: true })).toEqual(expected)
    })

    it("returns object without writeonly fields for parameter", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<id>0</id>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer"
          },
          dog: {
            writeOnly: true,
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with writeonly fields for parameter, with includeWriteOnly", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<id>0</id>\n\t<dog>string</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer"
          },
          dog: {
            writeOnly: true,
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition, { includeWriteOnly: true })).toEqual(expected)
    })

    it("returns object with passed property as attribute", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals id=\"0\">\n\t<dog>string</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer",
            xml: {
              attribute: true
            }
          },
          dog: {
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with passed property as attribute with custom name", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals test=\"0\">\n\t<dog>string</dog>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer",
            xml: {
              attribute: true,
              name: "test"
            }
          },
          dog: {
            type: "string"
          }
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with example values in attribute", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<user id=\"42\">\n\t<role>admin</role>\n</user>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer",
            xml: {
              attribute: true
            }
          },
          role:{
            type: "string"
          }
        },
        xml: {
          name: "user"
        },
        example: {
          id: 42,
          role: "admin"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with enum values in attribute", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<user id=\"one\">\n\t<role>string</role>\n</user>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "string",
            "enum": ["one", "two"],
            xml: {
              attribute: true
            }
          },
          role:{
            type: "string"
          }
        },
        xml: {
          name: "user"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with default values in attribute", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<user id=\"one\">\n\t<role>string</role>\n</user>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "string",
            "default": "one",
            xml: {
              attribute: true
            }
          },
          role:{
            type: "string"
          }
        },
        xml: {
          name: "user"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with default values in attribute", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<user id=\"one\">\n\t<role>string</role>\n</user>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "string",
            "example": "one",
            xml: {
              attribute: true
            }
          },
          role:{
            type: "string"
          }
        },
        xml: {
          name: "user"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with example value", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<user>\n\t<id>42</id>\n\t<role>admin</role>\n</user>"
      let definition = {
        type: "object",
        properties: {
          id: {
            type: "integer"
          },
          role:{
            type: "string"
          }
        },
        xml: {
          name: "user"
        },
        example: {
          id: 42,
          role: "admin"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with additional props", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<dog>string</dog>\n\t<additionalProp>string</additionalProp>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          dog: {
            type: "string"
          }
        },
        additionalProperties: {
          type: "string"
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with additional props =true", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<dog>string</dog>\n\t<additionalProp>Anything can be here</additionalProp>\n</animals>"
      let definition = {
        type: "object",
        properties: {
          dog: {
            type: "string"
          }
        },
        additionalProperties: true,
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with 2 properties with no type passed but properties", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<aliens>\n\t<alien>string</alien>\n\t<dog>0</dog>\n</aliens>"
      let definition = {
        properties: {
          alien: {
            type: "string"
          },
          dog: {
            type: "integer"
          }
        },
        xml: {
          name: "aliens"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })

    it("returns object with additional props with no type passed", function () {
      let expected = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<animals>\n\t<additionalProp>string</additionalProp>\n</animals>"
      let definition = {
        additionalProperties: {
          type: "string"
        },
        xml: {
          name: "animals"
        }
      }

      expect(sut(definition)).toEqual(expected)
    })
  })
})
*/
