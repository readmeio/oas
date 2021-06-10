/* eslint-disable no-underscore-dangle */
function getKey(user, scheme) {
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

function getByScheme(user, scheme = {}, selectedApp = false) {
  if (user.keys && user.keys.length) {
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

module.exports = (oas, user, selectedApp = false) => {
  return Object.keys(oas.components.securitySchemes)
    .map(scheme => {
      return {
        [scheme]: getByScheme(
          user,
          {
            ...oas.components.securitySchemes[scheme],
            _key: scheme,
            selectedApp,
          },
          selectedApp
        ),
      };
    })
    .reduce((prev, next) => Object.assign(prev, next), {});
};

module.exports.getByScheme = getByScheme;
