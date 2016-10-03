exports.swagger = true;
exports.login = false;

exports.run = function(config, info) {
  console.log(JSON.stringify(info.swagger, undefined, 2));
};
