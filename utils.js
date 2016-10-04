var fs = require('fs');
var os = require('os');
var path = require('path');
var glob = require('glob')
var figures = require('figures');
var open = require('open');

var _ = require('lodash');
var status = require('node-status')
var swagger = require('swagger-parser');
var yaml = require('yamljs');
var request = require('request');
var swaggerInline = require('swagger-inline');

exports.config = function(env) {
  var config = require('./config/' + (env || 'config'));

  // TODO: Make config a JS file; do this there.
  config.apiFile = path.join(os.homedir(), '.api.json');

  return config;
};

exports.findSwagger = function(cb, opts) {
  opts = opts || {};

  swaggerInline('**/*', {
      format: '.json',
      metadata: true,
  }).then((generatedSwagger) => {
    generatedSwagger = JSON.parse(generatedSwagger);

    if(!generatedSwagger['x-si-base']) {
      console.log("We couldn't find a Swagger file.".red);
      console.log("Run " + "api init".yellow + " to get started.");
      process.exit();
    }

    swagger.validate(generatedSwagger, function(err, api) {
      if(err) {

        // TODO: We should go through the crappy validation stuff
        // and try to make it easier to understand

        console.log("");
        console.log("Error validating Swagger!".red);
        console.log("");
        if(err.details) {
          _.each(err.details, function(detail) {
            var at = detail.path && detail.path.length ? " (at " + detail.path.join('.') + ")" : "";
            console.log("  " + figures.cross.red + "  " + detail.message + at.grey);
        });
        } else {
          console.log(figures.cross.red + "  " + err.message);
        }
        console.log("");
        process.exit();
        return;
      }

      cb(undefined, generatedSwagger, generatedSwagger['x-si-base']);
    });
  });

};

exports.getAliasFile = function(unknownAction) {
  var files = glob.sync(path.join(__dirname, "lib", "*"));
  var foundAction = false;
  _.each(files, function(file) {
    var actionInfo = require(file);
    if(actionInfo.aliases && actionInfo.aliases.indexOf(unknownAction) >= 0) {
      foundAction = file.match(/(\w+).js/)[1];
    }
  });
  return foundAction;
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

exports.fileExists = function(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
};

exports.getSwaggerUrl = function(config, info, cb) {
  var status = exports.uploadAnimation();

  request.post(config.host.url + '/', {
    'form': {
      'swagger': JSON.stringify(info.swagger),
      'cli': 1,
    }
  }, function(err, res, url) {
    status(!!url);

    if(!url) {
      console.log("");
      console.log("There was an issue uploading your swagger file".red);
      return;
    }

    cb(url);

  });
};

exports.uploadAnimation = function() {
  console.log("");
  var job = status.addItem('job', {
    steps: [
      'Swagger uploaded!',
    ]
  });

  status.start({
      interval: 200,
      pattern: '{spinner.green} Uploading your Swagger file...',
  });

  return function(success) {
    job.doneStep(success);
    status.stop();
  };
};

exports.guessLanguage = function(cb) {
  // Really simple way at guessing the language.
  // If we're wrong, it's not a big deal... and
  // way better than asking them what language
  // they're writing (since the UI was confusing).

  var language = 'js';
  var languages = {
    rb: 0,
    coffee: 0,
    py: 0,
    js: 0,
    java: 0,
    php: 0,
    go: 0
  };

  var files = glob.sync("*");
  _.each(files, function(f) {
    var ext = f.split('.').slice(-1)[0];
    if(typeof languages[ext] !== 'undefined') {
      languages[ext]++;
    }
  });

  _.each(languages, function(i, l) {
    if(i > languages[language]) {
      language = l;
    }
  });

  return language;
};

exports.open = function(url, info) {
  open(url);
};

exports.swaggerInlineExample = function(_lang) {
  var prefix = '    ';

  var annotation = [
    '@api [get] /pet/{petId}',
    'description: "Returns all pets from the system that the user has access to"',
    'responses:',
    '  "200":',
    '    description: "A list of pets."',
    '    schema:',
    '      type: "String"',
  ];

  var languages = {
    'js': ['/*', ' * ', '*/', 'route.get("/pet/:petId", pet.show);'],
    'java': ['/*', ' * ', '*/', 'public String getPet(id) {'],
    'php': ['/*', ' * ', '*/', 'function showPet($id) {'],
    'coffee': ['###', '', '###', "route.get '/pet/:petId', pet.show"],
    'rb': ['=begin', '', '=end', "get '/pet/:petId' do"],
    'py': ['"""', '', '"""', "def getPet(id):"],
    'go': ['/*', ' * ', '*/', 'func getPet(id) {'],
  };

  _lang = _lang.toLowerCase();
  if(!_lang || !languages[_lang]) _lang = 'javascript';

  var lang = languages[_lang];

  var out = [
    prefix + lang[0].cyan,
  ];

  _.each(annotation, function(line) {
    out.push(prefix + lang[1].cyan + line.cyan);
  });

  out.push(prefix + lang[2].cyan);
  out.push(prefix + lang[3].grey);

  return out.join("\n");
}

