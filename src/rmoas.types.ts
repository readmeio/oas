import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type OperationObject = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
export type HttpMethods = OpenAPIV3.HttpMethods | OpenAPIV3_1.HttpMethods;
export type KeyedSecuritySchemeObject =
  | (OpenAPIV3.SecuritySchemeObject & { _key?: string })
  | (OpenAPIV3_1.SecuritySchemeObject & { _key?: string });
export type SecurityRequirementObject = OpenAPIV3.SecurityRequirementObject | OpenAPIV3_1.SecurityRequirementObject;
export type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
export type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;
export type TagObject = OpenAPIV3.TagObject | OpenAPIV3_1.TagObject;
export type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
export type CallbackObject = OpenAPIV3.CallbackObject | OpenAPIV3_1.CallbackObject;
export type PathItemObject = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;
export type MediaTypeObject = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;

export function isRef(check: unknown): check is OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject {
  return (check as OpenAPIV3.ReferenceObject | OpenAPIV3_1.ReferenceObject).$ref !== undefined;
}
