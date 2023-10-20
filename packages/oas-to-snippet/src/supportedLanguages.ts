import type { SupportedLanguages } from './types.js';

const supportedLanguages: SupportedLanguages = {
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
        restsharp: {
          name: 'RestSharp',
          install: 'dotnet add package RestSharp',
        },
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
        axios: {
          name: 'Axios',
          install: 'npm install axios --save',
        },
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
        api: {
          name: 'api',
          opts: {
            apiDefinition: null,
            apiDefinitionUri: null,
          },
          // `registryIdentifier` will be swapped out dynamically when we retrieve this install copy.
          install: 'npx api install {registryIdentifier}',
        },
        axios: {
          name: 'Axios',
          install: 'npm install axios --save',
        },
        fetch: {
          name: 'node-fetch',
          install: 'npm install node-fetch@2 --save',
        },
        native: { name: 'http' },
        request: {
          name: 'Request',
          install: 'npm install request --save',
        },
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
        cohttp: {
          name: 'CoHTTP',
          install: 'opam install cohttp-lwt-unix cohttp-async',
        },
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
        guzzle: {
          name: 'Guzzle',
          install: 'composer require guzzlehttp/guzzle',
        },
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
        requests: {
          name: 'Requests',
          install: 'python -m pip install requests',
        },
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
        httpie: {
          name: 'HTTPie',
          install: 'brew install httpie',
        },
      },
    },
  },
  swift: {
    highlight: 'swift',
    httpsnippet: {
      lang: 'swift',
      default: 'nsurlsession',
      targets: {
        nsurlsession: { name: 'NSURLSession' },
      },
    },
  },
};

export default supportedLanguages;
