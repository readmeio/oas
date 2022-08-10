const path = require('path');

const chalk = require('chalk');

const utils = require('./lib/utils');

function loadAction(action = 'help') {
  const file = path.join(__dirname, 'commands', `${action}.js`);
  if (utils.fileExists(file)) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(file);
  }

  console.log(chalk.red('Action not found.'));
  console.log(`Type ${chalk.yellow('oas help')} to see all commands`);
  return process.exit(1);
}

module.exports = function (args, opts) {
  opts = opts || {};

  const cmd = loadAction(args[0]);
  if (!cmd) {
    return;
  }

  const info = {
    args,
    opts,
  };

  if (cmd.swagger) {
    utils.findSwagger(info, function (err, swagger) {
      if (err) {
        console.error(err);
        return;
      }

      info.swagger = swagger;

      cmd.run(info);
    });
  } else {
    cmd.run(info);
  }
};
