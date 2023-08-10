import type * as RMOAS from '../rmoas.types';
import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

type authKey = null | unknown | { password: string | number; user: string | number };

/**
 * @param user User to retrieve retrieve an auth key for.
 * @param scheme The type of security scheme that we want a key for.
 */
function getKey(user: RMOAS.User, scheme: RMOAS.KeyedSecuritySchemeObject): authKey {
  switch (scheme.type) {
    case 'oauth2':
    case 'apiKey':
      return user[scheme._key] || user.apiKey || scheme['x-default'] || null;

    case 'http':
      if (scheme.scheme === 'basic') {
        return user[scheme._key] || { user: user.user || null, pass: user.pass || null };
      }

      if (scheme.scheme === 'bearer') {
        return user[scheme._key] || user.apiKey || null;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Retrieve auth keys for a specific security scheme for a given user for a specific "app" that
 * they have configured.
 *
 * For `scheme` we're typing it to a union of `SecurityScheme` and `any` because we have handling
 * and tests for an unknown or unrecognized `type` and though it's not possible with the
 * `SecurityScheme.type` to be unrecognized it may still be possible to get an unrecognized scheme
 * with this method in the wild as we have API definitions in our database that were ingested
 * before we had good validation in place.
 *
 * @param user User
 * @param scheme Security scheme to get auth keys for.
 * @param selectedApp The user app to retrieve an auth key for.
 */
export function getByScheme(
  user: RMOAS.User,
  scheme = <RMOAS.KeyedSecuritySchemeObject>{},
  selectedApp?: string | number,
): authKey {
  if (user?.keys && user.keys.length) {
    if (selectedApp) {
      return getKey(
        user.keys.find(key => key.name === selectedApp),
        scheme,
      );
    }

    return getKey(user.keys[0], scheme);
  }

  return getKey(user, scheme);
}

/**
 * Retrieve auth keys for an API definition from a given user for a specific "app" that they have
 * configured.
 *
 * @param api API definition
 * @param user User
 * @param selectedApp The user app to retrieve an auth key for.
 */
export default function getAuth(
  api: OpenAPIV3.Document | OpenAPIV3_1.Document,
  user: RMOAS.User,
  selectedApp?: string | number,
) {
  return Object.keys(api?.components?.securitySchemes || {})
    .map(scheme => {
      return {
        [scheme]: getByScheme(
          user,
          {
            // This sucks but since we dereference we'll never have a `$ref` pointer here with a
            // `ReferenceObject` type.
            ...(api.components.securitySchemes[scheme] as RMOAS.SecuritySchemeObject),
            _key: scheme,
          },
          selectedApp,
        ),
      };
    })
    .reduce((prev, next) => Object.assign(prev, next), {});
}
