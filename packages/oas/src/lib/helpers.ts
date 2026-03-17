import type { SchemaObject } from '../types.js';

export function hasSchemaType(schema: SchemaObject, discriminator: 'array' | 'object'): boolean {
  if (Array.isArray(schema.type)) {
    return schema.type.includes(discriminator);
  }

  return schema.type === discriminator;
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function isPrimitive(val: unknown): val is boolean | number | string {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

/**
 * Recursively collect all `$ref` pointers in a schema that point into the document (e.g. `#/...`).
 * Returns the set of full ref strings so refs can be placed at their originating paths in the output.
 */
function collectRefsInSchema(schema: unknown): Set<string> {
  const refs = new Set<string>();
  if (!schema || typeof schema !== 'object') return refs;
  const obj = schema as Record<string, unknown>;
  if (typeof obj.$ref === 'string' && obj.$ref.startsWith('#/')) {
    refs.add(obj.$ref);
  }
  for (const value of Object.values(obj)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        for (const r of collectRefsInSchema(item)) refs.add(r);
      }
    } else if (value && typeof value === 'object') {
      for (const r of collectRefsInSchema(value)) refs.add(r);
    }
  }
  return refs;
}

/**
 * Given root schema(s) and a full usedSchemas map (key = full $ref string), return only the
 * entries that are transitively referenced in the output (so inlined/dereferenced schemas are not included).
 */
export function filterUsedSchemasToReferenced(
  rootSchemas: unknown[],
  usedSchemas: Map<string, unknown>,
): Map<string, unknown> {
  const referenced = new Set<string>();
  for (const root of rootSchemas) {
    for (const r of collectRefsInSchema(root)) {
      referenced.add(r);
    }
  }

  let prevSize = 0;
  while (referenced.size > prevSize) {
    prevSize = referenced.size;
    for (const ref of referenced) {
      const schema = usedSchemas.get(ref);
      if (schema) {
        for (const r of collectRefsInSchema(schema)) {
          referenced.add(r);
        }
      }
    }
  }

  const filtered = new Map<string, unknown>();
  for (const ref of referenced) {
    const s = usedSchemas.get(ref);
    if (s !== undefined) {
      filtered.set(ref, s);
    }
  }

  return filtered;
}

/** Top-level JSON Schema / OpenAPI keywords we must not use as the first path segment when embedding refs. */
const RESERVED_TOP_LEVEL_REF_SEGMENTS = new Set([
  '$schema',
  '$id',
  '$ref',
  'type',
  'properties',
  'items',
  'required',
  'definitions',
  'default',
  'title',
  'description',
  'additionalProperties',
  'patternProperties',
  'enum',
  'oneOf',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else',
  'const',
  'format',
]);

/**
 * Parse a `$ref` pointers (e.g. `#/x-definitions/MySchema` or `#/components/schemas/Foo`) into
 * path segments. Returns `null` if the first segment is reserved (we should not embed at root
 * under that key).
 *
 */
function getRefPathSegments(ref: string): string[] | null {
  if (!ref.startsWith('#/')) return null;
  const path = ref
    .slice(2)
    .split('/')
    .map(seg => seg);

  if (path.length < 2) {
    // We need at least two pieces of a `$ref` for it to be valid. e.g. `#/x-definitions/MySchema`
    // or `#/components/schemas/Foo`.
    return null;
  }

  const first = path[0];
  if (RESERVED_TOP_LEVEL_REF_SEGMENTS.has(first)) {
    return null;
  }

  return path;
}

/**
 * Merge referenced schemas into the root schema at the paths defined by their $ref.
 * E.g. ref `#/x-definitions/MySchema` → root['x-definitions']['MySchema'] = schema.
 * Skips refs whose first path segment is reserved.
 */
export function mergeReferencedSchemasIntoRoot(root: SchemaObject, refToSchema: Map<string, unknown>): void {
  for (const [ref, schema] of refToSchema) {
    const segments = getRefPathSegments(ref);
    if (!segments || segments.length === 0) {
      continue;
    }

    let current: SchemaObject = root;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      let next = current[seg as keyof SchemaObject];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        next = {};
        current[seg as keyof SchemaObject] = next;
      }

      current = next as Record<string, unknown>;
    }

    current[segments[segments.length - 1] as keyof SchemaObject] = schema;
  }
}
