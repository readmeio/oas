import type { DiscriminatorChildrenMap, DiscriminatorObject, OASDocument, SchemaObject } from '../types.js';

import { isRef } from '../types.js';
import { cloneObject } from './clone-object.js';
import { isPrimitive } from './helpers.js';
import { dereferenceRef, getSchemaNameFromRef } from './refs.js';

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
 * Checks if a schema `allOf` contains a `$ref` or resolved reference to a specific schema name.
 *
 * When `baseSchema` is provided, also treats an `allOf` item as the base if it is an inlined copy
 * (same `discriminator.propertyName`, no `oneOf`, no `discriminator.mapping`) so OAS-dereferenced APIs
 * are still recognized.
 *
 * @param schema Schema to check.
 * @param targetSchemaName The schema name to look for (e.g., 'Pet').
 * @param baseSchema Optional base schema to match inlined refs (e.g. `api.components.schemas[targetSchemaName]`).
 * @returns If the schema's `allOf` contains a `$ref` to the target schema.
 */
function allOfReferencesSchema(schema: SchemaObject, targetSchemaName: string, baseSchema?: SchemaObject): boolean {
  if (!schema || typeof schema !== 'object') return false;
  if (!('allOf' in schema) || !Array.isArray(schema.allOf)) return false;

  return schema.allOf.some(item => {
    if (isRef(item)) {
      // Check if the `$ref` points to the target schema.
      return getSchemaNameFromRef(item.$ref) === targetSchemaName;
    }

    if (item && typeof item === 'object' && 'x-readme-ref-name' in item) {
      return item['x-readme-ref-name'] === targetSchemaName;
    }

    // After dereferencing an `allOf` may contain inlined schemas.
    if (baseSchema && item && typeof item === 'object' && !isRef(item)) {
      const baseProp = baseSchema.discriminator?.propertyName;
      const itemDisc = (item as { discriminator?: { propertyName?: string; mapping?: unknown } }).discriminator;
      if (
        baseProp &&
        itemDisc?.propertyName === baseProp &&
        !('oneOf' in item) &&
        !(itemDisc.mapping && typeof itemDisc.mapping === 'object')
      ) {
        return true;
      }
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
export function findDiscriminatorChildren(api: Pick<OASDocument, 'components'>): {
  children: DiscriminatorChildrenMap;
  inverted: DiscriminatorChildrenMap;
} {
  const childrenMap: DiscriminatorChildrenMap = new Map();
  const invertedChildrenMap: DiscriminatorChildrenMap = new Map();

  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return { children: childrenMap, inverted: invertedChildrenMap };
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

    // Otherwise, scan for schemas that extend this base via allOf ($ref, x-readme-ref-name, or inlined base)
    if (!childSchemaNames || childSchemaNames.length === 0) {
      const base = schemas[baseName] as SchemaObject & { discriminator?: { propertyName?: string; mapping?: unknown } };
      childSchemaNames = schemaNames.filter(name => {
        if (name === baseName) return false;
        return allOfReferencesSchema(schemas[name], baseName, base);
      });
    }

    // Store child schema names in the map
    if (childSchemaNames.length > 0) {
      childrenMap.set(baseName, childSchemaNames);
    }
  }

  // Invert our map so we can do reverse lookups.
  for (const [key, values] of childrenMap) {
    for (const value of values) {
      if (invertedChildrenMap.has(value)) {
        invertedChildrenMap.get(value)?.push(key);
      } else {
        invertedChildrenMap.set(value, [key]);
      }
    }
  }

  return { children: childrenMap, inverted: invertedChildrenMap };
}

/**
 * Phase 2: After dereferencing, build oneOf arrays for discriminator schemas using the
 * dereferenced child schemas.
 *
 * @param api The OpenAPI definition to process (after dereferencing).
 * @param childrenMap The mapping of discriminator schemas to their children (from findDiscriminatorChildren).
 */
export function buildDiscriminatorOneOf(
  api: Pick<OASDocument, 'components'>,
  childrenMap: DiscriminatorChildrenMap,
): void {
  // Early exit if there are no component schemas or no mappings
  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return;
  } else if (childrenMap.size === 0) {
    return;
  }

  // Build oneOf for each discriminator schema (preserve child allOf so options are allOf[base, extension])
  for (const [schemaName, childNames] of childrenMap) {
    const schema = api.components.schemas[schemaName];
    if (!schema) continue;

    const oneOf: SchemaObject[] = [];
    for (const childName of childNames) {
      const childSchema = api.components.schemas[childName];
      if (!childSchema) continue;
      const cloned = cloneObject(childSchema) as SchemaObject & { 'x-readme-ref-name'?: string };
      cloned['x-readme-ref-name'] = childName;
      oneOf.push(cloned);
    }

    if (oneOf.length > 0) {
      (schema as Record<string, unknown>).oneOf = oneOf;
    }
  }

  // Post-process: Strip oneOf from the base when it is embedded in a child's allOf.
  // deepResolveSchema makes child.allOf[0] the same object as the base, so after we add oneOf to the base
  // the child's allOf[0] also has oneOf. Replace it with a clone without oneOf so refs to the child stay flat.
  for (const [parentSchemaName, childNames] of childrenMap) {
    const baseSchema = api.components.schemas[parentSchemaName];
    if (!baseSchema) continue;

    for (const childName of childNames) {
      const childSchema = api.components.schemas[childName];
      if (!childSchema || !('allOf' in childSchema) || !Array.isArray(childSchema.allOf)) {
        continue;
      }

      for (let i = 0; i < childSchema.allOf.length; i++) {
        const item = childSchema.allOf[i];
        if (!item || typeof item !== 'object') continue;

        const isBaseByRef =
          'x-readme-ref-name' in item &&
          (item as SchemaObject & { 'x-readme-ref-name'?: string })['x-readme-ref-name'] === parentSchemaName;
        const isBaseByIdentity = item === baseSchema;
        if ((isBaseByRef || isBaseByIdentity) && 'oneOf' in item) {
          const clonedItem = cloneObject(item);
          delete (clonedItem as Record<string, unknown>).oneOf;
          childSchema.allOf[i] = clonedItem;
        }
      }
    }
  }
}

/**
 * Recursively resolve $ref pointers in a schema using the given definition.
 * Used to fully resolve discriminator-related schemas without full API dereferencing.
 */
function deepResolveSchema(schema: SchemaObject, definition: OASDocument, seenRefs: Set<string>): SchemaObject {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  if (isRef(schema)) {
    const resolved = dereferenceRef(schema, definition, seenRefs) as SchemaObject;
    if (isRef(resolved)) {
      return resolved;
    }
    return deepResolveSchema(resolved, definition, seenRefs);
  }

  const result = { ...schema } as SchemaObject;

  const schemaArrayKeys = ['allOf', 'oneOf', 'anyOf'] as const;
  for (const key of schemaArrayKeys) {
    if (Array.isArray(result[key])) {
      (result as Record<string, unknown>)[key] = (result[key] as SchemaObject[]).map(item =>
        deepResolveSchema(item as SchemaObject, definition, seenRefs),
      );
    }
  }

  if (result.properties && typeof result.properties === 'object') {
    const resolvedProps: Record<string, SchemaObject> = {};
    for (const [k, v] of Object.entries(result.properties)) {
      if (v && typeof v === 'object') {
        resolvedProps[k] = deepResolveSchema(v as SchemaObject, definition, seenRefs);
      } else {
        resolvedProps[k] = v as SchemaObject;
      }
    }
    (result as Record<string, unknown>).properties = resolvedProps;
  }

  const resultItems = (result as Record<string, unknown>).items;
  if (resultItems && typeof resultItems === 'object' && !Array.isArray(resultItems)) {
    (result as Record<string, unknown>).items = deepResolveSchema(resultItems as SchemaObject, definition, seenRefs);
  }
  if (resultItems && Array.isArray(resultItems)) {
    (result as Record<string, unknown>).items = (resultItems as SchemaObject[]).map(item =>
      deepResolveSchema(item, definition, seenRefs),
    );
  }

  if (
    result.additionalProperties &&
    typeof result.additionalProperties === 'object' &&
    !(result.additionalProperties as unknown as boolean)
  ) {
    (result as Record<string, unknown>).additionalProperties = deepResolveSchema(
      result.additionalProperties as SchemaObject,
      definition,
      seenRefs,
    );
  }

  return result;
}

/** Clone a component schema and set x-readme-ref-name so resolved refs are always tagged. */
function cloneSchemaWithRefName(schema: SchemaObject, refName: string): SchemaObject & { 'x-readme-ref-name': string } {
  const clone = cloneObject(schema) as SchemaObject & { 'x-readme-ref-name'?: string };
  clone['x-readme-ref-name'] = refName;
  return clone as SchemaObject & { 'x-readme-ref-name': string };
}

/**
 * Recursively replace any sub-schema that has discriminator but no oneOf and an
 * x-readme-ref-name that exists in apiWithOneOf.components.schemas with the oneOf
 * version from that api. Also resolves nested $ref to component schemas and replaces
 * with the oneOf version when the target is a discriminator base. Used so nested
 * discriminator schemas (e.g. in array items) get oneOf without prior dereferencing.
 */
export function injectDiscriminatorOneOfInSchema(schema: unknown, apiWithOneOf: OASDocument): SchemaObject | unknown {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }
  const s = schema as SchemaObject & { 'x-readme-ref-name'?: string; $ref?: string };
  if (isRef(s)) {
    const name = getSchemaNameFromRef(s.$ref);
    if (name && apiWithOneOf.components?.schemas?.[name]) {
      return cloneSchemaWithRefName(apiWithOneOf.components.schemas[name] as SchemaObject, name);
    }
    // Resolve refs that are not #/components/schemas/... (e.g. in-document refs after dereference)
    const resolved = dereferenceRef(s, apiWithOneOf);
    if (resolved && resolved !== s && typeof resolved === 'object') {
      return injectDiscriminatorOneOfInSchema(resolved, apiWithOneOf);
    }
    return schema;
  }
  const refName = s['x-readme-ref-name'];
  if (apiWithOneOf.components?.schemas) {
    const storedMap = (apiWithOneOf as OASDocument & { __readmeDiscriminatorChildren?: DiscriminatorChildrenMap })
      .__readmeDiscriminatorChildren;
    const baseNamesMap = storedMap && storedMap.size > 0 ? storedMap : findDiscriminatorChildren(apiWithOneOf).children;
    const baseNames = new Set(baseNamesMap.keys());
    const childNames = new Set(([] as string[]).concat(...baseNamesMap.values()));
    // Always replace when this schema is the canonical base (by refName) so we get the oneOf version
    if (refName && apiWithOneOf.components.schemas[refName] && baseNames.has(refName)) {
      return cloneSchemaWithRefName(apiWithOneOf.components.schemas[refName] as SchemaObject, refName);
    }
    // When this schema is a child (e.g. Cat), use the full component schema so oneOf options have flat properties
    const isChildByRef = refName && childNames.has(refName);
    const childNameByIdentity = [...childNames].find(name => apiWithOneOf.components?.schemas?.[name] === s);
    const childNameToUse = isChildByRef ? refName : childNameByIdentity;
    if (childNameToUse && apiWithOneOf.components?.schemas?.[childNameToUse]) {
      return cloneSchemaWithRefName(apiWithOneOf.components.schemas[childNameToUse] as SchemaObject, childNameToUse);
    }
    if ('discriminator' in s && !('oneOf' in s)) {
      // Otherwise replace when schema has discriminator but no oneOf and matches a base (by fallback)
      const hasAllOf = 'allOf' in s && Array.isArray((s as SchemaObject).allOf);
      const nameToUse = !hasAllOf
        ? [...baseNames].find(name => {
            const comp = apiWithOneOf.components?.schemas?.[name];
            return (
              comp &&
              typeof comp === 'object' &&
              'discriminator' in comp &&
              'oneOf' in comp &&
              (comp as { discriminator?: { propertyName?: string } }).discriminator?.propertyName ===
                (s as { discriminator?: { propertyName?: string } }).discriminator?.propertyName
            );
          })
        : undefined;
      if (nameToUse && apiWithOneOf.components.schemas[nameToUse]) {
        const baseSchema = apiWithOneOf.components.schemas[nameToUse] as SchemaObject;
        const baseKeys =
          typeof baseSchema === 'object' && baseSchema.properties ? Object.keys(baseSchema.properties).sort() : [];
        const sProps = (s as SchemaObject).properties;
        const currentKeys = sProps && typeof sProps === 'object' ? Object.keys(sProps).sort() : [];
        // Only replace when the schema has exactly the base's properties (so it is the base, not an inlined child)
        if (currentKeys.length === baseKeys.length && currentKeys.every((k, i) => k === baseKeys[i])) {
          return cloneSchemaWithRefName(apiWithOneOf.components.schemas[nameToUse] as SchemaObject, nameToUse);
        }
      }
    }
  }
  const result = { ...s } as SchemaObject;
  const schemaArrayKeys = ['allOf', 'oneOf', 'anyOf'] as const;
  for (const key of schemaArrayKeys) {
    if (Array.isArray(result[key])) {
      (result as Record<string, unknown>)[key] = (result[key] as SchemaObject[]).map(
        item => injectDiscriminatorOneOfInSchema(item, apiWithOneOf) as SchemaObject,
      );
    }
  }
  if (result.properties && typeof result.properties === 'object') {
    const next: Record<string, SchemaObject> = {};
    for (const [k, v] of Object.entries(result.properties)) {
      next[k] = injectDiscriminatorOneOfInSchema(v, apiWithOneOf) as SchemaObject;
    }
    (result as Record<string, unknown>).properties = next;
  }
  const resultItems = (result as Record<string, unknown>).items;
  if (resultItems && typeof resultItems === 'object' && !Array.isArray(resultItems)) {
    (result as Record<string, unknown>).items = injectDiscriminatorOneOfInSchema(resultItems, apiWithOneOf);
  }
  if (resultItems && Array.isArray(resultItems)) {
    (result as Record<string, unknown>).items = (resultItems as SchemaObject[]).map(
      item => injectDiscriminatorOneOfInSchema(item, apiWithOneOf) as SchemaObject,
    );
  }
  return result;
}

/**
 * Returns an API document whose components.schemas have discriminator oneOf built,
 * without requiring full OAS dereferencing. Resolves only the discriminator base and
 * child schemas synchronously via dereferenceRef, then runs buildDiscriminatorOneOf.
 * Use this in getParametersAsJSONSchema and getResponseAsJSONSchema so they work
 * without prior dereferencing.
 *
 * @param api The OpenAPI definition.
 * @returns An API with components.schemas containing resolved discriminator schemas and
 *   oneOf, or null if there are no discriminator children (caller should use original api).
 */
export function getApiWithDiscriminatorOneOf(api: OASDocument): OASDocument | null {
  const stored = (api as OASDocument & { __readmeDiscriminatorChildren?: DiscriminatorChildrenMap })
    .__readmeDiscriminatorChildren;
  const discriminatorChildrenMap = stored && stored.size > 0 ? stored : findDiscriminatorChildren(api).children;
  if (discriminatorChildrenMap.size === 0) {
    return null;
  }

  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return null;
  }

  const schemas = api.components.schemas as Record<string, SchemaObject>;
  const clonedSchemas = cloneObject(schemas);

  const baseNames = [...discriminatorChildrenMap.keys()];
  const childNames = [...discriminatorChildrenMap.values()].flat();
  const allNames = Array.from(new Set([...baseNames, ...childNames]));

  const workingApi = {
    ...api,
    components: {
      ...api.components,
      schemas: clonedSchemas,
    },
  } as OASDocument & { __readmeDiscriminatorChildren?: DiscriminatorChildrenMap };
  workingApi.__readmeDiscriminatorChildren = discriminatorChildrenMap;

  const childNamesSet = new Set(childNames);
  for (const name of allNames) {
    const original = schemas[name];
    if (original && typeof original === 'object' && !isPrimitive(original)) {
      clonedSchemas[name] = deepResolveSchema(original, workingApi, new Set());
      if (childNamesSet.has(name)) {
        clonedSchemas[name]['x-readme-ref-name'] = name;
      }
    }
  }

  buildDiscriminatorOneOf(workingApi, discriminatorChildrenMap);

  return workingApi as OASDocument;
}
