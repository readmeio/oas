const Oas = require('..').default;

/**
 * As of when this test was written our JSON Schema generation deduped schema enums with
 * `[...new Set(['1', '2'])]`. Problem is that with our current TS config (at the time) that the
 * TS-compiled code  wouldn't be able to convert the Set to an array, resulting in that line
 * returning an empty array. Though we've since fixed this by changing that line to use
 * `Array.from()` instead of the spread operator this bug ended up making its way into production
 * and wiped all cases of enum values, leaving empty dropdown selectors for all of our customers
 * for roughly 18 hours.
 *
 * @see {@link https://github.com/readmeio/oas/pull/559}
 */
test('should be able to generate enums', () => {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'fixed enums',
      version: '1.0.0',
    },
    servers: [{ url: 'https://httpbin.org' }],
    paths: {
      '/anything': {
        post: {
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    enumType: {
                      enum: ['pug', 'cat'],
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
            },
          },
        },
      },
    },
  };

  const oas = new Oas(spec);
  expect(oas.operation('/anything', 'post').getParametersAsJsonSchema()[0].schema.properties.enumType).toStrictEqual({
    type: 'string',
    enum: ['pug', 'cat'],
  });
});
