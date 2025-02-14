export type AuthForHAR = Record<string, number | string | { pass?: string; user?: string }>;

export type { DataForHAR } from 'oas/types';

export interface oasToHarOptions {
  /**
   * The URL of a proxy to use. Requests will be prefixed with its value; for
   * example if you use "https://try.readme.io", a request to
   * "https://example.com/some/api" will be sent to
   * "https://try.readme.io/https://example.com/some/api"
   */
  proxyUrl: string;
}
