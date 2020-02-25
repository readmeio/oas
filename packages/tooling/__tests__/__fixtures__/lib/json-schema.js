const util = require('util');

// eslint-disable-next-line no-unused-vars
function inspect(obj) {
  // eslint-disable-next-line no-console
  console.log(util.inspect(obj, false, null, true));
}

module.exports = {
  generateParameterDefaults: (complexity, opts = { default: undefined, allowEmptyValue: undefined }) => {
    const generateParamName = (testCase, allowEmptyValue) => {
      return `${testCase}:default[${opts.default}]allowEmptyValue[${allowEmptyValue}]`;
    };

    const props = {};
    if (typeof opts.default === 'undefined' || opts.default === undefined) {
      // Should not add a default.
    } else if (opts.default === '') {
      props.default = '';
    } else {
      props.default = opts.default ? opts.default : false;
    }

    const primitiveString = allowEmptyValue => {
      return {
        name: generateParamName('primitiveString', allowEmptyValue),
        in: 'query',
        schema: {
          type: 'string',
          ...props,
          ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
        },
      };
    };

    const arrayOfPrimitives = allowEmptyValue => {
      return {
        name: generateParamName('arrayOfPrimitives', allowEmptyValue),
        in: 'query',
        schema: {
          type: 'array',
          items: {
            type: 'string',
            ...props,
            ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
          },
        },
      };
    };

    const arrayWithAnArrayOfPrimitives = allowEmptyValue => {
      return {
        name: generateParamName('arrayWithAnArrayOfPrimitives', allowEmptyValue),
        in: 'query',
        schema: {
          type: 'array',
          items: {
            type: 'array',
            items: {
              type: 'string',
              ...props,
              ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
            },
          },
        },
      };
    };

    const objectWithPrimitivesAndMixedArrays = allowEmptyValue => {
      const tktk = {
        name: generateParamName('objectWithPrimitivesAndMixedArrays', allowEmptyValue),
        in: 'query',
        schema: {
          type: 'object',
          properties: {
            param1: {
              type: 'string',
              ...props,
              ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
            },
            param2: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  type: 'string',
                  ...props,
                  ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
                },
              },
            },
          },
        },
      };

      // inspect(tktk)

      return tktk;
    };

    // When `allowEmptyValue` is present, we should make sure we're testing both states. If `true`, we should allow
    // empty string `default` properties through. If `false`, they should ultimately be omitted from the final
    // compilation.
    const parameters = [];
    const oas = {};

    if (complexity === 'simple') {
      parameters.push(
        arrayOfPrimitives(),
        arrayWithAnArrayOfPrimitives(),
        objectWithPrimitivesAndMixedArrays(),
        primitiveString()
      );

      if (opts.allowEmptyValue !== undefined) {
        parameters.push(
          arrayOfPrimitives(true),
          arrayOfPrimitives(false),
          arrayWithAnArrayOfPrimitives(true),
          arrayWithAnArrayOfPrimitives(false),
          objectWithPrimitivesAndMixedArrays(true),
          objectWithPrimitivesAndMixedArrays(false),
          primitiveString(true),
          primitiveString(false)
        );
      }
    } else if (complexity === '$ref') {
      parameters.push(
        { $ref: '#/components/parameters/arrayOfPrimitives' },
        { $ref: '#/components/parameters/arrayWithAnArrayOfPrimitives' },
        { $ref: '#/components/parameters/objectWithPrimitivesAndMixedArrays' },
        { $ref: '#/components/parameters/primitiveString' }
      );

      oas.components = {
        parameters: {
          arrayOfPrimitives: arrayOfPrimitives(),
          arrayWithAnArrayOfPrimitives: arrayWithAnArrayOfPrimitives(),
          objectWithPrimitivesAndMixedArrays: objectWithPrimitivesAndMixedArrays(),
          primitiveString: primitiveString(),
        },
      };

      if (opts.allowEmptyValue !== undefined) {
        parameters.push(
          { $ref: '#/components/parameters/arrayOfPrimitives:allowEmptyValueTrue' },
          { $ref: '#/components/parameters/arrayOfPrimitives:allowEmptyValueFalse' },
          { $ref: '#/components/parameters/arrayWithAnArrayOfPrimitives:allowEmptyValueTrue' },
          { $ref: '#/components/parameters/arrayWithAnArrayOfPrimitives:allowEmptyValueFalse' },
          { $ref: '#/components/parameters/objectWithPrimitivesAndMixedArrays:allowEmptyValueTrue' },
          { $ref: '#/components/parameters/objectWithPrimitivesAndMixedArrays:allowEmptyValueFalse' },
          { $ref: '#/components/parameters/primitiveString:allowEmptyValueTrue' },
          { $ref: '#/components/parameters/primitiveString:allowEmptyValueFalse' }
        );

        oas.components.parameters = Object.assign(oas.components.parameters, {
          'arrayOfPrimitives:allowEmptyValueTrue': arrayOfPrimitives(true),
          'arrayOfPrimitives:allowEmptyValueFalse': arrayOfPrimitives(false),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueTrue': arrayWithAnArrayOfPrimitives(true),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueFalse': arrayWithAnArrayOfPrimitives(false),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueTrue': objectWithPrimitivesAndMixedArrays(true),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueFalse': objectWithPrimitivesAndMixedArrays(false),
          'primitiveString:allowEmptyValueTrue': primitiveString(true),
          'primitiveString:allowEmptyValueFalse': primitiveString(false),
        });
      }
    }

    return {
      parameters,
      oas,
    };
  },
};
