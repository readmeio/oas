export function jsonStringifyClean(obj: any): string {
  return JSON.stringify(obj, undefined, 2);
}
