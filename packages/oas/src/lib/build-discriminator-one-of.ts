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
        oneOf.push(cloneObject(schemas[childName]));
      }
    }

    if (oneOf.length > 0) {
      (schema as Record<string, unknown>).oneOf = oneOf;
    }
  }

  // Post-process: Strip oneOf from discriminator schemas embedded in child allOf structures.
  // When Cat extends Pet via allOf, and Pet has a discriminator with oneOf, the embedded Pet
  // inside Cat's allOf should NOT have oneOf (would create circular Cat.allOf[0].oneOf[0] ≈ Cat).
  // We only strip from allOf entries to preserve oneOf in direct references (e.g., items: $ref Pet).
  for (const [parentSchemaName, childNames] of childrenMap) {
    for (const childName of childNames) {
      const childSchema = schemas[childName];
      if (!childSchema || !('allOf' in childSchema) || !Array.isArray(childSchema.allOf)) {
        continue;
      }

      for (let i = 0; i < childSchema.allOf.length; i++) {
        const item = childSchema.allOf[i];
        if (
          item &&
          typeof item === 'object' &&
          'x-readme-ref-name' in item &&
          (item as SchemaObject)['x-readme-ref-name'] === parentSchemaName &&
          'oneOf' in item
        ) {
          // Clone the allOf entry and strip oneOf from the clone to avoid mutating the shared reference.
          // This ensures Pet in components.schemas keeps its oneOf while embedded Pet in Cat's allOf doesn't.
          const clonedItem = cloneObject(item);
          delete (clonedItem as Record<string, unknown>).oneOf;
          childSchema.allOf[i] = clonedItem;
        }
      }
    }
  }
}
