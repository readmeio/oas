export default function cloneObject<T>(obj: T): T | undefined {
  if (typeof obj === 'undefined') {
    return undefined;
  }

  return JSON.parse(JSON.stringify(obj));
}
