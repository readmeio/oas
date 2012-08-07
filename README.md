api
===

is a module for easily providing several pluggable RESTful APIs and other
dynamic content on a single server. It extends
[`http.Server`](http://nodejs.org/api/http.html#http_class_http_server).

Installation
------------

`npm install -g api`

Usage
-----

api comes with an executable. If you run `api` from your console, the script
walks up the path of your current working directory and looks for a directory
named `.conf` that contains a file named `api.json`. This file must contain
several values. Here's an annotated version of such a file.

``` javascript
{
  "protocol": "http",               // "http" or "https"
  "connection": {                   // host and port of that server
    "hostname": "localhost",
    "port": 1337
  },
  "directories": {
    "modules": ".conf/modules"      // directory that contains submodules
  },
  "modules": [
    "example"                       // modules that are loaded on startup
  ],
  "errorPages": {                   // error pages
    "404": ".conf/error/404.html",
    "500": ".conf/error/500.html"
  },
  "logFile": ".conf/api.log"        // the log file
}
```

Just copy & paste this file to `.conf/api.json`, if you want to use it, but
don’t forget to remove the comments. JSON files are not allowed to contain
comments for some reason.

This example configuration starts a server at `http://localhost:1337`. It also
defines `.conf/module` as the directory for submodules and registers one module
"example". To add code for that module, you have to create the file
`.conf/modules/example.js`. A module must export a single function
(`function (app, logger, conf, globalConf, started)`).

  * `app` is a reference of the Server object.
  * `logger` is a [stoopid][] logger.
  * `conf` is a module specific configuration object.
  * `globalConf` is the global configuration object from `.conf/api.json`.
  * `started` is a callback (`function (err)`), that is used to return errors
    or let _api_ know, that the module has been started.

[stoopid]: https://github.com/mikeal/stoopid


`.conf/modules/example.js`:

``` javascript
module.exports = function example(app, logger, conf, globalConf, started) {
  // register request listeners
  app.get('^/hello-world.html', function helloWorld(req, resp) {
    logger.info('Somebody visited "/hello-world.html".');
    resp.writeHead(200, { 'Content-Type': 'text/html' });
    resp.end('<b>Hello World!</b>');
  });

  started(); // send the callback after everything has been set up.
}
```

You can try the example by starting `api` from the console. You should see the
following output on `stdout`:

    [process] - Server up and running.
    [process] - Starting module "example".
    [process] - Module "example" up and running.

Now you can visit `http://localhost:1337/hello-world.html` and you should see

**Hello World!**

as well as

    [process] - Somebody visited "/hello-world.html"

API
---

The api `Server` object has all the methods of
[`http.Server`](http://nodejs.org/api/http.html#http_class_http_server) (or
`https.Server`, if you configured it with https). There are also some additional
methods, that are more or less shortcuts for common events:

  * `on(path, callback)` handles any requests that match `path`, no matter which
    http method is used.
  * `get(path, callback)` handles all GET request that match `path`.
  * `post(path, callback)` handles all POST requests that match `path`.
  * `put(path, callback)` handles all PUT requests that match `path`.
  * `delete(path, callback)` handles all DELETE requests that match `path`.
  * `head(path, callback)` handles all HEAD requests that match `path`.

`path` is a string representation of that `RegExp` object.
Slashes (`/`) don’t need to be escaped.

`callback` is a callback function (`function (req, resp)`) just like in the
[http 'request' event](http://nodejs.org/api/http.html#http_event_request).

Bugs and Issues
---------------

If you encounter any bugs or issues, feel free to open an issue at
[github](//github.com/pvorb/node-api/issues) or send me an e-mail to
paul(at)vorb.de.

License
-------

Copyright © 2011-2012 Paul Vorbach

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
