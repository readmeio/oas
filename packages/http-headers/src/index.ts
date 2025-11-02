import type { HTTPHeader, HTTPHeaderDescription } from './types.js';

import { HTTPHeaders } from './http-headers.js';

/**
 * Convert a potentially non-compliant string into a HTTP header type.
 *
 */
export function normalizeHeader(header: string): HTTPHeader {
  return header
    .toLowerCase()
    .split('-')
    .map(h => h.charAt(0).toUpperCase() + h.slice(1))
    .join('-') as HTTPHeader;
}

/**
 * Is the supplied header documented on MDN?
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers}
 */
export function isHeaderValid(header: string): boolean {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader];
}

/**
 * Determine if a given headers is flagged as being `experimental`.
 *
 */
export function isHeaderExperimental(header: string): boolean {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader]?.experimental;
}

/**
 * Determine if a given header is flagged as being `deprecated`.
 */
export function isHeaderDeprecated(header: string): boolean {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader]?.deprecated;
}

/**
 * Retrieve a direct link to a headers documentation on MDN.
 *
 * @example
 * getHeaderLink('Accept') -> 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept'
 */
export function getHeaderLink(header: string): string {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.link || '';
}

/**
 * Retrieve the description for a header, as documented on MDN.
 *
 * @example
 * getHeaderDescription('Authorization') => 'Contains the credentials to authenticate a user-agent with a server.
 */
export function getHeaderDescription(header: string): string {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.description || '';
}

/**
 * Retrieve the description for a header, formatted as Markdown.
 *
 */
export function getHeaderMarkdown(header: string): string {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.markdown || HTTPHeaders[normalizedHeader]?.description || '';
}

/**
 * Perform a lookup of a HTTP Header in MDN's snapshotted documentation.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers}
 */
export function getHeader(header: string): HTTPHeaderDescription {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader] ?? {};
}
