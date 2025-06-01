import type { MediaTypeExample } from './get-mediatype-examples.js';
import type { DataForHAR } from '../../types.js';
import type { Operation } from '../index.js';
import type { OpenAPIV3 } from 'openapi-types';

import { getExtension, type Extensions } from '../../extensions.js';

export type ExampleGroups = Record<
  string,
  {
    /**
     * Array of custom code samples that contain `correspondingExample` key.
     * Mutually exclusive of `request`. Note that if this object is present,
     * there may or may not be corresponding responses in the `response` object.
     */
    customCodeSamples?: (Extensions['code-samples'][number] & {
      /**
       * The index in the originally defined `code-samples` array
       */
      originalIndex: number;
    })[];

    /**
     * Title of example group. This is derived from the `summary` field of one of
     * the operation's example objects. The precedence is as follows (from highest to lowest):
     * 1. The first custom code sample's `name` field.
     * 2. The first request parameter (e.g., cookie/header/path/query) example object that
     *  contains a `summary` field
     * 3. The request body example object's `summary` field
     * 4. The response example object's `summary` field
     *
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#example-object}
     * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#example-object}
     */
    name: string;

    /**
     * Object containing the example request data for the current example key.
     * Mutually exclusive of `customCodeSamples`. If `customCodeSamples` is present,
     * any request example definitions are ignored.
     */
    request?: DataForHAR;

    /**
     * Object containing the example response data for the current example key.
     */
    response?: {
      /**
       * The content type of the current example
       *
       * @example "application/json"
       * @example "text/plain"
       */
      mediaType: string;

      /**
       * The entire response example object. The example value itself is contained
       * within `value`.
       *
       * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.0.3.md#example-object}
       * @see {@link https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.1.0.md#example-object}
       */
      mediaTypeExample: MediaTypeExample;

      /**
       * The HTTP status code for the current response example
       *
       * @example "2xx"
       * @example "400"
       */
      status: string;
    };
  }
>;

/**
 * Internal key to represent custom code samples that do not have a corresponding response example.
 */
const noCorrespondingResponseKey = 'NoCorrespondingResponseForCustomCodeSample';

/**
 * Takes a groups object and an operation and adds any matching response examples
 * to existing groups object
 */
function addMatchingResponseExamples(groups: ExampleGroups, operation: Operation) {
  operation.getResponseExamples().forEach(example => {
    Object.entries(example.mediaTypes || {}).forEach(([mediaType, mediaTypeExamples]) => {
      mediaTypeExamples.forEach(mediaTypeExample => {
        // only add a response example if the `title` field exists
        // and it matches one of the existing example keys
        if (mediaTypeExample.title && Object.keys(groups).includes(mediaTypeExample.title)) {
          groups[mediaTypeExample.title].response = {
            mediaType,
            mediaTypeExample,
            status: example.status,
          };

          // if the current group doesn't already have a name set,
          // use the response example object's summary field
          if (!groups[mediaTypeExample.title].name) {
            groups[mediaTypeExample.title].name = mediaTypeExample.summary;
          }
        }
      });
    });
  });
}

/**
 * Returns a name for the given custom code sample. If there isn't already one defined,
 * we construct a fallback value based on where the sample is in the array.
 */
function getDefaultName(sample: Extensions['code-samples'][number], count: Record<string, number>): string {
  return sample.name && sample.name.length > 0
    ? sample.name
    : `Default${count[sample.language] > 1 ? ` #${count[sample.language]}` : ''}`;
}

/**
 * Returns an object with groups of all example definitions (body/header/query/path/response/etc.).
 * The examples are grouped by their key when defined via the `examples` map.
 *
 * Any custom code samples defined via the `x-readme.code-samples` extension are returned,
 * regardless of if they have a matching response example.
 *
 * For standard OAS request parameter (e.g., body/header/query/path/etc.) examples,
 * they are only present in the return object if they have a corresponding response example
 * (i.e., a response example with the same key in the `examples` map).
 */
export function getExampleGroups(operation: Operation): ExampleGroups {
  const namelessCodeSampleCounts: Record<string, number> = {};
  const groups: ExampleGroups = {};

  // add custom code samples
  const codeSamples = getExtension('code-samples', operation.api, operation) as Extensions['code-samples'];
  codeSamples?.forEach((sample, i) => {
    if (namelessCodeSampleCounts[sample.language]) {
      namelessCodeSampleCounts[sample.language] += 1;
    } else {
      namelessCodeSampleCounts[sample.language] = 1;
    }
    const name = getDefaultName(sample, namelessCodeSampleCounts);

    // sample contains `correspondingExample` key
    if (groups[sample.correspondingExample]?.customCodeSamples?.length) {
      groups[sample.correspondingExample].customCodeSamples.push({ ...sample, name, originalIndex: i });
    } else if (sample.correspondingExample) {
      groups[sample.correspondingExample] = {
        name,
        customCodeSamples: [{ ...sample, name, originalIndex: i }],
      };
    }

    // sample does not contain a corresponding response example
    else if (groups[noCorrespondingResponseKey]?.customCodeSamples?.length) {
      groups[noCorrespondingResponseKey].customCodeSamples.push({ ...sample, name, originalIndex: i });
    } else {
      groups[noCorrespondingResponseKey] = {
        name,
        customCodeSamples: [{ ...sample, name, originalIndex: i }],
      };
    }
  });

  // if we added any custom code samples, add the corresponding response examples and return
  if (Object.keys(groups).length) {
    addMatchingResponseExamples(groups, operation);
    return groups;
  }

  // add request param examples
  operation.getParameters().forEach(param => {
    Object.entries(param.examples || {}).forEach(([exampleKey, paramExample]: [string, OpenAPIV3.ExampleObject]) => {
      groups[exampleKey] = {
        ...groups[exampleKey],
        name: groups[exampleKey]?.name || paramExample.summary,
        request: {
          ...groups[exampleKey]?.request,
          [param.in]: {
            ...groups[exampleKey]?.request?.[param.in],
            [param.name]: paramExample.value,
          },
        },
      };
    });
  });

  // add request body examples
  operation.getRequestBodyExamples().forEach(requestExample => {
    requestExample.examples.forEach((mediaTypeExample: MediaTypeExample) => {
      if (mediaTypeExample.title) {
        const mediaType = requestExample.mediaType === 'application/x-www-form-urlencoded' ? 'formData' : 'body';
        groups[mediaTypeExample.title] = {
          ...groups[mediaTypeExample.title],
          name: groups[mediaTypeExample.title]?.name || mediaTypeExample.summary,
          request: {
            ...groups[mediaTypeExample.title]?.request,
            [mediaType]: mediaTypeExample.value,
          },
        };
      }
    });
  });

  // if we added any request examples, add the corresponding response examples
  if (Object.keys(groups).length) {
    addMatchingResponseExamples(groups, operation);
  }

  // prune any objects that don't have both a request and a response
  Object.entries(groups).forEach(([groupId, group]) => {
    if (group.request && !group.response) {
      delete groups[groupId];
    }
  });

  return groups;
}
