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
  develFilesOk: [ ],
  setUp: function(done) {
    common.setUp(done)
  },
  tearDown: function(done) {
    common.tearDown(done)
  },

  noServers: function(test) {
    test.expect(3)

    // 3 assertions happen in here
    common.normalRunAsserts(test, 0)

    deploy.forker = function(proc, args, options) {
      return new mocks.forkerMock()
    }

    setTimeout(function() {
      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  },

  oneServer: function(test) {
    test.expect(9)

    // 3 assertions happen in here
    common.normalRunAsserts(test, 1)

    var forker = new mocks.forkerMock()
      , hupd = false
      , server1 = deploy.bind(http.createServer(function(req, res) {
          })).listen(common.ports[0])
      , server2
      , json

    process = new mocks.processMock()

    // Mock the child receiving messages from the parent
    forker.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      deploy.processMessageFromParent(msg, handle)
    }

    // Mock the parent receiving messages from the child
    process.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      deploy.processMessageFromChild(msg, handle)
    }

    server1.on('listening', function() {
      process.kill(process.pid, 'SIGHUP')
      hupd = true
    })

    deploy.forker = function(proc, args, options) {
      return forker
    }

    setTimeout(function() {
      test.ok(hupd)
      deploy.isChild = true

      server2 = deploy.bind(http.createServer(function(req, res) {
        })).listen(common.ports[0])

      server2.on('error', function(msg) {
        test.ok(false)
      })

      server2.on('close', function(msg) {
        test.ok(false)
      })

      server2.on('listening', function() {
        test.ok(true)
        deploy.isChild = false
      })
    }, 100)

    setTimeout(function() {
      test.ok(server2 && server2._handle)

      if(server1 && server1._handle)
        server1.close()

      if(server2 && server2._handle)
        server2.close()

      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)
  }
}
