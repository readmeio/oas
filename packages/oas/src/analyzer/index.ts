import type { OASDocument } from '../types.js';
import type { OperationScope } from './scope.js';
import type { OASAnalysis } from './types.js';

import { dereferenceOasShared } from './dereference.js';
import {
  additionalProperties as analyzeAdditionalProperties,
  callbacks as analyzeCallbacks,
  circularRefs as analyzeCircularRefs,
  commonParameters as analyzeCommonParameters,
  discriminators as analyzeDiscriminators,
  links as analyzeLinks,
  mediaTypes as analyzeMediaTypes,
  parameterSerialization as analyzeParameterSerialization,
  polymorphism as analyzePolymorphism,
  references as analyzeReferences,
  securityTypes as analyzeSecurityTypes,
  serverVariables as analyzeServerVariables,
  totalOperations as analyzeTotalOperations,
  webhooks as analyzeWebhooks,
  xmlRequests as analyzeXMLRequests,
  xmlResponses as analyzeXMLResponses,
  xmlSchemas as analyzeXMLSchemas,
} from './queries/openapi.js';
import { computeOperationScope, computeWebhookScope, isPointerInScope, toPointer } from './scope.js';

export {
  analyzeAdditionalProperties,
  analyzeCallbacks,
  analyzeCircularRefs,
  analyzeCommonParameters,
  analyzeDiscriminators,
  analyzeLinks,
  analyzeMediaTypes,
  analyzeParameterSerialization,
  analyzePolymorphism,
  analyzeReferences,
  analyzeSecurityTypes,
  analyzeServerVariables,
  analyzeTotalOperations,
  analyzeWebhooks,
  analyzeXMLRequests,
  analyzeXMLResponses,
  analyzeXMLSchemas,
};

/**
 * Run every analyzer query against a definition, optionally narrowed down to a single operation or
 * webhook's `OperationScope`.
 *
 * This is the shared implementation behind `analyzer()`, `analyzeOperation()`, and
 * `analyzeWebhookOperation()`. Dereferencing (the most expensive step here) is cached against the
 * original `definition` reference via `dereferenceOasShared()`, and every JSONPath scan that the
 * individual queries run is cached against it as well, so calling this repeatedly for many
 * operations out of the same definition only pays the full-document cost once.
 *
 */
async function buildAnalysis(definition: OASDocument, scope?: OperationScope): Promise<OASAnalysis> {
  const { circularRefs: dereferencedCircularRefs } = await dereferenceOasShared(definition);

  const additionalProperties = analyzeAdditionalProperties(definition, scope);
  const callbacks = analyzeCallbacks(definition, scope);
  const circularRefs = (
    scope
      ? dereferencedCircularRefs.filter(ref => isPointerInScope(toPointer(ref), scope))
      : [...dereferencedCircularRefs]
  ).toSorted();
  const commonParameters = analyzeCommonParameters(definition, scope);
  const discriminators = analyzeDiscriminators(definition, scope);
  const links = analyzeLinks(definition, scope);
  const parameterSerialization = analyzeParameterSerialization(definition, scope);
  const polymorphism = analyzePolymorphism(definition, scope);
  const references = analyzeReferences(definition, scope);
  const serverVariables = analyzeServerVariables(definition);
  const xmlSchemas = analyzeXMLSchemas(definition, scope);
  const xmlRequests = analyzeXMLRequests(definition, scope);
  const xmlResponses = analyzeXMLResponses(definition, scope);
  const webhooks = analyzeWebhooks(definition, scope);

  const analysis: OASAnalysis = {
    general: {
      mediaTypes: {
        name: 'Media Type',
        found: analyzeMediaTypes(definition, scope),
      },
      operationTotal: {
        name: 'Operation',
        // A scoped analysis is, by definition, looking at exactly one operation.
        found: scope ? 1 : analyzeTotalOperations(definition),
      },
      securityTypes: {
        name: 'Security Type',
        found: analyzeSecurityTypes(definition, scope),
      },
    },
    openapi: {
      additionalProperties: {
        present: !!additionalProperties.length,
        locations: additionalProperties,
      },
      callbacks: {
        present: !!callbacks.length,
        locations: callbacks,
      },
      circularRefs: {
        present: !!circularRefs.length,
        locations: circularRefs,
      },
      commonParameters: {
        present: !!commonParameters.length,
        locations: commonParameters,
      },
      discriminators: {
        present: !!discriminators.length,
        locations: discriminators,
      },
      links: {
        present: !!links.length,
        locations: links,
      },
      style: {
        present: !!parameterSerialization.length,
        locations: parameterSerialization,
      },
      polymorphism: {
        present: !!polymorphism.length,
        locations: polymorphism,
      },
      references: {
        present: !!references.length,
        locations: references,
      },
      serverVariables: {
        present: !!serverVariables.length,
        locations: serverVariables,
      },
      xmlRequests: {
        present: !!xmlRequests.length,
        locations: xmlRequests,
      },
      xmlResponses: {
        present: !!xmlResponses.length,
        locations: xmlResponses,
      },
      xmlSchemas: {
        present: !!xmlSchemas.length,
        locations: xmlSchemas,
      },
      webhooks: {
        present: !!webhooks.length,
        locations: webhooks,
      },
    },
  };

  return analysis;
}

/**
 * Analyze a given OpenAPI or Swagger definition for any OpenAPI or JSON Schema feature uses it
 * may contain or utilize.
 *
 */
export async function analyzer(definition: OASDocument): Promise<OASAnalysis> {
  return buildAnalysis(definition);
}

/**
 * Analyze a single operation within a given OpenAPI definition for any OpenAPI or JSON Schema
 * feature uses that it, or anything it references, may contain or utilize.
 *
 * When analyzing many operations out of the same definition, pass the *same* `definition`
 * reference to every call — the expensive dereferencing and document-wide JSONPath scans that this
 * relies on are cached against that reference, so only the first call pays for them.
 *
 */
export async function analyzeOperation(definition: OASDocument, path: string, method: string): Promise<OASAnalysis> {
  const scope = computeOperationScope(definition, path, method);
  return buildAnalysis(definition, scope);
}

/**
 * Analyze a single webhook operation within a given OpenAPI 3.1 definition for any OpenAPI or JSON
 * Schema feature uses that it, or anything it references, may contain or utilize.
 *
 * @see {@link analyzeOperation}
 */
export async function analyzeWebhookOperation(
  definition: OASDocument,
  webhookName: string,
  method: string,
): Promise<OASAnalysis> {
  const scope = computeWebhookScope(definition, webhookName, method);
  return buildAnalysis(definition, scope);
}
