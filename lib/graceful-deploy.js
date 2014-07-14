/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , em = require('events').EventEmitter
  , winston = require('winston')
  , core = require('./core')
  , human = require('./human')
  , server = require('./server')
  , skinjob = require('./skinjob')

//==============================================================================

/*
 */
function gracefulDeploy() {
  this.__defineGetter__("lastError", function() {
    return core.lastError
  })

  this.__defineGetter__("options", function() {
    return {
        debug: core.verbose
      , holdDeployForSilence: human.holdDeployForSilence
      , forcedExitAfterDeploy: human.forcedExitAfterDeploy
      , logger: core.logger
      , forker: human.forker
    }
  })

  this.__defineSetter__("options", function(opts) {
    if(!opts)
      return

    if(opts.hasOwnProperty('debug'))
      core.verbose = opts.debug

    if(opts.hasOwnProperty('holdDeployForSilence'))
      human.holdDeployForSilence = opts.holdDeployForSilence

    if(opts.hasOwnProperty('forcedExitAfterDeploy'))
      human.forcedExitAfterDeploy = opts.forcedExitAfterDeploy

    if(opts.hasOwnProperty('logger'))
      core.logger = opts.logger

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
    , holdDeployForSilence: false
    , forcedExitAfterDeploy: true
    , logger: new (winston.Logger)({
        transports: [
          new (winston.transports.Console)({'timestamp': true})
        ]
      })
    , forker: require('child_process').fork
  }

  core.lastError = false
  core.emitter = this

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
gracefulDeploy.prototype.bind = function(s) {
  var self = this
    , bound = new server(s)

  /*
   */
  bound.listen = function(port) {
    bound.port = port

    // This call to listen on the socket came from a deploy child, so don't
    // actually listen, make the request to the server to hande off the port
    if(self.isSkinjob) {
      skinjob.addServer(bound)
      process.send(JSON.stringify({port: port, deploy: true}))
      return bound.instance
    }

    try {
      bound.instance.listen(port, function() {
        human.addServer(bound)
        core.debug('listening', port)
      })
    } catch(err) {
      core.error(err.message)
    }

    return bound.instance
  }

  /*
  // Track when the server is closed
   */
  bound.instance.on('close', function() {
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

  return bound
}

//==============================================================================

module.exports = new gracefulDeploy()
