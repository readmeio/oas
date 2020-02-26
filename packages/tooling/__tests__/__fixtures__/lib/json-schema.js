const util = require('util');

// eslint-disable-next-line no-unused-vars
function inspect(obj) {
  // eslint-disable-next-line no-console
  console.log(util.inspect(obj, false, null, true));
}

module.exports = {
  schemas: {
    arrayOfPrimitives: (props, allowEmptyValue) => {
      return {
        type: 'array',
        items: {
          type: 'string',
          ...props,
          ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
        },
      };
    },

    arrayWithAnArrayOfPrimitives: (props, allowEmptyValue) => {
      return {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'string',
            ...props,
            ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
          },
        },
      };
    },

    objectWithPrimitivesAndMixedArrays: (props, allowEmptyValue) => {
      return {
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
      };
    },

    primitiveString: (props, allowEmptyValue) => {
      return {
        type: 'string',
        ...props,
        ...(allowEmptyValue !== undefined ? { allowEmptyValue } : {}),
      };
    },
  },

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

    const getParamSchema = (paramCase, allowEmptyValue) => {
      return {
        name: generateParamName(paramCase, allowEmptyValue),
        in: 'query',
        schema: module.exports.schemas[paramCase](props, allowEmptyValue),
      };
    };

    // When `allowEmptyValue` is present, we should make sure we're testing both states. If `true`, we should allow
    // empty string `default` properties through. If `false`, they should ultimately be omitted from the final
    // compilation.
    const parameters = [];
    const oas = {};

    if (complexity === 'simple') {
      parameters.push(
        getParamSchema('arrayOfPrimitives'),
        getParamSchema('arrayWithAnArrayOfPrimitives'),
        getParamSchema('objectWithPrimitivesAndMixedArrays'),
        getParamSchema('primitiveString')
      );

      if (opts.allowEmptyValue !== undefined) {
        parameters.push(
          getParamSchema('arrayOfPrimitives', true),
          getParamSchema('arrayOfPrimitives', false),
          getParamSchema('arrayWithAnArrayOfPrimitives', true),
          getParamSchema('arrayWithAnArrayOfPrimitives', false),
          getParamSchema('objectWithPrimitivesAndMixedArrays', true),
          getParamSchema('objectWithPrimitivesAndMixedArrays', false),
          getParamSchema('primitiveString', true),
          getParamSchema('primitiveString', false)
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
          arrayOfPrimitives: getParamSchema('arrayOfPrimitives'),
          arrayWithAnArrayOfPrimitives: getParamSchema('arrayWithAnArrayOfPrimitives'),
          objectWithPrimitivesAndMixedArrays: getParamSchema('objectWithPrimitivesAndMixedArrays'),
          primitiveString: getParamSchema('primitiveString'),
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
          'arrayOfPrimitives:allowEmptyValueTrue': getParamSchema('arrayOfPrimitives', true),
          'arrayOfPrimitives:allowEmptyValueFalse': getParamSchema('arrayOfPrimitives', false),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueTrue': getParamSchema('arrayWithAnArrayOfPrimitives', true),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueFalse': getParamSchema('arrayWithAnArrayOfPrimitives', false),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueTrue': getParamSchema(
            'objectWithPrimitivesAndMixedArrays',
            true
          ),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueFalse': getParamSchema(
            'objectWithPrimitivesAndMixedArrays',
            false
          ),
          'primitiveString:allowEmptyValueTrue': getParamSchema('primitiveString', true),
          'primitiveString:allowEmptyValueFalse': getParamSchema('primitiveString', false),
        });
      }
    }

    return { parameters, oas };
  },
};
