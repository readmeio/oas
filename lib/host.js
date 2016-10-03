var request = require('request');

exports.swagger = true;
exports.login = true;

/*
 * This will completely change 100%, and all files
 * uploaded to apis.host will be removed! It's just
 * a placeholder to kinda have something that works.
 */

exports.run = function(config, info) {
  console.log('Uploading Swagger file...');

  request.post(config.host.url + '/', {
    'form': {
      'swagger': JSON.stringify(info.swagger),
      'cli': 1,
    }
  }, function(err, res, url) {
    console.log("");
    console.log("You can now access your Swagger from the following public URL:");
    console.log("");
    console.log("  " + url);
    console.log("");
    console.log("(You can also use .yaml to get the YAML representation.)");
  });
};
