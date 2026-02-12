export function cloneObject<T>(obj: T): T {
  if (typeof obj === 'undefined') {
    return undefined as T;
  }

  return JSON.parse(JSON.stringify(obj));
}
