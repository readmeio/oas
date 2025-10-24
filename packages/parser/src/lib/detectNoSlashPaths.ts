import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

/**
 * Detects paths in the API definition that are missing leading slashes.
 * This is a common issue that causes "ADDITIONAL PROPERTY" validation errors.
 *
 * @param api - The API definition to check
 * @returns Array of paths that are missing leading slashes
 */
export function detectNoSlashPaths(api: OpenAPIV2.Document | OpenAPIV3_1.Document | OpenAPIV3.Document): string[] {
  const noSlashPaths: string[] = [];

  if (!api.paths) {
    return noSlashPaths;
  }

  // Check each path in the paths object
  Object.keys(api.paths).forEach(path => {
    // Skip if path already has a leading slash
    if (path.startsWith('/')) {
      return;
    }

    // Skip if it's a valid path parameter pattern like {id}
    if (path.startsWith('{') && path.endsWith('}')) {
      return;
    }

    // This path is missing a leading slash
    noSlashPaths.push(path);
  });

  return noSlashPaths;
}
