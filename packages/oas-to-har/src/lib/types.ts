export type AuthForHAR = Record<string, number | string | { pass?: string; user?: string }>;

export interface DataForHAR {
  body?: any;
  cookie?: Record<string, any>;
  formData?: Record<string, any>; // `application/x-www-form-urlencoded` requests payloads.
  header?: Record<string, any>;
  path?: Record<string, any>;
  query?: Record<string, any>;
  server?: {
    selected: number;
    variables?: Record<string, unknown>;
  };
}
export interface oasToHarOptions {
  // If true, the operation URL will be rewritten and prefixed with https://try.readme.io/ in
  // order to funnel requests through our CORS-friendly proxy.
  proxyUrl: boolean;
}
