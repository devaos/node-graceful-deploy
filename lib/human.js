/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , common = require('./common')

//==============================================================================

/*
 */
function human() { }

human.prototype.exit = true
human.prototype.forker = require('child_process').fork
human.prototype.emitter = null
human.prototype.servers = [ ]
human.prototype.started = false
human.prototype.finished = false
human.prototype.skinjob = null

/*
 */
human.prototype.begin = function() {
  if(this.started)
    return this.skinjob

  common.debug('deploying')
  this.started = true
  this.emitter.emit('started', this.servers.length)

  var argv = process.argv.slice(2)
  argv.push('--gracefulDeploy')

  this.skinjob = this.forker(process.argv[1], argv, {
      cwd: process.cwd()
    , env: process.env
    , encoding: 'utf8' // TODO: how to get current proc's encoding?
    , execPath: process.execPath
    , execArgv: process.execArgv
    , silent: false
  })

  if(!this.skinjob)
    return common.error('unable to fork deploy child process')

  if(this.servers.length === 0) {
    return this.finish()
  }

  this.skinjob.on('message', this.processMessageFromSkinjob.bind(this))
  return this.skinjob
}

/*
 */
human.prototype.finish = function() {
  var self = this

  this.finished = true
  this.emitter.emit('finished')

  process.nextTick(function() {
    if(self.skinjob) {
      self.skinjob.disconnect()
      self.skinjob.unref()
    }
  })

  process.nextTick(function() {
    if(self.exit)
      process.exit(0)
  })
}

/*
 */
human.prototype.processMessageFromSkinjob = function(msg, handle) {
  msg = JSON.parse(msg)

  if(!msg || !msg.port)
    return common.error('unexpected message from deploy process')

  var server
    , self = this

  // Here we have been told by the child that they received the socket, so
  // wrap up the server on this end
  if(msg.received) {
    common.debug('deployed', msg.port)
    server = _.findWhere(this.servers, {port: msg.port})

    if(server && server.instance) {
      if(server.instance._handle !== null)
        server.instance.close()

      server.instance = null
      this.servers.splice(_.indexOf(this.servers, server), 1)
    }

    if(this.servers.length === 0)
      this.finish()
  }

  // Here we're told that the child wants this socket, so give it to them if
  // we're in a good place to do that
  if(msg.deploy) {
    common.debug('deploy request', msg.port)
    server = _.findWhere(this.servers, {port: msg.port})

    if(server && server.instance) {
      server.instance.getConnections(function(err, count) {
        if(count === 0 && server.instance) {
          common.debug('deploy request sent', msg.port)

          self.skinjob.send(JSON.stringify({port: server.port}),
            server.instance._handle)

          server.deployed = true
        }
      })
    }
  }
}

//==============================================================================

module.exports = new human()
