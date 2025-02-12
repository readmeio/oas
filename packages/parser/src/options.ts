import type { Document } from './types.js';
import type { DeepPartial } from '@apidevtools/json-schema-ref-parser/dist/lib/options';
import type $RefParserOptions from '@apidevtools/json-schema-ref-parser/lib/options';

import { getNewOptions } from '@apidevtools/json-schema-ref-parser/lib/options';
import merge from 'lodash/merge';

import { validateSchema as schemaValidator } from './validators/schema.js';
import { validateSpec as specValidator } from './validators/spec.js';

/**
 * SwaggerParserOptions that determine how Swagger APIs are parsed, resolved, dereferenced, and
 * validated.
 *
 * @param {object|SwaggerParserOptions} [_options] - Overridden options
 * @class
 * @augments $RefParserOptions
 */
export interface ParserOptionsStrict<S extends Document = Document> extends $RefParserOptions<S> {
  validate: {
    colorizeErrors?: boolean;
    schema?: typeof schemaValidator | false;
    spec?: typeof specValidator | false;
  };
}

export type SwaggerParserOptions<S extends Document = Document> = Omit<DeepPartial<ParserOptionsStrict<S>>, 'callback'>;

function getSwaggerParserDefaultOptions(): SwaggerParserOptions {
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

export function getSwaggerParserOptions<S extends Document = Document>(
  options: SwaggerParserOptions<S> | object,
): ParserOptionsStrict<S> {
  let newOptions = getSwaggerParserDefaultOptions();
  if (options) {
    newOptions = merge(newOptions, options);
  }

  return newOptions as ParserOptionsStrict;
}
