import type * as RMOAS from '../rmoas.types';
import { isRef } from '../rmoas.types';
import findSchemaDefinition from './find-schema-definition';

/**
 * Gets the schema of the first media type defined in the `content` of the path operation or returns the ref if there's
 * no Request Body Object.
 *
 * If the ref looks like a `requestBodies` reference, then do a lookup for the actual schema.
 *
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#fixed-fields-8}
 * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.1.0.md#fixed-fields-8}
 * @param operation Operation to look for a primary requestBody schema in.
 * @param api The API definition that this operation exists within.
 * @returns The found requestBody schema.
 */
export default function getSchema(
  operation: RMOAS.OperationObject,
  api?:
    | RMOAS.OASDocument
    | {
        [schemaType: string]: {
          [key: string]: RMOAS.SchemaObject;
        };
      }
): {
  type: string;
  schema: any; // @fixme give this a better type
} {
  try {
    if (isRef(operation.requestBody)) {
      if (operation.requestBody.$ref.match(/^#\/components\/requestBodies\/.*$/)) {
        return getSchema({
          requestBody: findSchemaDefinition(operation.requestBody.$ref, api),
        } as RMOAS.OperationObject);
      }
    }

    const requestBody = operation.requestBody as RMOAS.RequestBodyObject;
    if (requestBody.content) {
      const type = Object.keys(requestBody.content)[0];

      return {
        type,
        schema: requestBody.content[type],
      };
    }

    return {
      type: 'application/json',
      schema: requestBody,
    };
  } catch (e) {} // eslint-disable-line no-empty

  return undefined;
}
