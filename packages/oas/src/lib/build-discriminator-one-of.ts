import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { OASDocument, SchemaObject } from '../types.js';

import { isRef } from '../types.js';

type DiscriminatorObject = OpenAPIV3.DiscriminatorObject | OpenAPIV3_1.DiscriminatorObject;

/**
 * Mapping of discriminator schema names to their child schema names.
 * Used to pass information between the pre-dereference and post-dereference phases.
 */
export type DiscriminatorChildrenMap = Map<string, string[]>;

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
    const schema = schemas[name];
    return hasDiscriminatorWithoutPolymorphism(schema);
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
 * Deep clone a schema object to avoid circular reference issues.
 */
function cloneSchema(schema: SchemaObject): SchemaObject {
  return JSON.parse(JSON.stringify(schema));
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

    // Build oneOf from dereferenced child schemas
    const oneOf: SchemaObject[] = [];
    for (const childName of childNames) {
      if (schemas[childName]) {
        // Clone the schema to avoid circular reference issues
        oneOf.push(cloneSchema(schemas[childName]));
      }
    }

    if (oneOf.length > 0) {
      (schema as Record<string, unknown>).oneOf = oneOf;
    }
  }
}
