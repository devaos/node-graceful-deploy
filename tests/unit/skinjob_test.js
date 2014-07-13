'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , deploy = require('../../lib/skinjob')
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

exports.commonTest = {
  develFilesOk: [ ],

  setUp: function(done) {
    common.setUp(done)
  },

  tearDown: function(done) {
    common.tearDown(done)
  },

  noServers: function(test) {
    test.expect(1)

    // Mock the parent receiving messages from the child
    process = new mocks.processMock()
    process.send = function(msg, handle) {
      var json = JSON.parse(msg)
      test.strictEqual(json.port, common.ports[0])
    }

    deploy.processMessageFromHuman(JSON.stringify({port: common.ports[0]}),
      null)

    test.done()
  }
}
