var colors = require('colors');
var inquirer = require('inquirer');
var fs = require('fs');
var crypto = require('crypto');
var YAML = require('json2yaml');
var utils = require('../utils');

exports.swagger = false;
exports.login = false;
exports.category = "basic";
exports.desc = "Create a new API specification";

var types = [
  { "name": "application/json", "checked": true },
  { "name": "application/xml" },
  { "name": "application/x-www-form-urlencoded" },
  { "name": "multipart/form-data" },
];

exports.run = function(config, info) {

  console.log("This will help you set up an 'Open API' (formerly 'Swagger') file in your");
  console.log("repo, so you can start documenting your API!");

  console.log("");

  var questions = [
    {
      type: 'input',
      name: 'info.title',
      message: 'Name of the API',
      default: process.cwd().split('/').slice(-1)[0],
    },
    {
      type: 'input',
      name: 'info.version',
      message: 'Version number',
      default: '1.0.0',
    },
    {
      type: 'input',
      name: 'info.license',
      message: 'License',
    },
    {
      type: 'input',
      name: 'url',
      message: 'Full Base URL',
      validate: function (value) {
        var pass = /^(http|https|ws|wss):\/\/[^ "]+$/.test(value);

        if (pass) {
          return true;
        }

        return 'Please enter a valid URL, including protocol';
      }
    },
    {
      type: 'checkbox',
      name: 'consumes',
      message: 'Consumes content types',
      choices: types,
    },
    {
      type: 'checkbox',
      name: 'produces',
      message: 'Produces content types',
      choices: types,
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output JSON or YAML file',
      default: getDefaultSwagger(),
      choices: types,
      validate: function (value) {
        var pass = /.(json|yaml|yml)$/.test(value);
        var doesntExist = !utils.fileExists(value);

        if (pass && doesntExist) {
          return true;
        }

        if(!pass) {
          return 'Your file must end with .json or .yaml';
        }
        if(!doesntExist) {
          return 'This file already exists';
        }
      }
    }
  ];

  inquirer.prompt(questions).then(function (answers) {
    var swagger = {
      'swagger': '2.0',
      'x-api-id': crypto.randomBytes(15).toString('hex'),
      'info': {
        'version': answers['info.version'],
        'title': answers['info.title'],
      },
    };

    if(answers['info.license']) {
      swagger.info.license = {
        'name': answers['info.license']
      };
    }

    if(answers.produces.length) {
      swagger.produces = answers.produces;
    }

    if(answers.consumes.length) {
      swagger.consumes = answers.consumes;
    }

    var url = answers.url.match(/^(.*):\/\/([^\/]*)(.*)?$/);
    swagger.schemes = [url[1]];
    swagger.host = url[2];
    if(url[3]) {
      swagger.basePath = url[3];
    }

    writeFile(answers.output, swagger);

    console.log("");
    console.log("======================");
    console.log("");
    console.log("SUCCESS!".green);
    console.log("");
    console.log("We've created your new Open API file at " + answers.output.yellow + ".");
    console.log("");
    console.log("You can document each endpoint right above the code. Just use the");
    console.log("following syntax in a comment above the code:");
    console.log("");

    console.log(utils.swaggerInlineExample(utils.guessLanguage()));

    console.log('');
    console.log('For more information on this syntax, see https://github.com/readmeio/swagger-inline');
    console.log('');
    console.log('To see what you can do with your API, type ' + 'api help'.yellow + '.');
    console.log('');
    console.log('');

    process.exit();
  });

};

function writeFile(output, swagger) {
  var body = JSON.stringify(swagger, undefined, 2)
  if(output.match(/.(yaml|yml)/)) {
    body = YAML.stringify(swagger);
    body = body.replace(/^\s\s/gm, '').replace(/^---\n/, '');
  }
  fs.writeFileSync(output, body)
}

function getDefaultSwagger() {
  var i = 0;
  while(file = utils.fileExists(_file(i))) {
    i++;
  }
  return _file(i);

  function _file(i) {
    return 'swagger' + (i ? i : '') + '.json';
  }
}

