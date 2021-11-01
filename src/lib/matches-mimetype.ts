function matchesMimeType(arr: Array<string>, contentType: string): boolean {
  return arr.some(function (type) {
    return contentType.indexOf(type) > -1;
  });
}

export default {
  formUrlEncoded: (contentType: string): boolean => {
    return matchesMimeType(['application/x-www-form-urlencoded'], contentType);
  },

  json: (contentType: string): boolean => {
    return matchesMimeType(
      ['application/json', 'application/x-json', 'text/json', 'text/x-json', '+json'],
      contentType
    );
  },

  multipart: (contentType: string): boolean => {
    return matchesMimeType(
      ['multipart/mixed', 'multipart/related', 'multipart/form-data', 'multipart/alternative'],
      contentType
    );
  },

  wildcard: (contentType: string): boolean => {
    return contentType === '*/*';
  },

  xml: (contentType: string): boolean => {
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
