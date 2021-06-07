require('colors');

exports.swagger = true;
exports.desc = 'Validate your OpenAPI definition';

exports.run = function () {
  console.log(`${'✔'.green + ' Success!'.green} Your OpenAPI definition is valid!`);
  process.exit();
};
