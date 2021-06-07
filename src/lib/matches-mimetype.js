function matchesMimeType(arr, contentType) {
  return arr.some(function (type) {
    return contentType.indexOf(type) > -1;
  });
}

module.exports = {
  formUrlEncoded: contentType => {
    return matchesMimeType(['application/x-www-form-urlencoded'], contentType);
  },

  json: contentType => {
    return matchesMimeType(
      ['application/json', 'application/x-json', 'text/json', 'text/x-json', '+json'],
      contentType
    );
  },

  multipart: contentType => {
    return matchesMimeType(
      ['multipart/mixed', 'multipart/related', 'multipart/form-data', 'multipart/alternative'],
      contentType
    );
  },

  wildcard: contentType => {
    return contentType === '*/*';
  },

  xml: contentType => {
    return matchesMimeType(
      [
        'application/xml',
        'application/xml-external-parsed-entity',
        'application/xml-dtd',
        'text/xml',
        'text/xml-external-parsed-entity',
        '+xml',
      ],
      contentType
    );
  },
};
