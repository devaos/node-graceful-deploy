'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , http = require('http')
  , portscanner = require('portscanner')
  , deploy = require('../../index')
  , mocks = require('./lib/mocks')
  , common = require('./lib/common')

//==============================================================================

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

//==============================================================================

exports.gracefulDeployServer = {
  develFilesOk: [
  ],
  setUp: function(done) {
    common.setUp(done)
  },
  tearDown: function(done) {
    common.tearDown(done)
  },
  noServers: function(test) {
    test.expect(3)

    deploy.on('error', function(err) {
      test.ok(false)
    })

    deploy.on('started', function() {
      console.log("started")
      test.ok(true)
    })

    deploy.on('finished', function() {
      console.log("finished")
      test.ok(true)
    })

    deploy.forker = function(proc, args, options) {
      return new mocks.forker()
    }

    setTimeout(function() { 
      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  }
}
