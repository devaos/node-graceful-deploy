/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , core = require('./core')

//==============================================================================

var handleError = function(err) {
  core.error(err, this.port)
}

//==============================================================================

/*
 */
function human() { }

human.prototype.waitForSilence = false
human.prototype.forcedExitAfterDeploy = true
human.prototype.forker = require('child_process').fork
human.prototype.emitter = null
human.prototype.servers = [ ]
human.prototype.started = false
human.prototype.finished = false
human.prototype.skinjob = null

/*
 */
human.prototype.addServer = function(server) {
  this.servers.push(server)
  server.instance.on('error', handleError.bind(server))

  // Track when clients disconnect from the server so we can shutdown after the
  // last client leaves
  var open = 0
  server.instance.on('request', function(req, res) {
    res.on('finish', function() {
      if(!this.started)
        return

      var meta = _.indexOf(this.servers, server)

      if(meta < 0 || this.servers[meta].deployed)
        return

      server.instance.getConnections(function(err, count) {
        meta = _.indexOf(this.servers, server)

        if(meta < 0 || this.servers[meta].deployed)
          return

        if(core.isServerDown(server)) {
          this.remServer(server)
          this.skinjob.send(JSON.stringify({port: this.servers[meta].port,
            unused: true}))

          if(this.servers.length === 0)
            this.finish()

          return
        }

        if(count === 0)
          this.skinjob.send(JSON.stringify({port: server.port}),
            server.instance._handle)
      }.bind(this))
    }.bind(this))
  }.bind(this))
}

/*
 */
human.prototype.remServer = function(server) {
  if(server.instance)
    server.instance.removeListener('error', handleError.bind(server))

  var idx = _.indexOf(this.servers, server)

  if(idx >= 0)
    this.servers.splice(idx, 1)
}

/*
 */
human.prototype.begin = function() {
  if(this.started)
    return this.skinjob

  core.debug('deploying')
  this.started = true

  if(this.emitter)
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
    return core.error('unable to fork deploy child process')

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

  if(this.emitter)
    this.emitter.emit('finished')

  process.nextTick(function() {
    if(self.skinjob) {
      self.skinjob.disconnect()
      self.skinjob.unref()
    }
  })

  process.nextTick(function() {
    if(self.forcedExitAfterDeploy)
      process.exit(0)
  })
}

/*
 */
human.prototype.processMessageFromSkinjob = function(msg, handle) {
  if(!msg)
    return core.error('no message from deploy parent')

  var json
    , server
    , self = this

  try {
    json = JSON.parse(msg)
  } catch(err) {
    return core.error('corrupt message from deploy parent')
  }

  if(!json || !json.port)
    return core.error('no port from deploy parent')

  // Here we have been told by the child that they received the socket, so
  // wrap up the server on this end
  if(json.received) {
    core.debug('deployed', json.port)
    server = _.findWhere(this.servers, {port: json.port})

    if(server) {
      if(!core.isServerDown(server)){
        server.instance.close()
      }

      this.remServer(server)
    }

    if(this.servers.length === 0)
      this.finish()

    return
  }

  // Here we're told that the child wants this socket, so give it to them if
  // we're in a good place to do that
  if(json.deploy) {
    core.debug('deploy request', json.port)
    server = _.findWhere(this.servers, {port: json.port})

    if(core.isServerDown(server)) {
      if(server)
        this.remServer(server)

      this.skinjob.send(JSON.stringify({port: json.port, unused: true}))

      if(this.servers.length === 0)
        this.finish()

      return
    }

    if(!this.holdDeployForSilence) {
      this.skinjob.send(JSON.stringify({port: server.port}),
        server.instance._handle)
      server.deployed = true
      return
    }

    server.instance.getConnections(function(err, count) {
      if(count === 0 && server.instance) {
        core.debug('deploy request sent', json.port)

        self.skinjob.send(JSON.stringify({port: server.port}),
          server.instance._handle)
        server.deployed = true
      }
    })

    return
  }
}

//==============================================================================

module.exports = new human()
