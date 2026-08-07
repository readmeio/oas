// oxlint-disable vitest/no-conditional-expect
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { beforeAll, afterAll, describe, expect, it } from 'vitest';

import { bundle, validate } from '../../src/index.js';

function schemaWithRef(ref: string) {
  return {
    openapi: '3.0.3',
    info: { title: 'SSRF fixture', version: '1.0.0' },
    paths: {
      '/pets': {
        get: {
          responses: {
            '200': {
              description: 'ok',
              content: {
                'application/json': {
                  schema: { $ref: ref },
                },
              },
            },
          },
        },
      },
    },
  };
}

describe('SSRF guards for bundle/validate', () => {
  it.each([
    'http://127.0.0.1/schema.json',
    'http://169.254.169.254/latest/meta-data/',
    'http://[::ffff:169.254.169.254]/latest/meta-data/',
    'http://[::ffff:127.0.0.1]/schema.json',
  ])('bundle() should refuse private $ref %s', async ref => {
    await expect(bundle(schemaWithRef(ref))).rejects.toThrow(/unable to resolve \$ref pointer/i);
  });

  it('validate() should refuse IPv4-mapped IMDS $ref', async () => {
    const ref = 'http://[::ffff:169.254.169.254]/latest/meta-data/iam/security-credentials/role';

    await expect(validate(schemaWithRef(ref))).rejects.toThrow(/unable to resolve \$ref pointer/i);
  });
});

describe('filesystem `$ref` guards', () => {
  let secretDir: string;
  let secretPath: string;
  const secretContents = 'SECRET_CONTENT_12345';

  beforeAll(() => {
    secretDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oas-file-ref-'));
    secretPath = path.join(secretDir, 'secret.txt');

    fs.writeFileSync(secretPath, secretContents);
  });

  afterAll(() => {
    fs.rmSync(secretDir, { recursive: true, force: true });
  });

  it.each([`file://`, `full`] as const)('should refuse %s type `$ref` on object sources by default', async refType => {
    if (refType === 'full') {
      await expect(bundle(schemaWithRef(secretPath))).rejects.toThrow(/unable to resolve \$ref pointer/i);
      await expect(validate(schemaWithRef(secretPath))).rejects.toThrow(/unable to resolve \$ref pointer/i);
    } else {
      await expect(bundle(schemaWithRef(`file://${secretPath}`))).rejects.toThrow(/unable to resolve \$ref pointer/i);
      await expect(validate(schemaWithRef(`file://${secretPath}`))).rejects.toThrow(/unable to resolve \$ref pointer/i);
    }
  });

  it('should still refuse `file://` when only http resolve options are supplied', async () => {
    await expect(
      validate(schemaWithRef(`file://${secretPath}`), { resolve: { http: { timeout: 1000 } } }),
    ).rejects.toThrow(/unable to resolve \$ref pointer/i);
  });

  it('should allow filesystem `$ref`s when `resolve.file` is explicitly enabled', async () => {
    await expect(bundle(schemaWithRef(`file://${secretPath}`), { resolve: { file: true } })).resolves.toMatchObject({
      paths: {
        '/pets': {
          get: {
            responses: {
              '200': {
                content: {
                  'application/json': {
                    schema: secretContents,
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
