import type * as RMOAS from '../rmoas.types';

/**
 * Retrieve a user variable off of a given user.
 *
 * @see {@link https://docs.readme.com/docs/passing-data-to-jwt}
 * @param user The user to get a user variable for.
 * @param property The name of the variable to retrieve.
 * @param selectedApp The user app to retrieve an auth key for.
 */
export default function getUserVariable(user: RMOAS.User, property: string, selectedApp?: string | number) {
  let key = user;

  if ('keys' in user && Array.isArray(user.keys) && user.keys.length) {
    if (selectedApp) {
      key = user.keys.find(k => k.name === selectedApp);
    } else {
      key = user.keys[0];
    }
  }

  return key[property] || null;
}
