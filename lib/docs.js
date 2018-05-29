var utils = require("../utils");

exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.desc = "Host your docs on ReadMe";
exports.category = "services";

exports.run = function(config, info) {
  console.log("");
  console.log(
    "Success! ".green +
      "You can now access your Swagger from the following publicly sharable URL:"
  );
  console.log("");
  console.log("  " + info.swaggerUrl + "?docs");
  console.log("");
  console.log(
    "To use in ReadMe for documentation, follow the URL for setup information."
  );

  utils.open(info.swaggerUrl + "?docs", info);

  process.exit();
};
