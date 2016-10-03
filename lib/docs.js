var request = require('request');

exports.swagger = true;
exports.login = true;
exports.desc = "Upload your docs to ReadMe.io";

exports.run = function(config, info) {
  console.log('Uploading Swagger file...');

  request.post(config.host.url + '/', {
    'form': {
      'swagger': JSON.stringify(info.swagger),
      'cli': 1,
    }
  }, function(err, res, url) {
    console.log("https://swagger.readme.io/preview/" + new Buffer(url).toString('base64'));
  });
};
