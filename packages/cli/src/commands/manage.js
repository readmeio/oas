require('colors');

exports.swagger = false;
exports.login = false;
exports.category = 'utility';
exports.desc = 'Manage users and versions';

exports.run = function () {
  console.log('You can modify your settings from here!');
  console.log('');
  console.log('GRANT PUSH ACCESS'.cyan);
  console.log('Run the following command to add them (must match their GitHub email):');
  console.log('');
  console.log('  $ oas add user@email.com'.grey);
  console.log('');
  console.log('');

  process.exit();
};
