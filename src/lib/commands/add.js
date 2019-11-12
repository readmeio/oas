var request = require("request");
var jsonfile = require("jsonfile");

exports.swagger = true;
exports.login = true;
exports.desc = "Add a user";

exports.run = function(config, info) {
  var email = info.args[1];
  console.log(
    "Granting " +
      email.yellow +
      " push access to " +
      info.swagger["x-api-id"].yellow +
      "!"
  );
  console.log("");

  var user = jsonfile.readFileSync(config.apiFile);

  request.post(
    config.host.url + "/add",
    {
      form: {
        user: user.token,
        email: email,
        repo: info.swagger["x-api-id"]
      }
    },
    function() {
      console.log("Success! ".green + "User has been added.");
      process.exit();
    }
  );
};
