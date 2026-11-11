/**
 * Payload of an OpenAPI Example Object.
 *
 * OpenAPI 3.2 adds `dataValue` and `serializedValue` alongside `value`. `value` wins when it is
 * present, then `dataValue`, then `serializedValue`. A present key wins even when the payload is
 * `null` or an empty string.
 *
 * @see {@link https://spec.openapis.org/oas/v3.2.0.html#example-object}
 */
export function exampleValue(example: object): unknown {
  if ('value' in example) {
    return example.value;
  }

  if ('dataValue' in example) {
    return example.dataValue;
  }

  if ('serializedValue' in example) {
    return example.serializedValue;
  }

  return undefined;
}
