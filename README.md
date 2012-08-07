**API** is a module for easily providing several RESTful APIs on a single
server. It inherits all methods from `http.Server`.

## Usage

`test.js`:

```js
// Use the HTTP version
var api = require('api')('http');
var msg = 'Hello World!';

var server = new api.Server();
server.listen(1337, '127.0.0.1');

function error404(res) {
  res.writeHead(404);
  res.end('Not found.\n');
};

// Listen for regular requests and end with an 404 error.
server.on('regularRequest', function(req, res) {
  error404(res);
});

// Listen for requests to /hello-world.
server.on('/hello-world', function(req, res) {
  if (req.method == 'GET') {
    res.writeHead(200);
    res.end(msg+'\n');
  } else if (req.method == 'POST') {
    res.writeHead(200);
    msg = '';

    // Update the message
    req.on('data', function(chunk) {
      msg += chunk;
    });

    // After the POST request has ended, end with the message.
    req.on('end', function() {
      res.end('Successfully changed message to "'+msg+'".\n');
    });
  } else {
    error404(res);
  }
});
```

Test it.

### Terminal 1

```bash
$ node test.js
```

### Terminal 2

```bash
$ curl http://localhost:1337/hello-world
Hello World!
$ curl -d foobar http://localhost:1337/hello-world
Successfully changed message to "foobar".
$ curl http://localhost:1337/hello-world
foobar
$ curl http://localhost:1337/
Not Found.
```

## HTTP and HTTPS

You can use HTTP or HTTPS if you want by providing the argument when including
the package.

For HTTP do `require('api')('http')`.
For HTTPS do `require('api')('https')`.

## Bugs and Issues

If you encounter any bugs or issues, feel free to open an issue at
[github](//github.com/pvorb/node-api/issues).

## License

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
