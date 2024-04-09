/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-param-reassign */
import type { Merge } from 'type-fest';

/**
 * This file has been extracted and modified from `swagger-client`.
 *
 * @license Apache 2.0
 * @link https://npm.im/swagger-client
 * @link https://github.com/swagger-api/swagger-js/blob/master/src/execute/oas3/style-serializer.js
 */

const isRfc3986Reserved = (char: string) => ":/?#[]@!$&'()*+,;=".indexOf(char) > -1;
const isRfc3986Unreserved = (char: string) => /^[a-z0-9\-._~]+$/i.test(char);

function isURIEncoded(value: string) {
  try {
    return decodeURIComponent(value) !== value;
  } catch (err) {
    // `decodeURIComponent` will throw an exception if a string that has an un-encoded percent sign
    //  in it (like 20%), o if it's throwing we can just assume that the value hasn't been encoded.
    return false;
  }
}

function isObject(value: unknown) {
  return typeof value === 'object' && value !== null;
}

export function encodeDisallowedCharacters(
  str: string,
  {
    escape,
    returnIfEncoded = false,
    isAllowedReserved,
  }: {
    escape?: boolean | 'unsafe';
    isAllowedReserved?: boolean;
    returnIfEncoded?: boolean;
  } = {},
  parse?: boolean,
) {
  if (typeof str === 'number') {
    str = (str as number).toString();
  }

  if (returnIfEncoded) {
    if (isURIEncoded(str)) {
      return str;
    }
  }

  if (typeof str !== 'string' || !str.length) {
    return str;
  }

  if (!escape) {
    return str;
  }

  if (parse) {
    return JSON.parse(str);
  }

  // In ES6 you can do this quite easily by using the new ... spread operator. This causes the
  // string iterator (another new ES6 feature) to be used internally, and because that iterator is
  // designed to deal with code points rather than UCS-2/UTF-16 code units.
  return [...str]
    .map(char => {
      if (isRfc3986Unreserved(char)) {
        return char;
      }

      if (isRfc3986Reserved(char) && (escape === 'unsafe' || isAllowedReserved)) {
        return char;
      }

      const encoder = new TextEncoder();
      const encoded = Array.from(encoder.encode(char))
        .map(byte => `0${byte.toString(16).toUpperCase()}`.slice(-2))
        .map(encodedByte => `%${encodedByte}`)
        .join('');

      return encoded;
    })
    .join('');
}

export interface StylizerConfig {
  escape: boolean | 'unsafe';
  explode?: boolean;
  isAllowedReserved?: boolean;
  key: string;
  location: 'body' | 'query';
  style: 'deepObject' | 'form' | 'label' | 'matrix' | 'pipeDelimited' | 'simple' | 'spaceDelimited';
  value: any;
}

export function stylize(config: StylizerConfig) {
  const { value } = config;

  if (Array.isArray(value)) {
    return encodeArray(config);
  }

  if (isObject(value)) {
    return encodeObject(config);
  }

  return encodePrimitive(config);
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#style-examples}
 */
function encodeArray({
  location,
  key,
  value,
  style,
  explode,
  escape,
  isAllowedReserved = false,
}: Merge<StylizerConfig, { value: string[] }>) {
  const valueEncoder = (str: string) =>
    encodeDisallowedCharacters(str, {
      escape,
      returnIfEncoded: location === 'query',
      isAllowedReserved,
    });

  switch (style) {
    /**
     * @example <caption>`style: simple`</caption>
     * `["blue","black","brown"]` → `blue,black,brown`
     */
    case 'simple':
      return value.map(val => valueEncoder(val)).join(',');

    /**
     * @example <caption>`style: label`</caption>
     * `["blue","black","brown"]` → `.blue.black.brown`
     */
    case 'label':
      return `.${value.map(val => valueEncoder(val)).join('.')}`;

    /**
     * @example <caption>`style: matrix` + `explode: true`</caption>
     * `["blue","black","brown"]` → `;color=blue;color=black;color=brown`
     *
     * @example <caption>`style: matrix` + `explode: false` (the default behavior)</caption>
     * `["blue","black","brown"]` → `;color=blue,black,brown	`
     */
    case 'matrix':
      return value
        .map(val => valueEncoder(val))
        .reduce((prev, curr) => {
          if (!prev || explode) {
            return `${prev || ''};${key}=${curr}`;
          }
          return `${prev},${curr}`;
        }, '');

    /**
     * @example <caption>`style: form` + `explode: true`</caption>
     * `["blue","black","brown"]` → `color=blue&color=black&color=brown`
     *
     * @example <caption>`style: form` + `explode: false` (the default behavior)</caption>
     * `["blue","black","brown"]` → `color=blue,black,brown`
     */
    case 'form':
      return value.map(val => valueEncoder(val)).join(explode ? `&${key}=` : ',');

    /**
     * @example <caption>`style: spaceDelimited`</caption>
     * `["blue","black","brown"]` → `blue%20black%20brown`
     */
    case 'spaceDelimited':
      return value.map(val => valueEncoder(val)).join(` ${explode ? `${key}=` : ''}`);

    /**
     * @example <caption>`style: pipeDelimited`</caption>
     * `["blue","black","brown"]` → `blue|black|brown`
     */
    case 'pipeDelimited':
      return value.map(val => valueEncoder(val)).join(`|${explode ? `${key}=` : ''}`);

    default:
      return undefined;
  }
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#style-examples}
 */
function encodeObject({ location, key, value, style, explode, escape, isAllowedReserved = false }: StylizerConfig) {
  const valueEncoder = (str: string) =>
    encodeDisallowedCharacters(str, {
      escape,
      returnIfEncoded: location === 'query',
      isAllowedReserved,
    });

  const valueKeys = Object.keys(value);

  switch (style) {
    /**
     * @example <caption>`style: simple` + `explode: true`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `R=100,G=200,B=150`
     *
     * @example <caption>`style: simple` + `explode: false` (the default behavior)</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `R,100,G,200,B,150`
     */
    case 'simple':
      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const middleChar = explode ? '=' : ',';
        const prefix = prev ? `${prev},` : '';

        return `${prefix}${curr}${middleChar}${val}`;
      }, '');

    /**
     * @example <caption>`style: label` + `explode: true`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `.R=100.G=200.B=150`
     *
     * @example <caption>`style: label` + `explode: false` (the default behavior)</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `.R.100.G.200.B.150`
     */
    case 'label':
      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const middleChar = explode ? '=' : '.';
        const prefix = prev ? `${prev}.` : '.';

        return `${prefix}${curr}${middleChar}${val}`;
      }, '');

    /**
     * @example <caption>`style: matrix` + `explode: true`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `;R=100;G=200;B=150`
     *
     * @example <caption>`style: matrix` + `explode: false` (the default behavior)</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `;color=R,100,G,200,B,150`
     */
    case 'matrix':
      if (explode) {
        return valueKeys.reduce((prev, curr) => {
          const val = valueEncoder(value[curr]);
          const prefix = prev ? `${prev};` : ';';

          return `${prefix}${curr}=${val}`;
        }, '');
      }

      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const prefix = prev ? `${prev},` : `;${key}=`;

        return `${prefix}${curr},${val}`;
      }, '');

    /**
     * @example <caption>`style: form` + `explode: true`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `R=100&G=200&B=150`
     *
     * @example <caption>`style: form` + `explode: false` (the default behavior)</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `color=R,100,G,200,B,150`
     */
    case 'form':
      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const prefix = prev ? `${prev}${explode ? '&' : ','}` : '';
        const separator = explode ? '=' : ',';

        return `${prefix}${curr}${separator}${val}`;
      }, '');

    /**
     * @example <caption>`style: spaceDelimited`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `R%20100%20G%20200%20B%20150`
     */
    case 'spaceDelimited':
      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const prefix = prev ? `${prev} ` : '';

        return `${prefix}${curr} ${val}`;
      }, '');

    /**
     * @example <caption>`style: pipeDelimited`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `R|100|G|200|B|150`
     */
    case 'pipeDelimited':
      return valueKeys.reduce((prev, curr) => {
        const val = valueEncoder(value[curr]);
        const prefix = prev ? `${prev}|` : '';

        return `${prefix}${curr}|${val}`;
      }, '');

    /**
     * @example <caption>`style: deepObject`</caption>
     * `{ "R": 100, "G": 200, "B": 150 }` → `color[R]=100&color[G]=200&color[B]=150`
     */
    case 'deepObject':
      return valueKeys.reduce(curr => {
        const val = valueEncoder(value[curr]);
        return `${val}`;
      }, '');

    default:
      return undefined;
  }
}

/**
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#style-examples}
 */
function encodePrimitive({ location, key, value, style, escape, isAllowedReserved = false }: StylizerConfig) {
  const valueEncoder = (str: string) =>
    encodeDisallowedCharacters(str, {
      escape,
      returnIfEncoded: location === 'query' || location === 'body',
      isAllowedReserved,
    });

  switch (style) {
    /**
     * @example <caption>`style: simple`</caption>
     * `blue` → `blue`
     */
    case 'simple':
      return valueEncoder(value);

    /**
     * @example <caption>`style: label`</caption>
     * `blue` → `.blue`
     */
    case 'label':
      return `.${valueEncoder(value)}`;

    /**
     * @example <caption>`style: matrix`</caption>
     * `blue` → `;color=blue`
     */
    case 'matrix':
      if (value === '') {
        return `;${key}`;
      }

      return `;${key}=${valueEncoder(value)}`;

    /**
     * @example <caption>`style: form`</caption>
     * `blue` → `color=blue`
     */
    case 'form':
      return valueEncoder(value);

    /**
     * @example <caption>`style: deepObject`</caption>
     * `blue` → n/a
     */
    case 'deepObject':
      return valueEncoder(value);

    default:
      return undefined;
  }
}
