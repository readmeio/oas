import type { ValidAPIDefinition } from '../../utils.js';

import { describe, it, expect } from 'vitest';

import { parse, dereference, validate, bundle } from '../../../src/index.js';
import { relativePath } from '../../utils.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

describe('API with deeply-nested circular $refs', () => {
  it('should parse successfully', async () => {
    const api = await parse(relativePath('specs/deep-circular/deep-circular.yaml'));

    expect(api).toStrictEqual(parsedAPI.api);
  });

  it('should dereference successfully', async () => {
    const api = await dereference<ValidAPIDefinition>(relativePath('specs/deep-circular/deep-circular.yaml'));

    expect(api).toStrictEqual(dereferencedAPI);
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
        .properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
        .properties.level4.properties.name.type,
    );
  });

  it('should validate successfully', async () => {
    const api = await validate<ValidAPIDefinition>(relativePath('specs/deep-circular/deep-circular.yaml'));

    expect(api).toStrictEqual(dereferencedAPI);
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
        .properties.name.type,
    );
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type).toStrictEqual(
      api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
        .properties.level4.properties.name.type,
    );
  });

  it('should bundle successfully', async () => {
    const api = await bundle(relativePath('specs/deep-circular/deep-circular.yaml'));

    expect(api).toStrictEqual(bundledAPI);
  });
});
