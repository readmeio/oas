var jsonfile = require('jsonfile')
var open = require('open');

exports.run = function(config, info) {
  var apiFile = config.apiFile;
  var settings = {
    token: require('crypto').randomBytes(48).toString('hex'),
  };

  jsonfile.writeFileSync(apiFile, settings)

  open('http://apis.host/login.php?token=' + settings.token);
};
