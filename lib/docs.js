exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.desc = "Upload your docs to ReadMe.io";

exports.run = function(config, info) {
  console.log('Uploading Swagger file...');

  console.log("You can view your new docs here:");
  console.log("");
  console.log("  https://swagger.readme.io/preview/" + new Buffer(info.swaggerUrl).toString('base64'));
  console.log("");
};
