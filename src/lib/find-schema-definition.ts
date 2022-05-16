import jsonpointer from 'jsonpointer';

/**
 * Lookup a reference pointer within an OpenAPI definition and return the schema that it resolves
 * to.
 *
 * @param $ref Reference to look up a schema for.
 * @param definition OpenAPI definition to look for the `$ref` pointer in.
 */
export default function findSchemaDefinition($ref: string, definition = {}) {
  const origRef = $ref;

  $ref = $ref.trim();
  if ($ref === '') {
    // If this ref is empty, don't bother trying to look for it.
    return false;
  }

  if ($ref.startsWith('#')) {
    // Decode URI fragment representation.
    $ref = decodeURIComponent($ref.substring(1));
  } else {
    throw new Error(`Could not find a definition for ${origRef}.`);
  }

  const current = jsonpointer.get(definition, $ref);
  if (current === undefined) {
    throw new Error(`Could not find a definition for ${origRef}.`);
  }

  return current;
}
