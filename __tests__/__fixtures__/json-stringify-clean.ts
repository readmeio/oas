export default function jsonStringifyClean(obj) {
  return JSON.stringify(obj, undefined, 2);
}
