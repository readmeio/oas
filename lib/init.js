var colors = require("colors");
var path = require("path");
var inquirer = require("inquirer");
var fs = require("fs");
var crypto = require("crypto");
var YAML = require("json2yaml");
var utils = require("../utils");
var uslug = require("uslug");

exports.swagger = false;
exports.login = false;
exports.category = "basic";
exports.desc = "Create a new API specification";
exports.weight = 0;

exports.run = function(config, info) {
  console.log(
    `This will help you set up an ${
      "OpenAPI 3.0 Spec".cyan
    } (formerly Swagger) in your`
  );
  console.log("repo, so you can start documenting your API!");

  console.log("");

  var pkg = {};
  if (fs.existsSync("./package.json")) {
    pkg = require(path.join(process.cwd(), "/package.json"));
  }

  var questions = [
    {
      type: "input",
      name: "info.title",
      message: "Name of the API",
      default:
        pkg.name ||
        process
          .cwd()
          .split("/")
          .slice(-1)[0]
    },
    {
      type: "input",
      name: "info.version",
      message: "Version number",
      default: pkg.version || "1.0.0"
    },
    {
      type: "input",
      name: "info.license",
      message: "License",
      default: pkg.license
    },
    {
      type: "input",
      name: "url",
      message: "Full Base URL",
      validate: function(value) {
        var pass = /^(http|https|ws|wss):\/\/[^ "]+$/.test(value);

        if (pass) {
          return true;
        }

        return "Please enter a valid URL, including protocol";
      }
    },
    {
      type: "input",
      name: "output",
      message: "Output JSON or YAML file",
      default: getDefaultSwagger(),
      validate: function(value) {
        var pass = /.(json|yaml|yml)$/.test(value);
        var doesntExist = !utils.fileExists(value);

        if (pass && doesntExist) {
          return true;
        }

        if (!pass) {
          return "Your file must end with .json or .yaml";
        }
        if (!doesntExist) {
          return "This file already exists";
        }
      }
    }
  ];

  inquirer.prompt(questions).then(function(answers) {
    var swagger = {
      openapi: "3.0.0",
      "x-api-id":
        uslug(answers["info.title"]) || crypto.randomBytes(7).toString("hex"),
      info: {
        version: answers["info.version"],
        title: answers["info.title"]
      },
      servers: [
        {
          url: answers.url
        }
      ],
      //'paths': '**/*',
      paths: {}
    };

    if (answers["info.license"]) {
      swagger.info.license = {
        name: answers["info.license"]
      };
    }

    writeFile(answers.output, swagger);

    console.log("");
    console.log("======================");
    console.log("");
    console.log("SUCCESS!".green);
    console.log("");
    console.log(
      "We've created your new Open API file at " + answers.output.yellow + "."
    );
    console.log("");
    console.log(
      "You can document each endpoint right above the code. Just use the"
    );
    console.log("following syntax in a comment above the code:");
    console.log("");

    console.log(utils.swaggerInlineExample(utils.guessLanguage()));

    console.log("");
    console.log(
      "For more information on this syntax, see https://github.com/readmeio/swagger-inline"
    );
    console.log("");
    console.log(
      "To see what you can do with your API, type " + "oas help".yellow + "."
    );
    console.log("");
    console.log(
      "To generate an OAS file, type " +
        "oas generate".yellow +
        ". To publish it, type " +
        "oas host".yellow +
        "!"
    );
    console.log("");

    process.exit();
  });
};

function writeFile(output, swagger) {
  var body = JSON.stringify(swagger, undefined, 2);
  if (output.match(/.(yaml|yml)/)) {
    body = YAML.stringify(swagger);
    body = body.replace(/^\s\s/gm, "").replace(/^---\n/, "");
  }
  fs.writeFileSync(output, body);
}

function getDefaultSwagger() {
  var i = 0;
  while ((file = utils.fileExists(_file(i)))) {
    i++;
  }
  return _file(i);

  function _file(i) {
    return "swagger" + (i ? i : "") + ".json";
  }
}
