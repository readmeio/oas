import { describe, it, expect } from 'vitest';

import getHeader, {
  normalizeHeader,
  getHeaderMarkdown,
  getHeaderDescription,
  getHeaderLink,
  isHeaderDeprecated,
  isHeaderExperimental,
  isHeaderValid,
} from '../src';

describe('HTTP Headers', () => {
  describe('#normalizeHeader', () => {
    it('should not convert a compliant string', () => {
      const header = 'Accept';
      expect(normalizeHeader(header)).toBe(header);
    });

    it('should convert a non-kebab string', () => {
      expect(normalizeHeader('location')).toBe('Location');
    });

    it('should convert a kebab string', () => {
      expect(normalizeHeader('x-forwarded-for')).toBe('X-Forwarded-For');
    });
  });

  describe('#isHeaderValid', () => {
    it('should return true if header is documented', () => {
      expect(isHeaderValid('Accept')).toBe(true);
    });

    it('should return false if header not found', () => {
      expect(isHeaderValid('test-header')).toBe(false);
    });
  });

  describe('#isHeaderDeprecated', () => {
    it('should return false if header has not been flagged as deprecated', () => {
      expect(isHeaderDeprecated('Accept')).toBe(false);
    });

    it('should return true if header has been flagged as deprecated', () => {
      expect(isHeaderDeprecated('Viewport-Width')).toBe(true);
    });

    it('should return false if header does not exist', () => {
      expect(isHeaderDeprecated('randomValue')).toBe(false);
    });
  });

  describe('#isHeaderExperimental', () => {
    it('should return false if header has not been flagged as experimental', () => {
      expect(isHeaderExperimental('Accept')).toBe(false);
    });

    it('should return true if header has been flagged as experimental', () => {
      expect(isHeaderExperimental('Save-Data')).toBe(true);
    });

    it('should return false if header does not exist', () => {
      expect(isHeaderExperimental('randomValue')).toBe(false);
    });
  });

  describe('#getHeaderLink', () => {
    it('should return a link if found', () => {
      expect(getHeaderLink('Expect')).toBe('https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Expect');
    });

    it('should return an empty string if not found', () => {
      expect(getHeaderLink('Refresh')).toBe('');
    });
  });

  describe('#getHeaderDescription', () => {
    it('should return a description if found', () => {
      expect(getHeaderDescription('Report-To')).toBe(
        'Used to specify a server endpoint for the browser to send warning and error reports to.',
      );
    });

    it('should return an empty string if not found', () => {
      expect(getHeaderDescription('randomHeader')).toBe('');
    });
  });

  describe('#getHeaderMarkdown', () => {
    it('should return a markdown if exists', () => {
      expect(getHeaderMarkdown('Cookie')).toBe(
        'Contains stored [HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies) previously sent by the server with the "Set-Cookie" header.',
      );
    });

    it('should fallback to description if no markdown', () => {
      expect(getHeaderMarkdown('X-Forwarded-Host')).toBe(
        'Identifies the original host requested that a client used to connect to your proxy or load balancer.',
      );
    });

    it('should return an empty string if not found', () => {
      expect(getHeaderMarkdown('Ping-From')).toBe('');
    });
  });

  describe('#getHeader', () => {
    it('should return an empty object if header is invalid', () => {
      expect(getHeader('randomVal')).toStrictEqual({});
    });

    it('should return HTTP header metadata if valid', () => {
      expect(getHeader('Signed-Headers')).toStrictEqual({
        experimental: true,
        description:
          'The "Signed-Headers" header field identifies an ordered list of response header fields to include in a signature.',
        link: '',
        markdown:
          'The [`Signed-Headers`](https://wicg.github.io/webpackage/draft-yasskin-http-origin-signed-responses.html#rfc.section.5.1.2) header field identifies an ordered list of response header fields to include in a signature.',
      });
    });
  });
});
