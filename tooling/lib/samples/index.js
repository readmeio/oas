/* eslint-disable consistent-return */
/**
 * This file has been extracted and modified from Swagger UI.
 *
 * @license Apache 2.0
 * @link https://github.com/swagger-api/swagger-ui/blob/master/src/core/plugins/samples/fn.js
 */

const { objectify, isFunc, normalizeArray, deeplyStripKey } = require('./utils');
const memoizee = require('memoizee');

const primitives = {
  string: () => 'string',
  string_email: () => 'user@example.com',
  'string_date-time': () => new Date().toISOString(),
  string_date: () => new Date().toISOString().substring(0, 10),
  string_uuid: () => '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  string_hostname: () => 'example.com',
  string_ipv4: () => '198.51.100.42',
  string_ipv6: () => '2001:0db8:5b96:0000:0000:426f:8e17:642a',
  number: () => 0,
  number_float: () => 0.0,
  integer: () => 0,
  boolean: schema => (typeof schema.default === 'boolean' ? schema.default : true),
};

const primitive = schema => {
  schema = objectify(schema);
  const { type, format } = schema;

  const fn = primitives[`${type}_${format}`] || primitives[type];

  if (isFunc(fn)) {
    return fn(schema);
  }

  return `Unknown Type: ${schema.type}`;
};

const sampleFromSchema = (schema, config = {}) => {
  const objectifySchema = objectify(schema);
  let { type } = objectifySchema;
  const { example, properties, additionalProperties, items } = objectifySchema;

  const { includeReadOnly, includeWriteOnly } = config;

  if (example !== undefined) {
    return deeplyStripKey(example, '$$ref', val => {
      // do a couple of quick sanity tests to ensure the value
      // looks like a $$ref that swagger-client generates.
      return typeof val === 'string' && val.indexOf('#') > -1;
    });
  }

  if (!type) {
    if (properties || additionalProperties) {
      type = 'object';
    } else if (items) {
      type = 'array';
    } else {
      return;
    }
  }

  if (type === 'object') {
    const props = objectify(properties);
    const obj = {};
    // eslint-disable-next-line no-restricted-syntax
    for (const name in props) {
      if (props[name] && props[name].deprecated) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[name] && props[name].readOnly && !includeReadOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[name] && props[name].writeOnly && !includeWriteOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      obj[name] = sampleFromSchema(props[name], config);
    }

    if (additionalProperties === true) {
      obj.additionalProp = {};
    } else if (additionalProperties) {
      const additionalProps = objectify(additionalProperties);
      const additionalPropVal = sampleFromSchema(additionalProps, config);

      obj.additionalProp = additionalPropVal;
    }

    return obj;
  }

  if (type === 'array') {
    if (Array.isArray(items.anyOf)) {
      return items.anyOf.map(i => sampleFromSchema(i, config));
    }

    if (Array.isArray(items.oneOf)) {
      return items.oneOf.map(i => sampleFromSchema(i, config));
    }

    return [sampleFromSchema(items, config)];
  }

  if (schema.enum) {
    if (schema.default) {
      return schema.default;
    }

    return normalizeArray(schema.enum)[0];
  }

  if (type === 'file') {
    return;
  }

  return primitive(schema);
};

module.exports.sampleFromSchema = sampleFromSchema;

/* module.exports.inferSchema = thing => {
  if (thing.schema) {
    thing = thing.schema;
  }

  if (thing.properties) {
    thing.type = 'object';
  }

  return thing; // Hopefully this will have something schema like in it... `type` for example
}; */

/* const sampleXmlFromSchema = (schema, config = {}) => {
  const objectifySchema = deepAssign({}, objectify(schema));
  // eslint-disable-next-line prefer-const
  let { type, properties, additionalProperties, items, example } = objectifySchema;
  const { includeReadOnly, includeWriteOnly } = config;
  const defaultValue = objectifySchema.default;
  const res = {};
  const _attr = {};
  const { xml } = schema;
  // eslint-disable-next-line prefer-const
  let { name, prefix, namespace } = xml;
  const enumValue = objectifySchema.enum;
  // let displayName;
  let value;

  if (!type) {
    if (properties || additionalProperties) {
      type = 'object';
    } else if (items) {
      type = 'array';
    } else {
      return;
    }
  }

  name = name || 'notagname';
  // add prefix to name if exists
  const displayName = (prefix ? `${prefix}:` : '') + name;
  if (namespace) {
    // add prefix to namespace if exists
    const namespacePrefix = prefix ? `xmlns:${prefix}` : 'xmlns';
    _attr[namespacePrefix] = namespace;
  }

  if (type === 'array') {
    if (items) {
      items.xml = items.xml || xml || {};
      items.xml.name = items.xml.name || xml.name;

      if (xml.wrapped) {
        res[displayName] = [];
        if (Array.isArray(example)) {
          example.forEach(v => {
            items.example = v;
            res[displayName].push(sampleXmlFromSchema(items, config));
          });
        } else if (Array.isArray(defaultValue)) {
          defaultValue.forEach(v => {
            items.default = v;
            res[displayName].push(sampleXmlFromSchema(items, config));
          });
        } else {
          res[displayName] = [sampleXmlFromSchema(items, config)];
        }

        if (_attr) {
          res[displayName].push({ _attr });
        }

        return res;
      }

      const _res = [];

      if (Array.isArray(example)) {
        example.forEach(v => {
          items.example = v;
          _res.push(sampleXmlFromSchema(items, config));
        });

        return _res;
      } else if (Array.isArray(defaultValue)) {
        defaultValue.forEach(v => {
          items.default = v;
          _res.push(sampleXmlFromSchema(items, config));
        });

        return _res;
      }

      return sampleXmlFromSchema(items, config);
    }
  }

  if (type === 'object') {
    const props = objectify(properties);
    res[displayName] = [];
    example = example || {};

    // eslint-disable-next-line no-restricted-syntax
    for (const propName in props) {
      // eslint-disable-next-line no-prototype-builtins
      if (!props.hasOwnProperty(propName)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[propName].readOnly && !includeReadOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      if (props[propName].writeOnly && !includeWriteOnly) {
        // eslint-disable-next-line no-continue
        continue;
      }

      props[propName].xml = props[propName].xml || {};

      if (props[propName].xml.attribute) {
        const enumAttrVal = Array.isArray(props[propName].enum) && props[propName].enum[0];
        const attrExample = props[propName].example;
        const attrDefault = props[propName].default;
        _attr[props[propName].xml.name || propName] =
          (attrExample !== undefined && attrExample) ||
          (example[propName] !== undefined && example[propName]) ||
          (attrDefault !== undefined && attrDefault) ||
          enumAttrVal ||
          primitive(props[propName]);
      } else {
        props[propName].xml.name = props[propName].xml.name || propName;
        if (props[propName].example === undefined && example[propName] !== undefined) {
          props[propName].example = example[propName];
        }

        const t = sampleXmlFromSchema(props[propName]);
        if (Array.isArray(t)) {
          res[displayName] = res[displayName].concat(t);
        } else {
          res[displayName].push(t);
        }
      }
    }

    if (additionalProperties === true) {
      res[displayName].push({ additionalProp: 'Anything can be here' });
    } else if (additionalProperties) {
      res[displayName].push({ additionalProp: primitive(additionalProperties) });
    }

    if (_attr) {
      res[displayName].push({ _attr });
    }

    return res;
  }

  if (example !== undefined) {
    value = example;
  } else if (defaultValue !== undefined) {
    // display example if exists
    value = defaultValue;
  } else if (Array.isArray(enumValue)) {
    // display enum first value
    value = enumValue[0];
  } else {
    // set default value
    value = primitive(schema);
  }

  res[displayName] = _attr ? [{ _attr }, value] : value;

  return res;
}; */

// module.exports.sampleXmlFromSchema = sampleXmlFromSchema;

/* const createXMLExample = function (schema, config) {
  const json = sampleXmlFromSchema(schema, config);
  if (!json) {
    return;
  }

  return XML(json, { declaration: true, indent: '\t' });
}; */

// module.exports.createXMLExample = createXMLExample;

// module.exports.memoizedCreateXMLExample = memoizee(createXMLExample);

module.exports.memoizedSampleFromSchema = memoizee(sampleFromSchema);
