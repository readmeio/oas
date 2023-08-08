import { retrieveMarkdown, normalizeHeader } from '../src';

describe('HTTP Headers', () => {
  describe('#retrieveMarkdown', () => {
    it('should request source markdown from MDN', async () => {
      const markdown = await retrieveMarkdown();
      expect(markdown).toContain('title: HTTP headers');
    });
  });

  describe('#normalizeHeader', () => {
    it('should convert a string into header identification format', () => {
      expect(normalizeHeader('Authorization')).toBe('');
    });

    it('should capitalize lowercase headers', () => {
      expect(normalizeHeader('content-length')).toBe('');
    });
  });
});
