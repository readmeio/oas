var fs = require('fs');
var path = require('path');

var utils = require('./utils');

exports.actions = {
  'test': {swagger: true},
  'host': {swagger: true},
  'generate': {swagger: true},
};

exports.api = function(args, opts) {
  opts = opts || {};

  var action = args[0];
  var config = utils.config(opts.env);

  if(!(action in exports.actions)) {
    console.log('Action not found');
    return;
  }

  if(exports.actions[action].swagger) {
    utils.findSwagger(function(err, swagger) {
      if(err) {
        console.error(err);
        return;
      }

      if(!swagger) {
        console.log("We couldn't find a Swagger file. Let's set one up!");
        // TODO: Help them set it up
        return; // TODO: This is wrong
      }

      exports.load(action)(config, swagger);
    });
  } else {
    exports.load(action)(config);
  }
};

exports.load = function(action) {
  return require(path.join(__dirname, 'lib', `${action}.js`)).run;
};
