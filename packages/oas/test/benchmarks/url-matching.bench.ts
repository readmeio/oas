import type { HttpMethods, OASDocument } from '../../src/types.js';

import petstore from '@readme/oas-examples/3.0/json/petstore.json' with { type: 'json' };
import { bench, describe } from 'vitest';

import Oas from '../../src/index.js';
import docusign from '../__datasets__/docusign.json' with { type: 'json' };

const httpMethods = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

/**
 * Build a resolvable lookup URL for every operation in a definition: the server URL with its
 * defaults filled in, plus each path with its parameters swapped for literal values.
 *
 */
function buildLookups(oas: Oas): [string, HttpMethods][] {
  const serverUrl = oas.url();
  const lookups: [string, HttpMethods][] = [];

  Object.keys(oas.api.paths || {}).forEach(path => {
    Object.keys((oas.api.paths as Record<string, Record<string, unknown>>)[path] || {}).forEach(method => {
      if (httpMethods.includes(method.toLowerCase())) {
        lookups.push([`${serverUrl}${path.replace(/{[^}]+}/g, 'test123')}`, method as HttpMethods]);
      }
    });
  });

  return lookups;
}

const petstoreOas = Oas.init(structuredClone(petstore));
const petstoreLookups = buildLookups(petstoreOas);

const docusignOas = Oas.init(structuredClone(docusign as unknown as OASDocument));
const docusignLookups = buildLookups(docusignOas);

describe(`URL to operation matching (petstore, 14 paths, ${petstoreLookups.length} lookups)`, () => {
  bench('findOperation()', () => {
    for (const [url, method] of petstoreLookups) {
      petstoreOas.findOperation(url, method);
    }
  });
});

describe(`URL to operation matching (docusign, 209 paths, ${docusignLookups.length} lookups)`, () => {
  bench('findOperation()', () => {
    for (const [url, method] of docusignLookups) {
      docusignOas.findOperation(url, method);
    }
  });

  bench('findOperationWithoutMethod()', () => {
    for (const [url] of docusignLookups) {
      docusignOas.findOperationWithoutMethod(url);
    }
  });
});
