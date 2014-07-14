'use strict';

//==============================================================================

var deploy = require('../../index')
  , human = require('../../lib/human')
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

exports.serverTest = {
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

    deploy.options = {
      forker: function(proc, args, options) {
        return new mocks.forkerMock()
      }
    }

    setTimeout(function() {
      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  },

  oneServer: function(test) {
    test.expect(10)

    // 3 assertions happen in here
    common.normalRunAsserts(test, 1)

    var child = new mocks.childProcessMock()
      , hupd = false
      , servers = [ ]
      , json

    // Mock the child receiving messages from the parent
    deploy.options = {
      forker: function(proc, args, options) {
        return child
      }
    }

    child.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      skinjob.processMessageFromHuman(msg, handle)
    }

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      human.processMessageFromSkinjob(msg, handle)
    }

    // 1 assertion happens in here
    servers[0] = common.normalServerWithAsserts(test, common.ports[0])
      .on('listening', function() {
        process.kill(process.pid, 'SIGHUP')
        hupd = true
      })

    setTimeout(function() {
      test.ok(hupd)
      deploy.isSkinjob = true

      // 1 assertion happens in here
      servers[1] = common.normalServerWithAsserts(test, common.ports[0])
        .on('listening', function() {
          deploy.isSkinjob = false
        })
    }, 100)

    setTimeout(function() {
      test.ok(servers[1] && servers[1]._handle)

      for(var i = 0; i < 2; i++)
        if(servers[i] && servers[i]._handle)
          servers[i].close()

      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)
  },

  twoServers: function(test) {
    test.expect(16)

    // 3 assertions happen in here
    common.normalRunAsserts(test, 2)

    var child = new mocks.childProcessMock()
      , hupd = false
      , servers = [ ]
      , json

    // Mock the child receiving messages from the parent
    deploy.options = {
      forker: function(proc, args, options) {
        return child
      }
    }

    child.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.ok(json.port == common.ports[0] || json.port == common.ports[1] )
      skinjob.processMessageFromHuman(msg, handle)
    }

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      json = JSON.parse(msg)
      test.ok(json.port == common.ports[0] || json.port == common.ports[1] )
      human.processMessageFromSkinjob(msg, handle)
    }

    // 1 assertion happens in here
    servers[0] = common.normalServerWithAsserts(test, common.ports[0])
      .on('listening', function() {
        if(hupd)
          process.kill(process.pid, 'SIGHUP')
        hupd = true
      })

    // 1 assertion happens in here
    servers[1] = common.normalServerWithAsserts(test, common.ports[1])
      .on('listening', function() {
        if(hupd)
          process.kill(process.pid, 'SIGHUP')
        hupd = true
      })

    setTimeout(function() {
      test.ok(hupd)
      deploy.isSkinjob = true

      // 1 assertion happens in here
      servers[2] = common.normalServerWithAsserts(test, common.ports[0])
        .on('listening', function() {
          deploy.isSkinjob = false
        })

      // 1 assertion happens in here
      servers[3] = common.normalServerWithAsserts(test, common.ports[1])
        .on('listening', function() {
          deploy.isSkinjob = false
        })
    }, 200)

    setTimeout(function() {
      test.ok(servers[2] && servers[2]._handle)
      test.ok(servers[3] && servers[3]._handle)

      for(var i = 0; i < 4; i++)
        if(servers[i] && servers[i]._handle)
          servers[i].close()

      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)
  }
}
