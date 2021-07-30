require('colors');
const glob = require('glob');
const path = require('path');

exports.swagger = false;
exports.desc = 'Learn what you can do with oas';
exports.weight = 2;

function pad(text) {
  return `${text}                          `.substr(0, 23);
}

exports.run = function () {
  console.log('');
  console.log('Usage: oas <command>');
  console.log('');

  const files = glob.sync(path.join(__dirname, '*'));
  const commands = [];

  files.forEach(function (file) {
    const action = file.match(/(\w+).js/)[1];

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const cmd = require(file);
    const desc = cmd.desc || '';

    let cmdUsage;
    if (cmd.swagger) {
      // eslint-disable-next-line sonarjs/no-nested-template-literals
      cmdUsage = `${pad(`${action} [oas.json]`)} ${desc.grey}`;
      cmdUsage = cmdUsage.replace(/\[oas\.json\]/, '[oas.json]'.grey);
    } else {
      cmdUsage = `${pad(action)} ${desc.grey}`;
    }

    commands.push({
      msg: `  ${'$'.grey} oas ${cmdUsage}`,
      weight: cmd.weight || 100,
    });
  });

  commands.sort((a, b) => {
    if (a.weight > b.weight) return 1;
    return b.weight > a.weight ? -1 : 0;
  });

  commands.forEach(function (command) {
    console.log(command.msg);
  });

  console.log('');
  console.log('Just getting started?'.green, `Run ${'oas init'.yellow} to create your OpenAPI definition.`);
  console.log('');

  process.exit();
};
