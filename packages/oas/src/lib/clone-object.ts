export function cloneObject<T>(obj: T): T {
  if (typeof obj === 'undefined') {
    return undefined as T;
  }

  return structuredClone(obj);
}
