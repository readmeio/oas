import type { OASDocument, SecuritySchemeObject } from 'oas/types';

import { describe, it, expect } from 'vitest';

import configureSecurity from '../../src/lib/configure-security.js';

function createSecurityOAS(scheme: SecuritySchemeObject) {
  return {
    components: { securitySchemes: { busterAuth: scheme } },
  } as unknown as OASDocument;
}

describe('configure-security', () => {
  it('should return an empty object if there is no security keys', () => {
    expect(configureSecurity({} as OASDocument, {}, '')).toBeUndefined();
  });

  it('should return undefined if no values', () => {
    const spec = createSecurityOAS({ type: 'apiKey', in: 'header', name: 'key' });

    expect(configureSecurity(spec, {}, 'busterAuth')).toBeUndefined();
  });

  it('should not return non-existent values', () => {
    const spec = createSecurityOAS({ type: 'apiKey', in: 'header', name: 'key' });

    expect(configureSecurity(spec, {}, 'busterAuth')).toBeUndefined();
  });

  describe('http auth support', () => {
    describe('type=basic', () => {
      it.each([
        ['basic auth', { user: 'user', pass: 'pass' }, 'user:pass'],
        ['if a password is present but the username is undefined', { user: undefined, pass: 'pass' }, ':pass'],
        ['if a password is present but the username is null', { user: null, pass: 'pass' }, ':pass'],
        ['if a password is present but the username is an empty string', { user: '', pass: 'pass' }, ':pass'],
        ['if a username is present but the pass is undefined', { user: 'user', pass: undefined }, 'user:'],
        ['if a username is present but the pass is null', { user: 'user', pass: null }, 'user:'],
        ['if a username is present but the pass is an empty string', { user: 'user', pass: '' }, 'user:'],
      ])('should handle %s', (_, auth, expected) => {
        const user = auth.user;
        const pass = auth.pass;
        const spec = createSecurityOAS({ type: 'http', scheme: 'basic' });

        expect(configureSecurity(spec, { busterAuth: { user, pass } }, 'busterAuth')).toStrictEqual({
          type: 'headers',
          value: {
            name: 'authorization',
            value: `Basic ${Buffer.from(expected).toString('base64')}`,
          },
        });
      });

      it('should return with no header if wanted scheme is missing', () => {
        const spec = createSecurityOAS({ type: 'http', scheme: 'basic' });

        expect(configureSecurity(spec, { anotherSchemeName: { user: '', pass: '' } }, 'busterAuth')).toBe(false);
      });

      it('should return with no header if user and password are blank', () => {
        const spec = createSecurityOAS({ type: 'http', scheme: 'basic' });

        expect(configureSecurity(spec, { busterAuth: { user: '', pass: '' } }, 'busterAuth')).toBe(false);
      });

      it('should return with a header if user or password are not blank', () => {
        const user = 'user';
        const spec = createSecurityOAS({ type: 'http', scheme: 'basic' });

        expect(configureSecurity(spec, { busterAuth: { user, pass: '' } }, 'busterAuth')).toStrictEqual({
          type: 'headers',
          value: {
            name: 'authorization',
            value: `Basic ${Buffer.from(`${user}:`).toString('base64')}`,
          },
        });
      });
    });

    describe('scheme `bearer`', () => {
      it('should work for bearer', () => {
        const apiKey = '123456';
        const spec = createSecurityOAS({ type: 'http', scheme: 'bearer' });

        expect(configureSecurity(spec, { busterAuth: apiKey }, 'busterAuth')).toStrictEqual({
          type: 'headers',
          value: {
            name: 'authorization',
            value: `Bearer ${apiKey}`,
          },
        });
      });

      it('should return with no header if apiKey is blank', () => {
        const values = {
          auth: { test: '' },
        };

        const spec = createSecurityOAS({ type: 'http', scheme: 'bearer' });

        expect(
          configureSecurity(
            spec,
            // @ts-expect-error Testing a failure case here
            values,
            'busterAuth',
          ),
        ).toBe(false);
      });
    });
  });

  describe('oauth2 support', () => {
    it('should work for oauth2', () => {
      const apiKey = '123456';
      const spec = createSecurityOAS({ type: 'oauth2', flows: {} });

      expect(configureSecurity(spec, { busterAuth: apiKey }, 'busterAuth')).toStrictEqual({
        type: 'headers',
        value: {
          name: 'authorization',
          value: `Bearer ${apiKey}`,
        },
      });
    });

    it('should return with no header if apiKey is blank', () => {
      const spec = createSecurityOAS({ type: 'oauth2', flows: {} });

      expect(configureSecurity(spec, { busterAuth: '' }, 'busterAuth')).toBe(false);
    });
  });

  describe('apiKey auth support', () => {
    describe('in `query`', () => {
      it('should work for query', () => {
        const values = { busterAuth: 'value' };
        const security: SecuritySchemeObject = { type: 'apiKey', in: 'query', name: 'key' };
        const spec = createSecurityOAS(security);

        expect(configureSecurity(spec, values, 'busterAuth')).toStrictEqual({
          type: 'queryString',
          value: {
            name: security.name,
            value: values.busterAuth,
          },
        });
      });
    });

    describe('in `header`', () => {
      it('should work for header', () => {
        const values = { busterAuth: 'value' };
        const security: SecuritySchemeObject = { type: 'apiKey', in: 'header', name: 'key' };
        const spec = createSecurityOAS(security);

        expect(configureSecurity(spec, values, 'busterAuth')).toStrictEqual({
          type: 'headers',
          value: {
            name: security.name,
            value: values.busterAuth,
          },
        });
      });

      describe('x-bearer-format', () => {
        it('should work for bearer', () => {
          const values = { busterAuth: 'value' };
          const security: SecuritySchemeObject & { 'x-bearer-format': string } = {
            type: 'apiKey',
            in: 'header',
            name: 'key',
            'x-bearer-format': 'bearer',
          };

          const spec = createSecurityOAS(security);

          expect(configureSecurity(spec, values, 'busterAuth')).toStrictEqual({
            type: 'headers',
            value: {
              name: security.name,
              value: `Bearer ${values.busterAuth}`,
            },
          });
        });

        it('should work for basic', () => {
          const values = { busterAuth: 'value' };
          const security: SecuritySchemeObject & { 'x-bearer-format': string } = {
            type: 'apiKey',
            in: 'header',
            name: 'key',
            'x-bearer-format': 'basic',
          };

          const spec = createSecurityOAS(security);

          expect(configureSecurity(spec, values, 'busterAuth')).toStrictEqual({
            type: 'headers',
            value: {
              name: security.name,
              value: `Basic ${values.busterAuth}`,
            },
          });
        });

        it('should work for token', () => {
          const values = { busterAuth: 'value' };
          const security: SecuritySchemeObject & { 'x-bearer-format': string } = {
            type: 'apiKey',
            in: 'header',
            name: 'key',
            'x-bearer-format': 'token',
          };

          const spec = createSecurityOAS(security);

          expect(configureSecurity(spec, values, 'busterAuth')).toStrictEqual({
            type: 'headers',
            value: {
              name: security.name,
              value: `Token ${values.busterAuth}`,
            },
          });
        });
      });
    });
  });
});
