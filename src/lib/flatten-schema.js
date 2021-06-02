/* eslint-disable no-use-before-define */
const flattenArray = require('./flatten-array');

const getName = (parent, prop) => {
  if (!parent) return prop;
  if (parent[parent.length - 1] === ' ') return `${parent}${prop}`;

  return `${parent}.${prop}`;
};

const capitalizeFirstLetter = (string = '') => string.charAt(0).toUpperCase() + string.slice(1);

module.exports = schema => {
  function flattenObject(obj, parent, level) {
    return flattenArray(
      Object.keys(obj.properties).map(prop => {
        const value = obj.properties[prop];
        let array = [];

        if (value.$ref) {
          // If we have a $ref present then it's circular and mark the type as such so we at least have something to
          // identify it as to the user.
          value.type = 'circular';
        }

        // If `value` doesn't have an explicit `type` declaration, but has `properties` present, then
        // it's an object and should be treated as one.
        if (!('type' in value) && value.properties) {
          value.type = 'object';
        }

        if (value.type === 'object') {
          array.push(flattenSchema(value, getName(parent, prop), level + 1));
        } else if (value.type === 'array' && value.items) {
          const { items } = value;
          if (items.$ref) {
            // If we have a $ref present for the array items it's a circular reference so let's mark it as such and
            // break out.
            array.push({
              name: getName(parent, prop),
              type: `[Circular]`,
              description: value.description,
            });

            return array;
          }

          // If `value` doesn't have an explicit `type` declaration, but has `properties` present,
          // then it's an object and should be treated as one.
          if (!('type' in items) && items.properties) {
            items.type = 'object';
          }

          let newParent = parent ? `${parent}.` : '';
          newParent = `${newParent}${prop}[]`;
          if (items.type) {
            array.push({
              name: getName(parent, prop),
              type: `[${capitalizeFirstLetter(items.type)}]`,
              description: value.description || items.description,
            });

            if (items.type === 'object') {
              array.push(flattenSchema(items, newParent, level + 1));
            }
          } else if ('allOf' in items || 'oneOf' in items || 'anyOf' in items || '$ref' in items) {
            array = array.concat(flattenSchema(items, newParent, level));
          }

          return array;
        } else if ('allOf' in value || 'oneOf' in value || 'anyOf' in value) {
          array = array.concat(flattenSchema(value, getName(parent, prop), level + 1));
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

    // If we don't actually have an object here, don't try to treat it as one.
    //
    // This might happen in the event of a $ref being improperly written as the value of a non-$ref object property.
    // For example: `"schema": "~paths~/pet~post~requestBody~content~application/json~schema"`.
    if (obj === null || typeof obj !== 'object') {
      return [];
    }

    if ('allOf' in obj) {
      let allof = [];
      obj.allOf.forEach(item => {
        allof = allof.concat(flattenSchema(item, parent, level));
      });

      return allof;
    } else if ('oneOf' in obj || 'anyOf' in obj) {
      // Since we can't merge flatten objects in a `oneOf` or `anyOf` representation into a single structure, because
      // that wouldn't validate against the defined schema, we're instead just pick the first one present and
      // flattening only that one.
      //
      // This work will be somewhat resolved when we start to render response schemas in an improved, non-flattened list
      // in a future API Explorer redesign, but until then we have no other option other than to have partial
      // documentation data loss in the frontend.
      //
      // See https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/ for full documentation on how
      // these polymorphism traits work and why we need to have these quirks.
      if ('oneOf' in obj) {
        return flattenSchema(obj.oneOf.shift(), parent, level);
      }

      return flattenSchema(obj.anyOf.shift());
    } else if ('$ref' in obj) {
      return flattenSchema({}, parent, level);
    }

    // top level array
    if (obj.type === 'array' && obj.items) {
      const newParent = parent ? `${parent}.[]` : '';

      if (obj.items.$ref) {
        return flattenSchema(obj.items, newParent, level);
      }

      return flattenSchema(obj.items, `${newParent}`, level + 1);
    }

    if (obj && !obj.properties) {
      return [];
    }

    return flattenObject(obj, parent, level);
  }

  return flattenSchema(schema);
};
