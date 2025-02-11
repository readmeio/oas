import { describe, it, expect } from 'vitest';

import OpenAPIParser from '../../../src/index.js';
import * as path from '../../utils/path.js';

import bundledAPI from './bundled.js';
import dereferencedAPI from './dereferenced.js';
import parsedAPI from './parsed.js';

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
        if (method === 'parse') {
          expect(result).to.deep.equal(parsedAPI);
        } else if (method === 'dereference' || method === 'validate') {
          expect(result).to.deep.equal(dereferencedAPI);
        } else {
          expect(result).to.deep.equal(bundledAPI);
        }
      }
    });

    it('should reject upon a failure', async () => {
      await expect(
        OpenAPIParser[method](path.rel('specs/awaited-behavior/awaited-behavior-error.yaml')),
      ).rejects.toThrow(SyntaxError);
    });
  });
});
