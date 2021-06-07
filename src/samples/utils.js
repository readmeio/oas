/**
 * Portions of this file have been extracted and modified from Swagger UI.
 *
 * @license Apache 2.0
 * @link https://github.com/swagger-api/swagger-ui/blob/master/src/core/utils.js
 */

function isObject(obj) {
  return !!obj && typeof obj === 'object';
}

module.exports.usesPolymorphism = schema => {
  let polymorphism;

  if (schema.oneOf) {
    polymorphism = 'oneOf';
  } else if (schema.anyOf) {
    polymorphism = 'anyOf';
  } else if (schema.allOf) {
    polymorphism = 'allOf';
  }

  return polymorphism;
};

module.exports.objectify = thing => {
  if (!isObject(thing)) {
    return {};
  }

  return thing;
};

module.exports.normalizeArray = arr => {
  if (Array.isArray(arr)) {
    return arr;
  }

  return [arr];
};

module.exports.isFunc = thing => {
  return typeof thing === 'function';
};

// Deeply strips a specific key from an object.
//
// `predicate` can be used to discriminate the stripping further,
// by preserving the key's place in the object based on its value.
const deeplyStripKey = (input, keyToStrip, predicate = () => true) => {
  if (typeof input !== 'object' || Array.isArray(input) || input === null || !keyToStrip) {
    return input;
  }

  const obj = { ...input };

  Object.keys(obj).forEach(k => {
    if (k === keyToStrip && predicate(obj[k], k)) {
      delete obj[k];
      return;
    }

    obj[k] = deeplyStripKey(obj[k], keyToStrip, predicate);
  });

  return obj;
};

module.exports.deeplyStripKey = deeplyStripKey;
