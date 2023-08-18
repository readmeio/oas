import type { ComponentsObject, HttpMethods, OASDocument, TagObject } from '../rmoas.types';

import jsonPointer from 'jsonpointer';
import { getAPIDefinitionType } from 'oas-normalize/dist/lib/utils';

import { query } from '../analyzer/util';

export interface ReducerOptions {
  /** A key-value object of path + method combinations to reduce by. */
  paths?: Record<string, string[] | '*'>;
  /** An array of tags in the OpenAPI definition to reduce by. */
  tags?: string[];
}

/**
 * Query a JSON Schema object for any `$ref` pointers. Return any pointers that were found.
 *
 * @param schema JSON Schema object to look for any `$ref` pointers within it.
 */
function getUsedRefs(schema: any) {
  return query(["$..['$ref']"], schema);
}

/**
 * Recursively process a `$ref` pointer and accumulate any other `$ref` pointers that it or its
 * children use.
 *
 * @param schema JSON Schema object to look for and accumulate any `$ref` pointers that it may have.
 * @param $refs Known set of `$ref` pointers.
 * @param $ref `$ref` pointer to fetch a schema from out of the supplied schema.
 */
function accumulateUsedRefs(schema: Record<string, unknown>, $refs: Set<string>, $ref: any): void {
  let $refSchema;
  if (typeof $ref === 'string') $refSchema = jsonPointer.get(schema, $ref.substring(1));
  if ($refSchema === undefined) {
    // If the schema we have wasn't fully dereferenced or bundled for whatever reason and this
    // `$ref` that we have doens't exist here we shouldn't try to search for more `$ref` pointers
    // in a schema that doesn't exist.
    return;
  }

  getUsedRefs($refSchema).forEach(({ value: currRef }) => {
    // If we've already processed this $ref don't send us into an infinite loop.
    if ($refs.has(currRef)) {
      return;
    }

    $refs.add(currRef);
    accumulateUsedRefs(schema, $refs, currRef);
  });
}

/**
 * With an array of tags or object of paths+method combinations, reduce an OpenAPI definition to a
 * new definition that just contains those tags or path + methods.
 *
 * @example <caption>Reduce by an array of tags only.</caption>
 * { APIDEFINITION, { tags: ['pet'] } }
 *
 * @example <caption>Reduce by a specific path and methods.</caption>
 * { APIDEFINITION, { paths: { '/pet': ['get', 'post'] } } }
 *
 * @example <caption>Reduce by a specific path and all methods it has.</caption>
 * { APIDEFINITION, { paths: { '/pet': '*' } } }
 *
 * @param definition A valid OpenAPI 3.x definition
 */
export default function reducer(definition: OASDocument, opts: ReducerOptions = {}) {
  // Convert tags and paths to lowercase since casing should not matter.
  const reduceTags = 'tags' in opts ? opts.tags.map(tag => tag.toLowerCase()) : [];
  const reducePaths =
    'paths' in opts
      ? Object.entries(opts.paths).reduce((acc: Record<string, string[] | string>, [key, value]) => {
          const newKey = key.toLowerCase();
          const newValue = Array.isArray(value) ? value.map(v => v.toLowerCase()) : value.toLowerCase();
          acc[newKey] = newValue;
          return acc;
        }, {})
      : {};

  const $refs: Set<string> = new Set();
  const usedTags: Set<string> = new Set();

  if (getAPIDefinitionType(definition) !== 'openapi') {
    throw new Error('Sorry, only OpenAPI definitions are supported.');
  }

  // Stringify and parse so we get a full non-reference clone of the API definition to work with.
  const reduced = JSON.parse(JSON.stringify(definition)) as OASDocument;

  // Retain any root-level security definitions.
  if ('security' in reduced) {
    Object.values(reduced.security).forEach(sec => {
      Object.keys(sec).forEach(scheme => {
        $refs.add(`#/components/securitySchemes/${scheme}`);
      });
    });
  }

  if ('paths' in reduced) {
    Object.keys(reduced.paths).forEach(path => {
      const pathLC = path.toLowerCase();

      if (Object.keys(reducePaths).length) {
        if (!(pathLC in reducePaths)) {
          delete reduced.paths[path];
          return;
        }
      }

      Object.keys(reduced.paths[path]).forEach((method: 'parameters' | HttpMethods) => {
        // If this method is `parameters` we should always retain it.
        if (method !== 'parameters') {
          if (Object.keys(reducePaths).length) {
            if (
              reducePaths[pathLC] !== '*' &&
              Array.isArray(reducePaths[pathLC]) &&
              !reducePaths[pathLC].includes(method)
            ) {
              delete reduced.paths[path][method];
              return;
            }
          }
        }

        const operation = reduced.paths[path][method];

        // If we're reducing by tags and this operation doesn't live in one of those, remove it.
        if (reduceTags.length) {
          if (!('tags' in operation)) {
            delete reduced.paths[path][method];
            return;
          } else if (!operation.tags.filter(tag => reduceTags.includes(tag.toLowerCase())).length) {
            delete reduced.paths[path][method];
            return;
          }
        }

        // Accumulate a list of used tags so we can filter out any ones that we don't need later.
        if ('tags' in operation) {
          operation.tags.forEach((tag: string) => {
            usedTags.add(tag);
          });
        }

        // Accumulate a list of $ref pointers that are used within this operation.
        getUsedRefs(operation).forEach(({ value: ref }) => {
          $refs.add(ref);
        });

        // Accumulate any used security schemas that we need to retain.
        if ('security' in operation) {
          Object.values(operation.security).forEach(sec => {
            Object.keys(sec).forEach(scheme => {
              $refs.add(`#/components/securitySchemes/${scheme}`);
            });
          });
        }
      });

      // If this path no longer has any methods, delete it.
      if (!Object.keys(reduced.paths[path]).length) {
        delete reduced.paths[path];
      }
    });

    // If we don't have any more paths after cleanup, throw an error because an OpenAPI file must
    // have at least one path.
    if (!Object.keys(reduced.paths).length) {
      throw new Error('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
    }
  }

  // Recursively accumulate any components that are in use.
  $refs.forEach($ref => accumulateUsedRefs(reduced, $refs, $ref));

  // Remove any unused components.
  if ('components' in reduced) {
    Object.keys(reduced.components).forEach((componentType: keyof ComponentsObject) => {
      Object.keys(reduced.components[componentType]).forEach(component => {
        if (!$refs.has(`#/components/${componentType}/${component}`)) {
          delete reduced.components[componentType][component];
        }
      });

      // If this component group is now empty, delete it.
      if (!Object.keys(reduced.components[componentType]).length) {
        delete reduced.components[componentType];
      }
    });

    // If this path no longer has any components, delete it.
    if (!Object.keys(reduced.components).length) {
      delete reduced.components;
    }
  }

  // Remove any unused tags.
  if ('tags' in reduced) {
    reduced.tags.forEach((tag: TagObject, k: number) => {
      if (!usedTags.has(tag.name)) {
        delete reduced.tags[k];
      }
    });

    // Remove any now empty items from the tags array.
    reduced.tags = reduced.tags.filter(Boolean);

    if (!reduced.tags.length) {
      delete reduced.tags;
    }
  }

  return reduced;
}
