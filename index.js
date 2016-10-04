#! /usr/bin/env node
var _ = require('lodash');

var parseArgs = require('minimist')(process.argv.slice(2))
var args = parseArgs._;
var opts = _.clone(parseArgs);
delete opts['_'];

require('./api').api(args, opts);
