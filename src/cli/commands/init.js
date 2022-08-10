const fs = require('fs');
const path = require('path');

const chalk = require('chalk');
const inquirer = require('inquirer');
const YAML = require('json2yaml');

const utils = require('../lib/utils');

exports.swagger = false;
exports.desc = 'Create a new OpenAPI definition';
exports.weight = 1;

function writeFile(output, swagger) {
  let body = JSON.stringify(swagger, undefined, 2);
  if (output.match(/.(yaml|yml)/)) {
    body = YAML.stringify(swagger);
    body = body.replace(/^\s\s/gm, '').replace(/^---\n/, '');
  }
  fs.writeFileSync(output, body);
}

exports.run = function () {
  console.log(`This will help you set up an ${chalk.cyan('OpenAPI 3.0 Definition')} in your codebase, so`);
  console.log('you can start documenting your API!');
  console.log('');

  let pkg = {};
  if (fs.existsSync('./package.json')) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    pkg = require(path.join(process.cwd(), '/package.json'));
  }

  const questions = [
    {
      type: 'input',
      name: 'info.title',
      message: 'Name of the API',
      default: pkg.name || process.cwd().split('/').slice(-1)[0],
    },
    {
      type: 'input',
      name: 'info.version',
      message: 'Version number',
      default: pkg.version || '1.0.0',
    },
    {
      type: 'input',
      name: 'info.license',
      message: 'License',
      default: pkg.license,
    },
    {
      type: 'input',
      name: 'url',
      message: 'Full Base URL',
      validate(value) {
        const pass = /^(http|https|ws|wss):\/\/[^ "]+$/.test(value);
        if (pass) {
          return true;
        }

        return 'Please enter a valid URL, including the protocol.';
      },
    },
    {
      type: 'input',
      name: 'output',
      message: 'Output JSON or YAML file',
      validate(value) {
        const pass = /.(json|yaml|yml)$/.test(value);
        const doesntExist = !utils.fileExists(value);

        if (pass && doesntExist) {
          return true;
        }

        if (!pass) {
          return 'Your file must end with .json or .yaml';
        }

        return 'This file already exists';
      },
    },
  ];

  inquirer.prompt(questions).then(function (answers) {
    const swagger = {
      openapi: '3.0.0',
      info: {
        version: answers.info.version,
        title: answers.info.title,
      },
      servers: [
        {
          url: answers.url,
        },
      ],
      paths: {},
    };

    if (answers.info.license) {
      swagger.info.license = {
        name: answers.info.license,
      };
    }

    writeFile(answers.output, swagger);

    console.log('');
    console.log('======================');
    console.log('');
    console.log(chalk.green('SUCCESS!'));
    console.log('');
    console.log(`We've created your new OpenAPI file at ${chalk.yellow(answers.output)}.`);
    console.log('');
    console.log('You can document each endpoint right above the code. Just use the');
    console.log('following syntax in a comment above the code:');
    console.log('');

    console.log(utils.swaggerInlineExample(utils.guessLanguage()));

    console.log('');
    console.log('For more information on this syntax, see https://github.com/readmeio/swagger-inline');
    console.log('');
    console.log(`To see what you can do with your API, type ${chalk.yellow('oas help')}.`);
    console.log('');
    console.log(
      `To generate an OAS file, type ${chalk.yellow('oas generate')}. To publish it, type ${chalk.yellow('oas host')}!`
    );
    console.log('');

    process.exit();
  });
};
