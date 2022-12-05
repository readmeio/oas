import type { OASDocument } from '../rmoas.types';

import * as OPENAPI_QUERIES from './queries/openapi';
import * as README_QUERIES from './queries/readme';

interface OASAnalysisFeature {
  description: string | false;
  present: boolean;
  locations: number | string[];
  url?:
    | string
    | {
        /**
         * OpenAPI 3.1 introduced some new features so there won't be any docs on 3.0.
         */
        '3.0'?: string;
        '3.1': string;
      };
}

interface OASAnalysisGeneral {
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
        description:
          'additionalProperties allows you to document dictionaries where the keys are user-supplied strings.',
        present: !!additionalProperties.length,
        locations: additionalProperties,
      },
      callbacks: {
        description:
          'Callbacks are asynchronous, out-of-band requests that your service will send to some other service in response to certain events.',
        present: !!callbacks.length,
        locations: callbacks,
      },
      circularRefs: {
        description: 'Circular references are $ref pointers that at some point in their lineage reference themselves.',
        present: !!circularRefs.length,
        locations: circularRefs,
      },
      discriminators: {
        description:
          'With schemas that can be, or contain, different shapes, discriminators help you assist your users in identifying and determining the kind of shape they can supply or receive.',
        present: !!discriminators.length,
        locations: discriminators,
      },
      links: {
        description: 'Links allow you to define at call-time relationships to other operations within your API.',
        present: !!links.length,
        locations: links,
      },
      style: {
        description:
          'Parameter serialization (style) allows you to describe how the parameter should be sent to your API.',
        present: !!parameterSerialization.length,
        locations: parameterSerialization,
      },
      polymorphism: {
        description:
          'Polymorphism (allOf, oneOf, and anyOf) allow you to describe schemas that may contain either many different shapes, or a single shape containing multiple different schemas.',
        present: !!polymorphism.length,
        locations: polymorphism,
        url: {
          '3.0': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#schema-object',
          '3.1': 'https://json-schema.org/understanding-json-schema/reference/combining.html',
        },
      },
      serverVariables: {
        description: 'Server variables allow to do user-supplied variable subsitituions within your API server URL.',
        present: !!serverVariables.length,
        locations: serverVariables,
        url: {
          '3.0': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#server-variable-object',
          '3.1': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#server-variable-object',
        },
      },
      webhooks: {
        description: 'Webhooks allow you to describe out of band requests that may be initiated by your users.',
        present: !!webhooks.length,
        locations: webhooks,
        url: {
          '3.1': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#user-content-oaswebhooks',
        },
      },
      xml: {
        description: 'Any parameter and/or request body that accepts XML or responses that return XML payloads.',
        present: !!xml.length,
        locations: xml,
        url: {
          '3.0': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#xml-object',
          '3.1': 'https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#xml-object',
        },
      },
    },
    readme: {
      'x-default': {
        description:
          'The x-default extension allows you to define static authentication credential defaults for OAuth 2 and API Key security types.',
        present: !!authDefaults.length,
        locations: authDefaults,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#authentication-defaults',
      },
      'x-readme.code-samples': {
        description:
          'The x-readme.code-samples extension allows you to custom, create static code samples on your API documentation.',
        present: !!customCodeSamples.length,
        locations: customCodeSamples,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#custom-code-samples',
      },
      'x-readme.headers': {
        description:
          'The x-readme.headers extension allows you define headers that should always be present on your API or a specific operation, as well as what its value should be.',
        present: !!staticHeaders.length,
        locations: staticHeaders,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#static-headers',
      },
      'x-readme.explorer-enabled': {
        description:
          'The x-readme.explorer-enabled extension allows you to toggle your API documentation being interactive or not.',
        present: !!explorerDisabled.length,
        locations: explorerDisabled,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#disable-the-api-explorer',
      },
      'x-readme.proxy-enabled': {
        description:
          "The x-readme.proxy-enabled extension allows you to toggle if API requests from API documentation should be routed through ReadMe's CORS Proxy. You should only need to use this if your API does not support CORS.",
        present: !!disabledCorsProxy.length,
        locations: disabledCorsProxy,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#cors-proxy-enabled',
      },
      'x-readme.samples-languages': {
        description:
          'The x-readme.samples-languages extension allows you to toggle what languages are shown by default for code snippets in your API documentation.',
        present: !!codeSampleLanguages.length,
        locations: codeSampleLanguages,
        url: 'https://docs.readme.com/main/docs/openapi-extensions#code-sample-languages',
      },
    },
  };

  // We should only surface analysis for deprecated features and extensions if they have them as
  // there's no reason to give them information about something they can't use and should no longer
  // know about.
  if (codeSamplesDisabled.length) {
    analysis.readme['x-readme.samples-enabled'] = {
      description:
        'The x-readme.samples-enabled extension allowed you to disable code samples on specific endpoints. It is no longer supported and can be safely removed from your API definition.',
      present: !!codeSamplesDisabled.length,
      locations: codeSamplesDisabled,
      url: 'https://docs.readme.com/main/docs/openapi-extensions#disable-code-examples',
    };
  }

  if (rawBody.length) {
    analysis.readme.raw_body = {
      description:
        "The RAW_BODY property allows you to define that a request body should have its payload delivered as a raw string. This legacy feature is specific to our Manual API editor and we don't recommend you use it outside of that context, instead opting for a traditional `type: string, format: blob` schema definition.",
      present: !!rawBody.length,
      locations: rawBody,
      // url: 'https://docs.readme.com/main/docs/openapi-extensions#disable-code-examples',
    };
  }

  return analysis;
}
