const sinon = require("sinon");

describe.skip("api.js", function() {
  var api = require("../api");
  beforeEach(function() {
    var log = console.log;
    sinon.stub(console, "log", function() {
      return log.apply(log, arguments);
    });
  });

  afterEach(function() {
    console.log.restore();
  });

  describe("#api()", function() {
    it("action not found", function() {
      api.api("notARealAction");
      expect(console.log).to.have.been.calledWithMatch("not found");
    });
  });
});
