#! /usr/bin/env node
const _ = require('lodash');
const parseArgs = require('minimist')(process.argv.slice(2));

const args = parseArgs._;
const opts = _.clone(parseArgs);
delete opts._;

require('./api').api(args, opts);
