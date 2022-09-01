const { expect } = require('chai');

const OpenAPIParser = require('../../..');
const helper = require('../../utils/helper');
const path = require('../../utils/path');

const bundledAPI = require('./bundled');
const dereferencedAPI = require('./dereferenced');
const parsedAPI = require('./parsed');

describe('Callback & Promise syntax', () => {
  for (const method of ['parse', 'resolve', 'dereference', 'bundle', 'validate']) {
    describe(`${method} method`, () => {
      it('should call the callback function upon success', testCallbackSuccess(method));
      it('should call the callback function upon failure', testCallbackError(method));
      it('should resolve the Promise upon success', testPromiseSuccess(method));
      it('should reject the Promise upon failure', testPromiseError(method));
    });
  }

  function testCallbackSuccess(method) {
    return function (done) {
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
          done();
        } catch (e) {
          done(e);
        }
      });
    };
  }

  function testCallbackError(method) {
    return function (done) {
      OpenAPIParser[method](path.rel('specs/callbacks-promises/callbacks-promises-error.yaml'), (err, result) => {
        try {
          expect(err).to.be.an.instanceOf(SyntaxError);
          expect(result).to.equal(undefined);
          done();
        } catch (e) {
          done(e);
        }
      });
    };
  }

  function testPromiseSuccess(method) {
    return function () {
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
    };
  }

  function testPromiseError(method) {
    return function () {
      return OpenAPIParser[method](path.rel('specs/callbacks-promises/callbacks-promises-error.yaml'))
        .then(helper.shouldNotGetCalled)
        .catch(err => {
          expect(err).to.be.an.instanceOf(SyntaxError);
        });
    };
  }

  function getSchema(method) {
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
});
