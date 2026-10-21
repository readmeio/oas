import type { HttpMethods, PathsObject, ServerObject, ServerVariable, ServerVariablesObject, User } from '../types';
import type { Match, ParamData } from 'path-to-regexp';

import { normalizeURL, stripTrailingSlash, substituteServerVariables } from '@readme/openapi-parser/lib/urls';
import { match, pathToRegexp } from 'path-to-regexp';

import getUserVariable from './get-user-variable';

export interface PathMatch {
  match?: Match<ParamData>;
  operation: PathsObject;
  url: {
    method?: HttpMethods;
    nonNormalizedPath: string;
    origin: string;
    path: string;
    slugs: Record<string, string>;
  };
}

export type PathMatches = PathMatch[];

export type SplitUrlResult = (
  | {
      /**
       * A unique key, where the `value` is concatenated to its index
       */
      key: string;
      type: 'text';
      value: string;
    }
  | {
      /**
       * An optional description for the server variable.
       *
       * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-4}
       */
      description?: string;

      /**
       * An enumeration of string values to be used if the substitution options are from a limited set.
       *
       * @see {@link https://spec.openapis.org/oas/v3.1.0#fixed-fields-4}
       */
      enum?: string[];

      /**
       * A unique key, where the `value` is concatenated to its index
       */
      key: string;
      type: 'variable';
      value: string;
    }
)[];

/**
 * Escape a string so it can be interpolated into `RegExp` as a literal.
 *
 * Server URLs and URL origins routinely contain `.`, `?`, `+`, and other regex metacharacters.
 * Using them unescaped treats those characters as operators and can match the wrong host or path.
 */
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalize an unresolved OpenAPI server URL. Server variable defaults are substituted into a
 * temporary copy of the URL so that a protocol supplied by a variable isn't added a second time.
 *
 * @param servers Server objects to choose from.
 * @param selected The index of the server object that we want to normalize.
 */
function normalizedURLFromServers(servers: ServerObject[] | undefined, selected: number): string {
  const server = servers?.[selected];
  const resolvedUrl = server?.url ? substituteServerVariables(server.url, server.variables) : undefined;

  return normalizeURL(server?.url, resolvedUrl);
}

export function variablesFromServers(servers: ServerObject[] | undefined, selected = 0): ServerVariablesObject {
  return servers?.[selected]?.variables || {};
}

export function defaultVariablesFromServers(
  servers: ServerObject[] | undefined,
  selected = 0,
  user: User = {},
): ServerVariable {
  const variables = variablesFromServers(servers, selected);
  const defaults: ServerVariable = {};

  Object.keys(variables).forEach(key => {
    defaults[key] = getUserVariable(user, key) || variables[key].default || '';
  });

  return defaults;
}

export function splitUrlFromServers(servers: ServerObject[] | undefined, selected = 0): SplitUrlResult {
  const url = normalizedURLFromServers(servers, selected);
  const variables = variablesFromServers(servers, selected);

  return url
    .split(/({.+?})/)
    .filter(Boolean)
    .map((part, i) => {
      const isVariable = part.match(/[{}]/);
      const value = part.replace(/[{}]/g, '');
      const key = `${value}-${i}`;

      if (!isVariable) {
        return {
          type: 'text',
          value,
          key,
        } as const;
      }

      const variable = variables?.[value];
      return {
        type: 'variable',
        value,
        key,
        description: variable?.description,
        enum: variable?.enum,
      } as const;
    });
}

/**
 * With a URL that may contain server variables, transform those server variables into regex that
 * we can query against.
 *
 * For example, when given `https://{region}.node.example.com/v14` this will return back:
 *
 *    https://([-_a-zA-Z0-9:.[\\]]+)\.node\.example\.com/v14
 *
 * Static URL text is regex-escaped so hostname dots (and other metacharacters) stay literal.
 *
 * @param url URL to transform
 */
export function transformURLIntoRegex(url: string): string {
  // Split on `{var}` without capturing the name so we only interleave static text and the
  // variable-matching group. `SERVER_VARIABLE_REGEX` is global and capturing, so reusing it here
  // would both leave `lastIndex` dirty and insert the variable names into the result.
  const staticParts = url.split(/\{[-_a-zA-Z0-9:.[\]]+\}/g);
  return stripTrailingSlash(staticParts.map(escapeRegExp).join('([-_a-zA-Z0-9:.[\\]]+)'));
}

/**
 * Decode a URL or OpenAPI pathname so static segments compare equally whether they contain a
 * literal space (or other reserved-safe character) or the equivalent percent-encoding (`%20`).
 *
 * `decodeURI` is used instead of `decodeURIComponent` so `%2F` stays encoded and slash boundaries
 * are not rewritten. Invalid percent-encoding is left unchanged so callers can treat it as a
 * non-match instead of throwing.
 *
 * @param path Pathname to decode.
 */
function decodePathname(path: string): string {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
}

/**
 * After `normalizePath()`, a parameter is `:name` or `\\::name` and may sit after a static prefix
 * (`quarterly-:year`). Whole-segment checks would treat that as static and escape the colon.
 */
const PARAM_TOKEN = /\\:[A-Za-z0-9_]+|:[A-Za-z0-9_]+/;

function indexOfParamToken(segment: string): number {
  const found = PARAM_TOKEN.exec(segment);
  return found ? found.index : -1;
}

/**
 * Escape characters that `path-to-regexp` treats as syntax so a decoded static segment like
 * `{id}` (from `%7Bid%7D`) stays literal text instead of becoming an optional group. Parameter
 * tokens are left intact so prefixed params (`quarterly-:year`) still capture.
 */
function escapeStaticPathToRegexp(segment: string): string {
  const protectedTokens: string[] = [];
  // Keep `:name` and already-escaped `\:` (from `{a}:{b}` → `:a\::b`) out of the escaper.
  const withPlaceholders = segment.replace(/\\:[A-Za-z0-9_]*|:[A-Za-z0-9_]+/g, token => {
    protectedTokens.push(token);
    return `__OAS_PARAM_${protectedTokens.length - 1}__`;
  });

  return withPlaceholders
    .replace(/[:*{}\\]/g, '\\$&')
    .replace(/__OAS_PARAM_(\d+)__/g, (_, i) => protectedTokens[Number(i)]);
}

function dropTrailingEmptySegment(segs: string[]): string[] {
  // `/foo/` → ['', 'foo', '']; keep `/` as ['', ''].
  if (segs.length > 2 && segs[segs.length - 1] === '') {
    return segs.slice(0, -1);
  }

  return segs;
}

/**
 * Return the incoming index at which `incoming` has decoded to exactly `decodedPrefix`, so the
 * remainder (a path-parameter capture) can stay encoded for a single `decodeURIComponent`.
 */
function consumeEncodedPrefix(incoming: string, decodedPrefix: string): number {
  if (decodedPrefix === '') {
    return 0;
  }

  for (let i = 0; i <= incoming.length; i += 1) {
    let decoded: string;
    try {
      decoded = decodeURI(incoming.slice(0, i));
    } catch {
      continue;
    }

    if (decoded === decodedPrefix) {
      return i;
    }

    if (decoded.length > decodedPrefix.length) {
      return -1;
    }
  }

  return -1;
}

function alignIncomingSegment(incoming: string, templateSeg: string): string {
  const paramIdx = indexOfParamToken(templateSeg);
  if (paramIdx < 0) {
    return decodePathname(incoming);
  }

  if (paramIdx === 0) {
    return incoming;
  }

  const staticPrefix = decodePathname(templateSeg.slice(0, paramIdx));
  const prefixEnd = consumeEncodedPrefix(incoming, staticPrefix);
  if (prefixEnd < 0) {
    return incoming;
  }

  return staticPrefix + incoming.slice(prefixEnd);
}

/**
 * Decode only static text of an incoming pathname, leaving parameter captures encoded so
 * `decodeURIComponent` runs on them exactly once. A trailing slash is ignored so
 * `/foo%20bar/` still aligns against `/foo bar`.
 */
function alignIncomingPath(pathName: string, normalizedTemplate: string): string {
  const pathSegs = dropTrailingEmptySegment(pathName.split('/'));
  const tmplSegs = dropTrailingEmptySegment(normalizedTemplate.split('/'));
  if (pathSegs.length !== tmplSegs.length) {
    return pathName;
  }

  return pathSegs.map((seg, i) => alignIncomingSegment(seg, tmplSegs[i])).join('/');
}

/**
 * Normalize a path so that we can use it with `path-to-regexp` to do operation lookups.
 *
 * @param path Path to normalize.
 */
function normalizePath(path: string) {
  const usedNames = new Set<string>();

  return (
    path
      // This regex transforms `{pathParam}` into `:pathParam` so we can regex against it. We're
      // also handling quirks here like if there's an optional proceeding or trailing curly bracket
      // (`{{pathParam}` or `{pathParam}}`) as any unescaped curlys, which would be present in
      // `:pathParam}`, will throw a regex exception.
      // oxlint-disable-next-line no-unused-vars
      .replace(/({?){(.*?)}(}?)/g, (str, ...args) => {
        // If a path contains a path parameter with hyphens, like `:dlc-release`, when it's regexd
        // with `path-to-regexp` it match against the `:dlc` portion of the parameter, breaking all
        // matching against the full path.
        //
        // For example on `/games/:game/dlc/:dlc-release` the regex that's actually used to search
        // against a path like `/games/destiny-2/dlc/witch-queen` is the following:
        //    /^\/games(?:\/([^\/#\?]+?))\/dlc(?:\/([^\/#\?]+?))-release[\/#\?]?$/i
        //
        // However if `:dlc-release` is rewritten to `:dlcrelease` we end up with a functional
        // regex: /^\/games(?:\/([^\/#\?]+?))\/dlc(?:\/([^\/#\?]+?))[\/#\?]?$/i.
        //
        // Stripping every hyphen can collide distinct names in the same path (`{account-holder-id}`
        // and `{accountholderid}`). Disambiguate later collisions so each capture keeps its own
        // slug key and `findTargetPath` still sees the real parameter count.
        const base = args[1].replaceAll('-', '');
        let name = base;
        let suffix = 2;
        while (usedNames.has(name)) {
          name = `${base}_${suffix}`;
          suffix += 1;
        }
        usedNames.add(name);
        return `:${name}`;
      })

      // In addition to transforming `{pathParam}` into `:pathParam` we also need to escape cases
      // where a non-variabled colon is next to a variabled-colon because if we don't then
      // `path-to-regexp` won't be able to correct identify where the variable starts.
      //
      // For example if the URL is `/post/:param1::param2` we'll be escaping it to
      // `/post/:param1\::param2`.
      .replace(/::/, '\\::')

      // We also need to escape question marks too because they're treated as regex modifiers.
      .split('?')[0]
  );
}

// Bounds the matcher cache in long-lived multi-tenant processes.
const MATCHER_CACHE_MAX_SIZE = 10_000;
type PathMatcher = (path: string) => Match<ParamData>;

const matcherCache = new Map<string, { cleanedPath: string; matcher: PathMatcher | null; normalized: string }>();

/**
 * Compile a path template into its normalized form and `path-to-regexp` matcher. Compiling costs
 * an order of magnitude more than executing and depends only on the template string, so compiled
 * matchers are cached process-wide. A `null` matcher marks a template that can't be compiled.
 *
 * Authored `{param}` syntax is normalized first so percent-encoded braces (`%7Bid%7D`) stay
 * literal. Static segments are then `decodeURI`'d for encoding-insensitive matching; captures
 * are still decoded once by `decodeURIComponent`.
 */
function compilePathMatcher(path: string): {
  cleanedPath: string;
  matcher: PathMatcher | null;
  normalized: string;
} {
  let compiled = matcherCache.get(path);
  if (compiled === undefined) {
    const normalized = normalizePath(path);
    const normalizedSegs = normalized.split('/');
    const cleanedSegs = normalizedSegs.map(seg => {
      const paramIdx = indexOfParamToken(seg);
      if (paramIdx < 0) {
        return decodePathname(seg);
      }

      if (paramIdx === 0) {
        return seg;
      }

      return decodePathname(seg.slice(0, paramIdx)) + seg.slice(paramIdx);
    });
    const cleanedPath = cleanedSegs.join('/');
    const matcherPath = cleanedSegs.map(seg => escapeStaticPathToRegexp(seg)).join('/');
    let matcher = null;
    try {
      matcher = match(matcherPath, { decode: decodeURIComponent });
    } catch {
      // A template that can't be compiled (maybe it has a malformed path parameter) can never
      // match; record that instead of failing.
    }

    if (matcherCache.size >= MATCHER_CACHE_MAX_SIZE) {
      matcherCache.delete(matcherCache.keys().next().value as string);
    }

    compiled = { cleanedPath, matcher, normalized };
    matcherCache.set(path, compiled);
  }

  return compiled;
}

function safeMatch(matcher: PathMatcher, pathName: string): PathMatch['match'] {
  try {
    return matcher(pathName);
  } catch {
    // Executing a matcher can throw independently of compiling it -- a malformed
    // percent-encoding in the URL will throw in `decodeURIComponent` -- and should count as
    // a non-match, not a failure.
    return false;
  }
}

/**
 * Generate path matches for a given path and origin on a set of OpenAPI path objects.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#paths-object}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#paths-object}
 * @param paths The OpenAPI Paths Object to process.
 * @param pathName Path to look for a match.
 * @param origin The origin that we're matching against.
 */
export function generatePathMatches(paths: PathsObject, pathName: string, origin: string): PathMatches {
  const rawPathName = pathName.split('?')[0];
  const matches: PathMatches = Object.keys(paths)
    .map(path => {
      const { cleanedPath, matcher, normalized } = compilePathMatcher(path);
      if (!matcher) return false;

      // Decode static segments only so `/foo bar/{id}` matches `/foo%20bar/a%2Fb` while the
      // `{id}` capture is still `decodeURIComponent`'d once (`a/b`, not `a%2Fb` or a
      // double-decoded `%252F`).
      const matchResult = safeMatch(matcher, alignIncomingPath(rawPathName, normalized));

      const slugs: Record<string, string> = {};

      if (matchResult && Object.keys(matchResult.params).length) {
        Object.keys(matchResult.params).forEach(param => {
          slugs[`:${param}`] = (matchResult.params as Record<string, string>)[param];
        });
      }

      return {
        url: {
          origin,
          path: cleanedPath.replace(/\\::/, '::'),
          nonNormalizedPath: path,
          slugs,
        },
        operation: paths[path] as PathsObject,
        match: matchResult,
      } satisfies PathMatch;
    })
    .filter(item => item !== false);

  return matches.filter(p => p.match);
}

/**
 * @param pathMatches Array of path matches to filter down.
 * @param targetMethod HTTP method to look for.
 * @returns Filtered down path matches.
 */
export function filterPathMethods(pathMatches: PathMatches, targetMethod: HttpMethods): PathMatch[] {
  const regExp = pathToRegexp(targetMethod);
  return pathMatches
    .map(p => {
      const captures = Object.keys(p.operation).filter(r => regExp.regexp.exec(r));

      if (captures.length) {
        const method = captures[0];
        p.url.method = method.toUpperCase() as HttpMethods;

        return {
          url: p.url,
          operation: p.operation[method],
        };
      }

      return false;
    })
    .filter((item): item is PathMatch => Boolean(item));
}

/**
 * Of the given matches, pick the one with the fewest path parameters, as a literal segment match
 * is more specific than a parameter capture. Ties intentionally go to the **later** match (the
 * `<=`): `Oas.findOperationMatches()` relies on this by appending operation and path-item server
 * matches after root server ones, so that the server defined closest to the operation wins.
 *
 * @param pathMatches URL and PathsObject matches to narrow down to find a target path.
 * @returns An object containing matches that were discovered in the API definition.
 */
export function findTargetPath(pathMatches: PathMatch[]): PathMatch | undefined {
  if (!pathMatches.length) {
    return undefined;
  }

  let minCount = Object.keys(pathMatches[0].url.slugs).length;
  let found: PathMatch | undefined;

  for (let m = 0; m < pathMatches.length; m += 1) {
    const selection = pathMatches[m];
    const paramCount = Object.keys(selection.url.slugs).length;
    if (paramCount <= minCount) {
      minCount = paramCount;
      found = selection;
    }
  }

  return found;
}
