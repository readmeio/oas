// Nabbed from react-jsonschema-form. This is to resolve down one level of $refs
// if it looks like the schema is in `requestBodies`. This is because
// react-jsonschema-form does not know how to resolve objects that look like the following
// to get their actual $ref:
//
// { content: { 'application/json': { schema: { $ref: '#/components/schemas/Thing' } } } }
//
// Out of this we want to get `'#/components/schemas/Thing'`
//
// TODO this should probably be extracted into an npm module
// https://github.com/mozilla-services/react-jsonschema-form/blob/e0192b75d24024370d52a43293931c8ddd769752/src/utils.js#L384-L404
function findSchemaDefinition($ref, definitions = {}) {
  // Extract and use the referenced definition if we have it.
  const match = /^#\/(.*)$/.exec($ref);
  if (match && match[0]) {
    const parts = match[1].split('/');
    let current = definitions;

    parts.forEach(part => {
      if (Object.prototype.hasOwnProperty.call(current, part)) {
        current = current[part];
      } else {
        // No matching definition found, that's an error (bogus schema?)
        throw new Error(`Could not find a definition for ${$ref}.`);
      }
    });

    return current;
  }

  // No matching definition found, that's an error (bogus schema?)
  throw new Error(`Could not find a definition for ${$ref}.`);
}

module.exports = findSchemaDefinition;
