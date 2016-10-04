var glob = require('glob');
var path = require('path');
var _ = require('lodash');

exports.swagger = false;
exports.login = false;
exports.category = "basic";
exports.desc = "Learn what you can do with api";

exports.run = function(config, info) {
  console.log("");
  console.log("Usage: api <command> [swagger url]");
  var files = glob.sync(path.join(__dirname, "*"));

  var categories = {
    'basic': {
      desc: 'Commands for getting started',
      commands: [],
    },
    'services': {
      desc: 'Hosted third-party services ' + '(Will post to the Internet)'.grey,
      commands: [],
    },
    'utility': {
      desc: 'Utility functions for working locally',
      commands: [],
    },
  };

  _.each(files, function(file) {
    var action = file.match(/(\w+).js/)[1];
    var f = require(file);
    var info = f.desc || "";

    if(f.category) {
     categories[f.category].commands.push("  $".grey + pad(" api " + action) + " " + info.grey);
    }
  });

  _.each(categories, function(category) {
    console.log("");
    console.log(category.desc);
    _.each(category.commands, function(command) {
      console.log(command);
    });
  });
  
  console.log("");
  console.log("Just getting started?".green);
  console.log("Run " + "api init".yellow + " to create your Swagger file.");
  console.log("");

  process.exit();

  function pad(text) {
    return (text + "                     ").substr(0,15)
  }
};
