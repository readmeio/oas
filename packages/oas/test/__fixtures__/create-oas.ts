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

/**
 * Creates a base OAS document structure with empty paths and optional schemas.
 */
export function createOASDocument(schemas?: Record<string, unknown>): OASDocument {
  return {
    openapi: '3.0.3',
    info: { title: 'Test', version: '1.0.0' },
    paths: {},
    ...(schemas && {
      components: {
        schemas: schemas as Record<string, unknown>,
      },
    }),
  } as OASDocument;
}

/**
 * Creates a Pet schema with discriminator.
 */
export function createPetSchema(discriminatorOverrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
    },
    discriminator: {
      propertyName: 'pet_type',
      ...discriminatorOverrides,
    },
  };
}

/**
 * Creates a Cat schema that extends Pet via allOf.
 */
export function createCatSchema(): Record<string, unknown> {
  return {
    allOf: [
      { $ref: '#/components/schemas/Pet' },
      {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    ] as const,
  };
}

/**
 * Creates a Dog schema that extends Pet via allOf.
 */
export function createDogSchema(): Record<string, unknown> {
  return {
    allOf: [
      { $ref: '#/components/schemas/Pet' },
      {
        type: 'object',
        properties: {
          bark: { type: 'string' },
        },
      },
    ] as const,
  };
}

/**
 * Creates a dereferenced Cat schema (already merged).
 */
export function createDereferencedCatSchema() {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
      name: { type: 'string' },
    },
    'x-readme-ref-name': 'Cat',
  };
}

/**
 * Creates a dereferenced Dog schema (already merged).
 */
export function createDereferencedDogSchema() {
  return {
    type: 'object',
    properties: {
      pet_type: { type: 'string' },
      bark: { type: 'string' },
    },
    'x-readme-ref-name': 'Dog',
  };
}
