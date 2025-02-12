import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

export type Document<T extends object = NonNullable<unknown>> =
  | OpenAPIV2.Document<T>
  | OpenAPIV3_1.Document<T>
  | OpenAPIV3.Document<T>;
