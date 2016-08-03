var _ = require('lodash');
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

  request.post(config.mock.url + '/upload', {
    'form': {
      'swagger': JSON.stringify(info.swagger),
    },
    json: true
  }, function(err, res, data) {
    var samples = [];
    _.each(info.swagger.paths, function(types, path) {
      _.each(types, function(endpoint, type) {
        if(['get', 'post'].indexOf(type.toLowerCase()) >= 0) {
          samples.push([type, path]);
        }
      });
    });

    console.log("Success!".green.bold + " You now have an API you can test against:");
    console.log("");
    console.log("  " + data.url);
    console.log("");
    if(samples.length) {
      console.log("Here's some example URLs you can try:");
      console.log("");
      _.each(samples, function(s) {
        console.log(("  ["+s[0] +"] " + data.url + (info.swagger.basePath || "") + s[1]).grey);
      });
    }
  });
};
