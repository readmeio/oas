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
     * Title of example group. Precedence is as follows: TKTK
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

// internal key to represent code samples that do not have a corresponding response example,
// but should still be surfaced in the UI
const noCorrespondingResponseKey = 'NoCorrespondingResponseForCustomCodeSample';

/**
 * Takes a groups object and an operation and adds any matching response examples
 * to existing groups object
 */
function addMatchingResponseExamples(groups: ExampleGroups, operation: Operation) {
  operation.getResponseExamples().forEach(example => {
    Object.entries(example.mediaTypes || {}).forEach(([mediaType, mediaTypeExamples]) => {
      mediaTypeExamples.forEach(mediaTypeExample => {
        if (mediaTypeExample.title && Object.keys(groups).includes(mediaTypeExample.title)) {
          groups[mediaTypeExample.title].response = {
            mediaType,
            mediaTypeExample,
            status: example.status,
          };

          // if the current group doesn't already have a name set, use the response example summary
          if (!groups[mediaTypeExample.title].name) {
            groups[mediaTypeExample.title].name = mediaTypeExample.summary;
          }
        }
      });
    });
  });
}

/**
 * TKTK
 */
export function getExampleGroups(operation: Operation): ExampleGroups {
  let namelessCodeSamples = 0;
  const groups: ExampleGroups = {};

  // first, parse through custom code samples
  const codeSamples = getExtension('code-samples', operation.api, operation) as Extensions['code-samples'][];

  // add any and all code samples since they take precedence
  (codeSamples || [])?.forEach(sample => {
    namelessCodeSamples += 1;
    // sample contains `correspondingExample` key and key already exists in group object
    if (groups[sample.correspondingExample]?.customCodeSamples?.length) {
      // append code sample to existing list of items
      groups[sample.correspondingExample].customCodeSamples.push(sample);
    }
    // sample contains `correspondingExample` key (fallback)
    else if (sample.correspondingExample) {
      const name =
        sample.name && sample.name.length > 0
          ? sample.name
          : `Default${namelessCodeSamples > 1 ? ` #${namelessCodeSamples}` : ''}`;

      // create example group entry with code sample
      groups[sample.correspondingExample] = {
        name,
        customCodeSamples: [sample],
      };
    }
    // sample does not contain corresponding response example and internal key already exists
    else if (groups[noCorrespondingResponseKey]?.customCodeSamples?.length) {
      // append code sample to existing list of items
      groups[noCorrespondingResponseKey].customCodeSamples.push(sample);
    }
    // sample does not contain corresponding response example (fallback)
    else {
      const name =
        sample.name && sample.name.length > 0
          ? sample.name
          : `Default${namelessCodeSamples > 1 ? ` #${namelessCodeSamples}` : ''}`;

      // create example group entry with code sample
      groups[noCorrespondingResponseKey] = {
        name,
        customCodeSamples: [sample],
      };
    }
  });

  // if code samples with `correspondingExample` delineator exist, add those
  // and add any matching responses and then return
  if (Object.keys(groups).length) {
    addMatchingResponseExamples(groups, operation);
  } else {
    // if no custom code examples, parse through param and body examples
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
          groups[mediaTypeExample.title] = {
            ...groups[mediaTypeExample.title],
            request: {
              ...groups[mediaTypeExample.title]?.request,
              body: mediaTypeExample.value,
            },
          };

          // if the current group doesn't already have a name set, use the response example summary
          if (!groups[mediaTypeExample.title].name) {
            groups[mediaTypeExample.title].name = mediaTypeExample.summary;
          }
        }
      });
    });

    if (Object.keys(groups).length) {
      // if there are matching keys, add the corresponding response examples
      addMatchingResponseExamples(groups, operation);
    }
  }

  // cull any objects that don't have both request + response
  Object.entries(groups).forEach(([groupId, group]) => {
    if (group.request && !group.response) {
      delete groups[groupId];
    }
  });

  return groups;
}
