exports.swagger = true;
exports.login = true;

exports.run = function(config, info) {
  console.log('SWAGGER', info.swagger);
  console.log('TOKEN', info.token);
};
