export default function jsonStringifyClean(obj: any) {
  return JSON.stringify(obj, undefined, 2);
}
