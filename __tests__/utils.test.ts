import utils from '../src/utils';

test('should expose `jsonSchemaTypes`', () => {
  expect(utils.jsonSchemaTypes).toStrictEqual({
    path: 'Path Params',
    query: 'Query Params',
    body: 'Body Params',
    cookie: 'Cookie Params',
    formData: 'Form Data',
    header: 'Headers',
    metadata: 'Metadata',
  });
});
