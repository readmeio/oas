const jsonfile = require('jsonfile');
const open = require('open');
const crypto = require('crypto');

exports.swagger = false;
exports.login = false;
exports.desc = 'Authenticate this computer';
exports.category = 'utility';

exports.run = function (config, info) {
  if (info.args[1] === 'info') {
    let user;
    try {
      user = jsonfile.readFileSync(config.apiFile);
    } catch (e) {
      console.log("You aren't logged in");
    }
    open(`${config.host.url}/info?token=${user.token}`, { url: true });

    process.exit();
  }
  const apiFile = config.apiFile;
  const settings = {
    token: crypto.randomBytes(15).toString('hex'),
  };

  jsonfile.writeFileSync(apiFile, settings);

  open(`${config.host.url}/login?token=${settings.token}`, { url: true });

  process.exit();
};
