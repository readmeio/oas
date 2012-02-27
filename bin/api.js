#!/usr/bin/env node

var confdir = require('confdir');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');

confdir(process.cwd(), 'conf', function (err, confdir) {
  if (err)
    throw err;

  fs.readFile(path.resolve(confdir, 'api.json'), 'utf8',
      function (err, conf) {
    if (err)
      throw err;

    conf = JSON.parse(conf);

    conf.root = path.resolve(confdir, '..');

    // log file stream
    var logFile = path.resolve(conf.root, conf.logFile);
    var mode = 'w'; // create file by default
    // if file already exists, open it
    if (path.existsSync(logFile))
      mode = 'r+';

    // open log file stream
    var log = fs.createWriteStream(logFile, { flags: mode });

    var app = new require('api')(conf.protocol).Server();

    function die(err) {
      // ignore errors when closing log file
      try {
        log.closeSync(log);
      } catch (err) {}
      throw err;
    }

    // error handling
    app.error = function error(code, req, resp) {
      resp.writeHead(code, { 'Content-Type': 'text/html' });
      fs.readFile(path.resolve(conf.root, conf.directories.templates,
          code+'.tpl'), 'uft8', function (err, tpl) {
        if (err)
          return die(err);

        resp.end(ejs.render(tpl, { locals: { code: code, request: req } }));
        log.write('error: '+code+' '+req.url+'\n');
      });
    };

    // for every registered module
    conf.modules.forEach(function (mod) {
      var module = require(path.resolve(conf.root, conf.directories.modules,
          mod+'.js'));

      // read module specific configuration file
      fs.readFile(path.resolve(confdir, mod+'.json'), 'utf8',
          function (err, data) {
        if (err)
          return die(err);

        var modConf = JSON.parse(data);

        console.log('Starting module '+mod+'.');
        // hook module into app
        module(app, log, modConf, conf, function (err) {
          if (err)
            return die(err);

          console.log('Module '+mod+' up and running.');
        });
      });
    });

    if (conf.connection.port)
      if (conf.connection.hostname)
        app.listen(conf.connection.port, conf.connection.hostname, listen);
      else
        app.listen(conf.connection.port, listen);
    else
      app.listen(conf.connection.path, listen);

    function listen() {
      if (conf.connection.path)
        fs.chmod(conf.connection.path, conf.connection.permissions, listening);
      else
        listening();

      function listening(err) {
        if (err)
          return die(err);

        console.log('Server up and running.');
      }
    }
  });
});
