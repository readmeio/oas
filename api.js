var colors = require("colors");
var prompt = require("prompt-sync")();
var crypto = require("crypto");
var fs = require("fs");
var jsonfile = require("jsonfile");
var uslug = require("uslug");
var path = require("path");
var request = require("request");

var utils = require("./utils");

exports.api = function(args, opts) {
  opts = opts || {};

  var action = args[0];
  var config = utils.config(opts.env);

  var actionObj = exports.load(action);

  if (!actionObj) {
    return;
  }

  var info = {
    args: args,
    opts: opts
  };

  if (actionObj.login) {
    try {
      var login = jsonfile.readFileSync(config.apiFile);
      info.token = login.token;
    } catch (e) {
      console.log("You need to log in to do this!".red);
      console.log("Run " + "oas login".yellow);
      return process.exit(1);
    }
  }

  if (actionObj.swagger) {
    utils.findSwagger(info, function(err, swagger, file) {
      if (err) {
        console.error(err);
        return;
      }

      var apiId = swagger.info.title
        ? uslug(swagger.info.title)
        : crypto.randomBytes(7).toString("hex");

      request.get(
        config.host.url + "/check/" + apiId,
        { json: true },
        (err, check) => {
          if (!swagger["x-api-id"]) {
            if (check.body.exists) {
              // If this already exists, rather than giving a confusing
              // "permissions" error, we just add a suffix
              apiId += "-" + crypto.randomBytes(2).toString("hex");
            }

            console.log(
              'Your Swagger file needs a unique "x-api-id" property to work. Do you want us to add it automatically?'
            );
            var add = prompt("Add automatically? " + "(y/n) ".grey);
            if (add.trim()[0] != "y") {
              console.log("");
              console.log(
                "Okay! To do it yourself, edit " +
                  file.split("/").slice(-1)[0].yellow +
                  " and add the following 'x-api-id' line:"
              );
              exampleId(file, apiId);

              console.log("");
              console.log(
                "Make sure you commit the changes so your team is all using the same ID."
              );

              return process.exit(1);
            } else {
              if (utils.addId(file, apiId)) {
                console.log(
                  "Success! ".green +
                    "We added it to your Swagger file! Make sure you commit the changes so your team is all using the same ID."
                );
                console.log("");
                swagger["x-api-id"] = apiId;
              } else {
                console.log(
                  "We weren't able to add the ID automatically. In " +
                    file.split("/").slice(-1)[0].yellow +
                    ", add the following 'x-api-id' line:"
                );

                exampleId(file, apiId);

                console.log(
                  "Make sure you commit the changes so your team is all using the same ID."
                );

                return process.exit(1);
              }
            }
          }

          utils.removeMetadata(swagger);

          info.swagger = swagger;

          if (actionObj.swaggerUrl) {
            utils.getSwaggerUrl(config, info, function(url) {
              info.swaggerUrl = url;
              actionObj.run(config, info);
            });
          } else {
            actionObj.run(config, info);
          }
        }
      );
    });
  } else {
    actionObj.run(config, info);
  }
};

exports.load = function(action) {
  if (!action) action = "help";

  var file = path.join(__dirname, "lib", `${action}.js`);
  if (utils.fileExists(file)) {
    return require(file);
  }

  var alias = utils.getAliasFile(action);
  if (alias) {
    var file = path.join(__dirname, "lib", `${alias}.js`);
    return require(file);
  }

  console.log("Action not found.".red);
  console.log("Type " + "oas help".yellow + " to see all commands");
  return process.exit(1);
};

function exampleId(file, apiId) {
  if (file.match(/json$/)) {
    console.log("");
    console.log("    {".grey);
    console.log('      "swagger": "2.0",'.grey);
    console.log('      "x-api-id": "' + apiId + '",');
    console.log('      "info": {'.grey);
    console.log("      ...".grey);
  } else {
    console.log("");
    console.log('    swagger: "2.0"'.grey);
    console.log('    x-api-id: "' + apiId + '"');
    console.log("    info:".grey);
    console.log("      ...".grey);
  }
}
