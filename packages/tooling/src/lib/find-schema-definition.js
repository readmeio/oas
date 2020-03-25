// Nabbed from react-jsonschema-form, but this should probably be extracted into a slim NPM module.
const jsonpointer = require('jsonpointer');

function findSchemaDefinition($ref, definitions = {}) {
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

  const current = jsonpointer.get(definitions, $ref);
  if (current === undefined) {
    throw new Error(`Could not find a definition for ${origRef}.`);
  }

  return current;
}

module.exports = findSchemaDefinition;
