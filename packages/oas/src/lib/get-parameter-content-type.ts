import matchesMimetype from './matches-mimetype.js';

/**
 * Selects a content type from an array of content type keys, prioritizing `application/json`
 * and other JSON-like content types over other content types.
 *
 * When multiple content types are present:
 * - If there's exactly one content type, it's returned
 * - If there are multiple content types, JSON-like content types (e.g., `application/json`,
 *   `application/vnd.api+json`) are prioritized
 * - If no JSON-like content types are present, the first content type is returned
 *
 * @param contentKeys - Array of content type keys (e.g., ['application/json', 'application/xml'])
 * @returns The selected content type, or undefined if the array is empty
 */
export function getParameterContentType(contentKeys: string[]): string | undefined {
  if (contentKeys.length === 0) {
    return undefined;
  }

  if (contentKeys.length === 1) {
    return contentKeys[0];
  }

  // We should always try to prioritize `application/json` over any other possible
  // content that might be present on this schema.
  const jsonLikeContentTypes = contentKeys.filter(k => matchesMimetype.json(k));
  if (jsonLikeContentTypes.length) {
    return jsonLikeContentTypes[0];
  }

  return contentKeys[0];
}
