var fs = require("fs");
var cardinal = require("cardinal");
var os = require("os");
var path = require("path");
var glob = require("glob");
var figures = require("figures");
var open = require("open");
var jsonfile = require("jsonfile");

var _ = require("lodash");
var status = require("node-status");
var yaml = require("yamljs");
var request = require("request");

var swaggerInline = require("swagger-inline");
var OAS = require("oas-normalize");

exports.config = function(env) {
  var config = require("./config/" + (env || "config"));

  // TODO: Make config a JS file; do this there.
  config.apiFile = path.join(os.homedir(), ".api.json");

  return config;
};

exports.findSwagger = function(info, cb) {
  var base = exports.isSwagger(_.last(info.args))
    ? _.last(info.args)
    : undefined;

  swaggerInline("**/*", {
    format: ".json",
    metadata: true,
    base: base
  }).then(generatedSwaggerString => {
    var oas = new OAS(generatedSwaggerString);

    oas.load(function(err, schema) {
      if (!schema["x-si-base"]) {
        console.log("We couldn't find a Swagger file.".red);
        console.log(
          "Don't worry, it's easy to get started! Run " +
            "oas init".yellow +
            " to get started."
        );
        return process.exit(1);
      }

      oas.validate(function(err, generatedSwagger) {
        if (err) {
          if (info.opts.v) {
            console.log(cardinal.highlight(generatedSwaggerString));
          }

          console.log("");
          console.log("Error validating Swagger!".red);
          console.log("");

          if (!info.opts.v) {
            console.log(
              "Run with " + "-v".grey + " to see the invalid Swagger"
            );
            console.log("");
          }

          if (err.errors) {
            _.each(err.errors, function(detail) {
              var at =
                detail.path && detail.path.length
                  ? " (at " + detail.path.join(".") + ")"
                  : "";
              console.log(
                "  " + figures.cross.red + "  " + detail.message + at.grey
              );
            });
          } else {
            console.log(figures.cross.red + "  " + err.message);
          }
          console.log("");
          process.exit(1);
          return;
        }

        cb(
          undefined,
          JSON.parse(generatedSwaggerString),
          generatedSwagger["x-si-base"]
        );
      });
    });
  });
};

exports.getAliasFile = function(unknownAction) {
  var files = glob.sync(path.join(__dirname, "lib", "*"));
  var foundAction = false;
  _.each(files, function(file) {
    var actionInfo = require(file);
    if (actionInfo.aliases && actionInfo.aliases.indexOf(unknownAction) >= 0) {
      foundAction = file.match(/(\w+).js/)[1];
    }
  });
  return foundAction;
};

exports.removeMetadata = function(obj) {
  // x-si = swagger inline metadata
  for (prop in obj) {
    if (prop.substr(0, 5) === "x-si-") delete obj[prop];
    else if (typeof obj[prop] === "object") exports.removeMetadata(obj[prop]);
  }
};

exports.isSwagger = function(file) {
  var fileType = file.split(".").slice(-1)[0];
  return fileType === "json" || fileType === "yaml";
};

exports.addId = function(file, id) {
  var contents = fs.readFileSync(file, "utf8");
  var s = new RegExp(
    "^\\s*['\"]?(swagger)['\"]?:\\s*[\"']([^\"']*)[\"'].*$",
    "m"
  );
  if (!contents.match(s)) return false;

  contents = contents.replace(s, function(full, title, value) {
    var comma = "";
    if (file.match(/json$/) && !full.match(/,/)) {
      comma = ",";
    }
    return (
      full + comma + "\n" + full.replace(title, "x-api-id").replace(value, id)
    );
  });

  if (file.match(/json$/)) {
    try {
      JSON.parse(contents);
    } catch (e) {
      return false;
    }
  }

  try {
    fs.writeFileSync(file, contents, "utf8");
  } catch (e) {
    return false;
  }

  return true;
};

exports.fileExists = function(file) {
  try {
    return fs.statSync(file).isFile();
  } catch (err) {
    return false;
  }
};

exports.getSwaggerUrl = function(config, info, cb) {
  var status = exports.uploadAnimation();

  var user = jsonfile.readFileSync(config.apiFile);

  request.post(
    config.host.url + "/upload",
    {
      form: {
        swagger: JSON.stringify(info.swagger),
        cli: 1,
        user: user.token,
        "cli-tool-version": require("./package.json").version
      }
    },
    function(err, res, url) {
      if (!res) {
        status(false);
        console.log("");
        console.log("Error: ".red + "Could not reach server");
        return process.exit(1);
      }

      var isError = res.statusCode < 200 || res.statusCode >= 400;

      status(!isError);

      if (isError) {
        console.log("");
        console.log("Error: ".red + url);
        return process.exit(1);
      }

      if (res.headers.warning) {
        console.log("");
        console.log("Warning! ".yellow + res.headers.warning.yellow);
      }

      cb(url);
    }
  );
};

exports.uploadAnimation = function() {
  console.log("");
  var job = status.addItem("job", {
    steps: ["Swagger uploaded"]
  });

  status.start({
    interval: 200,
    pattern: "{spinner.green} Uploading your Swagger file..."
  });

  return function(success) {
    job.doneStep(success);
    status.stop();
  };
};

exports.guessLanguage = function(cb) {
  // Really simple way at guessing the language.
  // If we're wrong, it's not a big deal... and
  // way better than asking them what language
  // they're writing (since the UI was confusing).

  var language = "js";
  var languages = {
    rb: 0,
    coffee: 0,
    py: 0,
    js: 0,
    java: 0,
    php: 0,
    go: 0
  };

  var files = glob.sync("*");
  _.each(files, function(f) {
    var ext = f.split(".").slice(-1)[0];
    if (typeof languages[ext] !== "undefined") {
      languages[ext]++;
    }
  });

  _.each(languages, function(i, l) {
    if (i > languages[language]) {
      language = l;
    }
  });

  return language;
};

exports.open = function(url, info) {
  open(url);
};

exports.swaggerInlineExample = function(_lang) {
  var prefix = "    ";

  var annotation = [
    "@oas [get] /pet/{petId}",
    "description: Returns all pets from the system that the user has access to",
    "parameters:",
    "  - (path) petId=2* {Integer} The pet ID",
    "  - (query) limit {Integer:int32} The number of resources to return"
  ];

  var languages = {
    js: ["/*", " * ", " */", 'route.get("/pet/:petId", pet.show);'],
    java: ["/*", " * ", " */", "public String getPet(id) {"],
    php: ["/*", " * ", " */", "function showPet($id) {"],
    coffee: ["###", "", "###", "route.get '/pet/:petId', pet.show"],
    rb: ["=begin", "", "=end", "get '/pet/:petId' do"],
    py: ['"""', "", '"""', "def getPet(id):"],
    go: ["/*", " * ", " */", "func getPet(id) {"]
  };

  _lang = _lang.toLowerCase();
  if (!_lang || !languages[_lang]) _lang = "javascript";

  var lang = languages[_lang];

  var out = [prefix + lang[0].cyan];

  _.each(annotation, function(line) {
    out.push(prefix + lang[1].cyan + line.cyan);
  });

  out.push(prefix + lang[2].cyan);
  out.push(prefix + lang[3].grey);

  return out.join("\n");
};
