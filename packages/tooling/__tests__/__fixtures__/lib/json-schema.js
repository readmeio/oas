module.exports = {
  defaultParameters: (complexity, opts = { default: undefined, allowEmptyValue: undefined }) => {
    const optsHash = `default[${opts.default}]allowEmptyValue[${opts.allowEmptyValue}]`;
    const props = {};

    if (typeof opts.default === 'undefined' || opts.default === undefined) {
      // Should not add a default.
    } else if (opts.default === '') {
      props.default = '';
    } else {
      props.default = opts.default ? opts.default : false;
    }

    const primitiveString = {
      name: `primitiveString:${optsHash}`,
      in: 'query',
      schema: {
        type: 'string',
        ...props,
      },
    };

    const arrayOfPrimitives = {
      name: `arrayOfPrimitives:${optsHash}`,
      in: 'query',
      schema: {
        type: 'array',
        items: {
          type: 'string',
          ...props,
        },
      },
    };

    const arrayWithAnArrayOfPrimitives = {
      name: `arrayWithAnArrayOfPrimitives:${optsHash}`,
      in: 'query',
      schema: {
        type: 'array',
        items: {
          type: 'array',
          items: {
            type: 'string',
            ...props,
          },
        },
      },
    };

    const objectWithPrimitivesAndMixedArrays = {
      name: `objectWithPrimitivesAndMixedArrays:${optsHash}`,
      in: 'query',
      schema: {
        type: 'object',
        properties: {
          param1: {
            type: 'string',
            ...props,
          },
          param2: {
            type: 'array',
            items: {
              type: 'array',
              items: {
                type: 'string',
                ...props,
              },
            },
          },
        },
      },
    };

    if (complexity === 'simple') {
      return {
        parameters: [
          arrayOfPrimitives,
          arrayWithAnArrayOfPrimitives,
          objectWithPrimitivesAndMixedArrays,
          primitiveString,
        ],
      };
    }
  },
};
