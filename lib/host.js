var request = require('request');

/*
 * This will completely change 100%, and all files
 * uploaded to apis.host will be removed! It's just
 * a placeholder to kinda have something that works.
 */

exports.run = function(config, swagger) {
  console.log('Uploading Swagger file...');

  request.post(config.host.url + '/save.php', {
    'form': {
      'swagger': JSON.stringify(swagger),
    }
  }, function(err, res, data) {
    console.log(data);
  });
};
