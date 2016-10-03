var colors = require('colors');
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
      console.log('You need to login. ' + 'api login'.grey);
      return;
    }
  };
  
  if(actionObj.swagger) {
    utils.findSwagger(function(err, swagger, file) {
      if(err) {
        console.error(err);
        return;
      }

      if(!file) {
        console.log("We couldn't find a Swagger file. Let's set one up!");
        // TODO: Help them set it up
        return; // TODO: This is wrong
      }

      if(!swagger['x-api-id']) {
        console.log('Your Swagger file needs a unique "x-api-id" property to work. Do you want us to add it automatically?');
        // TODO: actually prompt

        var apiId = crypto.randomBytes(15).toString('hex');
        if(utils.addId(file, apiId)) {
          console.log("Okay, we added it to your Swagger file! Make sure you commit the changes so your team is all using the same ID.");
          swagger['x-api-id'] = apiId;
        } else {
          console.log("We weren't able to add the ID automatically. In "+file.split('/').slice(-1)[0].yellow+", add the following 'x-api-id' line:");

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
          return;
        }
      }

      utils.removeMetadata(swagger);

      info.swagger = swagger;
      actionObj.run(config, info);
    });
  } else {
    actionObj.run(config, info);
  }

};

exports.load = function(action) {
  //try {
    return require(path.join(__dirname, 'lib', `${action}.js`));
  //} catch(e) {
    //console.log('Action not found');
  //}
};

