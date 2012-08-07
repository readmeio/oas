#!/usr/bin/env node

var confdir = require('confdir');
var fs = require('fs');
var path = require('path');
var ejs = require('ejs');
var logger = require('stoopid');

// get the configuration directory of from CWD
confdir(process.cwd(), 'conf', function (err, confdir) {
  if (err)
    throw err;

  // read '.conf/api.json'
  fs.readFile(path.resolve(confdir, 'api.json'), 'utf8',
      function (err, conf) {
    if (err)
      throw err;

    conf = JSON.parse(conf);

    conf.root = path.resolve(confdir, '..');

    // the log file
    logger.addHandler('file', conf.logFile);

    // new API server
    var app = new require('api')(conf.protocol).Server();

    process.on('TERM', die); // die on 'TERM'ination ;)

    // die() is: shut down the server and exit the process
    function die(err) {
      try {
        app.on('close', function () {
          process.exit();
        });
        app.close();
      } finally {
        if (err)
          throw err;
      }
    }

    // error handling
    app.error = function error(code, req, resp) {
      logger.warn('error: '+code+' '+req.url); // log errors

      resp.writeHead(code, { 'Content-Type': 'text/html' });
      var tplFile = path.resolve(conf.root, conf.directories.templates,
          'error.tpl');
      fs.readFile(tplFile, 'uft8', function (err, tpl) {
        if (err)
          return logger.error('Could not read template "'+tplFile+'".');
        resp.end(ejs.render(tpl, { locals: { code: code, request: req } }));
      });
    };

    // for every registered module
    conf.modules.forEach(function (mod) {
      var module = require(path.resolve(conf.root, conf.directories.modules,
          mod+'.js'));


      // read module specific configuration file
      var confFile = path.resolve(confdir, mod+'.json');
      fs.readFile(confFile, 'utf8', function (err, data) {
        if (err)
          return logger.error('Could not read configuration "'+confFile+'".');

        var modConf = JSON.parse(data);

        logger.info('Starting module "'+mod+'".');
        // hook module into app
        module(app, logger.logger(mod), modConf, conf, function (err) {
          if (err)
            return logger.error('Could not start module "'+mod+'".');

          logger.info('Module "'+mod+'" up and running.');
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

        logger.info('Server up and running.');
      }
    }
  });
});
