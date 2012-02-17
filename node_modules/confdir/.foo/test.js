var assert = require('assert');
var path = require('path');
var confdir = require('../');

confdir(__dirname, 'foo', function callback(err, dir) {
  assert(dir === __dirname, 'Paths do not match.');
  console.log('passed test.');
});
