#!/usr/bin/env node

var confdir = require('confdir');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');

function die(log, err) {
  // ignore errors when closing log file
  try {
    log.closeSync(log);
  } catch (err) {}

  throw err;
}

confdir(process.cwd(), 'conf', function (err, confdir) {
  if (err)
    throw err;

  fs.readFile(path.resolve(confdir, 'api.json'), 'uft8', function (err, conf) {
    conf = JSON.parse(conf);

    conf.root = path.resolve(confdir, '..');

    var log = fs.createWriteStream(path.resolve(conf.root, conf.logFile),
      { flags: 'w' });
    var app = new require('api')(conf.protocol).Server();

    // error handling
    app.error = function error(code, req, resp) {
      resp.writeHead(code, { 'Content-Type': 'text/html' });
      fs.readFile(path.resolve(conf.root, conf.directories.templates,
          code+'.tpl'), 'uft8', function (err, tpl) {
        if (err)
          die(err);

        resp.end(ejs.render(tpl, { locals: { code: code, request: req } }));
        log.write('error: '+code+' '+req.url+'\n');
      });
    });

    // for every registered module
    conf.modules.forEach(function (mod) {
      var module = require(path.resolve(conf.root, conf.directories.modules,
          mod+'.js')

      // read module specific configuration file
      fs.readFile(path.resolve(confdir, mod+'.json'), 'utf8',
          function (err, data) {
        if (err)
          die(err);

        var modConf = JSON.parse(data);

        // hook module into app
        module(app, log, modConf, conf);
        console.log('Module '+mod+' up and running.');
      });
    });

    app.listen(conf.socket.path, function () {
      fs.chmod(conf.socket.path, conf.socket.permissions, function (err) {
        if (err)
          die(err);

        console.log('Server listening on '+socket+'.');
      });
    });
  });
});
