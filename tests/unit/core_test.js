'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , core = require('../../lib/core')
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

exports.coreTest = {
  develFilesOk: [ ],

  setUp: function(done) {
    common.setUp(done)
  },

  tearDown: function(done) {
    common.tearDown(done)
  },

  iHeartDebug: function(test) {
    test.expect(6)

    core.logger = {
      error: function(msg, obj) {
        test.ok(false)
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    core.verbose = false
    core.debug('flowers', 69, false)

    core.logger = {
      error: function(msg, obj) {
        test.ok(false)
      },
      info: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 69)
        test.strictEqual(obj.message, 'flowers')
      }
    }
    core.verbose = true
    core.debug('flowers', 69, false)

    core.logger = {
      error: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 96)
        test.strictEqual(obj.message, 'monkeys')
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    core.verbose = false
    core.debug('monkeys', 96, true)

    test.done()
  },

  iDontHeartErrors: function(test) {
    test.expect(4)

    core.emitter = new em()
    core.emitter.on('error', function(msg) {
      test.strictEqual(msg, 'flowers')
    })
    core.logger = {
      error: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 69)
        test.strictEqual(obj.message, 'flowers')
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    core.verbose = false
    core.error('flowers', 69)
    test.done()
  }
}
