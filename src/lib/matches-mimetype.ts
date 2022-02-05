function matchesMediaType(types: string[], mediaType: string): boolean {
  return types.some(function (type) {
    return mediaType.indexOf(type) > -1;
  });
}

export default {
  formUrlEncoded: (mimeType: string): boolean => {
    return matchesMediaType(['application/x-www-form-urlencoded'], mimeType);
  },

  json: (contentType: string): boolean => {
    return matchesMediaType(
      ['application/json', 'application/x-json', 'text/json', 'text/x-json', '+json'],
      contentType
    );
  },

  multipart: (contentType: string): boolean => {
    return matchesMediaType(
      ['multipart/mixed', 'multipart/related', 'multipart/form-data', 'multipart/alternative'],
      contentType
    );
  },

  wildcard: (contentType: string): boolean => {
    return contentType === '*/*';
  },

  xml: (contentType: string): boolean => {
    return matchesMediaType(
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
