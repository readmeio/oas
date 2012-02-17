var assert = require('assert');
var path = require('path');
var confdir = require('./');

confdir(__dirname, 'foo', function callback(err, dir) {
  assert(path.resolve(__dirname, '.foo') === dir, 'Paths do not match.');
  console.log('passed test.');
});

confdir(__dirname, 'bar', function callback(err, dir) {
  assert(err instanceof Error, 'Expected to receive an error.');
  console.log('passed test.');
});

require('./.foo/test');

