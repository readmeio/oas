import type * as RMOAS from '../../src/types.js';

import Oas from '../../src/index.js';

/**
 * @param operation Operation to create a fake API definition and Oas instance for.
 * @param components Schema components to add into the fake API definition.
 */
export default function createOas(operation: RMOAS.OperationObject, components?: RMOAS.ComponentsObject): Oas {
  const schema = {
    openapi: '3.0.3',
    info: { title: 'testing', version: '1.0.0' },
    paths: {
      '/': {
        get: operation,
      },
    },
  } as RMOAS.OASDocument;

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
}
