import type { Language, LanguageConfig } from './languages.js';
import type { HarRequest } from './types.js';
import type { ClientId, ClientPlugin, TargetId } from '@readme/httpsnippet/targets';
import type { AuthForHAR, DataForHAR } from '@readme/oas-to-har/lib/types';
import type Oas from 'oas';
import type { Operation } from 'oas/operation';

import { HTTPSnippet, addClientPlugin } from '@readme/httpsnippet';
import generateHar from '@readme/oas-to-har';

import { getSupportedLanguages, getLanguageConfig, getClientInstallationInstructions } from './languages.js';

export default function oasToSnippet(
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
     * Various options that are required for generating `[node, api]` code snippets.
     *
     * @see {@link https://npm.im/httpsnippet-client-api}
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

    /**
     * `httpsnippet` plugins to extend snippet generation to.
     *
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: ClientPlugin<any>[];
  } = {},
): { code: string | false; highlightMode: string | false; install: string | false } {
  let config: LanguageConfig | undefined;
  let language: TargetId | undefined;
  let target: ClientId | undefined;

  const plugins = opts.plugins || [];

  const languages = getSupportedLanguages({
    plugins,
  });

  try {
    ({ config, language, target } = getLanguageConfig(languages, lang));
  } catch (err) {
    if (!language || !target) {
      return { code: '', highlightMode: false, install: false };
    }
  }

  if (!config) {
    throw new Error(
      `The supplied language \`${lang.toString()}\` is not supported. If a plugin powers this language please initialize that plugin with the \`plugins\` option.`,
    );
  }

  if (!language || !target) {
    return { code: '', highlightMode: false, install: false };
  }

  const har = opts.harOverride || generateHar(oas, operation, values, auth);
  const snippet = new HTTPSnippet(har as HarRequest, {
    // We should only expect HAR's generated with `@readme/oas-to-har` to already be encoded.
    harIsAlreadyEncoded: !opts.harOverride,
  });

  let targetOpts = config.httpsnippet.targets[target].opts || {};
  const highlightMode = config.highlight;

  plugins.forEach(plugin => {
    addClientPlugin(plugin);

    // Our `httpsnippet-client-api` plugin uses these options so we need to pass them along.
    if (plugin.target === 'node' && plugin.client.info.key === 'api') {
      targetOpts.api = {
        definition: oas ? oas.getDefinition() : null,
        identifier: opts?.openapi?.variableName,
        registryURI: opts?.openapi?.registryIdentifier,
      };
    }
  });

  const install = getClientInstallationInstructions(languages, lang, opts?.openapi?.variableName);

  try {
    const code = snippet.convert(language, target, targetOpts);

    return {
      code: code ? code[0] : false,
      highlightMode,
      install: install || false,
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

    const code = snippet.convert(language, 'fetch', targetOpts);

    return {
      code: code ? code[0] : false,
      highlightMode,
      install: install || false,
    };
  }
}
