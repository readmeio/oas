import jsonpointer from 'jsonpointer';

/**
 * Lookup a reference pointer within an OpenAPI definition and return the schema that it resolves
 * to.
 *
 * @param $ref Reference to look up a schema for.
 * @param definition OpenAPI definition to look for the `$ref` pointer in.
 */
// biome-ignore lint/style/noDefaultExport: This is safe for now.
export default function findSchemaDefinition($ref: string, definition = {}): any {
  let currRef = $ref.trim();
  if (currRef === '') {
    // If this ref is empty, don't bother trying to look for it.
    return false;
  }

  if (currRef.startsWith('#')) {
    // Decode URI fragment representation.
    currRef = decodeURIComponent(currRef.substring(1));
  } else {
    throw new Error(`Could not find a definition for ${$ref}.`);
  }

  const current = jsonpointer.get(definition, currRef);
  if (current === undefined) {
    throw new Error(`Could not find a definition for ${$ref}.`);
  }

  return current;
}
