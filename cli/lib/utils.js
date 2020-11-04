const pkg = require('../../package.json');
const fs = require('fs');
const cardinal = require('cardinal');
const os = require('os');
const path = require('path');
const glob = require('glob');
const figures = require('figures');
const jsonfile = require('jsonfile');

const _ = require('lodash');
const status = require('node-status');
const request = require('request');

const swaggerInline = require('swagger-inline');
const OAS = require('oas-normalize');

exports.config = function (env) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const config = require(`../config/${env || 'config'}`);

  config.apiFile = path.join(os.homedir(), '.api.json');

  return config;
};

exports.findSwagger = function (info, cb) {
  const base = exports.isSwagger(_.last(info.args)) ? _.last(info.args) : undefined;

  swaggerInline('**/*', {
    format: '.json',
    metadata: true,
    scope: info.opts.scope,
    base,
  }).then(generatedSwaggerString => {
    const oas = new OAS(generatedSwaggerString);

    oas.bundle(function (err, schema) {
      // Log as much of the error as possible for more helpful debugging.
      if (err) {
        const { code, message, source, stack } = err;

        console.log(code);
        console.log(message);
        console.log(source);
        console.log(stack);

        process.exit(1);
      }

      if (!schema['x-si-base']) {
        console.log("We couldn't find a Swagger file.".red);
        console.log(`Don't worry, it's easy to get started! Run ${'oas init'.yellow} to get started.`);
        process.exit(1);
      }

      oas.validate(function (err, generatedSwagger) {
        if (err) {
          if (info.opts.v) {
            console.log(cardinal.highlight(generatedSwaggerString));
          }

          console.log('');
          console.log('Error validating Swagger!'.red);
          console.log('');

          if (!info.opts.v) {
            console.log(`Run with ${'-v'.grey} to see the invalid Swagger`);
            console.log('');
          }

          if (err.errors) {
            _.each(err.errors, function (detail) {
              const at = detail.path && detail.path.length ? ` (at ${detail.path.join('.')})` : '';
              console.log(`  ${figures.cross.red}  ${detail.message}${at.grey}`);
            });
          } else {
            console.log(`${figures.cross.red}  ${err.message}`);
          }
          console.log('');
          process.exit(1);
        }

        cb(undefined, schema, generatedSwagger['x-si-base']);
      });
    });
  });
};

exports.getAliasFile = function (unknownAction) {
  const files = glob.sync(path.join(__dirname, 'lib', '*'));
  let foundAction = false;
  _.each(files, function (file) {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const actionInfo = require(file);
    if (actionInfo.aliases && actionInfo.aliases.indexOf(unknownAction) >= 0) {
      foundAction = file.match(/(\w+).js/)[1];
    }
  });
  return foundAction;
};

exports.removeMetadata = function (obj) {
  // x-si = swagger inline metadata
  // eslint-disable-next-line no-restricted-syntax, no-undef
  for (prop in obj) {
    // eslint-disable-next-line no-undef
    if (prop.substr(0, 5) === 'x-si-') delete obj[prop];
    // eslint-disable-next-line no-undef
    else if (typeof obj[prop] === 'object') exports.removeMetadata(obj[prop]);
  }
};

exports.isSwagger = function (file) {
  const fileType = file.split('.').slice(-1)[0];
  return fileType === 'json' || fileType === 'yaml';
};

exports.fileExists = function (file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
};

exports.getSwaggerUrl = function (config, info, cb) {
  const uploadStatus = exports.uploadAnimation();

  const user = jsonfile.readFileSync(config.apiFile);

  request.post(
    `${config.host.url}/upload`,
    {
      form: {
        swagger: JSON.stringify(info.swagger),
        cli: 1,
        user: user.token,
        'cli-tool-version': pkg.version,
      },
    },
    function (err, res, url) {
      if (!res) {
        uploadStatus(false);
        console.log('');
        console.log(`${'Error: '.red}Could not reach server`);
        return process.exit(1);
      }

      const isError = res.statusCode < 200 || res.statusCode >= 400;

      uploadStatus(!isError);

      if (isError) {
        console.log('');
        console.log('Error: '.red + url);
        return process.exit(1);
      }

      if (res.headers.warning) {
        console.log('');
        console.log('Warning! '.yellow + res.headers.warning.yellow);
      }

      return cb(url);
    }
  );
};

exports.uploadAnimation = function () {
  console.log('');
  const job = status.addItem('job', {
    steps: ['Swagger uploaded'],
  });

  status.start({
    interval: 200,
    pattern: '{spinner.green} Uploading your Swagger file...',
  });

  return function (success) {
    job.doneStep(success);
    status.stop();
  };
};

exports.guessLanguage = function () {
  // Really simple way at guessing the language.
  // If we're wrong, it's not a big deal... and
  // way better than asking them what language
  // they're writing (since the UI was confusing).

  let language = 'js';
  const languages = {
    rb: 0,
    coffee: 0,
    py: 0,
    js: 0,
    java: 0,
    php: 0,
    go: 0,
  };

  const files = glob.sync('*');
  _.each(files, function (f) {
    const ext = f.split('.').slice(-1)[0];
    if (typeof languages[ext] !== 'undefined') {
      languages[ext] += 1;
    }
  });

  _.each(languages, function (i, l) {
    if (i > languages[language]) {
      language = l;
    }
  });

  return language;
};

exports.swaggerInlineExample = function (lang) {
  const prefix = '    ';

  const annotation = [
    '@oas [get] /pet/{petId}',
    'description: Returns all pets from the system that the user has access to',
    'parameters:',
    '  - (path) petId=2* {Integer} The pet ID',
    '  - (query) limit {Integer:int32} The number of resources to return',
  ];

  const languages = {
    js: ['/*', ' * ', ' */', 'route.get("/pet/:petId", pet.show);'],
    java: ['/*', ' * ', ' */', 'public String getPet(id) {'],
    php: ['/*', ' * ', ' */', 'function showPet($id) {'],
    coffee: ['###', '', '###', "route.get '/pet/:petId', pet.show"],
    rb: ['=begin', '', '=end', "get '/pet/:petId' do"],
    py: ['"""', '', '"""', 'def getPet(id):'],
    go: ['/*', ' * ', ' */', 'func getPet(id) {'],
  };

  lang = lang.toLowerCase();
  if (!lang || !languages[lang]) lang = 'javascript';

  const language = languages[lang];

  const out = [prefix + language[0].cyan];

  _.each(annotation, function (line) {
    out.push(prefix + language[1].cyan + line.cyan);
  });

  out.push(prefix + language[2].cyan);
  out.push(prefix + language[3].grey);

  return out.join('\n');
};
