import type { MediaTypeExample } from './get-mediatype-examples.js';
import type * as RMOAS from '../../types.js';
import type { Operation } from '../index.js';
import type { OpenAPIV3 } from 'openapi-types';

import { getExtension, type Extensions } from '../../extensions.js';

export type ExampleGroups = Record<
  string,
  {
    /**
     * List of custom code samples that contain `correspondingExample` key.
     * Mutually exclusive of `request`.
     */
    customCodeSamples?: Extensions['code-samples'][];
    /**
     * Title of example pair. Precedence is as follows: TKTK
     */
    name: string;
    /**
     * TKTK
     */
    request?: RMOAS.DataForHAR;
    /**
     * TKTK
     */
    response?: {
      mediaType: string;
      mediaTypeExample: MediaTypeExample;
      status: string;
    };
  }
>;

/**
 * TKTK
 */
export function getExampleGroups(operation: Operation): ExampleGroups {
  const pairs: ExampleGroups = {};

  // first, parse through custom code samples
  const codeSamples = getExtension('code-samples', operation.api, operation) as Extensions['code-samples'][];

  let namelessCodeSamples = 0;
  // internal key to represent code samples that do not have a corresponding response example,
  // but should still be surfaced in the UI
  const noCorrespondingResponseKey = 'NoCorrespondingResponseForCustomCodeSample';
  // add any and all code samples since they take precedence
  (codeSamples || [])?.forEach(sample => {
    namelessCodeSamples += 1;
    // sample contains `correspondingExample` key and key already exists in pair object
    if (pairs[sample.correspondingExample]?.customCodeSamples?.length) {
      // append code sample to existing list of items
      pairs[sample.correspondingExample].customCodeSamples.push(sample);
    }
    // sample contains `correspondingExample` key (fallback)
    else if (sample.correspondingExample) {
      const name =
        sample.name && sample.name.length > 0
          ? sample.name
          : `Default${namelessCodeSamples > 1 ? ` #${namelessCodeSamples}` : ''}`;

      // create example pair entry with code sample
      pairs[sample.correspondingExample] = {
        name,
        customCodeSamples: [sample],
      };
    }
    // sample does not contain corresponding response example and internal key already exists
    else if (pairs[noCorrespondingResponseKey]?.customCodeSamples?.length) {
      // append code sample to existing list of items
      pairs[noCorrespondingResponseKey].customCodeSamples.push(sample);
    }
    // sample does not contain corresponding response example (fallback)
    else {
      const name =
        sample.name && sample.name.length > 0
          ? sample.name
          : `Default${namelessCodeSamples > 1 ? ` #${namelessCodeSamples}` : ''}`;

      // create example pair entry with code sample
      pairs[noCorrespondingResponseKey] = {
        name,
        customCodeSamples: [sample],
      };
    }
  });

  // if code samples with `correspondingExample` delineator exist, add those
  // and add any matching responses and then return
  if (Object.keys(pairs).length) {
    operation.getResponseExamples().forEach(example => {
      Object.entries(example.mediaTypes || {}).forEach(([mediaType, mediaTypeExamples]) => {
        mediaTypeExamples.forEach(mediaTypeExample => {
          if (mediaTypeExample.title && Object.keys(pairs).includes(mediaTypeExample.title)) {
            pairs[mediaTypeExample.title].response = {
              mediaType,
              mediaTypeExample,
              status: example.status,
            };

            // if the current pair doesn't already have a name set, use the response example summary
            if (!pairs[mediaTypeExample.title].name) {
              pairs[mediaTypeExample.title].name = mediaTypeExample.summary;
            }
          }
        });
      });
    });
  } else {
    // if no custom code examples, parse through param and body examples
    operation.getParameters().forEach(param => {
      Object.entries(param.examples || {}).forEach(([exampleKey, paramExample]: [string, OpenAPIV3.ExampleObject]) => {
        pairs[exampleKey] = {
          ...pairs[exampleKey],
          name: paramExample.summary,
          request: {
            ...pairs[exampleKey]?.request,
            [param.in]: {
              ...pairs[exampleKey]?.request?.[param.in],
              [param.name]: paramExample.value,
            },
          },
        };
      });
    });

    // add request body examples
    operation.getRequestBodyExamples().forEach(requestExample => {
      requestExample.examples.forEach((mediaTypeExample: MediaTypeExample) => {
        if (mediaTypeExample.title && Object.keys(pairs).includes(mediaTypeExample.title)) {
          pairs[mediaTypeExample.title] = {
            ...pairs[mediaTypeExample.title],
            request: {
              ...pairs[mediaTypeExample.title]?.request,
              body: mediaTypeExample.value,
            },
          };

          // if the current pair doesn't already have a name set, use the response example summary
          if (!pairs[mediaTypeExample.title].name) {
            pairs[mediaTypeExample.title].name = mediaTypeExample.summary;
          }
        }
      });
    });

    if (Object.keys(pairs).length) {
      // if there are matching keys, add the corresponding response examples
      operation.getResponseExamples().forEach(example => {
        Object.entries(example.mediaTypes || {}).forEach(([mediaType, mediaTypeExamples]) => {
          mediaTypeExamples.forEach(mediaTypeExample => {
            if (mediaTypeExample.title && Object.keys(pairs).includes(mediaTypeExample.title)) {
              pairs[mediaTypeExample.title].response = {
                mediaType,
                mediaTypeExample,
                status: example.status,
              };

              // if the current pair doesn't already have a name set, use the response example summary
              if (!pairs[mediaTypeExample.title].name) {
                pairs[mediaTypeExample.title].name = mediaTypeExample.summary;
              }
            }
          });
        });
      });
    }
  }

  // cull any objects that don't have both request + response
  Object.entries(pairs).forEach(([pairId, pair]) => {
    if (pair.request && !pair.response) {
      delete pairs[pairId];
    }
  });

  return pairs;
}
