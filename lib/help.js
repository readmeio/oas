var glob = require("glob");
var path = require("path");
var _ = require("lodash");

exports.swagger = false;
exports.login = false;
exports.category = "basic";
exports.desc = "Learn what you can do with oas";
exports.weight = 2;

exports.run = function(config, info) {
  console.log("");
  console.log("Usage: oas <command> [swagger url]");
  var files = glob.sync(path.join(__dirname, "*"));

  var categories = {
    basic: {
      desc: "Commands for getting started",
      commands: []
    },
    services: {
      desc: "Hosted third-party services " + "(Will post to the Internet)".grey,
      commands: []
    },
    utility: {
      desc: "Utility functions",
      commands: []
    }
  };

  _.each(files, function(file) {
    var action = file.match(/(\w+).js/)[1];
    var f = require(file);
    var info = f.desc || "";

    if (f.category) {
      categories[f.category].commands.push({
        text: "  $".grey + pad(" oas " + action) + " " + info.grey,
        weight: f.weight
      });
    }
  });

  _.each(categories, function(category) {
    console.log("");
    console.log(category.desc);
    _.each(_.sortBy(category.commands, "weight"), function(command) {
      console.log(command.text);
    });
  });

  console.log("");
  console.log("Just getting started?".green);
  console.log("Run " + "oas init".yellow + " to create your Swagger file.");
  console.log("");

  process.exit();

  function pad(text) {
    return (text + "                     ").substr(0, 15);
  }
};
