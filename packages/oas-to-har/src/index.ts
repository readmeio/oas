import type { AuthForHAR, DataForHAR, oasToHarOptions } from './lib/types.js';
import type { PostData, PostDataParams, Request } from 'har-format';
import type Oas from 'oas';
import type { Extensions } from 'oas/extensions';
import type { SchemaWrapper } from 'oas/operation/get-parameters-as-json-schema';
import type {
  HttpMethods,
  JSONSchema,
  MediaTypeObject,
  OASDocument,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
  ResponseObject,
  SchemaObject,
  ServerVariable,
} from 'oas/types';

import { parse as parseDataUrl } from '@readme/data-urls';
import { HEADERS, PROXY_ENABLED } from 'oas/extensions';
import { Operation } from 'oas/operation';
import { isRef } from 'oas/types';
import { jsonSchemaTypes, matchesMimeType } from 'oas/utils';
import removeUndefinedObjects from 'remove-undefined-objects';

import configureSecurity from './lib/configure-security.js';
import { get, set } from './lib/lodash.js';
import formatStyle from './lib/style-formatting/index.js';
import { getSafeRequestBody, getTypedFormatsInSchema, hasSchemaType } from './lib/utils.js';

function formatter(
  values: DataForHAR,
  param: ParameterObject,
  type: 'body' | 'cookie' | 'header' | 'path' | 'query',
  onlyIfExists = false,
) {
  if (param.style) {
    const value = values[type][param.name];
    // Note: Technically we could send everything through the format style and choose the proper
    // default for each `in` type (e.g. query defaults to form).
    return formatStyle(value, param);
  }

  let value;

  // Handle missing values
  if (typeof values[type][param.name] !== 'undefined') {
    value = values[type][param.name];
  } else if (onlyIfExists && !param.required) {
    value = undefined;
  } else if (param.required && param.schema && !isRef(param.schema) && param.schema.default) {
    value = param.schema.default;
  } else if (type === 'path') {
    // If we don't have any values for the path parameter, just use the name of the parameter as the
    // value so we don't try try to build a URL to something like `https://example.com/undefined`.
    return param.name;
  }

  // Handle file uploads. Specifically arrays of file uploads which need to be formatted very
  // specifically.
  if (
    param.schema &&
    !isRef(param.schema) &&
    param.schema.type === 'array' &&
    param.schema.items &&
    !isRef(param.schema.items) &&
    param.schema.items.format === 'binary'
  ) {
    if (Array.isArray(value)) {
      // If this is array of binary data then we shouldn't do anything because we'll prepare them
      // separately in the HAR in order to preserve `fileName` and `contentType` data within
      // `postData.params`. If we don't then the HAR we generate for this data will be invalid.
      return value;
    }

    return JSON.stringify(value);
  }

  if (value !== undefined) {
    // Query params should always be formatted, even if they don't have a `style` serialization
    // configured.
    if (type === 'query') {
      return formatStyle(value, param);
    }

    return value;
  }

  return undefined;
}

function multipartBodyToFormatterParams(payload: unknown, oasMediaTypeObject: MediaTypeObject, schema: SchemaObject) {
  const encoding = oasMediaTypeObject.encoding;

  if (typeof payload === 'object' && payload !== null) {
    return Object.keys(payload)
      .map(key => {
        // If we have an incoming parameter, but it's not in the schema ignore it.
        if (!schema.properties?.[key]) {
          return false;
        }

        const paramEncoding = encoding ? encoding[key] : undefined;

        return {
          name: key,
          // If the style isn't defined, use the default
          style: paramEncoding ? paramEncoding.style : undefined,
          // If explode isn't defined, use the default
          explode: paramEncoding ? paramEncoding.explode : undefined,
          required:
            (schema.required && typeof schema.required === 'boolean' && Boolean(schema.required)) ||
            (Array.isArray(schema.required) && schema.required.includes(key)),
          schema: schema.properties[key],
          in: 'body',
        };
      })
      .filter(Boolean) as ParameterObject[];
  }

  // Pretty sure that we'll never have anything but an object for multipart bodies, so returning
  // empty array if we get anything else.
  return [];
}

const defaultFormDataTypes = Object.keys(jsonSchemaTypes).reduce((prev, curr) => {
  return Object.assign(prev, { [curr]: {} });
}, {});

function getResponseContentType(content: MediaTypeObject) {
  const types = Object.keys(content) || [];

  // If this response content has multiple types available we should always prefer the one that's
  // JSON-compatible. If they don't have one that is we'll return the first available, otherwise
  // if they don't have **any** repsonse content types present we'll assume it's JSON.
  if (types && types.length) {
    const jsonType = types.find(t => matchesMimeType.json(t));
    if (jsonType) {
      return jsonType;
    }

    return types[0];
  }

  return 'application/json';
}

function isPrimitive(val: unknown) {
  return typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean';
}

function stringify(json: Record<string | 'RAW_BODY', unknown>) {
  return JSON.stringify(removeUndefinedObjects(typeof json.RAW_BODY !== 'undefined' ? json.RAW_BODY : json));
}

function stringifyParameter(param: any): string {
  if (param === null || isPrimitive(param)) {
    return param;
  } else if (Array.isArray(param) && param.every(isPrimitive)) {
    return String(param);
  }

  return JSON.stringify(param);
}

function appendHarValue(
  harParam: PostDataParams['params'] | Request['cookies'] | Request['headers'] | Request['queryString'],
  name: string,
  value: any,
  addtlData: {
    contentType?: string;
    fileName?: string;
  } = {},
) {
  if (typeof value === 'undefined') return;

  if (Array.isArray(value)) {
    // If the formatter gives us an array, we're expected to add each array value as a new
    // parameter item with the same parameter name
    value.forEach(singleValue => {
      appendHarValue(harParam, name, singleValue);
    });
  } else if (typeof value === 'object' && value !== null) {
    // If the formatter gives us an object, we're expected to add each property value as a new
    // parameter item, each with the name of the property
    Object.keys(value).forEach(key => {
      appendHarValue(harParam, key, value[key]);
    });
  } else {
    // If the formatter gives us a non-array, non-object, we add it as is
    harParam.push({
      ...addtlData,
      name,
      value: String(value),
    });
  }
}

function encodeBodyForHAR(body: any) {
  if (isPrimitive(body)) {
    return body;
  } else if (
    typeof body === 'object' &&
    body !== null &&
    !Array.isArray(body) &&
    typeof body.RAW_BODY !== 'undefined'
  ) {
    // `RAW_BODY` is a ReadMe-specific thing where we'll interpret the entire payload as a
    // raw string. https://docs.readme.com/docs/raw-body-content
    if (isPrimitive(body.RAW_BODY)) {
      return body.RAW_BODY;
    }

    return stringify(body.RAW_BODY);
  }

  return stringify(body);
}

export default function oasToHar(
  oas: Oas,
  operationSchema?: Operation,
  values: DataForHAR = {},
  auth: AuthForHAR = {},
  opts: oasToHarOptions = {
    // If true, the operation URL will be rewritten and prefixed with https://try.readme.io/ in
    // order to funnel requests through our CORS-friendly proxy.
    proxyUrl: false,
  },
) {
  let operation: Operation;
  if (!operationSchema || typeof operationSchema.getParameters !== 'function') {
    /**
     * If `operationSchema` was supplied as a plain object instead of an instance of `Operation`
     * then we should create a new instance of it. We're doing it with a check on `getParameters`
     * instead of checking `instanceof Operation` because JS is very weird when it comes to
     * checking `instanceof` against classes. One instance of `Operation` may not always match up
     * with another if they're being loaded between two different libraries.
     *
     * It's weird. This is easier.
     */
    operation = new Operation(
      oas as unknown as OASDocument,
      operationSchema?.path || '',
      operationSchema?.method || ('' as HttpMethods),
      (operationSchema as unknown as OperationObject) || { path: '', method: '' },
    );
  } else {
    operation = operationSchema;
  }

  const apiDefinition = oas.getDefinition();

  const formData: DataForHAR = {
    ...defaultFormDataTypes,
    ...values,
  };

  if (!formData.server) {
    formData.server = {
      selected: 0,
      variables: oas.defaultVariables(0),
    };
  }

  // If the incoming `server.variables` is missing variables let's pad it out with defaults.
  formData.server.variables = {
    ...oas.defaultVariables(formData.server.selected),
    ...(formData.server.variables ? formData.server.variables : {}),
  };

  const har: Request = {
    cookies: [],
    headers: [],
    headersSize: 0,
    queryString: [],
    // @ts-expect-error This is fine because we're fleshing `postData` out further down.
    postData: {},
    bodySize: 0,
    method: operation.method.toUpperCase(),
    url: `${oas.url(formData.server.selected, formData.server.variables as ServerVariable)}${operation.path}`.replace(
      /\s/g,
      '%20',
    ),
    httpVersion: 'HTTP/1.1',
  };

  if (opts.proxyUrl) {
    if (oas.getExtension(PROXY_ENABLED, operation)) {
      har.url = `https://try.readme.io/${har.url}`;
    }
  }

  const parameters = operation.getParameters();

  har.url = har.url.replace(/{([-_a-zA-Z0-9[\]]+)}/g, (full, key) => {
    if (!operation || !parameters) return key; // No path params at all

    // Find the path parameter or set a default value if it does not exist
    const parameter = parameters.find(param => param.name === key) || ({ name: key } as ParameterObject);

    // The library that handles our style processing already encodes uri elements. For everything
    // else we need to handle it here.
    if (!('style' in parameter) || !parameter.style) {
      return encodeURIComponent(formatter(formData, parameter, 'path'));
    }

    return formatter(formData, parameter, 'path');
  });

  const queryStrings = parameters && parameters.filter(param => param.in === 'query');
  if (queryStrings && queryStrings.length) {
    queryStrings.forEach(queryString => {
      const value = formatter(formData, queryString, 'query', true);
      appendHarValue(har.queryString, queryString.name, value);
    });
  }

  // Do we have any `cookie` parameters on the operation?
  const cookies = parameters && parameters.filter(param => param.in === 'cookie');
  if (cookies && cookies.length) {
    cookies.forEach(cookie => {
      const value = formatter(formData, cookie, 'cookie', true);
      appendHarValue(har.cookies, cookie.name, value);
    });
  }

  // Does this response have any documented content types?
  if (operation.schema.responses) {
    Object.keys(operation.schema.responses).some(response => {
      if (isRef(operation.schema.responses?.[response])) return false;

      const content = (operation.schema.responses?.[response] as ResponseObject).content;
      if (!content) return false;

      // If there's no `accept` header present we should add one so their eventual code snippet
      // follows best practices.
      if (Object.keys(formData.header || {}).find(h => h.toLowerCase() === 'accept')) return true;

      har.headers.push({
        name: 'accept',
        value: getResponseContentType(content),
      });

      return true;
    });
  }

  // Do we have any `header` parameters on the operation?
  let hasContentType = false;
  let contentType = operation.getContentType();
  const headers = parameters && parameters.filter(param => param.in === 'header');
  if (headers && headers.length) {
    headers.forEach(header => {
      const value = formatter(formData, header, 'header', true);
      if (typeof value === 'undefined') return;

      if (header.name.toLowerCase() === 'content-type') {
        hasContentType = true;
        contentType = String(value);
      }

      appendHarValue(har.headers, header.name, value);
    });
  }

  // Are there `x-headers` static headers configured for this OAS?
  const userDefinedHeaders = oas.getExtension(HEADERS, operation) as Extensions['headers'];
  if (userDefinedHeaders) {
    userDefinedHeaders.forEach(header => {
      if (typeof header.key === 'string' && header.key.toLowerCase() === 'content-type') {
        hasContentType = true;
        contentType = String(header.value);
      }

      har.headers.push({
        name: String(header.key),
        value: String(header.value),
      });
    });
  }

  if (formData.header) {
    // Do we have an `accept` header set up in the form data, but it hasn't been added yet?
    const acceptHeader = Object.keys(formData.header).find(h => h.toLowerCase() === 'accept');
    if (acceptHeader && !har.headers.find(hdr => hdr.name.toLowerCase() === 'accept')) {
      har.headers.push({
        name: 'accept',
        value: String(formData.header[acceptHeader]),
      });
    }

    // Do we have a manually-defined `authorization` header set up in the form data?
    const authorizationHeader = Object.keys(formData.header).find(h => h.toLowerCase() === 'authorization');
    if (authorizationHeader && !har.headers.find(hdr => hdr.name.toLowerCase() === 'authorization')) {
      har.headers.push({
        name: 'authorization',
        value: String(formData.header[authorizationHeader]),
      });
    }
  }

  let requestBody: SchemaWrapper | undefined;
  if (operation.hasRequestBody()) {
    requestBody = operation.getParametersAsJSONSchema().find(payload => {
      // `formData` is used in our API Explorer for `application/x-www-form-urlencoded` endpoints
      // and if you have an operation with that, it will only ever have a `formData`. `body` is
      // used for all other payload shapes.
      return payload.type === (operation.isFormUrlEncoded() ? 'formData' : 'body');
    });
  }

  if (requestBody && requestBody.schema && Object.keys(requestBody.schema).length) {
    const requestBodySchema = requestBody.schema as SchemaObject;

    if (operation.isFormUrlEncoded()) {
      if (Object.keys(formData.formData || {}).length) {
        const cleanFormData = removeUndefinedObjects(JSON.parse(JSON.stringify(formData.formData)));
        if (cleanFormData !== undefined) {
          const postData: PostData = { params: [], mimeType: 'application/x-www-form-urlencoded' };

          Object.keys(cleanFormData).forEach(name => {
            postData.params.push({
              name,
              value: stringifyParameter(cleanFormData[name]),
            });
          });

          har.postData = postData;
        }
      }
    } else if (
      'body' in formData &&
      formData.body !== undefined &&
      (isPrimitive(formData.body) || Object.keys(formData.body).length)
    ) {
      const isMultipart = operation.isMultipart();
      const isJSON = operation.isJson();

      if (isMultipart || isJSON) {
        try {
          let cleanBody = removeUndefinedObjects(JSON.parse(JSON.stringify(formData.body)));

          if (isMultipart) {
            har.postData = { params: [], mimeType: 'multipart/form-data' };

            // Because some request body schema shapes might not always be a top-level `properties`,
            // instead nesting it in an `oneOf` or `anyOf` we need to extract the first usable
            // schema that we have in order to process this multipart payload.
            const safeBodySchema = getSafeRequestBody(requestBodySchema);

            /**
             * Discover all `{ type: string, format: binary }` properties, or arrays containing the
             * same, within the request body. If there are any, then that means that we're dealing
             * with a `multipart/form-data` request and need to treat the payload as
             * `postData.params` and supply filenames and content types for the files (if they're
             * available).
             *
             * @todo It'd be nice to replace this with `getTypedFormatsInSchema` instead.
             * @example `{ type: string, format: binary }`
             * @example `{ type: array, items: { type: string, format: binary } }`
             */
            const binaryTypes = Object.keys(safeBodySchema.properties).filter(key => {
              const propData = safeBodySchema.properties[key] as JSONSchema;
              if (propData.format === 'binary') {
                return true;
              } else if (
                propData.type === 'array' &&
                propData.items &&
                typeof propData.items === 'object' &&
                propData.items !== null &&
                (propData.items as JSONSchema).format === 'binary'
              ) {
                return true;
              }

              return false;
            });

            if (cleanBody !== undefined) {
              const multipartParams = multipartBodyToFormatterParams(
                formData.body,
                (operation.schema.requestBody as RequestBodyObject).content['multipart/form-data'],
                safeBodySchema,
              );

              if (multipartParams.length) {
                Object.keys(cleanBody).forEach(name => {
                  const param = multipartParams.find(multipartParam => multipartParam.name === name);

                  if (param) {
                    // If we're dealing with a binary type, and the value is a valid data URL we should
                    // parse out any available filename and content type to send along with the
                    // parameter to interpreters like `fetch-har` can make sense of it and send a usable
                    // payload.
                    const addtlData: { contentType?: string; fileName?: string } = {};

                    let value = formatter(formData, param, 'body', true);
                    if (!Array.isArray(value)) {
                      value = [value];
                    }

                    value.forEach((val: string) => {
                      if (binaryTypes.includes(name)) {
                        const parsed = parseDataUrl(val);
                        if (parsed) {
                          addtlData.fileName = 'name' in parsed ? parsed.name : 'unknown';
                          if ('contentType' in parsed) {
                            addtlData.contentType = parsed.contentType;
                          }
                        }
                      }

                      appendHarValue(har.postData?.params || [], name, val, addtlData);
                    });
                  }
                });
              }
            }
          } else {
            har.postData = { mimeType: contentType, text: '' };

            if (
              hasSchemaType(requestBody.schema, 'string') ||
              hasSchemaType(requestBody.schema, 'integer') ||
              hasSchemaType(requestBody.schema, 'number') ||
              hasSchemaType(requestBody.schema, 'boolean')
            ) {
              har.postData.text = JSON.stringify(JSON.parse(cleanBody));
            } else {
              /**
               * Handle formatted JSON objects that have properties that accept arbitrary JSON.
               *
               * Find all `{ type: string, format: json }` properties in the schema because we need
               * to manually `JSON.parse` them before submit, otherwise they'll be escaped instead
               * of actual objects. We also only want values that the user has entered, so we drop
               * any `undefined` `cleanBody` keys.
               */
              const jsonTypes = getTypedFormatsInSchema('json', requestBodySchema.properties, { payload: cleanBody });

              if (Array.isArray(jsonTypes) && jsonTypes.length) {
                try {
                  jsonTypes.forEach((prop: boolean | string) => {
                    try {
                      set(cleanBody, String(prop), JSON.parse(get(cleanBody, String(prop))));
                    } catch (e) {
                      // leave the prop as a string value
                    }
                  });

                  // `RAW_BODY` is a ReadMe-specific thing where we'll interpret the entire payload
                  // as a raw string. https://docs.readme.com/docs/raw-body-content
                  if (typeof cleanBody.RAW_BODY !== 'undefined') {
                    cleanBody = cleanBody.RAW_BODY;
                  }

                  har.postData.text = JSON.stringify(cleanBody);
                } catch (e) {
                  har.postData.text = stringify(formData.body);
                }
              } else {
                har.postData.text = encodeBodyForHAR(formData.body);
              }
            }
          }
        } catch (e) {
          // If anything above fails for whatever reason, assume that whatever we had is invalid
          // JSON and just treat it as raw text.
          har.postData = { mimeType: contentType, text: stringify(formData.body) };
        }
      } else {
        har.postData = { mimeType: contentType, text: encodeBodyForHAR(formData.body) };
      }
    }
  }

  // Add a `content-type` header if there are any body values setup above or if there is a schema
  // defined, but only do so if we don't already have a `content-type` present as it's impossible
  // for a request to have multiple.
  if (
    (har.postData?.text || (requestBody && requestBody.schema && Object.keys(requestBody.schema).length)) &&
    !hasContentType
  ) {
    har.headers.push({
      name: 'content-type',
      value: contentType,
    });
  }

  const securityRequirements = operation.getSecurity();

  if (securityRequirements && securityRequirements.length) {
    // TODO pass these values through the formatter?
    securityRequirements.forEach(schemes => {
      Object.keys(schemes).forEach(security => {
        const securityValue = configureSecurity(apiDefinition, auth, security);
        if (!securityValue) {
          return;
        }

        // If this is an `authorization` header and we've already added one (maybe one was manually
        // specified), then we shouldn't add another.
        if (securityValue.value.name === 'authorization') {
          if (har[securityValue.type].find(v => v.name === securityValue.value.name)) {
            return;
          }
        }

        // If we've already added this **specific** security value then don't add it again.
        if (
          har[securityValue.type].find(
            v => v.name === securityValue.value.name && v.value === securityValue.value.value,
          )
        ) {
          return;
        }

        har[securityValue.type].push(securityValue.value);
      });
    });
  }

  // If we didn't end up filling the `postData` object then we don't need it.
  if (Object.keys(har.postData || {}).length === 0) {
    delete har.postData;
  }

  return {
    log: {
      entries: [
        {
          request: har,
        },
      ],
    },
  };
}
