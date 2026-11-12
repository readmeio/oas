import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import { bundle, dereference } from '../../src/index.js';
import { isInsideRoot } from '../../src/lib/file-root.js';

const secretContents = 'SECRET_CONTENT_12345';
const directories: string[] = [];

function makeDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  directories.push(dir);
  return dir;
}

function definitionWithRef(ref: string) {
  return {
    openapi: '3.0.3',
    info: { title: 'File root', version: '1.0.0' },
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

function writeSpec(dir: string, ref: string, name = 'openapi.json'): string {
  const spec = path.join(dir, name);
  fs.writeFileSync(spec, JSON.stringify(definitionWithRef(ref)));
  return spec;
}

describe('isInsideRoot()', () => {
  it('should contain a file inside the root and reject a prefix sibling', () => {
    expect(isInsideRoot('/tmp/specs', '/tmp/specs/pet.json')).toBe(true);
    expect(isInsideRoot('/tmp/specs', '/tmp/specs')).toBe(true);
    expect(isInsideRoot('/tmp/specs', '/tmp/specs-evil/passwd')).toBe(false);
    expect(isInsideRoot('/tmp/specs', '/etc/passwd')).toBe(false);
  });
});

describe('filesystem `$ref` root', () => {
  afterEach(() => {
    for (const dir of directories) {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    directories.length = 0;
  });

  it('should read a sibling file and an absolute path that stays inside the root', async () => {
    const root = makeDir('oas-file-root-');
    const pet = { type: 'object', title: 'Pet' };
    fs.writeFileSync(path.join(root, 'pet.json'), JSON.stringify(pet));

    const sibling = writeSpec(root, './pet.json');
    await expect(dereference(sibling)).resolves.toMatchObject({
      paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: pet } } } } } } },
    });

    await expect(
      bundle(definitionWithRef(path.join(root, 'pet.json')), { resolve: { file: true, fileRoot: root } }),
    ).resolves.toMatchObject({
      paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: pet } } } } } } },
    });

    await expect(
      bundle(definitionWithRef(pathToFileURL(path.join(root, 'pet.json')).href), {
        resolve: { file: true, fileRoot: root },
      }),
    ).resolves.toMatchObject({
      paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: pet } } } } } } },
    });

    await expect(
      bundle(definitionWithRef('./pet.json'), { resolve: { file: true, fileRoot: root } }),
    ).resolves.toMatchObject({
      paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: pet } } } } } } },
    });
  });

  it('should refuse absolute, file URL, and relative paths that leave the root', async () => {
    const root = makeDir('oas-file-root-');
    const outside = makeDir('oas-file-root-outside-');
    fs.writeFileSync(path.join(outside, 'secret.json'), JSON.stringify(secretContents));
    fs.writeFileSync(path.join(root, 'pet.json'), JSON.stringify({ type: 'string' }));

    const cases = [
      definitionWithRef('/etc/passwd'),
      definitionWithRef('file:///etc/passwd'),
      definitionWithRef(path.join(outside, 'secret.json')),
      definitionWithRef(`${pathToFileURL(path.join(outside, 'secret.json')).href}`),
      definitionWithRef(`../${path.basename(outside)}/secret.json`),
      definitionWithRef('%2e%2e/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/passwd'),
      definitionWithRef(`file://${root}/../${path.basename(outside)}/secret.json`),
    ];

    await Promise.all(
      cases.map(spec =>
        expect(
          bundle(spec, { resolve: { file: true, fileRoot: root, fileBase: path.join(root, 'pet.json') } }),
        ).rejects.toThrow(/outside the allowed directory/i),
      ),
    );

    const escaped = writeSpec(root, `../${path.basename(outside)}/secret.json`);
    await expect(dereference(escaped)).rejects.toThrow(/outside the allowed directory/i);
  });

  it('should keep a hash or percent-encoded directory name inside the jail', async () => {
    const parent = makeDir('oas-file-root-');
    fs.writeFileSync(path.join(parent, 'secret.json'), JSON.stringify(secretContents));

    for (const name of ['specs#v1', '%2e%2e']) {
      const dir = path.join(parent, name);
      fs.mkdirSync(dir);
      const pet = { type: 'object', title: name };
      fs.writeFileSync(path.join(dir, 'pet.json'), JSON.stringify(pet));

      const sibling = writeSpec(dir, './pet.json');
      // oxlint-disable-next-line no-await-in-loop -- each directory is a separate jail case
      await expect(dereference(sibling)).resolves.toMatchObject({
        paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: pet } } } } } } },
      });

      const escaped = writeSpec(dir, '../secret.json', 'escape.json');
      // oxlint-disable-next-line no-await-in-loop -- each directory is a separate jail case
      await expect(dereference(escaped)).rejects.toThrow(/outside the allowed directory/i);
    }
  });

  it('should reject a named pipe inside the root without blocking', async () => {
    const root = makeDir('oas-file-root-');
    execFileSync('mkfifo', [path.join(root, 'pipe.json')]);
    const spec = writeSpec(root, './pipe.json');

    let timer: ReturnType<typeof setTimeout> | undefined;
    const blocked = new Promise((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('named pipe open blocked')), 1000);
    });

    try {
      await expect(Promise.race([dereference(spec), blocked])).rejects.toThrow(/not a file/i);
    } finally {
      clearTimeout(timer);
    }
  });

  it('should fail a missing file inside the root as an open error', async () => {
    const root = makeDir('oas-file-root-');
    const spec = writeSpec(root, './missing/nested/pet.json');

    await expect(dereference(spec)).rejects.toThrow(/error opening file/i);
  });

  it('should reject a missing path whose nearest ancestor is outside the root', async () => {
    const root = makeDir('oas-file-root-');

    await expect(
      bundle(definitionWithRef('/no/such/oas-file-root/passwd'), { resolve: { file: true, fileRoot: root } }),
    ).rejects.toThrow(/outside the allowed directory/i);
  });

  it('should refuse a nested file that references a path outside the root', async () => {
    const root = makeDir('oas-file-root-');
    const outside = makeDir('oas-file-root-outside-');
    fs.writeFileSync(path.join(outside, 'secret.json'), JSON.stringify(secretContents));
    fs.mkdirSync(path.join(root, 'nested'));
    fs.writeFileSync(
      path.join(root, 'nested', 'schema.json'),
      JSON.stringify({
        type: 'object',
        properties: { leak: { $ref: `../../${path.basename(outside)}/secret.json` } },
      }),
    );

    const spec = writeSpec(root, './nested/schema.json');

    let thrown: unknown;
    try {
      await dereference(spec);
    } catch (err) {
      thrown = err;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect(String(thrown)).toMatch(/outside the allowed directory/i);
    expect(String(thrown)).not.toContain(secretContents);
  });

  it('should refuse a symlink inside the root', async () => {
    const root = makeDir('oas-file-root-');
    const outside = makeDir('oas-file-root-outside-');
    const secret = path.join(outside, 'secret.json');
    fs.writeFileSync(secret, JSON.stringify(secretContents));
    fs.symlinkSync(secret, path.join(root, 'link.json'));

    const spec = writeSpec(root, './link.json');

    await expect(dereference(spec)).rejects.toThrow(/outside the allowed directory/i);
  });

  it('should refuse a symlink directory that points outside the root', async () => {
    const root = makeDir('oas-file-root-');
    const outside = makeDir('oas-file-root-outside-');
    fs.writeFileSync(path.join(outside, 'secret.json'), JSON.stringify(secretContents));
    fs.symlinkSync(outside, path.join(root, 'alias'));

    const spec = writeSpec(root, './alias/secret.json');

    await expect(dereference(spec)).rejects.toThrow(/outside the allowed directory/i);
  });

  it('should allow a parent directory when `fileRoot` contains both the spec and the target', async () => {
    const root = makeDir('oas-file-root-');
    const nested = path.join(root, 'specs');
    fs.mkdirSync(nested);
    const shared = { type: 'string', title: 'Shared' };
    fs.writeFileSync(path.join(root, 'shared.json'), JSON.stringify(shared));
    const spec = writeSpec(nested, '../shared.json');

    await expect(dereference(spec)).rejects.toThrow(/outside the allowed directory/i);
    await expect(dereference(spec, { resolve: { fileRoot: root } })).resolves.toMatchObject({
      paths: { '/pets': { get: { responses: { '200': { content: { 'application/json': { schema: shared } } } } } } },
    });
  });

  it('should refuse an `$id` that re-bases a relative `$ref` outside the root', async () => {
    const root = makeDir('oas-file-root-');
    const spec = {
      openapi: '3.1.0',
      info: { title: 'File root', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          Leak: {
            $id: 'file:///etc/',
            type: 'object',
            properties: {
              passwd: { $ref: 'passwd' },
            },
          },
        },
      },
    };

    await expect(bundle(spec, { resolve: { file: true, fileRoot: root } })).rejects.toThrow(
      /outside the allowed directory/i,
    );
  });

  it('should reject a resolution base that sits outside `fileRoot`', async () => {
    const root = makeDir('oas-file-root-');
    const outside = makeDir('oas-file-root-outside-');
    const base = path.join(outside, 'api.json');
    fs.writeFileSync(base, '{}');

    await expect(
      bundle(definitionWithRef('./pet.json'), { resolve: { file: true, fileRoot: root, fileBase: base } }),
    ).rejects.toThrow(/resolution base .* outside the allowed directory/i);
  });
});
