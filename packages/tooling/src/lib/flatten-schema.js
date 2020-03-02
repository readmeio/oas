/* eslint-disable no-use-before-define */
const findSchemaDefinition = require('./find-schema-definition');
const flattenArray = require('./flatten-array');

const getName = (parent, prop) => {
  if (!parent) return prop;
  if (parent[parent.length - 1] === ' ') return `${parent}${prop}`;

  return `${parent}.${prop}`;
};

const capitalizeFirstLetter = (string = '') => string.charAt(0).toUpperCase() + string.slice(1);

module.exports = (schema, oas) => {
  function flattenObject(obj, parent, level) {
    return flattenArray(
      Object.keys(obj.properties).map(prop => {
        let value = obj.properties[prop];
        const array = [];
        if (value.$ref) {
          value = findSchemaDefinition(value.$ref, oas);
        }

        // If `value` doesn't have an explicit `type` declaration, but has `properties` present, then
        // it's an object and should be treated as one.
        if (!('type' in value) && value.properties) {
          value.type = 'object';
        }

        if (value.type === 'object') {
          array.push(flattenSchema(value, getName(parent, prop), level + 1));
        }

        if (value.type === 'array' && value.items) {
          let { items } = value;
          if (items.$ref) {
            items = findSchemaDefinition(items.$ref, oas);
          }

          // If `value` doesn't have an explicit `type` declaration, but has `properties` present,
          // then it's an object and should be treated as one.
          if (!('type' in items) && items.properties) {
            items.type = 'object';
          }

          if (items.type) {
            array.push({
              name: getName(parent, prop),
              type: `[${capitalizeFirstLetter(items.type)}]`,
              description: value.description,
            });
          }

          const newParent = parent ? `${parent}.` : '';
          if (items.type === 'object') {
            array.push(flattenSchema(items, `${newParent}${prop}[]`, level + 1));
          }

          return array;
        }

        array.unshift({
          name: getName(parent, prop),
          type: capitalizeFirstLetter(value.type),
          description: value.description,
        });

        return array;
      })
    );
  }

  function flattenSchema(obj, parent = '', level = 0) {
    if (level > 2) {
      return [];
    }

    if ('allOf' in obj) {
      let allof = [];
      obj.allOf.forEach(item => {
        allof = allof.concat(flattenSchema(item));
      });

      return allof;
    } else if ('oneOf' in obj || 'anyOf' in obj) {
      // Since we can't merge flatten objects in a `oneOf` or `anyOf` representation into a single structure, because
      // that  wouldn't validate against the defined schema, we're instead just pick the first one present and
      // flattening only that one.
      //
      // This work will be somewhat resolved when we start to render response schemas in an improved, non-flattened list
      // in a future API Explorer redesign, but until then we have no other option other than to have partial
      // documentation data loss in the frontend.
      //
      // See https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/ for full documentation on how
      // these polymorphism traits work and why we need to have these quirks.
      if ('oneOf' in obj) {
        return flattenSchema(obj.oneOf.shift());
      }

      return flattenSchema(obj.anyOf.shift());
    } else if ('$ref' in obj) {
      const value = findSchemaDefinition(obj.$ref, oas);
      return flattenSchema(value);
    }

    // top level array
    if (obj.type === 'array' && obj.items) {
      if (obj.items.$ref) {
        const value = findSchemaDefinition(obj.items.$ref, oas);
        return flattenSchema(value);
      }

      const newParent = parent ? `${parent}.[]` : '';
      return flattenSchema(obj.items, `${newParent}`, level + 1);
    }

    if (obj && !obj.properties) {
      return [];
    }

    return flattenObject(obj, parent, level);
  }

  return flattenSchema(schema);
};
