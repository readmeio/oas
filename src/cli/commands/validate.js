const chalk = require('chalk');

exports.swagger = true;
exports.desc = 'Validate your OpenAPI definition';

exports.run = function () {
  console.log(`${chalk.green('✔ Success!')} Your OpenAPI definition is valid!`);
  process.exit();
};
