const prompt = require('prompt-sync')();
const crypto = require('crypto');
const jsonfile = require('jsonfile');
const uslug = require('uslug');
const path = require('path');
const request = require('request');

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
    utils.findSwagger(info, function (err, swagger, file) {
      if (err) {
        console.error(err);
        return;
      }

      let apiId = swagger.info.title ? uslug(swagger.info.title) : crypto.randomBytes(7).toString('hex');

      request.get(`${config.host.url}/check/${apiId}`, { json: true }, (err, check) => {
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
