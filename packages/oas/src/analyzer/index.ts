import type { OAS31Document, OAS32Document, OASDocument } from '../types.js';
import type { OperationScope } from './scope.js';
import type { AnalyzerQuery, OASAnalysis } from './types.js';

import { toPointer } from '../lib/refs.js';
import { isOpenAPI31, isOpenAPI32 } from '../types.js';

import { dereferenceOasShared } from './dereference.js';
import {
  additionalProperties as analyzeAdditionalProperties,
  callbacks as analyzeCallbacks,
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
import { computeOperationScope, computeWebhookScope, isPointerInScope } from './scope.js';

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
async function buildAnalysis(
  definition: OASDocument,
  query?: AnalyzerQuery[],
  scope?: OperationScope,
): Promise<OASAnalysis> {
  const analysis: OASAnalysis = {};

  if (!query || query.includes('mediaTypes')) {
    analysis.mediaTypes = {
      name: 'Media Type',
      found: analyzeMediaTypes(definition, scope),
    };
  }

  if (!query || query.includes('operationTotal')) {
    analysis.operationTotal = {
      name: 'Operation',
      // A scoped analysis is, by definition, looking at exactly one operation.
      found: scope ? 1 : analyzeTotalOperations(definition),
    };
  }

  if (!query || query.includes('securityTypes')) {
    analysis.securityTypes = {
      name: 'Security Type',
      found: analyzeSecurityTypes(definition, scope),
    };
  }

  if (!query || query.includes('additionalProperties')) {
    const additionalProperties = analyzeAdditionalProperties(definition, scope);
    analysis.additionalProperties = {
      present: !!additionalProperties.length,
      locations: additionalProperties,
    };
  }

  if (!query || query.includes('callbacks')) {
    const callbacks = analyzeCallbacks(definition, scope);
    analysis.callbacks = {
      present: !!callbacks.length,
      locations: callbacks,
    };
  }

  if (!query || query.includes('circularRefs')) {
    const { circularRefs: dereferencedCircularRefs } = await dereferenceOasShared(definition);
    const circularRefs = (
      scope
        ? dereferencedCircularRefs.filter(ref => isPointerInScope(toPointer(ref), scope))
        : [...dereferencedCircularRefs]
    ).toSorted();

    analysis.circularRefs = {
      present: !!circularRefs.length,
      locations: circularRefs,
    };
  }

  if (!query || query.includes('commonParameters')) {
    const commonParameters = analyzeCommonParameters(definition, scope);
    analysis.commonParameters = {
      present: !!commonParameters.length,
      locations: commonParameters,
    };
  }

  if (!query || query.includes('discriminators')) {
    const discriminators = analyzeDiscriminators(definition, scope);
    analysis.discriminators = {
      present: !!discriminators.length,
      locations: discriminators,
    };
  }

  if (!query || query.includes('links')) {
    const links = analyzeLinks(definition, scope);
    analysis.links = {
      present: !!links.length,
      locations: links,
    };
  }

  if (!query || query.includes('style')) {
    const parameterSerialization = analyzeParameterSerialization(definition, scope);
    analysis.style = {
      present: !!parameterSerialization.length,
      locations: parameterSerialization,
    };
  }

  if (!query || query.includes('polymorphism')) {
    const polymorphism = analyzePolymorphism(definition, scope);
    analysis.polymorphism = {
      present: !!polymorphism.length,
      locations: polymorphism,
    };
  }

  if (!query || query.includes('references')) {
    const references = analyzeReferences(definition, scope);
    analysis.references = {
      present: !!references.length,
      locations: references,
    };
  }

  if (!query || query.includes('serverVariables')) {
    const serverVariables = analyzeServerVariables(definition);
    analysis.serverVariables = {
      present: !!serverVariables.length,
      locations: serverVariables,
    };
  }

  if (!query || query.includes('xmlRequests')) {
    const xmlRequests = analyzeXMLRequests(definition, scope);
    analysis.xmlRequests = {
      present: !!xmlRequests.length,
      locations: xmlRequests,
    };
  }

  if (!query || query.includes('xmlResponses')) {
    const xmlResponses = analyzeXMLResponses(definition, scope);
    analysis.xmlResponses = {
      present: !!xmlResponses.length,
      locations: xmlResponses,
    };
  }

  if (!query || query.includes('xmlSchemas')) {
    const xmlSchemas = analyzeXMLSchemas(definition, scope);
    analysis.xmlSchemas = {
      present: !!xmlSchemas.length,
      locations: xmlSchemas,
    };
  }

  if (!query || query.includes('xmlSchemas')) {
    const webhooks = analyzeWebhooks(definition, scope);
    analysis.webhooks = {
      present: !!webhooks.length,
      locations: webhooks,
    };
  }

  return analysis;
}

/**
 * Analyze a given OpenAPI or Swagger definition for any, or a specific, OpenAPI or JSON Schema
 * feature uses it may contain or utilize.
 *
 */
export async function analyzer(definition: OASDocument, query?: AnalyzerQuery[]): Promise<OASAnalysis> {
  return buildAnalysis(definition, query);
}

/**
 * Analyze a single operation within a given OpenAPI definition for any, or a specific, OpenAPI or
 * JSON Schema feature uses that it, or anything it references, may contain or utilize.
 *
 * When analyzing many operations out of the same definition, pass the *same* `definition`
 * reference to every call — the expensive dereferencing and document-wide JSONPath scans that this
 * relies on are cached against that reference, so only the first call pays for them.
 *
 */
export async function analyzeOperation(
  definition: OASDocument,
  {
    path,
    method,
    query,
  }: {
    path: string;
    method: string;
    query?: AnalyzerQuery[];
  },
): Promise<OASAnalysis> {
  const scope = computeOperationScope(definition, path, method);
  return buildAnalysis(definition, query, scope);
}

/**
 * Analyze a single webhook operation within a given OpenAPI 3.1 definition for any, or a specific,
 * OpenAPI or JSON Schema feature uses that it, or anything it references, may contain or utilize.
 *
 * @see {@link analyzeOperation}
 */
export async function analyzeWebhookOperation(
  definition: OASDocument,
  {
    webhookName,
    method,
    query,
  }: {
    webhookName: string;
    method: string;
    query?: AnalyzerQuery[];
  },
): Promise<OASAnalysis> {
  if (!isOpenAPI31(definition) && !isOpenAPI32(definition)) {
    throw new TypeError('The supplied definition is not a OpenAPI 3.1 or 3.2 definition.');
  }

  const scope = computeWebhookScope(definition satisfies OAS31Document | OAS32Document, webhookName, method);
  return buildAnalysis(definition, query, scope);
}
