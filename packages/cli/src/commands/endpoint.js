require('colors');
const utils = require('../lib/utils');

exports.swagger = false;
exports.login = false;
exports.category = 'basic';
exports.desc = 'Learn how to document an endpoint';
exports.weight = 3;

exports.run = function () {
  console.log('You can document each endpoint right above the code. Just use the');
  console.log('following syntax in a comment above the code:');
  console.log('');

  console.log(utils.swaggerInlineExample(utils.guessLanguage()));

  console.log('');
  console.log(`${'Param shorthand: '.blue}Since params are very verbose, we have a shorthand`);
  console.log('for describing them.');

  console.log('');
  console.log('  - (in) name=default* {type:format} description'.grey);
  console.log('');

  console.log('This will be expanded when the Swagger file is compiled.');

  console.log('');
  console.log('For more information on this syntax, see https://github.com/readmeio/swagger-inline');

  process.exit();
};
