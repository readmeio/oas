const fs = require('fs');

const cardinal = require('cardinal');
const chalk = require('chalk');
const glob = require('glob');
const OASNormalize = require('oas-normalize').default;
const swaggerInline = require('swagger-inline');

exports.findSwagger = async function (info, cb) {
  const file = info.args[info.args.length - 1];
  const base = exports.isJSONOrYaml(file) ? file : undefined;

  if (!base) {
    console.error(
      `You must pass a base OpenAPI or Swagger definition into ${chalk.yellow('oas generate')} to build off of.`
    );

    console.error('');
    console.error('This base specification might look like the following:');
    console.error(
      cardinal.highlight(
        JSON.stringify(
          {
            openapi: '3.0.3',
            info: {
              title: 'Example OpenAPI base file for `oas`.',
              version: '1.0',
            },
            servers: [
              {
                url: 'https://api.example.com',
              },
            ],
          },
          null,
          2
        )
      )
    );

    console.error('');
    console.error(
      `And supply that to ${chalk.yellow('oas generate')} as ${chalk.yellow('oas generate openapiBase.json')}`
    );
    process.exit(1);
  }

  let pathGlob = info.opts.pathGlob || '**/*';
  if (info.opts.path) {
    pathGlob = `${info.opts.path.replace(/\/$/, '')}/*`;
  }

  const generatedDefinition = await swaggerInline(pathGlob, {
    format: '.json',
    scope: info.opts.scope,
    base,
    pattern: info.opts.pattern || null,
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });

  let oas = new OASNormalize(generatedDefinition);
  const bundledDefinition = await oas.bundle().catch(err => {
    console.error(err.message);
    process.exit(1);
  });

  oas = new OASNormalize(bundledDefinition, { colorizeErrors: true });
  await oas
    .validate()
    .then(schema => cb(undefined, schema))
    .catch(err => {
      if (info.opts.v) {
        console.log(cardinal.highlight(generatedDefinition));
      }

      console.log('');
      console.log(
        [
          chalk.red('Error validating the API definition!'),
          !info.opts.v ? `Run with ${chalk.grey('-v')} to see the invalid definition.` : '',
        ].join(' ')
      );
      console.log('');

      console.log(err.message);
      console.log('');
      process.exit(1);
    });
};

exports.isJSONOrYaml = function (file) {
  return Boolean(['.json', '.yaml', '.yml'].map(ext => file.endsWith(ext)).filter(Boolean).length);
};

exports.fileExists = function (file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
};

/**
 * Really simple way at guessing the language that their API might be written in. If we're wrong,
 * it's not a big deal!
 *
 * @returns {String}
 */
exports.guessLanguage = function () {
  let language = 'js';
  let languages = {
    rb: 0,
    coffee: 0,
    py: 0,
    js: 0,
    java: 0,
    php: 0,
    go: 0,
  };

  const files = glob.sync('*');
  files.forEach(function (f) {
    const ext = f.split('.').slice(-1)[0];
    if (typeof languages[ext] !== 'undefined') {
      languages[ext] += 1;
    }
  });

  languages = Object.entries(languages).filter(lang => lang[1] > 0);
  if (languages.length > 0) {
    languages.sort(function (a, b) {
      if (a[1] > b[1]) return 1;
      return b[1] > a[1] ? -1 : 0;
    });

    languages.reverse();

    language = languages.shift()[0];
  }

  return language;
};

exports.swaggerInlineExample = function (lang) {
  const prefix = '  ';

  const annotation = [
    '@oas [get] /pet/{petId}',
    'description: Returns all pets from the system that the user has access to',
    'parameters:',
    '  - (path) petId=2* {Integer} The pet ID',
    '  - (query) limit {Integer:int32} The number of resources to return',
  ];

  const languages = {
    js: ['/*', ' * ', ' */', 'route.get("/pet/:petId", pet.show);'],
    jsx: ['/*', ' * ', ' */', 'route.get("/pet/:petId", pet.show);'],
    ts: ['/*', ' * ', ' */', 'route.get("/pet/:petId", pet.show);'],
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

  const out = [`${prefix}${chalk.cyan(language[0])}`];

  annotation.forEach(function (line) {
    out.push(`${prefix}${chalk.cyan(language[1])}${chalk.cyan(line)}`);
  });

  out.push(`${prefix}${chalk.cyan(language[2])}`);
  out.push(`${prefix}${chalk.grey(language[3])}`);

  return out.join('\n');
};
