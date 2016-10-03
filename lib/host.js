exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.desc = "Get a public URL for your API";

exports.run = function(config, info) {
  console.log("");
  console.log("Success! ".green + "You can now access your Swagger from the following public URL:");
  console.log("");
  console.log("  " + info.swaggerUrl);
  console.log("");
  console.log("You can also use .yaml to get the YAML representation.".grey);
};
