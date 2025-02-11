import { describe, it, expect } from 'vitest';

import OpenAPIParser from '../../../src/index.js';
import * as helper from '../../utils/helper.js';
import * as path from '../../utils/path.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

describe('API with deeply-nested circular $refs', () => {
  it('should parse successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.parse(path.rel('specs/deep-circular/deep-circular.yaml'));
    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(parsedAPI.api);
    expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/deep-circular/deep-circular.yaml')]);
  });

  it(
    'should resolve successfully',
    helper.testResolve(
      'specs/deep-circular/deep-circular.yaml',
      parsedAPI.api,
      'specs/deep-circular/definitions/name.yaml',
      parsedAPI.name,
      'specs/deep-circular/definitions/required-string.yaml',
      parsedAPI.requiredString,
    ),
  );

  it('should dereference successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.dereference(path.rel('specs/deep-circular/deep-circular.yaml'));
    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(dereferencedAPI);
    // Reference equality
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type)
      .to.equal(api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.name.type)
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.name.type,
      )
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
          .properties.name.type,
      )
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
          .properties.level4.properties.name.type,
      );
  });

  it('should validate successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.validate(path.rel('specs/deep-circular/deep-circular.yaml'));
    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(dereferencedAPI);
    // Reference equality
    expect(api.paths['/family-tree'].get.responses['200'].schema.properties.name.type)
      .to.equal(api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.name.type)
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.name.type,
      )
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
          .properties.name.type,
      )
      .to.equal(
        api.paths['/family-tree'].get.responses['200'].schema.properties.level1.properties.level2.properties.level3
          .properties.level4.properties.name.type,
      );
  });

  it('should bundle successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.bundle(path.rel('specs/deep-circular/deep-circular.yaml'));
    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(bundledAPI);
  });
});
