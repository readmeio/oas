import type { OpenAPIV3 } from 'openapi-types';
import type { MockInstance } from 'vitest';

import { $RefParser } from '@apidevtools/json-schema-ref-parser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../../src/index.js';
import { relativePath } from '../../utils.js';
import v3NonRelativeServerJson from './v3-non-relative-server.json';
import v3RelativeServerJson from './v3-relative-server.json';
import v3RelativeServerPathsOpsJson from './v3-relative-server-paths-ops.json';

// Petstore v3 json has relative path in "servers"
const RELATIVE_SERVERS_OAS3_URL_1 = 'https://petstore3.swagger.io/api/v3/openapi.json';

// This will have "servers" at paths & operations level
const RELATIVE_SERVERS_OAS3_URL_2 = 'https://foo.my.cloud/v1/petstore/relativeservers';

describe('Servers with relative paths in OpenAPI v3 files', () => {
  let spy: MockInstance<typeof $RefParser.prototype.parse>;

  beforeEach(() => {
    spy = vi.spyOn($RefParser.prototype, 'parse');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fix relative servers path in the file fetched from url', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerJson)));

    const apiJson = await parse<OpenAPIV3.Document>(RELATIVE_SERVERS_OAS3_URL_1);

    expect(apiJson.servers[0].url).toBe('https://petstore3.swagger.io/api/v3');
  });

  it('should fix relative servers at root, path and operations level in the file fetched from url', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerPathsOpsJson)));

    const apiJson = await parse<OpenAPIV3.Document>(RELATIVE_SERVERS_OAS3_URL_2);

    expect(apiJson.servers[0].url).toBe('https://foo.my.cloud/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).toBe('https://foo.my.cloud/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).toBe('https://foo.my.cloud/api/v5');
  });

  it('should parse but no change to relative servers path in local file import', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerPathsOpsJson)));

    const apiJson = await parse<OpenAPIV3.Document>(relativePath('./v3-relative-server.json'));

    expect(apiJson.servers[0].url).toBe('/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).toBe('/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).toBe('/api/v5');
  });

  it('should parse but no change to non-relative servers path in local file import', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3NonRelativeServerJson)));

    const apiJson = await parse<OpenAPIV3.Document>(relativePath('./v3-non-relative-server.json'));

    expect(apiJson.servers[0].url).toBe('https://petstore3.swagger.com/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).toBe('https://petstore3.swagger.com/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).toBe('https://petstore3.swagger.com/api/v5');
  });
});
