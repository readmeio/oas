import type { Document } from './types.js';
import type { SchemaValidator } from './validators/schema.js';
import type { SpecValidator } from './validators/spec.js';
import type $RefParserOptions from '@apidevtools/json-schema-ref-parser/lib/options';
import type { DeepPartial } from '@apidevtools/json-schema-ref-parser/lib/options';

import { getNewOptions } from '@apidevtools/json-schema-ref-parser/lib/options';
import merge from 'lodash/merge';

import { validateSchema } from './validators/schema.js';
import { validateSpec } from './validators/spec.js';

export interface ParserOptionsStrict<S extends Document = Document> extends $RefParserOptions<S> {
  validate: {
    colorizeErrors?: boolean;
    schema?: SchemaValidator | false;
    spec?: SpecValidator | false;
  };
}

export type ParserOptions<S extends Document = Document> = Omit<DeepPartial<ParserOptionsStrict<S>>, 'callback'>;

function getDefaultOptions(): ParserOptions {
  const baseDefaults = getNewOptions({});
  return {
    ...baseDefaults,
    validate: {
      colorizeErrors: false,
      schema: validateSchema,
      spec: validateSpec,
    },
  };
}

export function getOptions<S extends Document = Document>(options: ParserOptions<S> | object): ParserOptionsStrict<S> {
  const newOptions = getDefaultOptions();
  if (options) {
    merge(newOptions, options);
  }

  return newOptions as ParserOptionsStrict;
}
