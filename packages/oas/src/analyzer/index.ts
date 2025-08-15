import type { OASDocument } from '../types.js';
import type { OASAnalysis } from './types.js';

import {
  additionalProperties as queryAdditionalProperties,
  callbacks as queryCallbacks,
  circularRefs as queryCircularRefs,
  commonParameters as queryCommonParameters,
  discriminators as queryDiscriminators,
  fileSize as queryFileSize,
  links as queryLinks,
  mediaTypes as queryMediaTypes,
  parameterSerialization as queryParameterSerialization,
  polymorphism as queryPolymorphism,
  securityTypes as querySecurityTypes,
  serverVariables as queryServerVariables,
  totalOperations as queryTotalOperations,
  webhooks as queryWebhooks,
  xml as queryXml,
  xmlRequests as queryXmlRequests,
  xmlResponses as queryXmlResponses,
  xmlSchemas as queryXmlSchemas,
} from './queries/openapi.js';
import {
  authDefaults as queryAuthDefaults,
  codeSampleLanguages as queryCodeSampleLanguages,
  codeSamplesDisabled as queryCodeSamplesDisabled,
  corsProxyDisabled as queryCorsProxyDisabled,
  customCodeSamples as queryCustomCodeSamples,
  explorerDisabled as queryExplorerDisabled,
  rawBody as queryRawBody,
  refNames as queryRefNames,
  staticHeaders as queryStaticHeaders,
} from './queries/readme.js';

/**
 * Analyze a given OpenAPI or Swagger definition for any OpenAPI, JSON Schema, and ReadMe-specific
 * feature uses it may contain.
 *
 */
// biome-ignore lint/style/noDefaultExport: This is safe for now.
export default async function analyzer(definition: OASDocument): Promise<OASAnalysis> {
  const additionalProperties = queryAdditionalProperties(definition);
  const callbacks = queryCallbacks(definition);
  const circularRefs = await queryCircularRefs(definition);
  const commonParameters = queryCommonParameters(definition);
  const discriminators = queryDiscriminators(definition);
  const links = queryLinks(definition);
  const parameterSerialization = queryParameterSerialization(definition);
  const polymorphism = queryPolymorphism(definition);
  const serverVariables = queryServerVariables(definition);
  const webhooks = queryWebhooks(definition);
  const xml = queryXml(definition);
  const xmlSchemas = queryXmlSchemas(definition);
  const xmlRequests = queryXmlRequests(definition);
  const xmlResponses = queryXmlResponses(definition);

  const authDefaults = queryAuthDefaults(definition);
  const codeSampleLanguages = queryCodeSampleLanguages(definition);
  const customCodeSamples = queryCustomCodeSamples(definition);
  const codeSamplesDisabled = queryCodeSamplesDisabled(definition);
  const disabledCorsProxy = queryCorsProxyDisabled(definition);
  const explorerDisabled = queryExplorerDisabled(definition);
  const staticHeaders = queryStaticHeaders(definition);
  const rawBody = queryRawBody(definition);
  const refNames = queryRefNames(definition);

  const { raw: rawFileSize, dereferenced: dereferencedFileSize } = await queryFileSize(definition);

  const analysis: OASAnalysis = {
    general: {
      dereferencedFileSize: {
        name: 'Dereferenced File Size',
        found: dereferencedFileSize,
      },
      mediaTypes: {
        name: 'Media Type',
        found: queryMediaTypes(definition),
      },
      operationTotal: {
        name: 'Operation',
        found: queryTotalOperations(definition),
      },
      rawFileSize: {
        name: 'Raw File Size',
        found: rawFileSize,
      },
      securityTypes: {
        name: 'Security Type',
        found: querySecurityTypes(definition),
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
      xml: {
        present: !!xml.length,
        locations: xml,
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
    readme: {
      'x-default': {
        present: !!authDefaults.length,
        locations: authDefaults,
      },
      'x-readme.code-samples': {
        present: !!customCodeSamples.length,
        locations: customCodeSamples,
      },
      'x-readme.headers': {
        present: !!staticHeaders.length,
        locations: staticHeaders,
      },
      'x-readme.explorer-enabled': {
        present: !!explorerDisabled.length,
        locations: explorerDisabled,
      },
      'x-readme.proxy-enabled': {
        present: !!disabledCorsProxy.length,
        locations: disabledCorsProxy,
      },
      'x-readme.samples-languages': {
        present: !!codeSampleLanguages.length,
        locations: codeSampleLanguages,
      },
      'x-readme-ref-name': {
        present: !!refNames.length,
        locations: refNames,
      },
    },
  };

  // We should only surface analysis for deprecated features and extensions if they have them as
  // there's no reason to give them information about something they can't use and should no longer
  // know about.
  if (codeSamplesDisabled.length) {
    analysis.readme['x-readme.samples-enabled'] = {
      present: !!codeSamplesDisabled.length,
      locations: codeSamplesDisabled,
    };
  }

  if (rawBody.length) {
    analysis.readme.raw_body = {
      present: !!rawBody.length,
      locations: rawBody,
    };
  }

  return analysis;
}
