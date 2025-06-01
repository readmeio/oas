import type { ComponentsObject, OASDocument, OperationObject, PathsObject } from '../../src/types.js';

import Oas from '../../src/index.js';

/**
 * @param operation Operation to create a fake API definition and Oas instance for.
 * @param components Schema components to add into the fake API definition.
 */
export function createOasForOperation(operation: OperationObject, components?: ComponentsObject): Oas {
  const schema = {
    openapi: '3.0.3',
    info: { title: 'testing', version: '1.0.0' },
    paths: {
      '/': {
        get: operation,
      },
    },
  } as OASDocument;

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
}

/**
 * @param paths Path objects to create a fake API definition and Oas instance for.
 * @param components Schema components to add into the fake API definition.
 */
export function createOasForPaths(paths: PathsObject, components?: ComponentsObject): Oas {
  const schema = {
    openapi: '3.0.3',
    info: { title: 'testing', version: '1.0.0' },
    paths: {
      ...paths,
    },
  } as OASDocument;

  if (components) {
    schema.components = components;
  }

  return new Oas(schema);
}
