import type { Document } from './types.js';
import type { DeepPartial } from '@apidevtools/json-schema-ref-parser/dist/lib/options';
import type $RefParserOptions from '@apidevtools/json-schema-ref-parser/lib/options';

import { getNewOptions } from '@apidevtools/json-schema-ref-parser/lib/options';
import merge from 'lodash/merge';

import { validateSchema as schemaValidator } from './validators/schema.js';
import { validateSpec as specValidator } from './validators/spec.js';

/**
 * OpenAPIParserOptions that determine how Swagger APIs are parsed, resolved, dereferenced, and
 * validated.
 *
 */
export interface ParserOptionsStrict<S extends Document = Document> extends $RefParserOptions<S> {
  validate: {
    colorizeErrors?: boolean;
    schema?: typeof schemaValidator | false;
    spec?: typeof specValidator | false;
  };
}

export type OpenAPIParserOptions<S extends Document = Document> = Omit<DeepPartial<ParserOptionsStrict<S>>, 'callback'>;

function getDefaultOptions(): OpenAPIParserOptions {
  const baseDefaults = getNewOptions({});
  return {
    ...baseDefaults,
    validate: {
      colorizeErrors: false,
      schema: schemaValidator,
      spec: specValidator,
    },
  };
}

export function getOptions<S extends Document = Document>(
  options: OpenAPIParserOptions<S> | object,
): ParserOptionsStrict<S> {
  const newOptions = getDefaultOptions();
  if (options) {
    merge(newOptions, options);
  }

  return newOptions as ParserOptionsStrict;
}
