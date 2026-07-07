import type { JSONSchema4, JSONSchema7 } from 'json-schema';

import openapiV1 from './schemas/v1.2/apiDeclaration.json';
import openapiV2 from './schemas/v2.0/schema.json';
import openapiV3 from './schemas/v3.0/schema.json';
import openapiV31Legacy from './schemas/v3.1/legacy-schema.json';
import openapiV31 from './schemas/v3.1/schema.json';
import openapiV32Legacy from './schemas/v3.2/legacy-schema.json';
import openapiV32 from './schemas/v3.2/schema.json';

export const openapi = {
  v1: openapiV1 as JSONSchema4,
  v2: openapiV2 as JSONSchema4,
  v3: openapiV3 as JSONSchema4,
  v31: openapiV31 as JSONSchema7,
  v31legacy: openapiV31Legacy as JSONSchema7,
  v32: openapiV32 as JSONSchema7,
  v32legacy: openapiV32Legacy as JSONSchema7,
} as const;
