import nock from 'nock';
import { describe, it, expect, afterEach } from 'vitest';

import * as httpHeaders from '../src';

const { default: getHeaderDescription, interpolateDescription, sourceUrl } = httpHeaders;

describe('HTTP Headers', () => {
  describe('#retrieveMarkdown', () => {
    it('should request source markdown from MDN', async () => {
      const markdown = await httpHeaders.retrieveMarkdown();
      expect(markdown).toContain('title: HTTP headers');
    });
  });

  describe('#interpolateDescription', () => {
    it('should interpolate a complex glossary term', () => {
      const input = 'Informs the server about the {{Glossary("MIME_type", "types")}} of data that can be sent back.';
      expect(interpolateDescription(input)).toBe('Informs the server about the types of data that can be sent back.');
    });

    it('should interpolate a simple glossary term', () => {
      const input =
        'The {{Glossary("effective connection type")}} ("network profile") that best matches the connection\'s latency and bandwidth.';
      expect(interpolateDescription(input)).toBe(
        'The effective connection type ("network profile") that best matches the connection\'s latency and bandwidth.',
      );
    });

    it('should return existing description if no regexp matches', () => {
      const input = "Approximate bandwidth of the client's connection to the server, in Mbps.";
      expect(interpolateDescription(input)).toBe(input);
    });
  });

  describe('#getHeaderDescription', () => {
    afterEach(() => {
      nock.restore();
    });

    it('should return an empty object if something goes wrong', async () => {
      const mock = nock(sourceUrl).get('').reply(500);
      const headers = 'Connection';
      const descriptions = await getHeaderDescription(headers);
      expect(descriptions).toStrictEqual({});
      mock.done();
    });

    it('should return a header description for a string argument', async () => {
      const headers = 'Connection';
      const descriptions = await getHeaderDescription(headers);
      expect(descriptions).toStrictEqual({
        Connection: 'Controls whether the network connection stays open after the current transaction finishes.',
      });
    });

    it('should return header descriptions for an array of strings', async () => {
      const headers = ['authorization', 'accept', 'Content-Security-Policy', 'nel', 'ECT', 'Accept-Encoding'];
      const descriptions = await getHeaderDescription(headers);
      expect(descriptions).toStrictEqual({
        accept: 'Informs the server about the types of data that can be sent back.',
        'Accept-Encoding':
          'The encoding algorithm, usually a compression algorithm, that can be used on the resource sent back.',
        authorization: 'Contains the credentials to authenticate a user-agent with a server.',
        'Content-Security-Policy': 'Controls resources the user agent is allowed to load for a given page.',
        nel: 'Defines a mechanism that enables developers to declare a network error reporting policy.',
        ECT: 'The effective connection type ("network profile") that best matches the connection\'s latency and bandwidth. This is part of the Network Information API.',
      });
    });
  });
});
