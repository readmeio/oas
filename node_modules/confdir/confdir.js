// confDir
;(function() {
  var fs = require('fs');
  var path = require('path');

  exports = module.exports = function getConfDir(dir, mod, callback) {
    if (typeof mod != 'string' || /\//.test(mod)) {
      callback(new Error("Illegal argument 'modname'."));
      return;
    }

    var dirmod = '.' + mod;

    var lastResult = '';
    // find dirname by recursively walking up the path hierarchy
    function findDirRec(dir, callback) {
      var result = path.resolve(dir, dirmod);
      fs.stat(result, function stat(err, stat) {
        if (err || !stat.isDirectory()) {
          if (lastResult == result) {
            callback(new Error('No configuration directory found.'));
            return;
          }
          lastResult = result;
          findDirRec(path.resolve(dir, '..'), callback);
        } else {
          callback(null, result);
        }
      });
    }

    findDirRec(dir, callback);
  };
}).call(this);
