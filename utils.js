var fs = require('fs');
var path = require('path');

var _ = require('lodash');
var git = require('git-utils');
var swagger = require('swagger-parser');
var yaml = require('yamljs');

exports.config = function(env) {
  return require('./config/' + (env || 'config'));
}

exports.findSwagger = function(cb, opts) {
  opts = opts || {};

  var dir = opts.dir || process.cwd();
  /*
  // TODO: Maybe use the git root?
  if(!dir) {
    var repository = git.open(__dirname)
    dir = repository.getWorkingDirectory();
  }
  */

  var files = fs.readdirSync(dir).filter((file) => {
    if(!file.match(/\.(json|yaml)$/)) return false;
    return exports.isSwagger(path.join(dir, file));
  });

  // TODO: Give people an option if there's more than one Swagger file
  if(files[0]) {
    var file = path.join(dir, files[0]);
    swagger.bundle(file, function(err, api) {
      cb(err, api, file);
    });
  } else {
    cb();
  }
};

exports.isSwagger = function(file) {
  var fileType = file.split('.').slice(-1)[0];
  if(fileType == 'json') {
    try {
      var content = require(file);
      return content.swagger === "2.0";
    } catch(e) {}
  }

  if(fileType == 'yaml') {
    return yaml.load(file).swagger === "2.0";
  }

  return false;
}
