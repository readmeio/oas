const cardinal = require('cardinal');

exports.swagger = true;
exports.desc = 'Output your OpenAPI definition (use --pretty for colors)';

exports.run = function (info) {
  if (info.opts.pretty || info.opts.p) {
    console.log(cardinal.highlight(JSON.stringify(info.swagger, undefined, 2)));
  } else {
    console.log(JSON.stringify(info.swagger, undefined, 2));
  }

  process.exit();
};
