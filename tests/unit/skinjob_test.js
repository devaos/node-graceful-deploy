'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , http = require('http')
  , core = require('../../lib/core')
  , skinjob = require('../../lib/skinjob')
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

exports.skinjobTest = {
  develFilesOk: [ ],

  setUp: function(done) {
    common.setUp(done)
  },

  tearDown: function(done) {
    common.tearDown(done)
  },

  noServers: function(test) {
    test.expect(2)

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
    }

    skinjob.processMessageFromHuman(JSON.stringify({port: common.ports[0]}),
      null)

    test.strictEqual(core.lastError, false)
    test.done()
  },

  noHandle: function(test) {
    test.expect(3)

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
    }

    skinjob.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) { })
    })

    skinjob.servers[0].instance.on('listening', function() {
      test.ok(true)
    })

    skinjob.processMessageFromHuman(JSON.stringify({port: common.ports[0]}),
      null)

    setTimeout(function() {
      skinjob.servers[0].instance.close()
      test.strictEqual(core.lastError, false)
      test.done()
    }, 250)
  },

  errorMessages: function(test) {
    test.expect(4)

    core.logger = null
    core.emitter = new em()
    core.emitter.on('error', function(err) {
      test.ok(true)
    })

    skinjob.processMessageFromHuman()
    skinjob.processMessageFromHuman('hi', null)
    skinjob.processMessageFromHuman(JSON.stringify({hi: 'sucker'}), null)

    test.notEqual(core.lastError, false)
    test.done()
  },

  errorNoHandleAddressInUse: function(test) {
    test.expect(4)

    core.logger = null
    core.emitter = new em()
    core.emitter.on('error', function(err) {
      test.ok(true)
    })

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.ok(json.received)
      test.strictEqual(json.port, common.ports[0])
    }

    skinjob.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) { })
    })

    skinjob.servers[0].instance.on('listening', function() {
      test.ok(false)
    })

    var blockingServer = http.createServer(function(req, res) {
      }).listen(common.ports[0])

    blockingServer.on('listening', function() {
      skinjob.processMessageFromHuman(JSON.stringify({port: common.ports[0]}),
        null)
    })

    setTimeout(function() {
      blockingServer.close()
      test.notEqual(core.lastError, false)
      test.done()
    }, 250)
  }
}
