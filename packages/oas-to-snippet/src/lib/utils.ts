import type { Language } from '../types.js';
import type { TargetId } from '@readme/httpsnippet/targets';

import supportedLanguages from '../supportedLanguages.js';

export function getLanguageConfig(lang: Language) {
  let config;
  let language: TargetId;
  let target;

  // If `lang` is an array, then it's a mixture of language and targets like `[php, guzzle]` or
  // `[javascript, axios]` so we need to a bit of work to pull out the necessary information needed
  // to build the snippet. For backwards compatibility sake we still need to support supplying
  // `node-simple` as the language even though `node-simple` does not exist within the list of
  // supported languages.
  if (lang === 'node-simple') {
    config = supportedLanguages.node;
    language = 'node';
    target = 'api';
  } else if (lang === 'curl') {
    config = supportedLanguages.shell;
    language = 'shell';
    target = 'curl';
  } else if (Array.isArray(lang)) {
    if (lang[0] in supportedLanguages) {
      if (lang[1] in supportedLanguages[lang[0]].httpsnippet.targets) {
        config = supportedLanguages[lang[0]];
        language = config.httpsnippet.lang;
        target = lang[1];
      }
    }
  } else if (lang in supportedLanguages) {
    config = supportedLanguages[lang];
    language = config.httpsnippet.lang;
    target = config.httpsnippet.default;
  } else {
    throw new Error('An unknown language was supplied.');
  }

  return {
    config,
    language,
    target,
  };
}

export function getInstallInstructionsForLanguage(
  lang: Language,
  /**
   * For `api` snippet generation we need supply a ReadMe API Registry identifier that'll be used
   * to retrieve the OpenAPI definition to generate their SDK through the `npx api install` command.
   * These users won't be installing the `api` package itself to run the snippets we generate for
   * them.
   *
   * @example @developers/v2.0#17273l2glm9fq4l5
   */
  registryIdentifier?: string,
) {
  const { config, target } = getLanguageConfig(lang);

  const install = config.httpsnippet.targets[target]?.install;
  if (!install) {
    return undefined;
  }

  return install.replace('{registryIdentifier}', registryIdentifier);
}
