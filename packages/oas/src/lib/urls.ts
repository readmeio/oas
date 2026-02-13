import type { Match, ParamData } from 'path-to-regexp';
import type { HttpMethods, OASDocument, PathsObject } from '../types';

import { match, pathToRegexp } from 'path-to-regexp';

import { SERVER_VARIABLE_REGEX } from '../utils';

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

export function stripTrailingSlash(url: string): string {
  if (url[url.length - 1] === '/') {
    return url.slice(0, -1);
  }

  return url;
}

function ensureProtocol(url: string) {
  // Add protocol to urls starting with // e.g. //example.com
  // This is because httpsnippet throws a HARError when it doesnt have a protocol
  if (url.match(/^\/\//)) {
    return `https:${url}`;
  }

  // Add protocol to urls with no // within them
  // This is because httpsnippet throws a HARError when it doesnt have a protocol
  if (!url.match(/\/\//)) {
    return `https://${url}`;
  }

  return url;
}

/**
 * Normalize a OpenAPI server URL by ensuring that it has a proper HTTP protocol and doesn't have a
 * trailing slash.
 *
 * @param api The API definition that we're processing.
 * @param selected The index of the `servers` array in the API definition that we want to normalize.
 */
export function normalizedURL(api: OASDocument, selected: number): string {
  const exampleDotCom = 'https://example.com';
  let url: string | undefined;
  try {
    url = api.servers?.[selected].url;
    // This is to catch the case where servers = [{}]
    if (!url) throw new Error('no url');

    // Stripping the '/' off the end
    url = stripTrailingSlash(url);

    // Check if the URL is just a path a missing an origin, for example `/api/v3`. If so, then make
    // `example.com` the origin to avoid it becoming something invalid like `https:///api/v3`.
    // RM-1044
    if (url.startsWith('/') && !url.startsWith('//')) {
      const urlWithOrigin = new URL(exampleDotCom);
      urlWithOrigin.pathname = url;
      url = urlWithOrigin.href;
    }
  } catch {
    url = exampleDotCom;
  }

  return ensureProtocol(url);
}

/**
 * With a URL that may contain server variables, transform those server variables into regex that
 * we can query against.
 *
 * For example, when given `https://{region}.node.example.com/v14` this will return back:
 *
 *    https://([-_a-zA-Z0-9:.[\\]]+).node.example.com/v14
 *
 * @param url URL to transform
 */
export function transformURLIntoRegex(url: string): string {
  return stripTrailingSlash(url.replace(SERVER_VARIABLE_REGEX, '([-_a-zA-Z0-9:.[\\]]+)'));
}

/**
 * Normalize a path so that we can use it with `path-to-regexp` to do operation lookups.
 *
 * @param path Path to normalize.
 */
function normalizePath(path: string) {
  return (
    path
      // This regex transforms `{pathParam}` into `:pathParam` so we can regex against it. We're
      // also handling quirks here like if there's an optional proceeding or trailing curly bracket
      // (`{{pathParam}` or `{pathParam}}`) as any unescaped curlys, which would be present in
      // `:pathParam}`, will throw a regex exception.
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
        return `:${args[1].replace('-', '')}`;
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
  const prunedPathName = pathName.split('?')[0];
  const matches: PathMatches = Object.keys(paths)
    .map(path => {
      const cleanedPath = normalizePath(path);

      let matchResult: PathMatch['match'];
      try {
        const matchStatement = match(cleanedPath, { decode: decodeURIComponent });
        matchResult = matchStatement(prunedPathName);
      } catch {
        // If path matching fails for whatever reason (maybe they have a malformed path parameter)
        // then we shouldn't also fail.
        return false;
      }

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
 * @param pathMatches URL and PathsObject matches to narrow down to find a target path.
 * @returns An object containing matches that were discovered in the API definition.
 */
export function findTargetPath(pathMatches: PathMatch[]): PathMatch | undefined {
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
