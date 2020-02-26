const util = require('util');

// eslint-disable-next-line no-unused-vars
function inspect(obj) {
  // eslint-disable-next-line no-console
  console.log(util.inspect(obj, false, null, true));
}

const schemas = {
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
};

function buildSchemaDefault(opts) {
  const props = {};
  if (typeof opts.default === 'undefined' || opts.default === undefined) {
    // Should not add a default.
  } else if (opts.default === '') {
    props.default = '';
  } else {
    props.default = opts.default ? opts.default : false;
  }

  return props;
}

module.exports = {
  generateRequestBodyDefaults: (complexity, scenario, opts = { default: undefined, allowEmptyValue: undefined }) => {
    const generateCaseName = (testCase, allowEmptyValue) => {
      return `${testCase}:default[${opts.default}]allowEmptyValue[${allowEmptyValue}]`;
    };

    const props = buildSchemaDefault(opts);
    const oas = {};
    const requestBody = {
      description: `Scenario: ${generateCaseName(scenario, opts.allowEmptyValue)}`,
      content: {},
    };

    const getScenario = () => {
      return schemas[scenario](props, opts.allowEmptyValue);
    };

    if (complexity === 'simple') {
      requestBody.content = {
        'application/json': {
          schema: getScenario(),
        },
      };
    } else if (complexity === '$ref') {
      requestBody.content = {
        'application/json': {
          schema: {
            $ref: `#/components/schemas/${scenario}`,
          },
        },
      };

      oas.components = {
        schemas: {
          [scenario]: getScenario(),
        },
      };
    } else if (complexity === '$oneOf' || complexity === '$allOf' || complexity === '$anyOf') {
      requestBody.content = {
        'application/json': {
          schema: {
            [complexity]: [
              { $ref: `#/components/schemas/${scenario}-1` },
              { $ref: `#/components/schemas/${scenario}-2` },
            ],
          },
        },
      };

      oas.components = {
        schemas: {
          [`${scenario}-1`]: getScenario(),
          [`${scenario}-2`]: getScenario(),
        },
      };
    }

    return { requestBody, oas };
  },

  generateParameterDefaults: (complexity, opts = { default: undefined, allowEmptyValue: undefined }) => {
    const generateCaseName = (testCase, allowEmptyValue) => {
      return `${testCase}:default[${opts.default}]allowEmptyValue[${allowEmptyValue}]`;
    };

    const props = buildSchemaDefault(opts);
    const parameters = [];
    const oas = {};

    const getScenario = (scenario, allowEmptyValue) => {
      return {
        name: generateCaseName(scenario, allowEmptyValue),
        in: 'query',
        schema: schemas[scenario](props, allowEmptyValue),
      };
    };

    // When `allowEmptyValue` is present, we should make sure we're testing both states. If `true`, we should allow
    // empty string `default` properties through. If `false`, they should ultimately be omitted from the final
    // compilation.
    if (complexity === 'simple') {
      parameters.push(
        getScenario('arrayOfPrimitives'),
        getScenario('arrayWithAnArrayOfPrimitives'),
        getScenario('objectWithPrimitivesAndMixedArrays'),
        getScenario('primitiveString')
      );

      if (opts.allowEmptyValue !== undefined) {
        parameters.push(
          getScenario('arrayOfPrimitives', true),
          getScenario('arrayOfPrimitives', false),
          getScenario('arrayWithAnArrayOfPrimitives', true),
          getScenario('arrayWithAnArrayOfPrimitives', false),
          getScenario('objectWithPrimitivesAndMixedArrays', true),
          getScenario('objectWithPrimitivesAndMixedArrays', false),
          getScenario('primitiveString', true),
          getScenario('primitiveString', false)
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
          arrayOfPrimitives: getScenario('arrayOfPrimitives'),
          arrayWithAnArrayOfPrimitives: getScenario('arrayWithAnArrayOfPrimitives'),
          objectWithPrimitivesAndMixedArrays: getScenario('objectWithPrimitivesAndMixedArrays'),
          primitiveString: getScenario('primitiveString'),
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
          'arrayOfPrimitives:allowEmptyValueTrue': getScenario('arrayOfPrimitives', true),
          'arrayOfPrimitives:allowEmptyValueFalse': getScenario('arrayOfPrimitives', false),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueTrue': getScenario('arrayWithAnArrayOfPrimitives', true),
          'arrayWithAnArrayOfPrimitives:allowEmptyValueFalse': getScenario('arrayWithAnArrayOfPrimitives', false),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueTrue': getScenario(
            'objectWithPrimitivesAndMixedArrays',
            true
          ),
          'objectWithPrimitivesAndMixedArrays:allowEmptyValueFalse': getScenario(
            'objectWithPrimitivesAndMixedArrays',
            false
          ),
          'primitiveString:allowEmptyValueTrue': getScenario('primitiveString', true),
          'primitiveString:allowEmptyValueFalse': getScenario('primitiveString', false),
        });
      }
    }

    return { parameters, oas };
  },
};
