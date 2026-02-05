import type { OASDocument } from '../types.js';
import type { OASAnalysis } from './types.js';

import {
  additionalProperties as analyzeAdditionalProperties,
  callbacks as analyzeCallbacks,
  circularRefs as analyzeCircularRefs,
  commonParameters as analyzeCommonParameters,
  discriminators as analyzeDiscriminators,
  fileSize as analyzeFileSize,
  links as analyzeLinks,
  mediaTypes as analyzeMediaTypes,
  parameterSerialization as analyzeParameterSerialization,
  polymorphism as analyzePolymorphism,
  securityTypes as analyzeSecurityTypes,
  serverVariables as analyzeServerVariables,
  totalOperations as analyzeTotalOperations,
  webhooks as analyzeWebhooks,
  xmlRequests as analyzeXMLRequests,
  xmlResponses as analyzeXMLResponses,
  xmlSchemas as analyzeXMLSchemas,
} from './queries/openapi.js';

export {
  analyzeAdditionalProperties,
  analyzeCallbacks,
  analyzeCircularRefs,
  analyzeCommonParameters,
  analyzeDiscriminators,
  analyzeFileSize,
  analyzeLinks,
  analyzeMediaTypes,
  analyzeParameterSerialization,
  analyzePolymorphism,
  analyzeSecurityTypes,
  analyzeServerVariables,
  analyzeTotalOperations,
  analyzeWebhooks,
  analyzeXMLRequests,
  analyzeXMLResponses,
  analyzeXMLSchemas,
};

/**
 * Analyze a given OpenAPI or Swagger definition for any OpenAPI or JSON Schema feature uses it
 * may contain or utilize.
 *
 */
export async function analyzer(definition: OASDocument): Promise<OASAnalysis> {
  const additionalProperties = analyzeAdditionalProperties(definition);
  const callbacks = analyzeCallbacks(definition);
  const circularRefs = await analyzeCircularRefs(definition);
  const commonParameters = analyzeCommonParameters(definition);
  const discriminators = analyzeDiscriminators(definition);
  const links = analyzeLinks(definition);
  const parameterSerialization = analyzeParameterSerialization(definition);
  const polymorphism = analyzePolymorphism(definition);
  const serverVariables = analyzeServerVariables(definition);
  const webhooks = analyzeWebhooks(definition);
  const xmlSchemas = analyzeXMLSchemas(definition);
  const xmlRequests = analyzeXMLRequests(definition);
  const xmlResponses = analyzeXMLResponses(definition);

  const { raw: rawFileSize, dereferenced: dereferencedFileSize } = await analyzeFileSize(definition);

  const analysis: OASAnalysis = {
    general: {
      dereferencedFileSize: {
        name: 'Dereferenced File Size',
        found: dereferencedFileSize,
      },
      mediaTypes: {
        name: 'Media Type',
        found: analyzeMediaTypes(definition),
      },
      operationTotal: {
        name: 'Operation',
        found: analyzeTotalOperations(definition),
      },
      rawFileSize: {
        name: 'Raw File Size',
        found: rawFileSize,
      },
      securityTypes: {
        name: 'Security Type',
        found: analyzeSecurityTypes(definition),
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
      serverVariables: {
        present: !!serverVariables.length,
        locations: serverVariables,
      },
      webhooks: {
        present: !!webhooks.length,
        locations: webhooks,
      },
      xmlSchemas: {
        present: !!xmlSchemas.length,
        locations: xmlSchemas,
      },
      xmlRequests: {
        present: !!xmlRequests.length,
        locations: xmlRequests,
      },
      xmlResponses: {
        present: !!xmlResponses.length,
        locations: xmlResponses,
      },
    },
  };

  return analysis;
}
