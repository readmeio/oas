function getKey(user, property) {
  return user[property] || null;
}

module.exports = function getUserVariable(user, property, selectedApp = false) {
  if (user.keys) {
    if (selectedApp) {
      return getKey(
        user.keys.find(key => key.name === selectedApp),
        property
      );
    }

    return getKey(user.keys[0], property);
  }

  return getKey(user, property);
};
