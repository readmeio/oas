var Swagger2Postman = require('swagger2-to-postman');

exports.swagger = true;
exports.category = "services";
exports.desc = "Open your Swagger file in Postman ($)";
exports.aliases = ['postman'];

exports.run = function(config, info) {
  var swaggerConverter = new Swagger2Postman();
  //swaggerConverter.setLogger(console.log); // TODO! Add verbose mode?

  var convertResult = swaggerConverter.convert(info.swagger);

  if(convertResult.status === "failed") {
    console.log("Error converting to Postman!".red);
    if(convertResult.message) {
      console.log("  " + convertResult.message);
    }
    return process.exit();
  }

  console.log("Success!".green + " Here's your Postman collection:");
  console.log(JSON.stringify(convertResult.collection, undefined, 2));

  console.log("");
  console.log("Postman support is in beta.".yellow + " This doesn't quite do much yet, unfortunately!");

  process.exit();
};
