var path = require("path");
var utils = require("../src/lib/utils");

describe("utils.js", function() {
  describe.skip("#findSwagger()", function() {
    it("find a YAML file", function(done) {
      utils.findSwagger(
        function(err, swagger, file) {
          if (err) return done(err);
          expect(file).to.endsWith("PetStore.yaml");
          assert.equal("2.0", swagger.swagger);
          done();
        },
        {
          dir: path.join(__dirname, "fixtures", "yaml")
        }
      );
    });

    it("find a JSON file", function(done) {
      utils.findSwagger(
        function(err, swagger, file) {
          if (err) return done(err);
          expect(file).to.endsWith("swagger.json");
          assert.equal("2.0", swagger.swagger);
          done();
        },
        {
          dir: path.join(__dirname, "fixtures", "json")
        }
      );
    });

    it("loads main config", function() {
      var config = utils.config("config");
      expect(Object.keys(config).length > 0).to.be.true;
      assert.notEqual(config, "test");
    });

    it("loads test config", function() {
      var config = utils.config("test");
      expect(Object.keys(config).length > 0).to.be.true;
      assert.equal(config.env, "test");
    });
  });

  describe.skip("#isSwagger()", function() {
    it("yaml file is swagger", function() {
      expect(
        utils.isSwagger(
          path.join(__dirname, "fixtures", "yaml", "PetStore.yaml")
        )
      ).to.be.true;
    });

    it("json file is swagger", function() {
      expect(
        utils.isSwagger(
          path.join(__dirname, "fixtures", "json", "swagger.json")
        )
      ).to.be.true;
    });

    it("bad json file is not swagger", function() {
      expect(
        utils.isSwagger(
          path.join(__dirname, "fixtures", "yaml", "notthefile.json")
        )
      ).to.be.false;
    });

    it("bad yaml file is not swagger", function() {
      expect(
        utils.isSwagger(
          path.join(__dirname, "fixtures", "json", "wrongfile.yaml")
        )
      ).to.be.false;
    });
  });
});
