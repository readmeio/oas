var fs = require('fs');
var os = require('os');
var path = require('path');

var _ = require('lodash');
var git = require('git-utils');
var swagger = require('swagger-parser');
var yaml = require('yamljs');
var swaggerInline = require('swagger-inline');

exports.config = function(env) {
  var config = require('./config/' + (env || 'config'));

  // TODO: Make config a JS file; do this there.
  config.apiFile = path.join(os.homedir(), '.api.json');

  return config;
};

exports.findSwagger = function(cb, opts) {
  opts = opts || {};

  swaggerInline(['**/*.js'], { // TODO! Don't use just .js (Also... ignore node_modules, .git, etc?)
      format: '.json',
      metadata: true,
  }).then((generatedSwagger) => {
    generatedSwagger = JSON.parse(generatedSwagger);
    cb(undefined, generatedSwagger, generatedSwagger['x-si-base']); // TODO! We need to fix the file!
  });

};

exports.removeMetadata = function(obj) {
  for(prop in obj) {
    if (prop.substr(0, 5) === 'x-si-')
      delete obj[prop];
    else if (typeof obj[prop] === 'object')
      exports.removeMetadata(obj[prop]);
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
};

exports.addId = function(file, id) {
  var contents = fs.readFileSync(file, 'utf8');
  var s = new RegExp("^\\s*['\"]?(swagger)['\"]?:\\s*[\"']([^\"']*)[\"'].*$", "m");
  if(!contents.match(s)) return false;

  contents = contents.replace(s, function(full, title, value) {
    var comma = "";
    if(file.match(/json$/) && !full.match(/,/)) {
      comma = ","
    }
    return full + comma + "\n" + full.replace(title, 'x-api-id').replace(value, id);
  });

  if(file.match(/json$/)) {
    try {
      JSON.parse(content);
    } catch(e) {
      return false;
    }
  }

  try {
    fs.writeFileSync(file, contents, 'utf8');
  } catch(e) {
    return false;
  }

  return true;
};

