import Oas from '../../src';
import getAuth, { getByScheme } from '../../src/lib/get-auth';
import multipleSecurities from '../__datasets__/multiple-securities.json';

// We need to forcetype this definition to an OASDocument because it's got weird use cases in it
// and isn't actually a valid to the spec.
const oas = Oas.init(multipleSecurities);

test('should not throw on an empty or null API definitions', () => {
  expect(Oas.init(undefined).getAuth({ oauthScheme: 'oauth' })).toStrictEqual({});
  expect(Oas.init(null).getAuth({ oauthScheme: 'oauth' })).toStrictEqual({});
  expect(getAuth(Oas.init(undefined).api, { oauthScheme: 'oauth' })).toStrictEqual({});
  expect(getAuth(Oas.init(null).api, { oauthScheme: 'oauth' })).toStrictEqual({});
});

test('should fetch all auths from the OAS files', () => {
  expect(oas.getAuth({ oauthScheme: 'oauth', apiKeyScheme: 'apikey' })).toStrictEqual({
    apiKeyScheme: 'apikey',
    apiKeySignature: null,
    basicAuth: {
      pass: null,
      user: null,
    },
    httpBearer: null,
    oauthDiff: null,
    oauthScheme: 'oauth',
    unknownAuthType: null,
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
    Oas.init({}).getAuth(user);
  }).not.toThrow();

  expect(() => {
    Oas.init({ components: {} }).getAuth(user);
  }).not.toThrow();

  expect(() => {
    Oas.init({ components: { schemas: {} } }).getAuth(user);
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
    expect(getByScheme(topLevelUser, { type: 'oauth2', flows: {}, _key: 'authscheme' })).toBe('123456');
  });

  it('should return apiKey property for apiKey', () => {
    expect(getByScheme(topLevelUser, { type: 'oauth2', flows: {}, _key: 'authscheme' })).toBe('123456');
  });

  it('should return a default value if scheme is sec0 and default auth provided', () => {
    expect(
      getByScheme(
        {},
        {
          type: 'apiKey',
          name: 'apiKey',
          in: 'query',
          'x-default': 'default',
          _key: 'authscheme',
        }
      )
    ).toBe('default');
  });

  it('should return apiKey property for bearer', () => {
    expect(getByScheme(topLevelUser, { type: 'http', scheme: 'bearer', _key: 'authscheme' })).toBe('123456');
  });

  it('should return user/pass properties for basic auth', () => {
    expect(getByScheme(topLevelUser, { type: 'http', scheme: 'basic', _key: 'authscheme' })).toStrictEqual({
      user: 'user',
      pass: 'pass',
    });
  });

  it('should return first item from keys array if no app selected', () => {
    expect(getByScheme(keysUser, { type: 'oauth2', flows: {}, _key: 'authscheme' })).toBe('123456');
  });

  it('should return selected app from keys array if app provided', () => {
    expect(getByScheme(keysUser, { type: 'oauth2', flows: {}, _key: 'authscheme' }, 'app-2')).toBe('7890');
  });

  it('should return item by scheme name if no apiKey/user/pass', () => {
    expect(getByScheme(topLevelSchemeUser, { type: 'oauth2', flows: {}, _key: 'schemeName' })).toBe('scheme-key');
    expect(getByScheme(topLevelSchemeUser, { type: 'http', scheme: 'bearer', _key: 'schemeName' })).toBe('scheme-key');
    expect(getByScheme(keysSchemeUser, { type: 'oauth2', flows: {}, _key: 'schemeName' })).toBe('scheme-key-1');
    expect(getByScheme(keysSchemeUser, { type: 'oauth2', flows: {}, _key: 'schemeName' }, 'app-2')).toBe(
      'scheme-key-2'
    );

    expect(getByScheme(keysSchemeUser, { type: 'http', scheme: 'basic', _key: 'schemeName' }, 'app-3')).toStrictEqual({
      user: 'user',
      pass: 'pass',
    });
  });

  it('should return null for anything else', () => {
    expect(getByScheme({}, { type: 'http', scheme: 'basic', _key: 'schemeName' })).toStrictEqual({
      user: null,
      pass: null,
    });

    expect(getByScheme({}, { type: 'http', scheme: 'bearer', _key: 'schemeName' })).toBeNull();
    expect(getByScheme({}, { type: 'http', scheme: 'unknown', _key: 'schemeName' })).toBeNull();

    expect(getByScheme({ keys: [] }, { type: 'http', scheme: 'bearer', _key: 'schemeName' })).toBeNull();
    expect(getByScheme({ keys: [] }, { type: 'http', scheme: 'unknown', _key: 'schemeName' })).toBeNull();

    // @todo bring these tests back
    // expect(getByScheme(topLevelUser, { type: 'unknown' })).toBeNull();
    // expect(getByScheme(keysUser, { type: 'unknown' })).toBeNull();
    // expect(getByScheme(keysUser, { type: 'unknown' }, 'app-2')).toBeNull();
  });

  it('should allow scheme to be undefined', () => {
    expect(getByScheme(topLevelUser)).toBeNull();
  });
});
