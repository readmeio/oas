import Oas from 'oas';
import { describe, it, expect } from 'vitest';

import oasToHar from '../src/index.js';

import securityQuirks from './__datasets__/security-quirks.json';
import security from './__datasets__/security.json';

const spec = Oas.init(security);

describe('auth handling', () => {
  describe('headers', () => {
    it('should work for header auth', () => {
      expect(
        oasToHar(spec, spec.operation('/header', 'post'), {}, { auth_header: 'value' }).log.entries[0].request.headers,
      ).toStrictEqual([
        {
          name: 'x-auth-header',
          value: 'value',
        },
      ]);
    });

    it('should not send the same auth header twice if an auth scheme can be used in multiple ways', () => {
      const auth = {
        appId: '1234567890',
        accessToken: 'e229822e-f625-45eb-a963-4d197d29637b',
      };

      const oas = Oas.init(securityQuirks);
      const har = oasToHar(oas, oas.operation('/anything', 'post'), {}, auth);

      expect(har.log.entries[0].request.headers).toStrictEqual([
        {
          name: 'Access-Token',
          value: 'e229822e-f625-45eb-a963-4d197d29637b',
        },
      ]);
    });

    it('should not send the same header twice if only one form of auth is present', () => {
      const auth = { Basic: { pass: 'buster' } };

      const oas = Oas.init(securityQuirks);
      const har = oasToHar(oas, oas.operation('/anything', 'put'), {}, auth);

      expect(har.log.entries[0].request.headers).toStrictEqual([
        {
          name: 'authorization',
          value: 'Basic OmJ1c3Rlcg==',
        },
      ]);
    });

    it('should send a manually-defined auth header, overriding any supplied auth data, if `authorization` is present in the header data', () => {
      const auth = { Basic: { pass: 'buster' } };

      const oas = Oas.init(securityQuirks);
      const har = oasToHar(
        oas,
        oas.operation('/anything', 'put'),
        {
          header: {
            authorization: 'Bearer 1234',
          },
        },
        auth,
      );

      expect(har.log.entries[0].request.headers).toStrictEqual([
        {
          name: 'authorization',
          value: 'Bearer 1234',
        },
      ]);
    });
  });

  it('should work for query auth', () => {
    expect(
      oasToHar(
        spec,
        spec.operation('/query', 'post'),
        {},
        {
          auth_query: 'value',
        },
      ).log.entries[0].request.queryString,
    ).toStrictEqual([
      {
        name: 'authQuery',
        value: 'value',
      },
    ]);
  });

  it('should work for cookie auth', () => {
    expect(
      oasToHar(
        spec,
        spec.operation('/cookie', 'post'),
        {},
        {
          auth_cookie: 'value',
        },
      ).log.entries[0].request.cookies,
    ).toStrictEqual([
      {
        name: 'authCookie',
        value: 'value',
      },
    ]);
  });

  it('should work for multiple (||)', () => {
    expect(
      oasToHar(
        spec,
        spec.operation('/multiple-auth-or', 'post'),
        {},
        {
          auth_header: 'value',
          auth_headerAlt: 'value',
        },
      ).log.entries[0].request.headers,
    ).toStrictEqual([
      {
        name: 'x-auth-header',
        value: 'value',
      },
      {
        name: 'x-auth-header-alt',
        value: 'value',
      },
    ]);
  });

  it('should work for multiple (&&)', () => {
    expect(
      oasToHar(
        spec,
        spec.operation('/multiple-auth-and', 'post'),
        {},
        {
          auth_header: 'value',
          auth_headerAlt: 'value',
        },
      ).log.entries[0].request.headers,
    ).toStrictEqual([
      {
        name: 'x-auth-header',
        value: 'value',
      },
      {
        name: 'x-auth-header-alt',
        value: 'value',
      },
    ]);
  });

  it('should not set non-existent values', () => {
    const har = oasToHar(spec, spec.operation('/header', 'post'), {}, {});
    expect(har.log.entries[0].request.headers).toHaveLength(0);
  });
});
