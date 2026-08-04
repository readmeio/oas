import { describe, expect, it } from 'vitest';

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
