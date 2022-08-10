const chalk = require('chalk');

const utils = require('../lib/utils');

exports.swagger = false;
exports.desc = 'Learn how to document an endpoint';
exports.weight = 3;

exports.run = function () {
  console.log('You can document each API endpoint right alongside your code!');
  console.log('');
  console.log('Use the following syntax in a comment block above the the code:');
  console.log('');

  console.log(utils.swaggerInlineExample(utils.guessLanguage()));

  console.log('');
  console.log(`${chalk.blue('Parameter shorthand:')} Since parameters can be very verbose, we have a shorthand`);
  console.log('syntax for describing them.');

  console.log('');
  console.log(chalk.grey('  - (in) name=default* {type:format} description'));
  console.log('');

  console.log('This will be expanded when the OpenAPI definition is compiled.');

  console.log('');
  console.log(`For more information on this syntax, see ${chalk.yellow('https://github.com/readmeio/swagger-inline')}`);

  process.exit();
};
