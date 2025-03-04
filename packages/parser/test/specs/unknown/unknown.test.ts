import type { ValidAPIDefinition } from '../../utils.js';

import { describe, it, expect } from 'vitest';

import { parse, dereference, bundle } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import { toValidate } from '../../vitest.matchers.js';

import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

expect.extend({ toValidate });

describe('API with $refs to unknown file types', () => {
  it('should parse successfully', async () => {
    const api = await parse(relativePath('specs/unknown/unknown.yaml'));

    expect(api).toStrictEqual(parsedAPI.api);
  });

  it('should dereference successfully', async () => {
    const api = await dereference<ValidAPIDefinition>(relativePath('specs/unknown/unknown.yaml'));

    expect(api.paths['/files/text'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/text'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/html'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/html'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/blank'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/blank'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/binary'].get.responses['200'].schema.default).toBeInstanceOf(Buffer);
  });

  it('should validate successfully', async () => {
    await expect(relativePath('specs/unknown/unknown.yaml')).toValidate();
  });

  it('should bundle successfully', async () => {
    const api = await bundle<ValidAPIDefinition>(relativePath('specs/unknown/unknown.yaml'));

    expect(api.paths['/files/text'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/text'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/html'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/html'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/blank'].get.responses['200'].schema.default).toStrictEqual(
      dereferencedAPI.paths['/files/blank'].get.responses['200'].schema.default,
    );
    expect(api.paths['/files/binary'].get.responses['200'].schema.default).toBeInstanceOf(Buffer);
  });
});
