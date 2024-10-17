export default function cloneObject<T>(obj: T): T {
  if (typeof obj === 'undefined') {
    return undefined;
  }

  // eslint-disable-next-line try-catch-failsafe/json-parse
  return JSON.parse(JSON.stringify(obj));
}
