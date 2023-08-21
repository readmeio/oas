import type { HTTPHeader, HTTPHeaderDescription } from './types';

import HTTPHeaders from './http-headers';

/**
 * Converts potentially non-compliant string into HTTP header type
 */
export const normalizeHeader = (header: string): HTTPHeader => {
  return header
    .toLowerCase()
    .split('-')
    .map(h => h.charAt(0).toUpperCase() + h.slice(1))
    .join('-') as HTTPHeader;
};

/**
 * Is header documented via MDN's https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers
 */
export const isHeaderValid = (header: string): boolean => {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader];
};

/**
 * Returns if header is flagged as `experimental`.
 */
export const isHeaderExperimental = (header: string): boolean => {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader]?.experimental;
};

/**
 * Returns if header is flagged as `deprecated`.
 */
export const isHeaderDeprecated = (header: string): boolean => {
  const normalizedHeader = normalizeHeader(header);
  return !!HTTPHeaders[normalizedHeader]?.deprecated;
};

/**
 * Returns direct link to header's unique page in MDN.
 * @example
 * getHeaderLink('Accept') -> 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept'
 */
export const getHeaderLink = (header: string): string => {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.link || '';
};

/**
 * Returns header description, as documented in MDN.
 * @example
 * getHeaderDescription('Authorization') => 'Contains the credentials to authenticate a user-agent with a server.
 */
export const getHeaderDescription = (header: string): string => {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.description || '';
};

/**
 * Returns header description, formatted in markdown.
 */
export const getHeaderMarkdown = (header: string): string => {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader]?.markdown || HTTPHeaders[normalizedHeader]?.description || '';
};

/**
 * Performs lookup of an HTTP Header in MDN's snapshotted documentation.
 * Sourced from https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers.
 */
export default function getHeader(header: string): HTTPHeaderDescription {
  const normalizedHeader = normalizeHeader(header);
  return HTTPHeaders[normalizedHeader] ?? {};
}
