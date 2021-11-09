import matchesMimeType from '../../src/lib/matches-mimetype';

describe('#formUrlEncoded', () => {
  it('should recognize `application/x-www-form-urlencoded`', () => {
    expect(matchesMimeType.formUrlEncoded('application/x-www-form-urlencoded')).toBe(true);
  });
});

describe('#json', () => {
  it.each([
    ['application/json'],
    ['application/x-json'],
    ['text/json'],
    ['text/x-json'],
    ['application/vnd.github.v3.star+json'],
  ])('should recognize `%s`', contentType => {
    expect(matchesMimeType.json(contentType)).toBe(true);
  });
});

describe('#multipart', () => {
  it.each([['multipart/mixed'], ['multipart/related'], ['multipart/form-data'], ['multipart/alternative']])(
    'should recognize `%s`',
    contentType => {
      expect(matchesMimeType.multipart(contentType)).toBe(true);
    }
  );
});

describe('#wildcard', () => {
  it('should recognize `*/*`', () => {
    expect(matchesMimeType.wildcard('*/*')).toBe(true);
  });
});

describe('#xml', () => {
  it.each([
    ['application/xml'],
    ['application/xml-external-parsed-entity'],
    ['application/xml-dtd'],
    ['text/xml'],
    ['text/xml-external-parsed-entity'],
    ['application/vnd.github.v3.star+xml'],
  ])('should recognize `%s`', contentType => {
    expect(matchesMimeType.xml(contentType)).toBe(true);
  });
});
