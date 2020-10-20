const sinon = require('sinon');
const api = require('../../cli');

describe.skip('api.js', function () {
  beforeEach(function () {
    const log = console.log;
    sinon.stub(console, 'log', function (...args) {
      return log.apply(log, ...args);
    });
  });

  afterEach(function () {
    console.log.restore();
  });

  describe('#api()', function () {
    it('action not found', function () {
      api.api('notARealAction');
      sinon.assert.calledWithMatch('not found');
    });
  });
});
