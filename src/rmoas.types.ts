import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { JSONSchema4, JSONSchema6, JSONSchema7 } from 'json-schema'; // eslint-disable-line import/no-unresolved

export type OASDocument = OpenAPIV3.Document | OpenAPIV3_1.Document;
export type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;

export type HttpMethods =
  | (OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods)
  | ('get' | 'put' | 'post' | 'delete' | 'options' | 'head' | 'patch' | 'trace');

export type ServerObject = OpenAPIV3.ServerObject | OpenAPIV3_1.ServerObject;
export type ServerVariableObject = OpenAPIV3.ServerVariableObject | OpenAPIV3_1.ServerVariableObject;
export type ServerVariablesObject = {
  [variable: string]: ServerVariableObject;
};

export type SecuritySchemeObject = OpenAPIV3.SecuritySchemeObject | OpenAPIV3_1.SecuritySchemeObject;

export type KeyedSecuritySchemeObject = {
  _key: string;

  // `x-default` is our custom extension for specifying auth defaults.
  // https://docs.readme.com/docs/openapi-extensions#authentication-defaults
  'x-default'?: primitive;
} & SecuritySchemeObject;

export type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject | OpenAPIV3_1.SecurityRequirementObject;

export type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;

export type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

export type TagObject = OpenAPIV3.TagObject | OpenAPIV3_1.TagObject;

export type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;

export type CallbackObject = OpenAPIV3.CallbackObject | OpenAPIV3_1.CallbackObject;

export type PathsObject = OpenAPIV3.PathsObject | OpenAPIV3_1.PathsObject;
export type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;

export type SchemaObject = (
  | OpenAPIV3.SchemaObject
  | OpenAPIV3_1.SchemaObject
  // Adding `JSONSchema4`, `JSONSchema6`, and `JSONSchema7` to this because `json-schema-merge-allof` expects those.
  | (JSONSchema4 | JSONSchema6 | JSONSchema7)
) & {
  deprecated?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  'x-readme-ref-name'?: string;
};

export type MediaTypeObject = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;

export type CallbackExamples = Array<{
  identifier: string;
  expression: string;
  method: string;
  example: unknown;
}>;

export function isRef(check: unknown): check is OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject {
  return (check as OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject).$ref !== undefined;
}

export interface User {
  [key: string]: unknown;
  keys?: Array<{
    name: primitive;
    user?: primitive;
    pass?: primitive;
    [key: string]: unknown;
  }>;
}
