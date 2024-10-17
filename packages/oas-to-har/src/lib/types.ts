export type AuthForHAR = Record<string, number | string | { pass?: string; user?: string }>;

export { DataForHAR } from 'oas/types';

export interface oasToHarOptions {
  // The URL to use for the proxy; defaults to https://try.readme.io
  proxyAddress?: string;

  // If true, the operation URL will be rewritten and prefixed with https://try.readme.io/ in
  // order to funnel requests through our CORS-friendly proxy.
  proxyUrl: boolean;
}
