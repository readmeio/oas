import fs from 'node:fs';
import path from 'node:path';

function isEnoent(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT';
}

/**
 * True when `candidate` is `rootReal` or a path inside it. Both arguments must be absolute.
 */
function isInsideRoot(rootReal: string, candidate: string): boolean {
  const relative = path.relative(rootReal, candidate);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * `realpath` of `absolute`, walking up to the nearest existing ancestor when the file is missing
 * so a missing path can still be rejected for leaving the root.
 */
function locateRealPath(absolute: string): string {
  try {
    return fs.realpathSync(absolute);
  } catch (err) {
    if (!isEnoent(err)) {
      throw err;
    }
  }

  const parent = path.dirname(absolute);
  if (parent === absolute) {
    return absolute;
  }

  return path.join(locateRealPath(parent), path.basename(absolute));
}

/**
 * Resolve `pathsRoot` to a real directory at construction time, so a later `chdir` cannot move
 * the jail. The returned path is what filesystem `$ref`s are contained in.
 */
export function resolvePathsRoot(root: string): string {
  const resolved = path.resolve(root);
  let real: string;

  try {
    real = fs.realpathSync(resolved);
  } catch {
    throw new Error(`Root directory "${root}" is not accessible.`);
  }

  const stat = fs.statSync(real);
  if (!stat.isDirectory()) {
    throw new Error(`Root directory "${root}" is not a directory.`);
  }

  return real;
}

/**
 * Throw when `entry` realpaths outside `rootReal`.
 *
 * Called before the entry file is read, so a path or symlink that escapes `pathsRoot` never
 * becomes file contents. The root path is omitted from the error.
 */
export function assertEntryInsideRoot(entry: string, rootReal: string): void {
  const located = locateRealPath(path.resolve(entry));
  if (!isInsideRoot(rootReal, located)) {
    throw new Error(`File "${entry}" is outside the allowed directory.`);
  }
}
