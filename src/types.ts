import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema'; // eslint-disable-line import/no-unresolved

// Adding `JSONSchema4`, `JSONSchema6`, and `JSONSchema7` to this because `json-schema-merge-allof` expects those.
export type SchemaObject = (
  | OpenAPIV3.SchemaObject
  | OpenAPIV3_1.SchemaObject
  | (JSONSchema4 | JSONSchema6 | JSONSchema7)
) & {
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
};

export type primitive = string | number | boolean;
