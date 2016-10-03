exports.swagger = true;
exports.login = true;
exports.desc = "Internal use, will be deleted soon :)";

exports.run = function(config, info) {
  console.log('SWAGGER', info.swagger);
  console.log('TOKEN', info.token);
};
