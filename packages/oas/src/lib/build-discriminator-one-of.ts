import type { DiscriminatorChildrenMap, DiscriminatorObject, OASDocument, SchemaObject } from '../types.js';

import { isRef } from '../types.js';
import { cloneObject } from './clone-object.js';

/**
 * Determines if a schema has a discriminator but is missing oneOf/anyOf polymorphism.
 *
 * @param schema Schema to check.
 * @returns If the schema has a discriminator but no oneOf/anyOf.
 */
function hasDiscriminatorWithoutPolymorphism(schema: SchemaObject): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (!('discriminator' in schema)) return false;
  if ('oneOf' in schema || 'anyOf' in schema) return false;
  return true;
}

/**
 * Checks if a schema's allOf contains a $ref to a specific schema name.
 *
 * @param schema Schema to check.
 * @param targetSchemaName The schema name to look for (e.g., 'Pet').
 * @returns If the schema's allOf contains a $ref to the target schema.
 */
function allOfReferencesSchema(schema: SchemaObject, targetSchemaName: string): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (!('allOf' in schema) || !Array.isArray(schema.allOf)) return false;

  return schema.allOf.some(item => {
    if (isRef(item)) {
      // Check if the $ref points to the target schema
      // Format: #/components/schemas/SchemaName
      const refParts = item.$ref.split('/');
      const refSchemaName = refParts[refParts.length - 1];
      return refSchemaName === targetSchemaName;
    }
    return false;
  });
}

/**
 * Phase 1: Before dereferencing, identify discriminator schemas and their children via allOf
 * inheritance. Returns a mapping that can be used after dereferencing.
 *
 * We don't add oneOf here because that would create circular references
 * (Pet → Cat → Pet via allOf) which would break dereferencing.
 *
 * @param api The OpenAPI definition to process (before dereferencing).
 * @returns A map of discriminator schema names to their child schema names.
 */
export function findDiscriminatorChildren(api: OASDocument): DiscriminatorChildrenMap {
  const childrenMap: DiscriminatorChildrenMap = new Map();

  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return childrenMap;
  }

  const schemas = api.components.schemas as Record<string, SchemaObject>;
  const schemaNames = Object.keys(schemas);

  // Find all schemas with discriminator but no oneOf/anyOf
  const discriminatorSchemas: string[] = schemaNames.filter(name => {
    return hasDiscriminatorWithoutPolymorphism(schemas[name]);
  });

  // For each discriminator schema, record child schema names
  for (const baseName of discriminatorSchemas) {
    const baseSchema = schemas[baseName] as SchemaObject & { discriminator: DiscriminatorObject };
    const discriminator = baseSchema.discriminator;

    let childSchemaNames: string[] | undefined;

    // If there's already a mapping defined, use that
    if (discriminator.mapping && typeof discriminator.mapping === 'object') {
      const mappingRefs = Object.values(discriminator.mapping);
      if (mappingRefs.length > 0) {
        // Extract schema names from refs like "#/components/schemas/Cat"
        childSchemaNames = mappingRefs.map(ref => {
          const parts = ref.split('/');
          return parts[parts.length - 1];
        });
      }
    }

    // Otherwise, scan for schemas that extend this base via allOf
    if (!childSchemaNames || childSchemaNames.length === 0) {
      childSchemaNames = schemaNames.filter(name => {
        if (name === baseName) return false;
        return allOfReferencesSchema(schemas[name], baseName);
      });
    }

    // Store child schema names in the map
    if (childSchemaNames.length > 0) {
      childrenMap.set(baseName, childSchemaNames);
    }
  }

  return childrenMap;
}

/**
 * Checks if any child schemas are directly referenced in a parent oneOf/anyOf at the operation level.
 * If found, we skip building oneOf on the base schema to avoid duplicate/nested structures.
 *
 * @param api The OpenAPI definition to process (after dereferencing).
 * @param childNames The names of child schemas to check (e.g., ['Cat', 'Dog']).
 * @returns True if any child is directly in a parent oneOf/anyOf.
 */
function areChildrenInParentOneOf(api: OASDocument, childNames: string[]): boolean {
  const childNameSet = new Set(childNames);

  // Check if a schema's oneOf/anyOf directly references any of our children
  const hasDirectChildRef = (schema: SchemaObject): boolean => {
    if (!('oneOf' in schema || 'anyOf' in schema)) {
      return false;
    }

    const polyArray = ('oneOf' in schema ? schema.oneOf : schema.anyOf) as unknown[];
    if (!Array.isArray(polyArray)) {
      return false;
    }

    for (const item of polyArray) {
      if (isRef(item)) {
        const refParts = item.$ref.split('/');
        const refSchemaName = refParts[refParts.length - 1];
        if (childNameSet.has(refSchemaName)) {
          return true;
        }
      } else if (item && typeof item === 'object' && 'x-readme-ref-name' in item) {
        const refName = (item as { 'x-readme-ref-name'?: string })['x-readme-ref-name'];
        if (refName && childNameSet.has(refName)) {
          return true;
        }
      }
    }

    return false;
  };

  // Helper function to check operations (used for both paths and webhooks)
  const checkOperations = (operations: Record<string, unknown>): boolean => {
    for (const operation of Object.values(operations)) {
      if (!operation || typeof operation !== 'object') continue;

      // Check requestBody schema
      if ('requestBody' in operation) {
        const requestBody = (operation as { requestBody?: { content?: Record<string, { schema?: SchemaObject }> } })
          .requestBody;
        if (requestBody?.content) {
          for (const mediaType of Object.values(requestBody.content)) {
            if (mediaType?.schema && hasDirectChildRef(mediaType.schema)) {
              return true;
            }
          }
        }
      }

      // Check response schemas
      if ('responses' in operation) {
        const responses = (
          operation as { responses?: Record<string, { content?: Record<string, { schema?: SchemaObject }> }> }
        ).responses;
        if (responses) {
          for (const response of Object.values(responses)) {
            if (response?.content) {
              for (const mediaType of Object.values(response.content)) {
                if (mediaType?.schema && hasDirectChildRef(mediaType.schema)) {
                  return true;
                }
              }
            }
          }
        }
      }
    }

    return false;
  };

  // Check operation-level requestBody and response schemas in paths
  if (api?.paths) {
    for (const path of Object.values(api.paths)) {
      if (!path || typeof path !== 'object') continue;
      if (checkOperations(path)) {
        return true;
      }
    }
  }

  // Check operation-level requestBody and response schemas in webhooks
  if (api?.webhooks) {
    for (const webhook of Object.values(api.webhooks)) {
      if (!webhook || typeof webhook !== 'object') continue;
      if (checkOperations(webhook)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Phase 2: After dereferencing, build oneOf arrays for discriminator schemas using the
 * dereferenced child schemas.
 *
 * @param api The OpenAPI definition to process (after dereferencing).
 * @param childrenMap The mapping of discriminator schemas to their children (from findDiscriminatorChildren).
 */
export function buildDiscriminatorOneOf(api: OASDocument, childrenMap: DiscriminatorChildrenMap): void {
  // Early exit if there are no component schemas or no mappings
  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return;
  }
  if (childrenMap.size === 0) {
    return;
  }

  const schemas = api.components.schemas as Record<string, SchemaObject>;

  // Build oneOf for each discriminator schema
  for (const [schemaName, childNames] of childrenMap) {
    const schema = schemas[schemaName];
    if (!schema) continue;

    // Skip building oneOf if the children are already in a parent oneOf/anyOf.
    // This prevents creating nested oneOf structures when children are already
    // being used in polymorphism at a higher level (e.g., embedded discriminators).
    if (areChildrenInParentOneOf(api, childNames)) {
      continue;
    }

    // Build oneOf from dereferenced child schemas
    const oneOf: SchemaObject[] = [];
    for (const childName of childNames) {
      if (schemas[childName]) {
        // Clone the schema to avoid circular reference issues
        oneOf.push(cloneObject(schemas[childName]));
      }
    }

    if (oneOf.length > 0) {
      (schema as Record<string, unknown>).oneOf = oneOf;
    }
  }
}
