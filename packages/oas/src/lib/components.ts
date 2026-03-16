import type { OASDocument, SchemaObject } from '../types';

import { isPrimitive } from './helpers';

/**
 * Decorate component schemas within the API definition with a `x-readme-ref-name` property so we
 * can retin their original schema names during dereferencing or `$ref` resolution operations.
 *
 */
export function decorateComponentSchemasWithRefName(api: OASDocument): void {
  if (!api?.components?.schemas || typeof api.components.schemas !== 'object') {
    return;
  }

  Object.keys(api.components.schemas).forEach(schemaName => {
    // As of OpenAPI 3.1 component schemas can be primitives or arrays. If this happens then we
    // shouldn't try to add `x-readme-ref-name` properties because we can't. We'll have some data
    // loss on these schemas but as they aren't objects they likely won't be used in ways that
    // would require needing a `title` or `x-readme-ref-name` anyways.
    if (
      isPrimitive(api.components?.schemas?.[schemaName]) ||
      Array.isArray(api.components?.schemas?.[schemaName]) ||
      api.components?.schemas?.[schemaName] === null
    ) {
      return;
    }

    (api.components?.schemas?.[schemaName] as SchemaObject)['x-readme-ref-name'] = schemaName;
  });
}
