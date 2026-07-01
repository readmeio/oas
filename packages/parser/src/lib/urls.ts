import { isUnsafeUrl } from '@apidevtools/json-schema-ref-parser';

/**
 * Determine if a given URL is unsafe.
 *
 * An unsafe URL is one that is not publicly accessible (no private IPs, private ports, etc.)
 *
 */
export function isUnsafeURL(url: string): boolean {
  return isUnsafeUrl(url);
}
