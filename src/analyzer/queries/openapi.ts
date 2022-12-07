import type { OASDocument } from '../../rmoas.types';

import Oas from '../..';
import { query, refizePointer } from '../util';

/**
 * Determine if a given API definition uses the `additionalProperties` schema property.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function additionalProperties(definition: OASDocument) {
  return query(['$..additionalProperties'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes `callbacks`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callbackObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callbackObject}
 */
export function callbacks(definition: OASDocument) {
  return query(['$.components.callbacks', '$.paths..callbacks'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition has circular refs.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export async function circularRefs(definition: OASDocument) {
  // Dereferencing will update the passed in variable, which we don't want to do, so we
  // instantiated `Oas` with a clone.
  const oas = new Oas(JSON.parse(JSON.stringify(definition)));
  await oas.dereference();

  const results = oas.getCircularReferences();

  results.sort();
  return results;
}

/**
 * Determine if a given API definition utilizes discriminators.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#discriminatorObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#discriminatorObject}
 */
export function discriminators(definition: OASDocument) {
  return query(['$..discriminator'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes `links`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#linkObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#linkObject}
 */
export function links(definition: OASDocument) {
  return query(['$..links'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine all of the available media types used within an API definition.
 *
 * @todo This query currently picks up false positives if there is an object named `content`.
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#request-body-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#request-body-object}
 */
export function mediaTypes(definition: OASDocument) {
  const results = Array.from(
    new Set(
      query(['$..paths..content'], definition)
        .map(res => {
          // This'll transform `results`, which looks like `[['application/json'], ['text/xml']]`
          // into `['application/json', 'text/xml']`.
          return Object.keys(res.value);
        })
        .flat()
    )
  );

  results.sort();
  return results;
}

/**
 * Determine if a given API definition uses parameter serialization.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#parameter-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#parameter-object}
 */
export function parameterSerialization(definition: OASDocument) {
  return query(['$..parameters[*].style^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes schema polymorphism and/of interitance.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function polymorphism(definition: OASDocument) {
  const results = Array.from(
    new Set(query(['$..allOf^', '$..anyOf^', '$..oneOf^'], definition).map(res => refizePointer(res.pointer)))
  );

  results.sort();
  return results;
}

/**
 * Determine every kind of security type that a given API definition has documented.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#securitySchemeObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#securitySchemeObject}
 */
export function securityTypes(definition: OASDocument) {
  return Array.from(new Set(query(['$.components.securitySchemes..type'], definition).map(res => res.value as string)));
}

/**
 * Determine if a given API definition utilizes server variables.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#serverVariableObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#serverVariableObject}
 */
export function serverVariables(definition: OASDocument) {
  return query(['$.servers..variables^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine how many operations are defined in a given API definition.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operationObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operationObject}
 */
export function totalOperations(definition: OASDocument) {
  return query(['$..paths[*]'], definition)
    .map(res => Object.keys(res.value))
    .flat().length;
}

/**
 * Determine if a given API definition utilizes `webhooks` support in OpenAPI 3.1.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasObject}
 */
export function webhooks(definition: OASDocument) {
  return query(['$.webhooks[*]'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition has XML schemas, payloads, or responses.
 *
 * @todo detect `+xml` media types
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#xmlObject}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xmlObject}
 */
export function xml(definition: OASDocument) {
  return query(
    [
      '$.components.schemas..xml^',
      '$..parameters..xml^',
      '$..requestBody..xml^',

      "$..requestBody..['application/xml']",
      "$..requestBody..['application/xml-external-parsed-entity']",
      "$..requestBody..['application/xml-dtd']",
      "$..requestBody..['text/xml']",
      "$..requestBody..['text/xml-external-parsed-entity']",
      '$..requestBody.content[?(@property.match(/\\+xml$/i))]',

      "$..responses..['application/xml']",
      "$..responses..['application/xml-external-parsed-entity']",
      "$..responses..['application/xml-dtd']",
      "$..responses..['text/xml']",
      "$..responses..['text/xml-external-parsed-entity']",
      '$..responses[*].content[?(@property.match(/\\+xml$/i))]',
    ],
    definition
  ).map(res => refizePointer(res.pointer));
}
