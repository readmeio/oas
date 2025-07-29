import type { ValidAPIDefinition } from '../../utils.js';

import { describe, expect, it } from 'vitest';

import { bundle, dereference } from '../../../src/index.js';
import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

describe('Object sources (instead of file paths)', () => {
  it('should dereference an object that references external files', async () => {
    const api = await dereference<ValidAPIDefinition>(structuredClone(parsedAPI.api));

    expect(api).toStrictEqual(dereferencedAPI);
    expect(api.paths['/people/{name}'].get.responses['200'].schema).toStrictEqual(api.definitions.name);
    expect(api.definitions.requiredString).toStrictEqual(api.definitions.name.properties.first);
    expect(api.definitions.requiredString).toStrictEqual(api.definitions.name.properties.last);
    expect(api.definitions.requiredString).toStrictEqual(
      api.paths['/people/{name}'].get.responses['200'].schema.properties.first,
    );
    expect(api.definitions.requiredString).toStrictEqual(
      api.paths['/people/{name}'].get.responses['200'].schema.properties.last,
    );
  });

  it('should bundle an object that references external files', async () => {
    const api = await bundle<ValidAPIDefinition>(structuredClone(parsedAPI.api));

    expect(api).toStrictEqual(bundledAPI);
  });

  it('should validate an object that references external files', async () => {
    const api = await dereference<ValidAPIDefinition>(structuredClone(parsedAPI.api));

    expect(api).toStrictEqual(dereferencedAPI);
    expect(api.paths['/people/{name}'].get.responses['200'].schema).toStrictEqual(api.definitions.name);
    expect(api.definitions.requiredString).toStrictEqual(api.definitions.name.properties.first);
    expect(api.definitions.requiredString).toStrictEqual(api.definitions.name.properties.last);
    expect(api.definitions.requiredString).toStrictEqual(
      api.paths['/people/{name}'].get.responses['200'].schema.properties.first,
    );
    expect(api.definitions.requiredString).toStrictEqual(
      api.paths['/people/{name}'].get.responses['200'].schema.properties.last,
    );
  });
});
