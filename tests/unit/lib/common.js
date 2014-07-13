'use strict';

//==============================================================================

var deploy = require('../../../index')
  , http = require('http')
  , portscanner = require('portscanner')
  , realProcess = process

//==============================================================================

process.on('uncaughtException', function(err) {
  console.error(err.stack);
});

//==============================================================================

var common = module.exports = {
  ports: [ ],

  setUp: function(done) {
    deploy.init()
    deploy.options = { forcedExitAfterDeploy: false }

    common.ports = [ ]

    var savePort = function(err, port) {
      common.ports.push(port)
      if(common.ports.length >= 3)
        done()
    }

    for(var i = 0; i < 3; i++)
      portscanner.findAPortNotInUse(6000+1000*i, 9000, '127.0.0.1', savePort)
  },

  tearDown: function(done) {
    process = realProcess
    done()
  },

  normalRunAsserts: function(test, numServers) {
    deploy.on('error', function(err) {
      console.log(err)
      test.ok(false)
    })

    deploy.on('started', function(servers) {
      test.strictEqual(servers, numServers)
    })

    deploy.on('finished', function() {
      test.ok(true)
    })
  },

  normalServerWithAsserts: function(test, port) {
    var server = deploy.bind(http.createServer(function(req, res) {
      })).listen(port)

    server.on('error', function(msg) {
      console.log(msg.stack)
      test.ok(false)
    })

    server.on('listening', function() {
      test.ok(true)
    })

    return server
  }
}
