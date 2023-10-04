import type { OASDocument } from '../../rmoas.types';

import { query, refizePointer } from '../util';

/**
 * Determine if a given API definition is using our `x-default` extension for defining auth
 * defaults.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#authentication-defaults}
 */
export function authDefaults(definition: OASDocument) {
  return query(["$.components.securitySchemes..['x-default']^"], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine all of the code sample languages, using the `x-readme.samples-languages` extension
 * that are specified within an API definition.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#code-sample-languages}
 */
export function codeSampleLanguages(definition: OASDocument) {
  const results: string[] = Array.from(
    new Set(
      query(["$..['x-readme']['samples-languages']", "$..['x-samples-languages']"], definition)
        .map(res => res.value as string)
        .reduce((prev, next) => prev.concat(next), []),
    ),
  );

  results.sort();
  return results;
}

/**
 * Determine if a given API defintion is using the `x-samples-enabled` extension for disabling
 * code samples.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#disable-code-examples}
 */
export function codeSamplesDisabled(definition: OASDocument) {
  return Array.from(
    new Set(
      query(
        [
          "$['x-samples-enabled']^",
          "$['x-readme']['samples-enabled']",
          "$..paths[*]..['x-samples-enabled']^",
          "$..paths[*]..['x-readme']['samples-enabled']^^",
        ],
        definition,
      ).map(res => refizePointer(res.pointer)),
    ),
  );
}

/**
 * Determine if a given API definition is using our `x-proxy-enabled` extension for disabling the
 * "Try It" CORS proxy.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#cors-proxy-enabled}
 */
export function corsProxyDisabled(definition: OASDocument) {
  return Array.from(
    new Set(
      query(
        [
          "$['x-proxy-enabled']^",
          "$['x-readme']['proxy-enabled']",
          "$..paths[*]..['x-proxy-enabled']^",
          "$..paths[*]..['x-readme']['proxy-enabled']^^",
        ],
        definition,
      ).map(res => refizePointer(res.pointer)),
    ),
  );
}

/**
 * Determine if a given API definition is using our `x-code-samples` extension for documentating
 * custom code samples.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#custom-code-samples}
 */
export function customCodeSamples(definition: OASDocument) {
  return query(["$..['x-code-samples']", "$..['x-readme']['code-samples']"], definition)
    .filter(res => {
      // If `code-samples` is an empty array then we ignore it.
      return Array.isArray(res.value) && res.value.length ? res : false;
    })
    .map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition is using our `x-explorer-enabled` extension for disabling
 * "Try It" functionality.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#disable-the-api-explorer}
 */
export function explorerDisabled(definition: OASDocument) {
  return query(
    [
      "$['x-explorer-enabled']^",
      "$['x-readme']['explorer-enabled']",
      "$..paths[*]..['x-explorer-enabled']^",
      "$..paths[*]..['x-readme']['explorer-enabled']^^",
    ],
    definition,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition uses the `RAW_BODY` manual API hack for raw body content.
 *
 * @see {@link https://docs.readme.com/main/docs/manual-api-editor#raw-body-content-body-content}
 */
export function rawBody(definition: OASDocument) {
  return query(['$..RAW_BODY^^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition is using our `x-readme.headers` extension for defining
 * static headers.
 *
 * @see {@link https://docs.readme.com/main/docs/openapi-extensions#static-headers}
 */
export function staticHeaders(definition: OASDocument) {
  return query(["$..['x-headers']", "$..['x-readme']['headers']"], definition)
    .filter(res => {
      // If `headers` is an empty array then we ignore it.
      return Array.isArray(res.value) && res.value.length ? res : false;
    })
    .map(res => refizePointer(res.pointer));
}
