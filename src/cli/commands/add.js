const request = require('request');
const jsonfile = require('jsonfile');

exports.swagger = true;
exports.login = true;
exports.desc = 'Add a user';

exports.run = function (config, info) {
  const email = info.args[1];
  console.log(`Granting ${email.yellow} push access to ${info.swagger['x-api-id'].yellow}!`);
  console.log('');

  const user = jsonfile.readFileSync(config.apiFile);

  request.post(
    `${config.host.url}/add`,
    {
      form: {
        user: user.token,
        email,
        repo: info.swagger['x-api-id'],
      },
    },
    function () {
      console.log(`${'Success! '.green}User has been added.`);
      process.exit();
    }
  );
};
