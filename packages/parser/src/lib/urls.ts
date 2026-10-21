const PROTOCOL_REGEX = /^[a-z][a-z\d+.-]*:\/\//i;

/** Matches `{name}` globally; capture group `1` contains the name. */
export const SERVER_VARIABLE_REGEX: RegExp = /{([-_a-zA-Z0-9:.[\]]+)}/g;

/**
 * Substitute `{name}` server variables, converting resolved values to strings.
 *
 * @param url Server URL template.
 * @param variables Values by name: primitives or `{ default: value }` objects. Defaults to `{}`.
 * @param resolveMissing Optional fallback for unresolved names; returning `undefined` preserves the template.
 * @returns Substituted URL, with unresolved templates unchanged.
 */
export function substituteServerVariables(
  url: string,
  variables: Record<string, unknown> = {},
  resolveMissing?: (name: string) => unknown,
): string {
  return url.replace(SERVER_VARIABLE_REGEX, (original: string, name: string) => {
    if (name in variables) {
      const value = variables[name];

      if (typeof value === 'object') {
        if (!Array.isArray(value) && value !== null && 'default' in value) {
          return String(value.default);
        }
      } else {
        return String(value);
      }
    }

    const fallback = resolveMissing?.(name);
    return fallback === undefined ? original : String(fallback);
  });
}

export function stripTrailingSlash(url: string): string {
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }

  return url;
}

/**
 * Normalize a server URL **without validation**:
 * - Default missing schemes to HTTPS.
 * - Use `https://example.com` for empty URLs and root-relative paths.
 * - Remove one trailing `/`, preserving variable templates.
 *
 * @param url Server URL or template.
 * @param urlForProtocolCheck Resolved URL for scheme detection; defaults to `url`.
 * @returns Normalized URL.
 */
export function normalizeURL(url: string | undefined, urlForProtocolCheck: string | undefined = url): string {
  const exampleDotCom = 'https://example.com';
  if (!url) return exampleDotCom;

  url = stripTrailingSlash(url);
  if (!url) return exampleDotCom;

  // A root-relative path needs an origin; prefixing HTTPS would turn `/api` into `https:///api`.
  if (url.startsWith('/') && !url.startsWith('//')) {
    const urlWithOrigin = new URL(exampleDotCom);
    urlWithOrigin.pathname = url;
    return urlWithOrigin.href;
  }

  // Detect the scheme from resolved values while applying any prefix to the original template.
  if (urlForProtocolCheck?.startsWith('//')) {
    return `https:${url}`;
  }

  if (!PROTOCOL_REGEX.test(urlForProtocolCheck?.trim() ?? '')) {
    return `https://${url}`;
  }

  return url;
}
