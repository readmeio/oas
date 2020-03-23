const open = require('open');

exports.swagger = true;
exports.swaggerUrl = true;
exports.login = true;
exports.desc = 'Get a public URL for your API';
exports.category = 'services';

exports.run = function (config, info) {
  console.log('');
  console.log(`${'Success! '.green}You can now access your Swagger from the following publicly sharable URL:`);
  console.log('');
  console.log(`  ${info.swaggerUrl}`);
  console.log('');
  console.log('You can also use .yaml to get the YAML representation.'.grey);

  open(info.swaggerUrl, { url: true });

  process.exit();
};
