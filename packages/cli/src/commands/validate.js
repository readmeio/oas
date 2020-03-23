const figures = require('figures');

exports.swagger = true;
exports.login = false;
exports.desc = 'Validate your Swagger file';
exports.category = 'utility';

exports.run = function () {
  console.log(`${figures.tick.green + ' Success!'.green} Valid Swagger file`);
  process.exit();
};
