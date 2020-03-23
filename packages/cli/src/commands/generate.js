const cardinal = require('cardinal');

exports.swagger = true;
exports.login = false;
exports.desc = 'Output your Swagger file (--pretty for colors)';
exports.category = 'utility';

exports.run = function (config, info) {
  if (info.opts.pretty || info.opts.p) {
    console.log(cardinal.highlight(JSON.stringify(info.swagger, undefined, 2)));
  } else {
    console.log(JSON.stringify(info.swagger, undefined, 2));
  }
  process.exit();
};
