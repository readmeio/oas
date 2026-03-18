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
 * @returns Maps of discriminator schema names to their child schema names and `$ref` pointers.
 */
export function findDiscriminatorChildren(definition: Pick<OASDocument, 'components'>): {
  children: DiscriminatorChildrenMap;
  refs: Map<string, string>;
} {
  const childrenMap: DiscriminatorChildrenMap = new Map();
  const childrenRefMap = new Map<string, string>();

  if (!definition?.components?.schemas || typeof definition.components.schemas !== 'object') {
    return { children: childrenMap, refs: childrenRefMap };
  }

  const schemas = definition.components.schemas as Record<string, SchemaObject>;
  const schemaNames = Object.keys(schemas);

  // Find all schemas with discriminator but no oneOf/anyOf
  const discriminatorSchemas: string[] = schemaNames.filter(name => {
    return hasDiscriminatorWithoutPolymorphism(schemas[name]);
  });

  // For each discriminator schema, record child schema names
  for (const baseName of discriminatorSchemas) {
    const baseSchema = schemas[baseName] as SchemaObject & { discriminator: DiscriminatorObject };
    const discriminator = baseSchema.discriminator;

    let childSchemaNames: string[] = [];

    // If there's already a mapping defined, use that
    if (discriminator.mapping && typeof discriminator.mapping === 'object') {
      const mappingRefs = Object.values(discriminator.mapping);
      if (mappingRefs.length > 0) {
        // Extract schema names from refs like "#/components/schemas/Cat"
        childSchemaNames = mappingRefs.map(ref => ref.split('/').pop()).filter(ref => ref !== undefined);
      }
    }

    // Otherwise, scan for schemas that extend this base via allOf
    if (!childSchemaNames.length) {
      childSchemaNames = schemaNames.filter(name => {
        if (name === baseName) return false;
        return allOfReferencesSchema(schemas[name], baseName);
      });
    }

    // Store child schema names in the map
    if (childSchemaNames.length) {
      for (const childName of childSchemaNames) {
        childrenRefMap.set(childName, `#/components/schemas/${childName}`);
      }

      childrenMap.set(baseName, childSchemaNames);
      childrenRefMap.set(baseName, `#/components/schemas/${baseName}`);
    }
  }

  return { children: childrenMap, refs: childrenRefMap };
}

/**
 * Apply discriminator oneOf to a map of used schemas (e.g. from `getParametersAsJSONSchema` and
 * `getResponseAsJSONSchema`). For each discriminator base in `usedSchemas`, it ensures children
 * are in the map via `getOrAddSchema`, then sets `oneOf` on the base.
 *
 * Optionally this also strips `oneOf` from the base when it appears inside a child's `allOf`
 * schema.
 *
 * @param api The OpenAPI definition (for findDiscriminatorChildren).
 * @param usedSchemas Map of schema name -> JSON Schema to update.
 * @param getOrAddSchema Callback that resolves, converts, and adds a schema by name; returns the converted schema or undefined.
 */
export function applyDiscriminatorOneOfToUsedSchemas(
  definition: Pick<OASDocument, 'components'>,
  usedSchemas: Map<string, SchemaObject>,
  getOrAddSchema: (ref: string) => SchemaObject | undefined,
): void {
  const { children: childrenMap, refs: childrenRefMap } = findDiscriminatorChildren(definition);
  if (!childrenMap.size) return;

  // Build oneOf for each discriminator schema
  for (const [baseName, childNames] of childrenMap) {
    const baseRef = childrenRefMap.get(baseName);
    if (!baseRef) continue;

    const baseSchema = usedSchemas.get(baseRef);
    if (!baseSchema || typeof baseSchema !== 'object') continue;

    // Build `oneOf` from raw child schemas `$ref` pointers.
    const oneOf: SchemaObject[] = [];
    for (const childName of childNames) {
      const childRef = childrenRefMap.get(childName);
      if (!childRef) continue;

      const childSchema = getOrAddSchema(childRef);
      if (childSchema) {
        oneOf.push({
          $ref: childRef,
        });
      }
    }

    if (oneOf.length > 0) {
      (baseSchema as Record<string, unknown>).oneOf = oneOf;
    }
  }

  // Strip `oneOf` from discriminator schemas embedded in child `allOf` structures.
  //
  // When `Cat` extends `Pet` via an `allOf` and `Pet` has a `discriminator` with a `oneOf` the
  // embedded `Pet` inside `Cat`'s `allOf` should NOT have `oneOf` because this would create a
  // circular `Cat.allOf[0].oneOf[0] = Cat` reference.
  //
  // We only strip from `allOf` entries to preserve `oneOf` in direct references.
  for (const [parentSchemaName, childNames] of childrenMap) {
    for (const childName of childNames) {
      const childRef = childrenRefMap.get(childName);
      if (!childRef) continue;

      const childSchema = usedSchemas.get(childRef);
      if (!childSchema || !('allOf' in childSchema) || !Array.isArray(childSchema.allOf)) {
        continue;
      }

      for (let i = 0; i < childSchema.allOf.length; i++) {
        const item = childSchema.allOf[i];
        if (
          item &&
          typeof item === 'object' &&
          'x-readme-ref-name' in item &&
          item['x-readme-ref-name'] === parentSchemaName &&
          'oneOf' in item
        ) {
          // Clone the allOf entry and strip oneOf from the clone to avoid mutating the shared reference.
          // This ensures Pet in components.schemas keeps its oneOf while embedded Pet in Cat's allOf doesn't.
          const clonedItem = cloneObject(item);
          delete clonedItem.oneOf;
          childSchema.allOf[i] = clonedItem;
        }
      }
    }
  }
}
