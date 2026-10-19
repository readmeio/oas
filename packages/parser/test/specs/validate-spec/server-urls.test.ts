import type { OpenAPIV3 } from 'openapi-types';

import { describe, expect, it } from 'vitest';

import { validate } from '../../../src/index.js';
import { substituteServerVariables } from '../../../src/lib/urls.js';

function definition(servers: OpenAPIV3.ServerObject[]): OpenAPIV3.Document {
  return {
    openapi: '3.0.3',
    info: { title: 'Server URL validation', version: '1.0.0' },
    servers,
    paths: { '/sample': { get: { responses: { '200': { description: 'Successful response' } } } } },
  };
}

describe('Server variable substitution', () => {
  it('accepts literal values and Server Variable defaults without losing empty or zero values', () => {
    expect(
      substituteServerVariables('https://{host}:{port}/{path}', {
        host: { default: 'example.com' },
        port: 0,
        path: '',
      }),
    ).toBe('https://example.com:0/');
  });

  it('uses the same variable-name matching as OAS URL selection', () => {
    expect(
      substituteServerVariables('/{api-version}/{user.name}/{key[0]}/{invalid name}', {
        'api-version': 'v1',
        'user.name': 'sam',
        'key[0]': 'first',
        'invalid name': 'unchanged',
      }),
    ).toBe('/v1/sam/first/{invalid name}');
  });
});

describe('OpenAPI server URLs', () => {
  it('reports malformed hosts at every server scope and array position', async () => {
    const api = definition([
      { url: 'https://example.com' },
      { url: 'https://[api_url].com' },
      { url: '//[api_url].com' },
      { url: '[api_url].com' },
    ]);
    api.paths['/sample'] = {
      servers: [{ url: 'https://[path_url].com' }],
      get: {
        servers: [{ url: 'https://[operation_url].com' }],
        responses: { '200': { description: 'Successful response' } },
      },
    };

    await expect(validate(api)).resolves.toStrictEqual({
      valid: false,
      errors: [
        { message: '`/servers/1/url` is not a valid server URL: `https://[api_url].com`.' },
        { message: '`/servers/2/url` is not a valid server URL: `//[api_url].com`.' },
        { message: '`/servers/3/url` is not a valid server URL: `[api_url].com`.' },
        { message: '`/paths/sample/servers/0/url` is not a valid server URL: `https://[path_url].com`.' },
        { message: '`/paths/sample/get/servers/0/url` is not a valid server URL: `https://[operation_url].com`.' },
      ],
      warnings: [],
      additionalErrors: 0,
      specification: 'OpenAPI',
    });
  });

  it('reports malformed hosts supplied by variable defaults', async () => {
    const api = definition([
      {
        url: 'https://{hostname}',
        variables: { hostname: { default: '[api_url].com' } },
      },
    ]);

    await expect(validate(api)).resolves.toStrictEqual({
      valid: false,
      errors: [{ message: '`/servers/0/url` is not a valid server URL: `https://{hostname}`.' }],
      warnings: [],
      additionalErrors: 0,
      specification: 'OpenAPI',
    });
  });

  it('accepts supported literal URL forms', async () => {
    const api = definition([
      { url: 'https://[::1]:8080' },
      { url: '[::1]:8080' },
      { url: 'https://example.com/[api_url]?filter[name]=test' },
      { url: '/v1' },
      { url: '../api' },
      { url: '//example.com/v1' },
      { url: 'api.example.com/v1//users' },
      { url: 'localhost:3000' },
      { url: '' },
    ]);

    await expect(validate(api)).resolves.toStrictEqual({ valid: true, warnings: [], specification: 'OpenAPI' });
  });

  it('accepts undeclared server variables that can be supplied by user data at runtime', async () => {
    const api = definition([
      { url: 'https://{hostname}:{port}' },
      { url: '{protocol}://example.com' },
      { url: 'https://[{address}]' },
    ]);
    api.paths['/sample'] = {
      servers: [{ url: 'https://example.com:{port}' }],
      get: {
        servers: [
          {
            url: '{protocol}://{hostname}:{port}',
            variables: { hostname: { default: 'example.com' } },
          },
        ],
        responses: { '200': { description: 'Successful response' } },
      },
    };
    const original = structuredClone(api);

    await expect(validate(api)).resolves.toStrictEqual({ valid: true, warnings: [], specification: 'OpenAPI' });
    expect(api).toStrictEqual(original);
  });

  it('resolves server variable defaults without changing the templates', async () => {
    const servers: OpenAPIV3.ServerObject[] = [
      {
        url: '{protocol}://{hostname}:{port}/{version}',
        variables: {
          protocol: { default: 'https' },
          hostname: { default: 'example.com' },
          port: { default: '8443' },
          version: { default: 'v1' },
        },
      },
      {
        url: 'https://[{address}]',
        variables: { address: { default: '::1' } },
      },
    ];
    const api = definition(structuredClone(servers));

    await expect(validate(api)).resolves.toStrictEqual({ valid: true, warnings: [], specification: 'OpenAPI' });
    expect(api.servers).toStrictEqual(servers);
  });
});
