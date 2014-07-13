'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , deploy = require('../../lib/common')
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

exports.commonTest = {
  develFilesOk: [ ],

  setUp: function(done) {
    common.setUp(done)
  },

  tearDown: function(done) {
    common.tearDown(done)
  },

  iHeartDebug: function(test) {
    test.expect(6)

    deploy.logger = {
      error: function(msg, obj) {
        test.ok(false)
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    deploy.verbose = false
    deploy.debug('flowers', 69, false)

    deploy.logger = {
      error: function(msg, obj) {
        test.ok(false)
      },
      info: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 69)
        test.strictEqual(obj.message, 'flowers')
      }
    }
    deploy.verbose = true
    deploy.debug('flowers', 69, false)

    deploy.logger = {
      error: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 96)
        test.strictEqual(obj.message, 'monkeys')
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    deploy.verbose = false
    deploy.debug('monkeys', 96, true)

    test.done()
  },

  iDontHeartErrors: function(test) {
    test.expect(4)

    deploy.emitter = new em()
    deploy.emitter.on('error', function(msg) {
      test.strictEqual(msg, 'flowers')
    })
    deploy.logger = {
      error: function(msg, obj) {
        test.strictEqual(msg, 'graceful-deploy')
        test.strictEqual(obj.port, 69)
        test.strictEqual(obj.message, 'flowers')
      },
      info: function(msg, obj) {
        test.ok(false)
      }
    }
    deploy.verbose = false
    deploy.error('flowers', 69)
    test.done()
  }
}
