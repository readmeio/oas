var colors = require('colors');
var prompt = require('prompt-sync')();
var crypto = require('crypto');
var fs = require('fs');
var jsonfile = require('jsonfile');
var path = require('path');

var utils = require('./utils');

exports.api = function(args, opts) {
  opts = opts || {};

  var action = args[0];
  var config = utils.config(opts.env);

  var actionObj = exports.load(action);

  if(!actionObj) {
    return;
  }

  var info = {
    'args': args,
    'opts': opts,
  };

  if(actionObj.login) {
    try {
      var login = jsonfile.readFileSync(config.apiFile);
      info.token = login.token;
    } catch(e) {
      console.log('You need to log in to do this!'.red);
      console.log('Run ' + 'api login'.yellow);
      return process.exit();
    }
  }
  
  if(actionObj.swagger) {
    utils.findSwagger(function(err, swagger, file) {
      if(err) {
        console.error(err);
        return;
      }

      var apiId = crypto.randomBytes(15).toString('hex');

      if(!swagger['x-api-id']) {
        console.log('Your Swagger file needs a unique "x-api-id" property to work. Do you want us to add it automatically?');
        var add = prompt('Add automatically? ' + '(y/n) '.grey);
        if(add.trim()[0] != 'y') {
          console.log("");
          console.log("Okay! To do it yourself, edit "+file.split('/').slice(-1)[0].yellow+" and add the following 'x-api-id' line:");
          exampleId(apiId, file);

          console.log("");
          console.log("Make sure you commit the changes so your team is all using the same ID.");

          process.exit();
        } else {

          if(utils.addId(file, apiId)) {
            console.log("Success! ".green + "We added it to your Swagger file! Make sure you commit the changes so your team is all using the same ID.");
            console.log("");
            swagger['x-api-id'] = apiId;
          } else {
            console.log("We weren't able to add the ID automatically. In "+file.split('/').slice(-1)[0].yellow+", add the following 'x-api-id' line:");

            exampleId(apiId, file);

            console.log("Make sure you commit the changes so your team is all using the same ID.");

            process.exit();
          }

        }
      }

      utils.removeMetadata(swagger);

      info.swagger = swagger;

      if(actionObj.swaggerUrl) {
        utils.getSwaggerUrl(config, info, function(url) {
          info.swaggerUrl = url;
          actionObj.run(config, info);
        });
      } else {
        actionObj.run(config, info);
      }
    });
  } else {
    actionObj.run(config, info);
  }

};

exports.load = function(action) {
  if(!action) action = 'help';

  var file = path.join(__dirname, 'lib', `${action}.js`);
  if(utils.fileExists(file)) {
    return require(file);
  }

  var alias = utils.getAliasFile(action);
  if(alias) {
    var file = path.join(__dirname, 'lib', `${alias}.js`);
    return require(file);
  }

  console.log('Action not found.'.red);
  console.log('Type ' + 'api help'.yellow + ' to see all commands');
  process.exit();
};

function exampleId(file, apiId) {
  if(file.match(/json$/)) {
    console.log("");
    console.log("    {".grey);
    console.log("      \"swagger\": \"2.0\",".grey);
    console.log("      \"x-api-id\": \""+apiId+"\",");
    console.log("      \"info\": {".grey);
    console.log("      ...".grey);
  } else {
    console.log("");
    console.log("    swagger: \"2.0\"".grey);
    console.log("    x-api-id: \""+apiId+"\"");
    console.log("    info:".grey);
    console.log("      ...".grey);
  }
};

