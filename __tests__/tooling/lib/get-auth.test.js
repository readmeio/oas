const Oas = require('../../../tooling');
const { getByScheme } = require('../../../tooling/lib/get-auth');

const multipleSecurities = require('../__fixtures__/multiple-securities.json');

const oas = new Oas(multipleSecurities);

test('should fetch all auths from the OAS files', () => {
  expect(oas.getAuth({ oauthScheme: 'oauth', apiKeyScheme: 'apikey' })).toStrictEqual({
    apiKeyScheme: 'apikey',
    apiKeySignature: '',
    basicAuth: {
      pass: '',
      user: '',
    },
    httpBearer: '',
    oauthDiff: '',
    oauthScheme: 'oauth',
    unknownAuthType: '',
  });
});

test('should fetch auths from selected app', () => {
  const user = {
    keys: [
      { oauthScheme: '111', name: 'app-1' },
      { oauthScheme: '222', name: 'app-2' },
    ],
  };

  expect(oas.getAuth(user, 'app-2').oauthScheme).toBe('222');
});

test('should not error if oas.components is not set', () => {
  const user = { oauthScheme: 'oauth', apiKeyScheme: 'apikey' };

  expect(() => {
    new Oas().getAuth(user);
  }).not.toThrow();

  expect(() => {
    new Oas({ components: {} }).getAuth(user);
  }).not.toThrow();

  expect(() => {
    new Oas({ components: { schemas: {} } }).getAuth(user);
  }).not.toThrow();
});

describe('#getByScheme', () => {
  const topLevelUser = { apiKey: '123456', user: 'user', pass: 'pass' };
  const keysUser = {
    keys: [
      { apiKey: '123456', name: 'app-1' },
      { apiKey: '7890', name: 'app-2' },
    ],
  };

  const topLevelSchemeUser = { schemeName: 'scheme-key' };
  const keysSchemeUser = {
    keys: [
      { schemeName: 'scheme-key-1', name: 'app-1' },
      { schemeName: 'scheme-key-2', name: 'app-2' },
      { schemeName: { user: 'user', pass: 'pass' }, name: 'app-3' },
    ],
  };

  it('should return apiKey property for oauth', () => {
    expect(getByScheme(topLevelUser, { type: 'oauth2' })).toBe('123456');
  });

  it('should return apiKey property for apiKey', () => {
    expect(getByScheme(topLevelUser, { type: 'oauth2' })).toBe('123456');
  });

  it('should return a default value if scheme is sec0 and default auth provided', () => {
    expect(getByScheme({}, { type: 'apiKey', _key: 'sec0', 'x-default': 'default' })).toBe('default');
  });

  it('should return apiKey property for bearer', () => {
    expect(getByScheme(topLevelUser, { type: 'http', scheme: 'bearer' })).toBe('123456');
  });

  it('should return user/pass properties for basic auth', () => {
    expect(getByScheme(topLevelUser, { type: 'http', scheme: 'basic' })).toStrictEqual({
      user: 'user',
      pass: 'pass',
    });
  });

  it('should return first item from keys array if no app selected', () => {
    expect(getByScheme(keysUser, { type: 'oauth2' })).toBe('123456');
  });

  it('should return selected app from keys array if app provided', () => {
    expect(getByScheme(keysUser, { type: 'oauth2' }, 'app-2')).toBe('7890');
  });

  it('should return item by scheme name if no apiKey/user/pass', () => {
    expect(getByScheme(topLevelSchemeUser, { type: 'oauth2', _key: 'schemeName' })).toBe('scheme-key');
    expect(getByScheme(topLevelSchemeUser, { type: 'http', scheme: 'bearer', _key: 'schemeName' })).toBe('scheme-key');
    expect(getByScheme(keysSchemeUser, { type: 'oauth2', _key: 'schemeName' })).toBe('scheme-key-1');
    expect(getByScheme(keysSchemeUser, { type: 'oauth2', _key: 'schemeName' }, 'app-2')).toBe('scheme-key-2');
    expect(getByScheme(keysSchemeUser, { type: 'http', scheme: 'basic', _key: 'schemeName' }, 'app-3')).toStrictEqual({
      user: 'user',
      pass: 'pass',
    });
  });

  it('should return emptystring for anything else', () => {
    expect(getByScheme(topLevelUser, { type: 'unknown' })).toBe('');
    expect(getByScheme({}, { type: 'http', scheme: 'basic' })).toStrictEqual({ user: '', pass: '' });
    expect(getByScheme({}, { type: 'http', scheme: 'bearer' })).toBe('');
    expect(getByScheme({}, { type: 'http', scheme: 'unknown' })).toBe('');
    expect(getByScheme(keysUser, { type: 'unknown' })).toBe('');
    expect(getByScheme(keysUser, { type: 'unknown' }, 'app-2')).toBe('');
  });

  it('should allow scheme to be undefined', () => {
    expect(getByScheme(topLevelUser)).toBe('');
  });
});
