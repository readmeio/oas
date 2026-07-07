import type { OASDocument } from '../../types.js';
import type { OperationScope } from '../scope.js';
import type { JSONPathResult } from '../util.js';

import { dereferenceOas } from '../dereference.js';
import { queryCached } from '../query-cache.js';
import { isAncestorOfScope, isPointerInScope, toPointer } from '../scope.js';
import { refizePointer } from '../util.js';

/**
 * Narrow a set of JSONPath results down to only the ones that fall within a given operation's
 * scope. When no scope is supplied every result is considered in scope, which preserves the
 * whole-document behavior these queries have always had.
 *
 */
function filterByScope(results: JSONPathResult[], scope?: OperationScope): JSONPathResult[] {
  if (!scope) {
    return results;
  }

  return results.filter(res => isPointerInScope(res.pointer, scope));
}

/**
 * Determine if a given API definition uses the `additionalProperties` schema property.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function additionalProperties(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$..additionalProperties'], definition), scope).map(res =>
    refizePointer(res.pointer),
  );
}

/**
 * Determine if a given API definition utilizes `callbacks`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#callback-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#callback-object}
 */
export function callbacks(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(
    queryCached(['$.components.callbacks', '$.paths.*[?(@.callbacks)].callbacks'], definition),
    scope,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition has circular refs.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export async function circularRefs(definition: OASDocument, scope?: OperationScope): Promise<string[]> {
  // Dereferencing will update the passed in variable, which we don't want to do, so we
  // instantiated `Oas` with a clone.
  const { circularRefs: refs } = await dereferenceOas(structuredClone(definition));

  const results = scope ? refs.filter(ref => isPointerInScope(toPointer(ref), scope)) : [...refs];
  results.sort();
  return results;
}

/**
 * Determine if a given API definition utilizes common parameters.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#path-item-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#path-item-object}
 */
export function commonParameters(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$..paths[*].parameters'], definition), scope).map(res =>
    refizePointer(res.pointer),
  );
}

/**
 * Determine if a given API definition utilizes discriminators.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#discriminator-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#discriminator-object}
 */
export function discriminators(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$..discriminator'], definition), scope).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilizes `links`.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#link-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#link-object}
 */
export function links(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$.components.links', '$.paths..responses.*.links'], definition), scope).map(res =>
    refizePointer(res.pointer),
  );
}

/**
 * Determine all of the available media types used within an API definition.
 *
 * @todo This query currently picks up false positives if there is an object named `content`.
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#request-body-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#request-body-object}
 */
export function mediaTypes(definition: OASDocument, scope?: OperationScope): string[] {
  const results = Array.from(
    new Set(
      filterByScope(queryCached(['$..paths..content'], definition), scope).flatMap(res => {
        // This'll transform `results`, which looks like `[['application/json'], ['text/xml']]`
        // into `['application/json', 'text/xml']`.
        return Object.keys(res.value);
      }),
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
export function parameterSerialization(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$..parameters[*].style^'], definition), scope).map(res =>
    refizePointer(res.pointer),
  );
}

/**
 * Determine if a given API definition utilizes schema polymorphism and/of interitance.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#schema-object}
 */
export function polymorphism(definition: OASDocument, scope?: OperationScope): string[] {
  const results = Array.from(
    new Set(
      filterByScope(queryCached(['$..allOf^', '$..anyOf^', '$..oneOf^'], definition), scope).map(res =>
        refizePointer(res.pointer),
      ),
    ),
  );

  results.sort();
  return results;
}

/**
 * Determine if a given API definition utilizes `$ref` pointers.
 *
 */
export function references(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(queryCached(['$..$ref^'], definition), scope).map(res => refizePointer(res.pointer));
}

/**
 * Determine every kind of security type that a given API definition has documented.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#security-scheme-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#security-scheme-object}
 */
export function securityTypes(definition: OASDocument, scope?: OperationScope): string[] {
  return Array.from(
    new Set(
      filterByScope(queryCached(['$.components.securitySchemes..type'], definition), scope).map(
        res => res.value as string,
      ),
    ),
  );
}

/**
 * Determine if a given API definition utilizes server variables.
 *
 * Root-level `servers` apply to every operation unless a path or operation overrides them, so
 * these are always considered in scope regardless of which operation is being analyzed.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#server-variable-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-variable-object}
 */
export function serverVariables(definition: OASDocument): string[] {
  return queryCached(['$.servers..variables^'], definition).map(res => refizePointer(res.pointer));
}

/**
 * Determine how many operations are defined in a given API definition.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#operation-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#operation-object}
 */
export function totalOperations(definition: OASDocument): number {
  return queryCached(['$..paths[*]'], definition).flatMap(res => Object.keys(res.value)).length;
}

/**
 * Determine if a given API definition utilizes `webhooks` support in OpenAPI 3.1.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#oasWebhooks}
 */
export function webhooks(definition: OASDocument, scope?: OperationScope): string[] {
  const results = queryCached(['$.webhooks[*]'], definition);
  if (!scope) {
    return results.map(res => refizePointer(res.pointer));
  }

  // This query reports on an entire webhook (`/webhooks/newBooking`) rather than a specific
  // method on it, so a scope's root pointer (`/webhooks/newBooking/post`) is a *descendant* of a
  // matching result rather than the other way around. We still want to catch the normal case too,
  // where an operation reaches into a webhook by way of a `$ref`.
  return results
    .filter(res => isPointerInScope(res.pointer, scope) || isAncestorOfScope(res.pointer, scope))
    .map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition uses XML in a request body payload.
 *
 * @todo detect `+xml` media types
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 */
export function xmlRequests(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(
    queryCached(
      [
        "$..requestBody..['application/xml']",
        "$..requestBody..['application/xml-external-parsed-entity']",
        "$..requestBody..['application/xml-dtd']",
        "$..requestBody..['text/xml']",
        "$..requestBody..['text/xml-external-parsed-entity']",
        '$..requestBody.content[?(@property.match(/\\+xml$/i))]',
      ],
      definition,
    ),
    scope,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition uses XML in a response body.
 *
 * @todo detect `+xml` media types
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#media-type-object}
 */
export function xmlResponses(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(
    queryCached(
      [
        "$..responses..['application/xml']",
        "$..responses..['application/xml-external-parsed-entity']",
        "$..responses..['application/xml-dtd']",
        "$..responses..['text/xml']",
        "$..responses..['text/xml-external-parsed-entity']",
        '$..responses[*].content[?(@property.match(/\\+xml$/i))]',
      ],
      definition,
    ),
    scope,
  ).map(res => refizePointer(res.pointer));
}

/**
 * Determine if a given API definition utilises the XML object for defining XML schemas.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#xml-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xml-object}
 */
export function xmlSchemas(definition: OASDocument, scope?: OperationScope): string[] {
  return filterByScope(
    queryCached(['$.components.schemas..xml^', '$..parameters..xml^', '$..requestBody..xml^'], definition),
    scope,
  ).map(res => refizePointer(res.pointer));
}
