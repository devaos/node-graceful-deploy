'use strict';

//==============================================================================

var deploy
  , em = require('events').EventEmitter
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

exports.gracefulDeployGeneral = {
  develFilesOk: [ ],
  setUp: function(done) {
    common.setUp(done)
  },
  tearDown: function(done) {
    common.tearDown(done)
  },

  bindToServer: function(test) {
    test.expect(1)
    var s = deploy.bind(http.createServer(function(req, res) { }))
    var h = s.listen(common.ports[0])
    test.equal(h, s.instance)
    h.on('listening', function() {
      h.close()
      test.done()
    })
  },

  forkForDeploy: function(test) {
    test.expect(4)
    deploy.exit = false
    deploy.on('error', function(err) {
      test.ok(false)
    })

    deploy.forker = function(proc, args, options) {
      test.ok(proc.match(/nodeunit|grunt/))
      test.ok(args.length > 0)
      test.strictEqual(args[args.length-1], '--gracefulDeploy')
      return new mocks.forkerMock()
    }

    setTimeout(function() {
      test.strictEqual(deploy.lastError, false)
      test.done()
    }, 250)

    process.kill(process.pid, 'SIGHUP')
  }
}
