/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , em = require('events').EventEmitter
  , winston = require('winston')
  , common = require('./common')
  , human = require('./human')
  , skinjob = require('./skinjob')

//==============================================================================

/*
 */
function gracefulDeploy() {
  this.__defineGetter__("lastError", function() {
    return common.lastError
  })

  this.__defineGetter__("options", function() {
    return {
        debug: common.verbose
      , forcedExitAfterDeploy: human.exit
      , logger: common.logger
      , forker: human.forker
    }
  })

  this.__defineSetter__("options", function(opts) {
    if(!opts)
      return

    if(opts.hasOwnProperty('debug'))
      common.verbose = opts.debug

    if(opts.hasOwnProperty('forcedExitAfterDeploy'))
      human.exit = opts.forcedExitAfterDeploy

    if(opts.hasOwnProperty('logger'))
      common.logger = opts.logger

    if(opts.hasOwnProperty('forker'))
      human.forker = opts.forker
  })

  this.init()

  process.on('SIGHUP', human.begin.bind(human))
  process.on('message', skinjob.processMessageFromHuman.bind(skinjob))
}

gracefulDeploy.prototype = new em()
gracefulDeploy.prototype.isSkinjob = ( process.argv.length >= 2 &&
  process.argv[process.argv.length - 1] === '--gracefulDeploy' &&
  process.send )

/*
 */
gracefulDeploy.prototype.init = function() {
  this.options = {
      debug: false
    , forcedExitAfterDeploy: true
    , logger: new (winston.Logger)({
        transports: [
          new (winston.transports.Console)({'timestamp': true})
        ]
      })
    , forker: require('child_process').fork
  }

  common.lastError = false
  common.emitter = this

  human.emitter = this
  human.servers = [ ]
  human.started =
    human.finished = false
  human.skinjob = null

  skinjob.emitter = this
  skinjob.servers = [ ]

  this.isSkinjob = ( process.argv.length >= 2 &&
    process.argv[process.argv.length - 1] === '--gracefulDeploy' &&
    process.send )
}

/*
 */
gracefulDeploy.prototype.bind = function(newServer) {
  var self = this
    , server = new em()

  server.instance = newServer
  server.deployed = false
  server.port = 0
  server.handle = null

  server.listen = function(port) {
    server.port = port

    // This call to listen on the socket came from a deploy child, so don't
    // actually listen, make the request to the server to hande off the port
    if(self.isSkinjob) {
      skinjob.servers.push(server)
      process.send(JSON.stringify({port: port, deploy: true}))
      return server.instance
    }

    try {
      server.instance.listen(port, function() {
        human.servers.push(server)
        common.debug('listening', port)
      })
    } catch(err) {
      common.error(err.message)
    }

    return server.instance
  }

  // Track when clients disconnect from the server so we can shutdown after the
  // last client leaves
  server.instance.on('request', function(req, res) {
    res.on('finish', function() {
      if(self.started && server.instance)
        server.instance.getConnections(function(err, count) {
          if(self.started && count === 0 && server.instance)
            skinjob.send(JSON.stringify({port: server.port}),
              server.instance._handle)
        })
    })
  })

  // Track when the server is closed
  server.instance.on('close', function() {
    var found = _.findWhere(human.servers, {instance: this})

    if(found) {
      found.instance = null
      human.servers.splice(_.indexOf(human.servers, found), 1)
    }

    if(human.started && !human.finished && human.servers.length === 0)
      human.finish()

    found = _.findWhere(skinjob.servers, {instance: this})

    if(found) {
      found.instance = null
      skinjob.servers.splice(_.indexOf(skinjob.servers, found), 1)
    }
  })

  return server
}

//==============================================================================

module.exports = new gracefulDeploy()
