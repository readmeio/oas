import * as RMOAS from '../rmoas.types';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

type authKey = null | unknown | { user: primitive; password: primitive };

function getKey(user: User, scheme: RMOAS.KeyedSecuritySchemeObject): authKey {
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

// For `scheme` we're typing it to a union of `SecurityScheme` and `any` because we have handling and tests for an
// unknown or unrecognized `type` and though it's not possible with the `SecurityScheme.type` to be unrecognized it may
// still be possible to get an unrecognized scheme with this method in the wild as we have API definitions in our
// database that were ingested before we had good validation in place.
function getByScheme(user: User, scheme = <RMOAS.KeyedSecuritySchemeObject | any>{}, selectedApp?: primitive): authKey {
  if (user?.keys) {
    if (selectedApp) {
      return getKey(
        user.keys.find(key => key.name === selectedApp),
        scheme
      );
    }

    return getKey(user.keys[0], scheme);
  }

  return getKey(user, scheme);
}

export { getByScheme };

export default function getAuth(
  api: OpenAPIV3.Document | OpenAPIV3_1.Document,
  user: User,
  selectedApp?: primitive
): Record<string, unknown> {
  return Object.keys(api.components.securitySchemes)
    .map(scheme => {
      return {
        [scheme]: getByScheme(
          user,
          {
            // This sucks but since we dereference we'll never a `$ref` pointer here with a `ReferenceObject` type.
            ...(api.components.securitySchemes[scheme] as RMOAS.SecuritySchemeObject),
            _key: scheme,
          },
          selectedApp
        ),
      };
    })
    .reduce((prev, next) => Object.assign(prev, next), {});
}
