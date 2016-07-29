var colors = require('colors');
var fs = require('fs');
var jsonfile = require('jsonfile');
var path = require('path');

var utils = require('./utils');

exports.api = function(args, opts) {
  opts = opts || {};

  var action = args[0];
  var config = utils.config(opts.env);

  var actionObj = exports.load(action);

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

      if(!swagger) {
        console.log("We couldn't find a Swagger file. Let's set one up!");
        // TODO: Help them set it up
        return; // TODO: This is wrong
      }

      if(!swagger['x-api-id']) {
        console.log('Setting up Swagger file...');
        if(!!file.match('yaml')) {
          console.log("YAML file");
          console.log(file);
          // TODO: APPEND ID
        } else if(!!file.match('json')) {
          console.log("JSON file");
          console.log(file);
          // TODO: APPEND ID
        }
      }

      info.swagger = swagger;
      actionObj.run(config, info);
    });
  } else {
    actionObj.run(config, info);
  }

};

exports.load = function(action) {
  try {
    return require(path.join(__dirname, 'lib', `${action}.js`));
  } catch(e) {
    console.log('Action not found');
  }
};

