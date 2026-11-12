import type { FileInfo, ResolverOptions } from '@apidevtools/json-schema-ref-parser';
import type { PathLike, Stats } from 'node:fs';
import type { FileHandle } from 'node:fs/promises';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ResolverError } from '@apidevtools/json-schema-ref-parser';

const PROTOCOL = /^(\w{2,}):\/\//i;
const EXTRA_DECODE: readonly (readonly [RegExp, string])[] = [
  [/%23/gi, '#'],
  [/%24/gi, '$'],
  [/%26/gi, '&'],
  [/%2C/gi, ','],
  [/%40/gi, '@'],
];

interface NodeFS {
  constants: {
    O_DIRECTORY?: number;
    O_NOFOLLOW?: number;
    O_NONBLOCK?: number;
    O_RDONLY: number;
  };
  promises: {
    lstat(path: PathLike): Promise<Stats>;
    open(path: PathLike, flags: number): Promise<FileHandle>;
    realpath(path: PathLike): Promise<string>;
    stat(path: PathLike): Promise<Stats>;
  };
}

let fsPromise: Promise<NodeFS> | undefined;

/**
 * `fs` is loaded on demand so a browser bundle of this package does not pull it in until a
 * filesystem `$ref` is actually read.
 */
function nodeFs(): Promise<NodeFS> {
  fsPromise ??= import('node:fs');
  return fsPromise;
}

/**
 * Whether `value` is a local filesystem reference, including `file://` URLs.
 *
 * Matches `@apidevtools/json-schema-ref-parser`'s file resolver: anything without a URL scheme,
 * and `file:` URLs. Browsers have no filesystem resolver.
 */
function isFilesystemReference(value: string | undefined): boolean {
  if (typeof window !== 'undefined' || !value) {
    return false;
  }

  const match = PROTOCOL.exec(value);
  if (!match?.[1]) {
    return true;
  }

  return match[1].toLowerCase() === 'file';
}

/**
 * True when `candidate` is `rootReal` or a path inside it.
 *
 * `path.relative` keeps `/tmp/specs-evil` outside `/tmp/specs`. Both arguments must already be
 * absolute; pass realpaths when symlinks are involved.
 */
export function isInsideRoot(rootReal: string, candidate: string): boolean {
  const relative = path.relative(rootReal, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Directory that contains a filesystem API source. `file://` URLs are converted first so
 * `file:///etc/passwd` is jailed to `/etc`, not to a bogus `file:` directory.
 */
export function directoryOfSource(sourcePath: string): string {
  return path.dirname(toRawPath(sourcePath));
}

/**
 * Caller-supplied filesystem path. `#` and `%2e%2e` are literal characters here, unlike a
 * resolver URL. `file://` inputs are still converted with `fileURLToPath`.
 */
function toRawPath(input: string): string {
  if (PROTOCOL.test(input) && isFilesystemReference(input)) {
    return path.resolve(fileURLToPath(input));
  }

  return path.resolve(input);
}

/**
 * Convert a resolver URL or path into an absolute filesystem path.
 *
 * `$RefParser` hands the file resolver either a `file:` URL or an absolute path whose special
 * characters may still be percent-encoded. Decode those before normalizing `..`.
 */
function toLocalPath(input: string): string {
  const hashIndex = input.indexOf('#');
  const withoutHash = hashIndex >= 0 ? input.slice(0, hashIndex) : input;

  if (PROTOCOL.test(withoutHash) && isFilesystemReference(withoutHash)) {
    // `fileURLToPath` rejects non-local hosts. `path.resolve` collapses any `..` it leaves behind.
    return path.resolve(fileURLToPath(withoutHash));
  }

  let decoded = withoutHash.replace(/%(?![0-9A-Fa-f]{2})/g, '%25');
  try {
    decoded = decodeURI(decoded);
  } catch {
    // Leave a malformed escape sequence in place; path resolution still fails closed.
  }

  for (const [pattern, replacement] of EXTRA_DECODE) {
    decoded = decoded.replace(pattern, replacement);
  }

  return path.resolve(decoded);
}

/**
 * Use `fileRoot` (or `fileBase`, when it stays inside that root) as the base URL for an inline
 * schema. Path and URL sources keep the base `$RefParser` already derived from the source string.
 */
export async function resolveCallerBasePath(
  api: unknown,
  currentPath: string,
  options: { resolve?: { file?: boolean; fileBase?: string; fileRoot?: string } } | undefined,
): Promise<string> {
  if (typeof api === 'string' && api.length > 0) {
    return currentPath;
  }

  if (options?.resolve?.file !== true) {
    return currentPath;
  }

  const fileRoot = options.resolve.fileRoot;
  const fileBase = options.resolve.fileBase;

  if (fileBase) {
    if (fileRoot) {
      await assertPathInsideRoot(fileBase, fileRoot);
    }

    return fileBase;
  }

  if (fileRoot) {
    return asDirectoryBase(fileRoot);
  }

  return currentPath;
}

/**
 * Reject a resolution base whose real path sits outside `root`.
 *
 * The final path component is not followed. A symlink used only as a base URL can stay inside the
 * root even when its target does not; reads of that symlink are still refused by the resolver.
 */
async function assertPathInsideRoot(candidate: string, root: string): Promise<void> {
  const rootReal = await resolveRootDirectory(root);

  let absolute: string;
  try {
    absolute = toRawPath(candidate);
  } catch {
    throw new Error(`Resolution base "${candidate}" is outside the allowed directory.`);
  }

  const located = await locateLexicalPath(absolute);

  if (!isInsideRoot(rootReal, located)) {
    throw new Error(`Resolution base "${candidate}" is outside the allowed directory.`);
  }
}

/**
 * Filesystem resolver that refuses every read. Used when file resolution was requested for an
 * inline schema and no root directory was supplied.
 */
export function createRootlessFileResolver(): ResolverOptions {
  return {
    order: 100,
    canRead(file: FileInfo): boolean {
      return isFilesystemReference(file.url);
    },
    read(file: FileInfo): never {
      const label = refLabel(file);
      throw new ResolverError(
        new Error(`Unable to resolve $ref pointer "${label}": filesystem references require a root directory`),
        label,
      );
    },
  };
}

/**
 * Filesystem resolver that reads a file only when its real path stays inside `root`.
 *
 * Symlinks are not followed. Each path component is opened from the previous directory
 * descriptor, so replacing a directory with a symlink after the containment check cannot
 * redirect the read. The final component is opened nonblocking and checked with `fstat`
 * before any bytes are read, so a named pipe cannot stall the open. The root directory is
 * `realpath`'d on first read and reused for every `$ref` in the document, including nested
 * files and `$id` re-bases.
 */
export function createSandboxedFileResolver(root: string): ResolverOptions {
  let rootRealPromise: Promise<string> | undefined;

  return {
    order: 100,
    canRead(file: FileInfo): boolean {
      return isFilesystemReference(file.url);
    },
    async read(file: FileInfo): Promise<Buffer> {
      const label = refLabel(file);
      const fs = await nodeFs();
      rootRealPromise ??= resolveRootDirectory(root);

      let absolute: string;
      try {
        absolute = toLocalPath(file.url);
      } catch {
        throw outsideDirectory(label);
      }

      if (absolute.includes('\0')) {
        throw outsideDirectory(label);
      }

      const rootReal = await rootRealPromise;
      const located = await locateLexicalPath(absolute);
      if (!isInsideRoot(rootReal, located)) {
        throw outsideDirectory(label);
      }

      let handle: FileHandle;
      try {
        handle = (await canPinDirectories(fs))
          ? await openInsideRoot(rootReal, located, fs)
          : await openFinalComponent(located, fs);
      } catch (err) {
        if (isCode(err, 'ELOOP') || isCode(err, 'ENOTDIR')) {
          throw outsideDirectory(label);
        }

        if (isEnoent(err)) {
          const detail = (err as Error).message.includes('/proc/')
            ? 'ENOENT: no such file or directory'
            : (err as Error).message;
          throw new ResolverError(new Error(`Error opening file ${absolute}: ${detail}`), label);
        }

        if (isCode(err, 'ENOTFILE')) {
          throw new ResolverError(new Error(`Error opening file ${absolute}: not a file`), label);
        }

        throw err;
      }

      try {
        return await handle.readFile();
      } finally {
        await handle.close();
      }
    },
  };
}

let pinDirectories: Promise<boolean> | undefined;

/**
 * Linux can open a path component from a directory descriptor via `/proc/self/fd`. That pins the
 * directory inode, so `O_NOFOLLOW` applies to every component and not only the final one.
 */
function canPinDirectories(fs: NodeFS): Promise<boolean> {
  pinDirectories ??= fs.promises.stat('/proc/self/fd').then(
    stat => stat.isDirectory(),
    () => false,
  );
  return pinDirectories;
}

/**
 * Open `located` by walking from `rootReal` through directory descriptors.
 *
 * A symlink at any component fails closed, including one created after the containment check.
 * The final component uses `O_NONBLOCK` so a named pipe returns immediately and is rejected
 * by the file-type check instead of blocking the open.
 */
async function openInsideRoot(rootReal: string, located: string, fs: NodeFS): Promise<FileHandle> {
  const relative = path.relative(rootReal, located);
  const parts = relative === '' ? [] : relative.split(path.sep);
  if (!isInsideRoot(rootReal, located) || parts.some(part => part === '' || part === '.' || part === '..')) {
    throw codedError('ELOOP', 'outside');
  }

  let current: FileHandle | undefined;
  try {
    current = await fs.promises.open(rootReal, openFlags(fs, true));

    for (const [index, part] of parts.entries()) {
      const last = index === parts.length - 1;
      // oxlint-disable-next-line no-await-in-loop -- the next component has to be opened from this directory descriptor
      const next = await fs.promises.open(`/proc/self/fd/${current.fd}/${part}`, openFlags(fs, !last));
      const previous = current;
      current = next;
      // oxlint-disable-next-line no-await-in-loop -- the previous descriptor is closed only after the child open succeeds
      await previous.close();
    }

    await assertRegularFile(current);

    const opened = current;
    current = undefined;
    return opened;
  } finally {
    await current?.close();
  }
}

/**
 * Last-component `O_NOFOLLOW` open for systems without `/proc/self/fd`.
 */
async function openFinalComponent(located: string, fs: NodeFS): Promise<FileHandle> {
  const stat = await fs.promises.lstat(located);
  if (stat.isSymbolicLink()) {
    throw codedError('ELOOP', 'symlink');
  }

  if (!stat.isFile()) {
    throw codedError('ENOTFILE', 'not a file');
  }

  const handle = await fs.promises.open(located, openFlags(fs, false));
  try {
    await assertRegularFile(handle);
    return handle;
  } catch (err) {
    await handle.close();
    throw err;
  }
}

async function assertRegularFile(handle: FileHandle): Promise<void> {
  const stat = await handle.stat();
  if (!stat.isFile()) {
    throw codedError('ENOTFILE', 'not a file');
  }
}

function openFlags(fs: NodeFS, directory: boolean): number {
  // oxlint-disable-next-line no-bitwise -- `O_RDONLY` and `O_NOFOLLOW` are open(2) flags.
  let flags = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0);
  if (directory) {
    // oxlint-disable-next-line no-bitwise -- `O_DIRECTORY` is an open(2) flag.
    flags |= fs.constants.O_DIRECTORY ?? 0;
    return flags;
  }

  // oxlint-disable-next-line no-bitwise -- `O_NONBLOCK` keeps a named pipe from blocking the open.
  flags |= fs.constants.O_NONBLOCK ?? 0;
  return flags;
}

function codedError(code: string, message: string): Error {
  const err = new Error(message);
  return Object.assign(err, { code });
}

function refLabel(file: FileInfo): string {
  return file.reference && file.reference.length > 0 ? file.reference : file.url;
}

function outsideDirectory(ref: string): ResolverError {
  return new ResolverError(
    new Error(`Unable to resolve $ref pointer "${ref}": path is outside the allowed directory`),
    ref,
  );
}

function asDirectoryBase(root: string): string {
  const resolved = path.resolve(root);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

/**
 * `realpath` of `root`. Throws when `root` is missing or is not a directory.
 */
async function resolveRootDirectory(root: string): Promise<string> {
  const fs = await nodeFs();
  const resolved = path.resolve(root);

  let real: string;
  try {
    real = await fs.promises.realpath(resolved);
  } catch {
    throw new Error(`Root directory "${root}" is not accessible.`);
  }

  const stat = await fs.promises.stat(real);
  if (!stat.isDirectory()) {
    throw new Error(`Root directory "${root}" is not a directory.`);
  }

  return real;
}

/**
 * Absolute path of `absolute` after resolving symlinks in its ancestors, without following the
 * final component. Missing ancestors are walked until one exists, then the remainder is rejoined
 * so a missing file can still be checked against the root.
 */
async function locateLexicalPath(absolute: string): Promise<string> {
  const fs = await nodeFs();
  const parent = path.dirname(absolute);
  const base = path.basename(absolute);
  const parentReal = await locateExisting(parent, fs);
  return path.join(parentReal, base);
}

async function locateExisting(target: string, fs: NodeFS): Promise<string> {
  try {
    return await fs.promises.realpath(target);
  } catch (err) {
    if (!isEnoent(err)) {
      throw err;
    }
  }

  const parent = path.dirname(target);
  if (parent === target) {
    return target;
  }

  const parentReal = await locateExisting(parent, fs);
  return path.join(parentReal, path.basename(target));
}

function isEnoent(err: unknown): boolean {
  return isCode(err, 'ENOENT');
}

function isCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code;
}
