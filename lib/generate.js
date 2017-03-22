var cardinal = require('cardinal');

exports.swagger = true;
exports.login = false;
exports.desc = "Output your Swagger file";
exports.category = "utility";

exports.run = function(config, info) {
  console.log(cardinal.highlight(JSON.stringify(info.swagger, undefined, 2)));
  process.exit();
};
