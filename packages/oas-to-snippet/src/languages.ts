import type { ClientId, ClientPlugin, TargetId } from '@readme/httpsnippet/targets';

import { targets } from '@readme/httpsnippet/targets';

export type Language = keyof typeof DEFAULT_LANGUAGES | [keyof typeof DEFAULT_LANGUAGES, ClientId];

export interface LanguageConfig {
  highlight: string;
  httpsnippet: {
    default: ClientId;
    lang: TargetId;
    targets: Record<
      ClientId,
      {
        install?: string;
        name: string;
        opts?: Record<string, unknown>;
      }
    >;
  };
}

export type SupportedTargets = Exclude<TargetId, 'objc'> | 'cplusplus' | 'objectivec';
export type SupportedLanguages = Record<SupportedTargets, LanguageConfig>;

const DEFAULT_LANGUAGES: SupportedLanguages = {
  c: {
    highlight: 'text/x-csrc',
    httpsnippet: {
      lang: 'c',
      default: 'libcurl',
      targets: {
        libcurl: { name: 'libcurl' },
      },
    },
  },
  clojure: {
    highlight: 'clojure',
    httpsnippet: {
      lang: 'clojure',
      default: 'clj_http',
      targets: {
        clj_http: { name: 'clj-http' },
      },
    },
  },
  cplusplus: {
    highlight: 'text/x-c++src',
    httpsnippet: {
      lang: 'c',
      default: 'libcurl',
      targets: {
        libcurl: { name: 'libcurl' },
      },
    },
  },
  csharp: {
    highlight: 'text/x-csharp',
    httpsnippet: {
      lang: 'csharp',
      default: 'restsharp',
      targets: {
        httpclient: { name: 'HttpClient' },
        restsharp: { name: 'RestSharp' },
      },
    },
  },
  http: {
    highlight: 'http',
    httpsnippet: {
      lang: 'http',
      default: 'http1.1',
      targets: {
        'http1.1': { name: 'HTTP 1.1' },
      },
    },
  },
  go: {
    highlight: 'go',
    httpsnippet: {
      lang: 'go',
      default: 'native',
      targets: {
        native: { name: 'http.NewRequest' },
      },
    },
  },
  java: {
    highlight: 'java',
    httpsnippet: {
      lang: 'java',
      default: 'okhttp',
      targets: {
        asynchttp: { name: 'AsyncHttp' },
        nethttp: { name: 'java.net.http' },
        okhttp: { name: 'OkHttp' },
        unirest: { name: 'Unirest' },
      },
    },
  },
  javascript: {
    highlight: 'javascript',
    httpsnippet: {
      lang: 'javascript',
      default: 'fetch',
      targets: {
        axios: { name: 'Axios' },
        fetch: { name: 'fetch' },
        jquery: { name: 'jQuery' },
        xhr: { name: 'XMLHttpRequest' },
      },
    },
  },
  json: {
    highlight: 'json',
    httpsnippet: {
      lang: 'json',
      default: 'native',
      targets: {
        native: { name: 'JSON' },
      },
    },
  },
  kotlin: {
    highlight: 'java',
    httpsnippet: {
      lang: 'kotlin',
      default: 'okhttp',
      targets: {
        okhttp: { name: 'OkHttp' },
      },
    },
  },
  node: {
    highlight: 'javascript',
    httpsnippet: {
      lang: 'node',
      default: 'fetch',
      targets: {
        axios: { name: 'Axios' },
        fetch: { name: 'node-fetch' },
        native: { name: 'http' },
        request: { name: 'Request' },
      },
    },
  },
  objectivec: {
    highlight: 'objectivec',
    httpsnippet: {
      lang: 'objc',
      default: 'nsurlsession',
      targets: {
        nsurlsession: { name: 'NSURLSession' },
      },
    },
  },
  ocaml: {
    highlight: 'ocaml',
    httpsnippet: {
      lang: 'ocaml',
      default: 'cohttp',
      targets: {
        cohttp: { name: 'CoHTTP' },
      },
    },
  },
  php: {
    highlight: 'php',
    httpsnippet: {
      lang: 'php',
      default: 'guzzle',
      targets: {
        curl: { name: 'cURL' },
        guzzle: { name: 'Guzzle' },
      },
    },
  },
  powershell: {
    highlight: 'powershell',
    httpsnippet: {
      lang: 'powershell',
      default: 'webrequest',
      targets: {
        restmethod: { name: 'Invoke-RestMethod' },
        webrequest: { name: 'Invoke-WebRequest' },
      },
    },
  },
  python: {
    highlight: 'python',
    httpsnippet: {
      lang: 'python',
      default: 'requests',
      targets: {
        requests: { name: 'Requests' },
      },
    },
  },
  r: {
    highlight: 'r',
    httpsnippet: {
      lang: 'r',
      default: 'httr',
      targets: {
        httr: { name: 'httr' },
      },
    },
  },
  ruby: {
    highlight: 'ruby',
    httpsnippet: {
      lang: 'ruby',
      default: 'native',
      targets: {
        native: { name: 'net::http' },
      },
    },
  },
  shell: {
    highlight: 'shell',
    httpsnippet: {
      lang: 'shell',
      default: 'curl',
      targets: {
        curl: {
          name: 'cURL',
          opts: {
            escapeBrackets: true,
            indent: '     ',
          },
        },
        httpie: { name: 'HTTPie' },
      },
    },
  },
  swift: {
    highlight: 'swift',
    httpsnippet: {
      lang: 'swift',
      default: 'urlsession',
      targets: {
        urlsession: { name: 'URLSession' },
      },
    },
  },
};

/**
 * Retrieve all supported supported languages by this library. You can also optionally supply an
 * array of `httpsnippet` plugins to extend this list.
 *
 */
export function getSupportedLanguages(
  {
    plugins,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins?: ClientPlugin<any>[];
  } = { plugins: [] },
) {
  const languages: SupportedLanguages = JSON.parse(JSON.stringify(DEFAULT_LANGUAGES));

  Object.entries(targets).forEach(([target, { clientsById }]) => {
    if (!(target in languages)) {
      return;
    }

    Object.entries(clientsById).forEach(([client, data]) => {
      if (!(client in languages[target as SupportedTargets].httpsnippet.targets)) {
        return;
      }

      if ('installation' in data.info) {
        languages[target as SupportedTargets].httpsnippet.targets[client].install = data.info.installation;
      }
    });
  });

  (plugins || []).forEach(({ target, client: { info: clientInfo } }) => {
    const clientKey = clientInfo.key;

    languages[target as SupportedTargets].httpsnippet.targets[clientKey] = {
      name: clientInfo.title,
    };

    if (clientInfo.installation) {
      languages[target as SupportedTargets].httpsnippet.targets[clientKey].install = clientInfo.installation;
    }
  });

  return languages;
}

export function getLanguageConfig(languages: SupportedLanguages, lang: Language) {
  let config: LanguageConfig | undefined;
  let language: TargetId | undefined;
  let target: ClientId | undefined;

  // If `lang` is an array, then it's a mixture of language and targets like `[php, guzzle]` or
  // `[javascript, axios]` so we need to a bit of work to pull out the necessary information
  // needed to build the snippet.
  if (Array.isArray(lang)) {
    if (lang[0] in languages) {
      if (lang[1] in languages[lang[0] as SupportedTargets].httpsnippet.targets) {
        config = languages[lang[0] as SupportedTargets];
        language = config.httpsnippet.lang;
        target = lang[1];
      }
    }
  } else if (lang in languages) {
    config = languages[lang];
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

export function getClientInstallationInstructions(
  languages: SupportedLanguages,
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
  const { config, target } = getLanguageConfig(languages, lang);

  const install = config?.httpsnippet.targets[target || '']?.install;
  if (!install) {
    return undefined;
  }

  return registryIdentifier ? install.replace('{packageName}', registryIdentifier) : install;
}
