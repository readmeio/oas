import type { Language } from './types.js';
import type { HarRequest } from '@readme/httpsnippet';
import type { TargetId } from '@readme/httpsnippet/targets';
import type { AuthForHAR, DataForHAR } from '@readme/oas-to-har/lib/types';
import type Oas from 'oas';
import type Operation from 'oas/operation';

import { HTTPSnippet, addTargetClient } from '@readme/httpsnippet';
import generateHar from '@readme/oas-to-har';
import HTTPSnippetSimpleApiClient from 'httpsnippet-client-api';

import { getLanguageConfig } from './lib/utils.js';

export default async function oasToSnippet(
  oas: Oas,
  operation: Operation,
  values: DataForHAR,
  auth: AuthForHAR,
  lang: Language,
  opts: {
    /**
     * If you already have a HAR and you just want to generate a code snippet for it then you should
     * supply that HAR to this option.
     *
     */
    harOverride?: HarRequest;

    /**
     * Various options that are required for generating `api` or `node-simple` code snippets.
     *
     */
    openapi?: {
      /**
       * The ReadMe API Registry identifier for this OpenAPI definition.
       *
       * @example @developers/v2.0#17273l2glm9fq4l5
       */
      registryIdentifier?: string;

      /**
       * This is the primary variable name that will be used in the code snippet. If supplied this
       * will take precedence over any supplied `registryIdentifier`.
       *
       * @example developers
       */
      variableName?: string;
    };
  } = {},
) {
  let config;
  let language: TargetId;
  let target;

  try {
    ({ config, language, target } = getLanguageConfig(lang));
  } catch (err) {
    if (!language || !target) {
      return { code: '', highlightMode: false };
    }
  }

  const har = opts.harOverride || generateHar(oas, operation, values, auth);
  const snippet = new HTTPSnippet(har as HarRequest, {
    // We should only expect HAR's generated with `@readme/oas-to-har` to already be encoded.
    harIsAlreadyEncoded: !opts.harOverride,
  });

  let targetOpts = config.httpsnippet.targets[target].opts || {};
  const highlightMode = config.highlight;

  // API SDK client needs additional runtime information on the API definition we're showing the
  // user so it can generate an appropriate snippet.
  if (language === 'node' && target === 'api') {
    try {
      addTargetClient('node', HTTPSnippetSimpleApiClient);
    } catch (e) {
      if (!e.message.match(/already exists/)) {
        throw e;
      }
    }

    targetOpts.apiDefinition = oas ? oas.getDefinition() : null;
    targetOpts.apiDefinitionUri = opts?.openapi?.registryIdentifier;
    targetOpts.identifier = opts?.openapi?.variableName;
  }

  try {
    return {
      code: await snippet.convert(language, target, targetOpts),
      highlightMode,
    };
  } catch (err) {
    if (language !== 'node' && target !== 'api') {
      throw err;
    }

    /**
     * Since `api` depends upon the API definition it's more subject to breakage than other snippet
     * targets, so if we failed when attempting to generate one for that let's instead render out a
     * `fetch` snippet.
     */
    targetOpts = config.httpsnippet.targets.fetch.opts || {};

    return {
      code: await snippet.convert(language, 'fetch', targetOpts),
      highlightMode,
    };
  }
}
