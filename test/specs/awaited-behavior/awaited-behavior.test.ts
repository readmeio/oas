import { describe, it, expect } from 'vitest';

import OpenAPIParser from '../../..';
import path from '../../utils/path';

import bundledAPI from './bundled';
import dereferencedAPI from './dereferenced';
import parsedAPI from './parsed';

function getSchema(method: string) {
  switch (method) {
    case 'parse':
      return parsedAPI;
    case 'dereference':
    case 'validate':
      return dereferencedAPI;
    case 'bundle':
      return bundledAPI;
    default:
      throw new Error('Unrecognized schema method called.');
  }
}

describe('awaited behavior', () => {
  describe.each(['parse', 'resolve', 'dereference', 'bundle', 'validate'])('%s method', method => {
    it('should resolve upon a success', async () => {
      const parser = new OpenAPIParser();
      const result = await parser[method](path.rel('specs/awaited-behavior/awaited-behavior.yaml'));

      expect(result).to.be.an('object');
      expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/awaited-behavior/awaited-behavior.yaml')]);

      if (method === 'resolve') {
        expect(result).to.equal(parser.$refs);
      } else {
        expect(result).to.equal(parser.schema);

        // Make sure the API was parsed correctly
        const expected = getSchema(method);
        expect(result).to.deep.equal(expected);
      }
    });

    it('should reject upon a failure', async () => {
      await expect(
        OpenAPIParser[method](path.rel('specs/awaited-behavior/awaited-behavior-error.yaml')),
      ).rejects.toThrow(SyntaxError);
    });
  });
});
