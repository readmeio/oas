import * as RMOAS from '../rmoas.types';

export type UserVariable = unknown | null;

function getKey(key: RMOAS.User | Record<string, primitive>, property: string): UserVariable {
  return key[property] || null;
}

export default function getUserVariable(user: RMOAS.User, property: string, selectedApp?: primitive): UserVariable {
  let key = user;

  if ('keys' in user && Array.isArray(user.keys) && user.keys.length) {
    if (selectedApp) {
      key = user.keys.find(k => k.name === selectedApp);
    } else {
      key = user.keys[0];
    }
  }

  return getKey(key, property);
}
