var jsonfile = require('jsonfile')
var open = require('open');

exports.swagger = false;
exports.login = false;
exports.desc = "Authenticate this computer";
exports.category = "utility";

exports.run = function(config, info) {
  if(info.args[1] == 'info') {
    try {
      var user = jsonfile.readFileSync(config.apiFile);
    } catch(e) {
      console.log("You aren't logged in");
    }
    open('http://www.apis.host/info?token=' + user.token);

    return;
  }
  var apiFile = config.apiFile;
  var settings = {
    token: require('crypto').randomBytes(15).toString('hex'),
  };

  jsonfile.writeFileSync(apiFile, settings)

  open('http://www.apis.host/login?token=' + settings.token);

  process.exit();
};
