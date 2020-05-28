const jsonfile = require('jsonfile');
const path = require('path');

const utils = require('./lib/utils');

exports.api = function (args, opts) {
  opts = opts || {};

  const action = args[0];
  const config = utils.config(opts.env);

  const actionObj = exports.load(action);

  if (!actionObj) {
    return;
  }

  const info = {
    args,
    opts,
  };

  if (actionObj.login) {
    try {
      const login = jsonfile.readFileSync(config.apiFile);
      info.token = login.token;
    } catch (e) {
      console.log('You need to log in to do this!'.red);
      console.log(`Run ${'oas login'.yellow}`);
      process.exit(1);
    }
  }

  if (actionObj.swagger) {
    utils.findSwagger(info, function (err, swagger) {
      if (err) {
        console.error(err);
        return;
      }

      utils.removeMetadata(swagger);

      info.swagger = swagger;

      if (actionObj.swaggerUrl) {
        utils.getSwaggerUrl(config, info, function (url) {
          info.swaggerUrl = url;
          actionObj.run(config, info);
        });
      } else {
        actionObj.run(config, info);
      }
    });
  } else {
    actionObj.run(config, info);
  }
};

exports.load = function (action = 'help') {
  let file = path.join(__dirname, 'commands', `${action}.js`);
  if (utils.fileExists(file)) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(file);
  }

  const alias = utils.getAliasFile(action);
  if (alias) {
    file = path.join(__dirname, 'commands', `${alias}.js`);
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(file);
  }

  console.log('Action not found.'.red);
  console.log(`Type ${'oas help'.yellow} to see all commands`);
  return process.exit(1);
};
