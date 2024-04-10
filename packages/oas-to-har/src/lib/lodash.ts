type Many<T> = T | readonly T[];
type PropertyName = number | string | symbol;
type PropertyPath = Many<PropertyName>;

/**
 * A janky, poorly typed replacement for `lodash.get`.
 *
 * @see {@link https://youmightnotneed.com/lodash#get}
 */
export function get(object: unknown, path?: string): any {
  // If path is not defined or it has false value
  if (!path) return undefined;
  // Check if path is string or array. Regex : ensure that we do not have '.' and brackets.
  // Regex explained: https://regexr.com/58j0k
  const pathArray = String(path).match(/([^[.\]])+/g);
  // Find value
  // @ts-expect-error idk man
  const result = pathArray?.reduce((prevObj, key) => prevObj && prevObj[key], object);
  // If found value is undefined return default value; otherwise return the value
  return result;
}

/**
 * A janky, poorly typed replacement for `lodash.set`.
 *
 * @see {@link https://youmightnotneed.com/lodash#set}
 */
export function set<TResult>(object: object, path: PropertyPath, value: any): TResult {
  // Regex explained: https://regexr.com/58j0k
  const pathArray: PropertyPath | RegExpMatchArray | null = Array.isArray(path)
    ? path
    : String(path).match(/([^[.\]])+/g);

  // @ts-expect-error idk man
  return pathArray?.reduce((acc, key, i) => {
    // @ts-expect-error idk man
    if (acc[key] === undefined) {
      // @ts-expect-error idk man
      acc[key] = {};
    }
    if (i === pathArray.length - 1) {
      // @ts-expect-error idk man
      acc[key] = value;
    }
    // @ts-expect-error idk man
    return acc[key];
  }, object);
}
