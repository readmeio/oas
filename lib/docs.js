exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.category = "services";
exports.desc = "Upload your docs to ReadMe ($)";
exports.aliases = ['documentation', 'readme', 'readme.io', 'readmeio'];

exports.run = function(config, info) {
  console.log("You can view your new docs here:");
  console.log("");
  console.log("  https://swagger.readme.io/preview/" + new Buffer(info.swaggerUrl).toString('base64'));
  console.log("");

  process.exit();
};
