const path = require('path');
const utils = require('../../src/lib/utils');

describe('utils.js', function() {
  describe('#findSwagger()', function() {
    it.skip('find a YAML file', function() {
      return new Promise(done => {
        utils.findSwagger(
          function(err, swagger, file) {
            if (err) return done(err);
            expect(file).toEndWith('PetStore.yaml');
            expect(swagger.swagger).toBe('2.0');
            return done();
          },
          {
            dir: path.join(__dirname, 'fixtures', 'yaml'),
          }
        );
      });
    });

    it.skip('find a JSON file', function() {
      return new Promise(done => {
        utils.findSwagger(
          function(err, swagger, file) {
            if (err) return done(err);
            expect(file).toEndWith('swagger.json');
            expect(swagger.swagger).toBe('2.0');
            return done();
          },
          {
            dir: path.join(__dirname, 'fixtures', 'json'),
          }
        );
      });
    });

    it('loads main config', function() {
      const config = utils.config('config');
      expect(Object.keys(config).length > 0).toBe(true);
      expect(config).not.toBe('test');
    });

    it('loads test config', function() {
      const config = utils.config('test');
      expect(Object.keys(config).length > 0).toBe(true);
      expect(config.env).toBe('test');
    });
  });

  describe.skip('#isSwagger()', function() {
    it('yaml file is swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'yaml', 'PetStore.yaml'))).toBe(true);
    });

    it('json file is swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'json', 'swagger.json'))).toBe(true);
    });

    it('bad json file is not swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'yaml', 'notthefile.json'))).toBe(false);
    });

    it('bad yaml file is not swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'json', 'wrongfile.yaml'))).toBe(false);
    });
  });
});
