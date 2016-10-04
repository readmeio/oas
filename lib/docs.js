var utils = require('../utils');

exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.category = "services";
exports.desc = "Upload your docs to ReadMe ($)";
exports.aliases = ['documentation', 'readme', 'readme.io', 'readmeio'];

exports.run = function(config, info) {
  var url = "https://swagger.readme.io/preview/" + new Buffer(info.swaggerUrl).toString('base64');

  console.log("You can view your new docs here:");
  console.log("");
  console.log("  " + url);
  console.log("");

  utils.open(url, info);

  process.exit();
};
