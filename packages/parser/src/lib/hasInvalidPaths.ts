import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Detects paths in the API definition that are missing leading slashes.
 * This is a common issue that causes "ADDITIONAL PROPERTY" validation errors.
 *
 * @param api - The API definition to check
 * @returns Array of paths that are missing leading slashes
 */
export function hasInvalidPaths(api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document): boolean {
  if (!api.paths || typeof api.paths !== 'object' || Array.isArray(api.paths)) {
    return false;
  }

  // Return paths that do not start with a leading slash
  return Object.keys(api.paths).some(path => !path.startsWith('/'));
}
