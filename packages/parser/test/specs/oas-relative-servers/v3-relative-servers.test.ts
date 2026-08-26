import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import type { MockInstance } from 'vitest';

import { $RefParser } from '@apidevtools/json-schema-ref-parser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { parse } from '../../../src/index.js';
import { fixOasRelativeServers } from '../../../src/repair.js';
import { relativePath } from '../../utils.js';

import v3NonRelativeServerJson from './v3-non-relative-server.json' with { type: 'json' };
import v3RelativeServerPathsOpsJson from './v3-relative-server-paths-ops.json' with { type: 'json' };
import v3RelativeServerWebhooksJson from './v3-relative-server-webhooks.json' with { type: 'json' };
import v3RelativeServerJson from './v3-relative-server.json' with { type: 'json' };

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

  it('should fix relative servers at webhook path and operation level in the file fetched from url', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerWebhooksJson)));

    const apiJson = await parse<OpenAPIV3_1.Document>(RELATIVE_SERVERS_OAS3_URL_2);

    expect(apiJson.webhooks.newPet.servers[0].url).toBe('https://foo.my.cloud/hooks/v1');
    expect(apiJson.webhooks.newPet.post.servers[0].url).toBe('https://foo.my.cloud/hooks/v2');
  });

  it('should parse but no change to relative webhook servers in local file import', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerWebhooksJson)));

    const apiJson = await parse<OpenAPIV3_1.Document>(relativePath('./v3-relative-server-webhooks.json'));

    expect(apiJson.webhooks.newPet.servers[0].url).toBe('/hooks/v1');
    expect(apiJson.webhooks.newPet.post.servers[0].url).toBe('/hooks/v2');
  });

  it('should preserve a non-default port when rewriting relative path servers', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerPathsOpsJson)));

    const apiJson = await parse<OpenAPIV3.Document>('https://foo.my.cloud:8443/v1/petstore/relativeservers');

    expect(apiJson.servers[0].url).toBe('https://foo.my.cloud:8443/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).toBe('https://foo.my.cloud:8443/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).toBe('https://foo.my.cloud:8443/api/v5');
  });

  it('should preserve a non-default port when rewriting relative webhook servers', async () => {
    spy.mockImplementationOnce(() => JSON.parse(JSON.stringify(v3RelativeServerWebhooksJson)));

    const apiJson = await parse<OpenAPIV3_1.Document>('https://foo.my.cloud:8443/v1/openapi.json');

    expect(apiJson.webhooks.newPet.servers[0].url).toBe('https://foo.my.cloud:8443/hooks/v1');
    expect(apiJson.webhooks.newPet.post.servers[0].url).toBe('https://foo.my.cloud:8443/hooks/v2');
  });

  it('should leave relative servers unchanged when the source URL is not a valid URL', () => {
    const schema = {
      openapi: '3.1.0',
      info: { title: 't', version: '1' },
      servers: [{ url: '/api' }],
      paths: {},
    };

    expect(() => {
      fixOasRelativeServers(schema, 'http://[');
    }).not.toThrow();
    expect(schema.servers[0].url).toBe('/api');
  });
});
