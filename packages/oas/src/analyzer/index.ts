import type { OASDocument } from '../types.js';
import type { OASAnalysis } from './types.js';

import * as OPENAPI_QUERIES from './queries/openapi.js';
import * as README_QUERIES from './queries/readme.js';

/**
 * Analyze a given OpenAPI or Swagger definition for any OpenAPI, JSON Schema, and ReadMe-specific
 * feature uses it may contain.
 *
 */
export default async function analyzer(definition: OASDocument): Promise<OASAnalysis> {
  const additionalProperties = OPENAPI_QUERIES.additionalProperties(definition);
  const callbacks = OPENAPI_QUERIES.callbacks(definition);
  const circularRefs = await OPENAPI_QUERIES.circularRefs(definition);
  const commonParameters = OPENAPI_QUERIES.commonParameters(definition);
  const discriminators = OPENAPI_QUERIES.discriminators(definition);
  const links = OPENAPI_QUERIES.links(definition);
  const parameterSerialization = OPENAPI_QUERIES.parameterSerialization(definition);
  const polymorphism = OPENAPI_QUERIES.polymorphism(definition);
  const serverVariables = OPENAPI_QUERIES.serverVariables(definition);
  const webhooks = OPENAPI_QUERIES.webhooks(definition);
  const xml = OPENAPI_QUERIES.xml(definition);
  const xmlSchemas = OPENAPI_QUERIES.xmlSchemas(definition);
  const xmlRequests = OPENAPI_QUERIES.xmlRequests(definition);
  const xmlResponses = OPENAPI_QUERIES.xmlResponses(definition);

  const authDefaults = README_QUERIES.authDefaults(definition);
  const codeSampleLanguages = README_QUERIES.codeSampleLanguages(definition);
  const customCodeSamples = README_QUERIES.customCodeSamples(definition);
  const codeSamplesDisabled = README_QUERIES.codeSamplesDisabled(definition);
  const disabledCorsProxy = README_QUERIES.corsProxyDisabled(definition);
  const explorerDisabled = README_QUERIES.explorerDisabled(definition);
  const staticHeaders = README_QUERIES.staticHeaders(definition);
  const rawBody = README_QUERIES.rawBody(definition);
  const refNames = README_QUERIES.refNames(definition);

  const { raw: rawFileSize, dereferenced: dereferencedFileSize } = await OPENAPI_QUERIES.fileSize(definition);

  const analysis: OASAnalysis = {
    general: {
      dereferencedFileSize: {
        name: 'Dereferenced File Size',
        found: dereferencedFileSize,
      },
      mediaTypes: {
        name: 'Media Type',
        found: OPENAPI_QUERIES.mediaTypes(definition),
      },
      operationTotal: {
        name: 'Operation',
        found: OPENAPI_QUERIES.totalOperations(definition),
      },
      rawFileSize: {
        name: 'Raw File Size',
        found: rawFileSize,
      },
      securityTypes: {
        name: 'Security Type',
        found: OPENAPI_QUERIES.securityTypes(definition),
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
