'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , http = require('http')
  , core = require('../../lib/core')
  , human = require('../../lib/human')
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

exports.humanTest = {
  develFilesOk: [ ],

  setUp: function(done) {
    common.setUp(done)
  },

  tearDown: function(done) {
    common.tearDown(done)
  },

  spinThroughBeginAndFinish: function(test) {
    test.expect(10)

    human.emitter = new em()
    human.emitter.on('started', function() { test.ok(true) })
    human.emitter.on('finished', function() { test.ok(true) })

    var child = new mocks.childProcessMock()
    child.disconnect = child.unref = function() {
      test.ok(true)
    }

    human.forker = function(proc, args, options) {
      test.ok(proc.match(/nodeunit|grunt/))
      test.ok(args.length > 0)
      test.strictEqual(args[args.length-1], '--gracefulDeploy')
      return child
    }

    setTimeout(function() {
      test.ok(human.started)
      test.ok(human.finished)
      test.strictEqual(core.lastError, false)
      test.done()
    }, 250)

    human.begin()
  },

  forkForSkinjob: function(test) {
    test.expect(4)

    human.forker = function(proc, args, options) {
      test.ok(proc.match(/nodeunit|grunt/))
      test.ok(args.length > 0)
      test.strictEqual(args[args.length-1], '--gracefulDeploy')
      return new mocks.forkerMock()
    }

    setTimeout(function() {
      test.strictEqual(core.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  },

  errorNoForkForSkinjob: function(test) {
    test.expect(5)

    core.logger = null
    core.emitter = new em()
    core.emitter.on('error', function(err) {
      test.ok(true)
    })

    human.forker = function(proc, args, options) {
      test.ok(proc.match(/nodeunit|grunt/))
      test.ok(args.length > 0)
      test.strictEqual(args[args.length-1], '--gracefulDeploy')
      return null
    }

    setTimeout(function() {
      test.notStrictEqual(core.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  },

  noServers: function(test) {
    test.expect(3)

    // Mock the child receiving messages from the parent
    human.skinjob = new mocks.childProcessMock()
    human.skinjob.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.ok(json.unused)
      test.strictEqual(json.port, common.ports[0])
      test.strictEqual(core.lastError, false)
      test.done()
    }

    human.processMessageFromSkinjob(JSON.stringify({deploy: true,
      port: common.ports[0]}))
  },

  downedServer: function(test) {
    test.expect(5)

    // Mock the child receiving messages from the parent
    human.skinjob = new mocks.childProcessMock()
    human.skinjob.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.ok(json.unused)
      test.strictEqual(json.port, common.ports[0])

      test.strictEqual(human.servers.length, 0)

      human.processMessageFromSkinjob(JSON.stringify({received: true,
        port: common.ports[0]}))

      test.strictEqual(core.lastError, false)
      test.done()
    }

    human.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) {
          }).listen(common.ports[0])
    })

    human.servers[0].instance.on('listening', function() {
      test.ok(true)

      human.servers[0].instance.close()
      human.processMessageFromSkinjob(JSON.stringify({deploy: true,
        port: common.ports[0]}))
    })
  },

  serverReceived: function(test) {
    test.expect(5)

    // Mock the child receiving messages from the parent
    human.skinjob = new mocks.childProcessMock()
    human.skinjob.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      test.ok(!core.isHandleDown(handle))

      human.processMessageFromSkinjob(JSON.stringify({received: true,
        port: common.ports[0]}))

      test.strictEqual(human.servers.length, 0)

      handle.close()
      test.strictEqual(core.lastError, false)
      test.done()
    }

    human.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) {
          }).listen(common.ports[0])
    })

    human.servers[0].instance.on('listening', function() {
      test.ok(true)

      human.processMessageFromSkinjob(JSON.stringify({deploy: true,
        port: common.ports[0]}))
    })
  },

  activeServerNoWait: function(test) {
    test.expect(7)

    var received = false
    var child = new mocks.childProcessMock()
    human.forker = function(proc, args, options) {
      return child
    }

    // Mock the child receiving messages from the parent
    child.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      test.ok(!core.isHandleDown(handle))

      received = true
      human.processMessageFromSkinjob(JSON.stringify({received: true,
        port: common.ports[0]}))

      test.strictEqual(human.servers.length, 0)
    }

    human.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) {
          human.begin()
          human.processMessageFromSkinjob(JSON.stringify({deploy: true,
            port: common.ports[0]}))

          // We received the deploy before we finished the request
          test.ok(received)

          req.on('data', function(data) {
            res.end('pong\n')
          })
        }).listen(common.ports[0])
    })

    human.servers[0].instance.on('listening', function() {
      test.ok(true)

      var options = {
        hostname: '127.0.0.1',
        port: common.ports[0],
        path: '/ping',
        method: 'POST',
        headers: { 'Connection': 'Close' }
      }

      var req = http.request(options, function(res) {
        if(res.statusCode === 200) {
          test.ok(true)
        }
      })

      req.on('error', function(e) {
        test.ok(false)
      })

      // write data to request body
      setTimeout(function() {
        req.end('ping\n')
      }, 100)
    })

    setTimeout(function() {
      test.strictEqual(core.lastError, false)
      test.done()
    }, 250)
  },

  activeServerWait: function(test) {
    test.expect(7)

    human.holdDeployForSilence = true

    var received = false
    var child = new mocks.childProcessMock()
    human.forker = function(proc, args, options) {
      return child
    }

    // Mock the child receiving messages from the parent
    child.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
      test.ok(!core.isHandleDown(handle))

      received = true
      human.processMessageFromSkinjob(JSON.stringify({received: true,
        port: common.ports[0]}))

      test.strictEqual(human.servers.length, 0)
    }

    human.addServer({
        port: common.ports[0]
      , instance: http.createServer(function(req, res) {
          human.begin()
          human.processMessageFromSkinjob(JSON.stringify({deploy: true,
            port: common.ports[0]}))

          // We did not receive the deploy before we finished the request
          test.ok(!received)

          req.on('data', function(data) {
            res.end('pong\n')
          })
        }).listen(common.ports[0])
    })

    human.servers[0].instance.on('listening', function() {
      test.ok(true)

      var options = {
        hostname: '127.0.0.1',
        port: common.ports[0],
        path: '/ping',
        method: 'POST',
        headers: { 'Connection': 'Close' }
      }

      var req = http.request(options, function(res) {
        if(res.statusCode === 200) {
          test.ok(true)
        }
      })

      req.on('error', function(e) {
        test.ok(false)
      })

      // write data to request body
      setTimeout(function() {
        req.end('ping\n')
      }, 100)
    })

    setTimeout(function() {
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

    human.processMessageFromSkinjob()
    human.processMessageFromSkinjob('hi', null)
    human.processMessageFromSkinjob((JSON.stringify({hi: 'sucker'}), null))

    test.notEqual(core.lastError, false)
    test.done()
  }
}
