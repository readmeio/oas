/**
 * @deprecated Use `structuredClone` instead
 */
export function cloneObject<T>(obj: T): T {
  if (typeof obj === 'undefined') {
    return undefined as T;
  }

  // oxlint-disable-next-line readme/json-parse-try-catch
  return JSON.parse(JSON.stringify(obj));
}
