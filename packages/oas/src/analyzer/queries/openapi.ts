import type { OASDocument } from '../../types.js';

import Oas from '../../index.js';
import { query, refizePointer } from '../util.js';

/**
 * Determine if a given API definition uses the `additionalProperties` schema property.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function additionalProperties(definition: OASDocument): string[] {
  return query(['$..additionalProperties'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes `callbacks`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
 */
export function callbacks(definition: OASDocument): string[] {
  return query(['$.components.callbacks', '$.paths..callbacks'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition has circular refs.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export async function circularRefs(definition: OASDocument): Promise<string[]> {
  // Dereferencing will update the passed in variable, which we don't want to do, so we
  // instantiated `Oas` with a clone.
  // eslint-disable-next-line try-catch-failsafe/json-parse
  const oas = new Oas(JSON.parse(JSON.stringify(definition)));
  await oas.dereference();

  const results = oas.getCircularReferences();

  results.sort();
  return results;
}

/**
 * Determine if a given API definition utilizes common parameters.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 */
export function commonParameters(definition: OASDocument): string[] {
  return query(['$..paths[*].parameters'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes discriminators.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#discriminator-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#discriminator-object}
 */
export function discriminators(definition: OASDocument): string[] {
  return query(['$..discriminator'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Calculate the size of the raw and dereferenced OpenAPI file in MB.
 *
 */
export async function fileSize(definition: OASDocument): Promise<{ raw: number; dereferenced: number }> {
  const oas = new Oas(structuredClone(definition));

  const originalSizeInBytes = Buffer.from(JSON.stringify(oas.api)).length;
  const raw = Number((originalSizeInBytes / (1024 * 1024)).toFixed(2));

  await oas.dereference();

  const dereferencedSizeInBytes = Buffer.from(JSON.stringify(oas)).length;
  const dereferenced = Number((dereferencedSizeInBytes / (1024 * 1024)).toFixed(2));

  return { raw, dereferenced };
}

/**
 * Determine if a given API definition utilizes `links`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#link-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#link-object}
 */
export function links(definition: OASDocument): string[] {
  return query(['$..links'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine all of the available media types used within an API definition.
 *
 * @todo This query currently picks up false positives if there is an object named `content`.
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#request-body-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#request-body-object}
 */
export function mediaTypes(definition: OASDocument): string[] {
  const results = Array.from(
    new Set(
      query(['$..paths..content'], definition)
        .map(res => {
          // This'll transform `results`, which looks like `[['application/json'], ['text/xml']]`
          // into `['application/json', 'text/xml']`.
          return Object.keys(res.value);
        })
        .flat(),
    ),
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
export function parameterSerialization(definition: OASDocument): string[] {
  return query(['$..parameters[*].style^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes schema polymorphism and/of interitance.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function polymorphism(definition: OASDocument): string[] {
  const results = Array.from(
    new Set(query(['$..allOf^', '$..anyOf^', '$..oneOf^'], definition).map(res => refizePointer(res.pointer))),
  );

  results.sort();
  return results;
}

/**
 * Determine every kind of security type that a given API definition has documented.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-scheme-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object}
 */
export function securityTypes(definition: OASDocument): string[] {
  return Array.from(new Set(query(['$.components.securitySchemes..type'], definition).map(res => res.value as string)));
}

/**
 * Determine if a given API definition utilizes server variables.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#server-variable-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-variable-object}
 */
export function serverVariables(definition: OASDocument): string[] {
  return query(['$.servers..variables^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine how many operations are defined in a given API definition.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operation-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operation-object}
 */
export function totalOperations(definition: OASDocument): number {
  return query(['$..paths[*]'], definition)
    .map(res => Object.keys(res.value))
    .flat().length;
}

/**
 * Determine if a given API definition utilizes `webhooks` support in OpenAPI 3.1.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasWebhooks}
 */
export function webhooks(definition: OASDocument): string[] {
  return query(['$.webhooks[*]'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition has XML schemas, payloads, or responses.
 *
 * @deprecated The data contained within this has been split apart into `xmlSchemas`, `xmlRequests`, and `xmlResponses`. This property will be removed in a future release.
 * @see xmlSchemas
 * @see xmlRequests
 * @see xmlResponses
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#xml-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xml-object}
 */
export function xml(definition: OASDocument): string[] {
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
    definition,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilises the XML object for defining XML schemas.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#xml-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xml-object}
 */
export function xmlSchemas(definition: OASDocument): string[] {
  return query(
    [
      '$.components.schemas..xml^',
      '$..parameters..xml^',
      '$..requestBody..xml^',

      // "$..requestBody..['application/xml']",
      // "$..requestBody..['application/xml-external-parsed-entity']",
      // "$..requestBody..['application/xml-dtd']",
      // "$..requestBody..['text/xml']",
      // "$..requestBody..['text/xml-external-parsed-entity']",
      // '$..requestBody.content[?(@property.match(/\\+xml$/i))]',

      // "$..responses..['application/xml']",
      // "$..responses..['application/xml-external-parsed-entity']",
      // "$..responses..['application/xml-dtd']",
      // "$..responses..['text/xml']",
      // "$..responses..['text/xml-external-parsed-entity']",
      // '$..responses[*].content[?(@property.match(/\\+xml$/i))]',
    ],
    definition,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition uses XML in a request body payload.
 *
 * @todo detect `+xml` media types
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 */
export function xmlRequests(definition: OASDocument): string[] {
  return query(
    [
      // '$.components.schemas..xml^',
      // '$..parameters..xml^',
      // '$..requestBody..xml^',

      "$..requestBody..['application/xml']",
      "$..requestBody..['application/xml-external-parsed-entity']",
      "$..requestBody..['application/xml-dtd']",
      "$..requestBody..['text/xml']",
      "$..requestBody..['text/xml-external-parsed-entity']",
      '$..requestBody.content[?(@property.match(/\\+xml$/i))]',

      // "$..responses..['application/xml']",
      // "$..responses..['application/xml-external-parsed-entity']",
      // "$..responses..['application/xml-dtd']",
      // "$..responses..['text/xml']",
      // "$..responses..['text/xml-external-parsed-entity']",
      // '$..responses[*].content[?(@property.match(/\\+xml$/i))]',
    ],
    definition,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition uses XML in a response body.
 *
 * @todo detect `+xml` media types
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 */
export function xmlResponses(definition: OASDocument): string[] {
  return query(
    [
      // '$.components.schemas..xml^',
      // '$..parameters..xml^',
      // '$..requestBody..xml^',

      // "$..requestBody..['application/xml']",
      // "$..requestBody..['application/xml-external-parsed-entity']",
      // "$..requestBody..['application/xml-dtd']",
      // "$..requestBody..['text/xml']",
      // "$..requestBody..['text/xml-external-parsed-entity']",
      // '$..requestBody.content[?(@property.match(/\\+xml$/i))]',

      "$..responses..['application/xml']",
      "$..responses..['application/xml-external-parsed-entity']",
      "$..responses..['application/xml-dtd']",
      "$..responses..['text/xml']",
      "$..responses..['text/xml-external-parsed-entity']",
      '$..responses[*].content[?(@property.match(/\\+xml$/i))]',
    ],
    definition,
  ).map(res => refizePointer(res.pointer));
}
