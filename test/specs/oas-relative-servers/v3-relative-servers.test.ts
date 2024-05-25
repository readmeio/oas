import $RefParser from '@readme/json-schema-ref-parser';
import sinon from 'sinon';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import OpenAPIParser from '../../../lib';
import path from '../../utils/path';

// Import of our fixed OpenAPI JSON files
import v3NonRelativeServerJson from './v3-non-relative-server.json';
import v3RelativeServerPathsOpsJson from './v3-relative-server-paths-ops.json';
import v3RelativeServerJson from './v3-relative-server.json';

// Petstore v3 json has relative path in "servers"
const RELATIVE_SERVERS_OAS3_URL_1 = 'https://petstore3.swagger.io/api/v3/openapi.json';

// This will have "servers" at paths & operations level
const RELATIVE_SERVERS_OAS3_URL_2 = 'https://foo.my.cloud/v1/petstore/relativeservers';

describe('Servers with relative paths in OpenAPI v3 files', () => {
  let mockParse;

  beforeEach(() => {
    // Mock the parse function
    mockParse = sinon.stub($RefParser.prototype, 'parse');
  });

  afterEach(() => {
    // Restore the parse function
    $RefParser.prototype.parse.restore();
  });

  it('should fix relative servers path in the file fetched from url', async () => {
    mockParse.callsFake(() => {
      // to prevent edit of the original JSON
      return JSON.parse(JSON.stringify(v3RelativeServerJson));
    });
    const apiJson = await OpenAPIParser.parse(RELATIVE_SERVERS_OAS3_URL_1);
    expect(apiJson.servers[0].url).to.equal('https://petstore3.swagger.io/api/v3');
  });

  it('should fix relative servers at root, path and operations level in the file fetched from url', async () => {
    mockParse.callsFake(() => {
      // to prevent edit of the original JSON
      return JSON.parse(JSON.stringify(v3RelativeServerPathsOpsJson));
    });
    const apiJson = await OpenAPIParser.parse(RELATIVE_SERVERS_OAS3_URL_2);
    expect(apiJson.servers[0].url).to.equal('https://foo.my.cloud/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).to.equal('https://foo.my.cloud/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).to.equal('https://foo.my.cloud/api/v5');
  });

  it('should parse but no change to relative servers path in local file import', async () => {
    mockParse.callsFake(() => {
      return JSON.parse(JSON.stringify(v3RelativeServerPathsOpsJson));
    });
    const apiJson = await OpenAPIParser.parse(path.rel('./v3-relative-server.json'));
    expect(apiJson.servers[0].url).to.equal('/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).to.equal('/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).to.equal('/api/v5');
  });

  it('should parse but no change to non-relative servers path in local file import', async () => {
    mockParse.callsFake(() => {
      return JSON.parse(JSON.stringify(v3NonRelativeServerJson));
    });
    const apiJson = await OpenAPIParser.parse(path.rel('./v3-non-relative-server.json'));
    expect(apiJson.servers[0].url).to.equal('https://petstore3.swagger.com/api/v3');
    expect(apiJson.paths['/pet'].servers[0].url).to.equal('https://petstore3.swagger.com/api/v4');
    expect(apiJson.paths['/pet'].get.servers[0].url).to.equal('https://petstore3.swagger.com/api/v5');
  });
});
