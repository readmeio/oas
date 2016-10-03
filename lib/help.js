var glob = require('glob');
var path = require('path');
var _ = require('lodash');

exports.swagger = false;
exports.login = false;
exports.desc = "Learn what you can do with api";

exports.run = function(config, info) {
  console.log("");
  console.log("Here's a list of what you can do with " + 'api'.yellow + ":");
  console.log("");
  var files = glob.sync(path.join(__dirname, "*"));

  _.each(files, function(file) {
    var action = file.match(/(\w+).js/)[1];
    var info = require(file).desc || "";
    console.log("  $".grey + pad(" api " + action) + " " + info.grey);
  });
  
  console.log("");
  console.log("Just getting started?".green);
  console.log("Run " + "api init".yellow + " to create your Swagger file.");
  console.log("");

  function pad(text) {
    return (text + "                     ").substr(0,15)
  }
};
