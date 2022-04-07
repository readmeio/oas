export default function cloneObject<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
