import type { OASDocument } from '../rmoas.types';

import * as OPENAPI_QUERIES from './queries/openapi';
import * as README_QUERIES from './queries/readme';

export interface OASAnalysisFeature {
  present: boolean;
  locations: string[];
}

export interface OASAnalysisGeneral {
  name: string;
  found: number | string[];
}

export interface OASAnalysis {
  general: {
    mediaTypes: OASAnalysisGeneral;
    operationTotal: OASAnalysisGeneral;
    securityTypes: OASAnalysisGeneral;
  };
  openapi: {
    additionalProperties: OASAnalysisFeature;
    callbacks: OASAnalysisFeature;
    circularRefs: OASAnalysisFeature;
    discriminators: OASAnalysisFeature;
    links: OASAnalysisFeature;
    style: OASAnalysisFeature;
    polymorphism: OASAnalysisFeature;
    serverVariables: OASAnalysisFeature;
    webhooks: OASAnalysisFeature;
    xml: OASAnalysisFeature;
  };
  readme: {
    'x-default': OASAnalysisFeature;
    'x-readme.headers': OASAnalysisFeature;
    'x-readme.proxy-enabled': OASAnalysisFeature;
    'x-readme.samples-languages'?: OASAnalysisFeature;
    'x-readme.code-samples': OASAnalysisFeature;
    'x-readme.explorer-enabled': OASAnalysisFeature;

    /**
     * This extension is deprecated.
     */
    'x-readme.samples-enabled'?: OASAnalysisFeature;

    /**
     * RAW_BODY is specific to our Manual API editor and we don't recommend anyone writing their
     * own API definition should use it so this is considered deprecated.
     */
    raw_body?: OASAnalysisFeature;
  };
}

/**
 * Analyze a given OpenAPI or Swagger definition for any OpenAPI, JSON Schema, and ReadMe-specific
 * feature uses it may contain.
 *
 * @todo this might be worth moving into the `oas` package at some point
 */
export default async function analyzer(definition: OASDocument): Promise<OASAnalysis> {
  const additionalProperties = OPENAPI_QUERIES.additionalProperties(definition);
  const callbacks = OPENAPI_QUERIES.callbacks(definition);
  const circularRefs = await OPENAPI_QUERIES.circularRefs(definition);
  const discriminators = OPENAPI_QUERIES.discriminators(definition);
  const links = OPENAPI_QUERIES.links(definition);
  const parameterSerialization = OPENAPI_QUERIES.parameterSerialization(definition);
  const polymorphism = OPENAPI_QUERIES.polymorphism(definition);
  const serverVariables = OPENAPI_QUERIES.serverVariables(definition);
  const webhooks = OPENAPI_QUERIES.webhooks(definition);
  const xml = OPENAPI_QUERIES.xml(definition);

  const authDefaults = README_QUERIES.authDefaults(definition);
  const codeSampleLanguages = README_QUERIES.codeSampleLanguages(definition);
  const customCodeSamples = README_QUERIES.customCodeSamples(definition);
  const codeSamplesDisabled = README_QUERIES.codeSamplesDisabled(definition);
  const disabledCorsProxy = README_QUERIES.corsProxyDisabled(definition);
  const explorerDisabled = README_QUERIES.explorerDisabled(definition);
  const staticHeaders = README_QUERIES.staticHeaders(definition);
  const rawBody = README_QUERIES.rawBody(definition);

  const analysis: OASAnalysis = {
    general: {
      mediaTypes: {
        name: 'Media Type',
        found: OPENAPI_QUERIES.mediaTypes(definition),
      },
      operationTotal: {
        name: 'Operation',
        found: OPENAPI_QUERIES.totalOperations(definition),
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
