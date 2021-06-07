require('colors');
const fs = require('fs');
const cardinal = require('cardinal');
const glob = require('glob');
const swaggerInline = require('swagger-inline');
const OASNormalize = require('oas-normalize');

exports.findSwagger = async function (info, cb) {
  const file = info.args[info.args.length - 1];
  const base = exports.isJSONOrYaml(file) ? file : undefined;

  if (!base) {
    console.error(`You must pass a base OpenAPI or Swagger definition into ${'oas generate'.yellow} to build off of.`);
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
    console.error(`And supply that to ${'oas generate'.yellow} as ${'oas generate openapiBase.json'.yellow}`);
    process.exit(1);
  }

  let pathGlob = '**/*';
  if (info.opts.path) {
    pathGlob = `${info.opts.path.replace(/\/$/, '')}/*`;
  }

  const generatedDefinition = await swaggerInline(pathGlob, { format: '.json', scope: info.opts.scope, base }).catch(
    err => {
      console.error(err);
      process.exit(1);
    }
  );

  let oas = new OASNormalize(generatedDefinition);
  const bundledDefinition = await oas.bundle().catch(err => {
    console.error(err);
    process.exit(1);
  });

  oas = new OASNormalize(bundledDefinition);
  await oas
    .validate()
    .then(schema => cb(undefined, schema))
    .catch(err => {
      if (info.opts.v) {
        console.log(cardinal.highlight(generatedDefinition));
      }

      console.log('');
      console.log('Error validating the API definition!'.red);
      console.log('');

      if (!info.opts.v) {
        console.log(`Run with ${'-v'.grey} to see the invalid definition.`);
        console.log('');
      }

      if (err.errors) {
        err.errors.forEach(function (detail) {
          const at = detail.path && detail.path.length ? ` (at ${detail.path.join('.')})` : '';
          console.log(`  ${'✖'.red}  ${detail.message}${at.grey}`);
        });
      } else {
        console.log(`  ${'✖'.red}  ${err.message}`);
      }

      console.log('');
      process.exit(1);
    });
};

exports.isJSONOrYaml = function (file) {
  return ['json', 'yaml', 'yml'].includes(file.split('.').slice(-1)[0]);
};

exports.fileExists = function (file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
};

/**
 * Really simple way at guessing the language that their API might be written in. If we're wrong, it's not a big deal!
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

  const out = [prefix + language[0].cyan];

  annotation.forEach(function (line) {
    out.push(prefix + language[1].cyan + line.cyan);
  });

  out.push(prefix + language[2].cyan);
  out.push(prefix + language[3].grey);

  return out.join('\n');
};
