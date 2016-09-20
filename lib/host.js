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

  request.post(config.host.url + '/save.php', {
    'form': {
      'swagger': JSON.stringify(info.swagger),
    }
  }, function(err, res, data) {
    console.log(err, data);
  });
};
