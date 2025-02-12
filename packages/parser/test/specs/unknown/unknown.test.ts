import type { ValidAPIDefinition } from '../../utils/helper.js';

import { describe, it, expect } from 'vitest';

import { OpenAPIParser } from '../../../src/index.js';
import * as helper from '../../utils/helper.js';
import * as path from '../../utils/path.js';

import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

describe('API with $refs to unknown file types', () => {
  it('should parse successfully', async () => {
    const parser = new OpenAPIParser();
    const api = await parser.parse(path.rel('specs/unknown/unknown.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api).to.deep.equal(parsedAPI.api);
    expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/unknown/unknown.yaml')]);
  });

  it(
    'should resolve successfully',
    helper.testResolve(
      'specs/unknown/unknown.yaml',
      parsedAPI.api,
      'specs/unknown/files/blank',
      parsedAPI.blank,
      'specs/unknown/files/text.txt',
      parsedAPI.text,
      'specs/unknown/files/page.html',
      parsedAPI.html,
      'specs/unknown/files/binary.png',
      parsedAPI.binary,
    ),
  );

  it('should dereference successfully', async () => {
    const parser = new OpenAPIParser<ValidAPIDefinition>();
    const api = await parser.dereference(path.rel('specs/unknown/unknown.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api.paths['/files/text'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/text'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/html'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/html'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/blank'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/blank'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/binary'].get.responses['200'].schema.default).to.be.an.instanceOf(Buffer);
  });

  it('should validate successfully', async () => {
    const parser = new OpenAPIParser<ValidAPIDefinition>();
    const api = await parser.validate(path.rel('specs/unknown/unknown.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api.paths['/files/text'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/text'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/html'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/html'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/blank'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/blank'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/binary'].get.responses['200'].schema.default).to.be.an.instanceOf(Buffer);
  });

  it('should bundle successfully', async () => {
    const parser = new OpenAPIParser<ValidAPIDefinition>();
    const api = await parser.bundle(path.rel('specs/unknown/unknown.yaml'));

    expect(api).to.equal(parser.schema);
    expect(api.paths['/files/text'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/text'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/html'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/html'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/blank'].get.responses['200'].schema.default).to.equal(
      dereferencedAPI.paths['/files/blank'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/binary'].get.responses['200'].schema.default).to.be.an.instanceOf(Buffer);
  });
});
