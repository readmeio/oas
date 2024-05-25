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

describe('Callback & Promise syntax', () => {
  describe.each(['parse', 'resolve', 'dereference', 'bundle', 'validate'])('%s method', method => {
    it('should call the callback function upon success', () => {
      return new Promise((resolve, reject) => {
        const parser = new OpenAPIParser();
        parser[method](path.rel('specs/callbacks-promises/callbacks-promises.yaml'), (err, result) => {
          try {
            expect(err).to.equal(null);
            expect(result).to.be.an('object');
            expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/callbacks-promises/callbacks-promises.yaml')]);

            if (method === 'resolve') {
              expect(result).to.equal(parser.$refs);
            } else {
              expect(result).to.equal(parser.schema);

              // Make sure the API was parsed correctly
              const expected = getSchema(method);
              expect(result).to.deep.equal(expected);
            }
            resolve(true);
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('should call the callback function upon failure', () => {
      return new Promise((resolve, reject) => {
        OpenAPIParser[method](path.rel('specs/callbacks-promises/callbacks-promises-error.yaml'), (err, result) => {
          try {
            expect(err).to.be.an.instanceOf(SyntaxError);
            expect(result).to.equal(undefined);
            resolve(true);
          } catch (e) {
            reject(e);
          }
        });
      });
    });

    it('should resolve the Promise upon success', () => {
      const parser = new OpenAPIParser();
      return parser[method](path.rel('specs/callbacks-promises/callbacks-promises.yaml')).then(result => {
        expect(result).to.be.an('object');
        expect(parser.$refs.paths()).to.deep.equal([path.abs('specs/callbacks-promises/callbacks-promises.yaml')]);

        if (method === 'resolve') {
          expect(result).to.equal(parser.$refs);
        } else {
          expect(result).to.equal(parser.schema);

          // Make sure the API was parsed correctly
          const expected = getSchema(method);
          expect(result).to.deep.equal(expected);
        }
      });
    });

    it('should reject the Promise upon failure', async () => {
      await expect(
        OpenAPIParser[method](path.rel('specs/callbacks-promises/callbacks-promises-error.yaml')),
      ).rejects.toThrow(SyntaxError);
    });
  });
});
