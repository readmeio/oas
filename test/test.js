var chai = require('chai');
var assert = chai.assert;
var expect = chai.expect;
chai.use(require('chai-string'));
chai.use(require('sinon-chai'));
require('sinon');
require('mocha-sinon');

var path = require('path');

describe('utils.js', function() {
  var utils = require('../utils');
  describe('#findSwagger()', function() {

    it('find a YAML file', function(done) {
      utils.findSwagger(function(err, swagger, file) {
        if(err) return done(err);
        expect(file).to.endsWith('PetStore.yaml');
        assert.equal('2.0', swagger.swagger);
        done();
      }, {
        dir: path.join(__dirname, 'fixtures', 'yaml')
      });
    });

    it('find a JSON file', function(done) {
      utils.findSwagger(function(err, swagger, file) {
        if(err) return done(err);
        expect(file).to.endsWith('swagger.json');
        assert.equal('2.0', swagger.swagger);
        done();
      }, {
        dir: path.join(__dirname, 'fixtures', 'json')
      });
    });

    it('loads main config', function() {
      var config = utils.config('config');
      expect(Object.keys(config).length > 0).to.be.true;
      assert.notEqual(config, 'test');
    });

    it('loads test config', function() {
      var config = utils.config('test');
      expect(Object.keys(config).length > 0).to.be.true;
      assert.equal(config.env, 'test');
    });

  });

  describe('#isSwagger()', function() {
    it('yaml file is swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'yaml', 'PetStore.yaml'))).to.be.true;
    });

    it('json file is swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'json', 'swagger.json'))).to.be.true;
    });

    it('bad json file is not swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'yaml', 'notthefile.json'))).to.be.false;
    });

    it('bad yaml file is not swagger', function() {
      expect(utils.isSwagger(path.join(__dirname, 'fixtures', 'json', 'wrongfile.yaml'))).to.be.false;
    });

  });

});

describe('api.js', function() {
  var api = require('../api');
  beforeEach(function() {
    var log = console.log;
    this.sinon.stub(console, 'log', function() {
      return log.apply(log, arguments);
    });
  });

  afterEach(function() {
    console.log.restore();
  });

  describe('#api()', function() {
    it('action not found', function() {
      api.api('notARealAction');
      expect(console.log).to.have.been.calledWithMatch('not found');
    });
  });
});
