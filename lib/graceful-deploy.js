/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , em = require('events').EventEmitter
  , winston = require('winston')
  , fs = require('fs')
  , deploy = module.exports = new em()

//==============================================================================

/*
 */
deploy.init = function() {
  serversI = [ ]
  serversO = [ ]
  spawn = null

  this.started =
    this.finished =
    this.lastError = false

  this.options = {
      debug: false
    , exit: true
  }

  this.logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({'timestamp': true})
    ]
  })

  this.forker = require('child_process').fork

  this.isChild = ( process.argv.length >= 2 &&
    process.argv[process.argv.length - 1] === '--gracefulDeploy' &&
    process.send )
}

/*
 */
deploy.bind = function(newServer) {
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
    if(self.isChild) {
      process.send(JSON.stringify({port: port, deploy: true}))
      return server.instance
    }

    try {
      server.instance.listen(port, function() {
        debug('listening', port)
      })
    } catch(err) {
      error(err.message)
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
            spawn.send(JSON.stringify({port: server.port}),
              server.instance._handle)
        })
    })
  })

  // Track when the server is closed
  server.instance.on('close', function() {
    var found = _.findWhere(serversO, {instance: this})

    if(found) {
      found.instance = null
      serversO.splice(_.indexOf(serversO, found), 1)
    }

    if(self.upgrading && serversO.length === 0)
      self.finish()
  })

  if(self.isChild)
    serversI.push(server)
  else
    serversO.push(server)

  return server
}

/*
 */
deploy.begin = function() {
  if(this.started)
    return spawn

  debug('deploying')
  this.started = true
  this.emit('started', serversO.length)

  var argv = process.argv.slice(2)
  argv.push('--gracefulDeploy')

  spawn = this.forker(process.argv[1], argv, {
      cwd: process.cwd()
    , env: process.env
    , encoding: 'utf8' // TODO: how to get current proc's encoding?
    , execPath: process.execPath
    , execArgv: process.execArgv
    , silent: false
  })

  if(!spawn)
    return error('unable to fork deploy child process')

  if(serversO.length === 0) {
    return this.finish()
  }

  spawn.on('message', this.processMessageFromChild.bind(this))
  return spawn
}

/*
 */
deploy.finish = function() {
  this.finished = true
  this.emit('finished')

  process.nextTick(function() {
    if(spawn) {
      spawn.disconnect()
      spawn.unref()
    }
  })

  if(this.options.exit)
    process.nextTick(function() {
      process.exit(0)
    })
}

/*
 */
deploy.processMessageFromChild = function(msg, handle) {
  msg = JSON.parse(msg)

  if(!msg || !msg.port)
    return error('unexpected message from deploy child process')

  var server

  // Here we have been told by the child that they received the socket, so
  // wrap up the server on this end
  if(msg.received) {
    debug('deployed', msg.port)
    server = _.findWhere(serversO, {port: msg.port})

    if(server && server.instance) {
      if(server.instance._handle !== null)
        server.instance.close()

      server.instance = null
      serversO.splice(_.indexOf(serversO, server), 1)
    }

    if(serversO.length === 0)
      this.finish()
  }

  // Here we're told that the child wants this socket, so give it to them if
  // we're in a good place to do that
  if(msg.deploy) {
    debug('deploy request', msg.port)
    server = _.findWhere(serversO, {port: msg.port})

    if(server && server.instance) {
      server.instance.getConnections(function(err, count) {
        if(count === 0 && server.instance) {
          debug('deploy request sent', msg.port)

          spawn.send(JSON.stringify({port: server.port}),
            server.instance._handle)

          server.deployed = true
        }
      })
    }
  }
}

/*
 */
deploy.processMessageFromParent = function(msg, handle) {
  msg = JSON.parse(msg)
  debug('child received', msg.port)

  if(!msg || !msg.port)
    return

  var server = _.findWhere(serversI, {port: msg.port})

  if(!server || !server.instance) {
    // This should not happen since we requested the port, so in this case we
    // presumably no longer care about the port so discard it and let the parent
    // know it can suspend operations
    process.send(JSON.stringify({port: msg.port, received: true}))
  }

  if(typeof(handle) != 'object' || !handle.hasOwnProperty('fd') ||
   handle.fd < 0) {
    try {
      server.instance.listen(msg.port, function() {
        debug('listening on port', msg.port)

        // Although the handle failed, we were able to bind to the port so just
        // return that everything is a-ok to the parent
        process.send(JSON.stringify({port: msg.port, received: true}))
      })
    } catch(err) {
      error(err.message, msg.port)
    }

    return
  }

  server.handle = handle

  try {
    server.instance.listen(handle, function() {
      debug('listening on handle', msg.port)

      // Yay, we received a port.  If a server is already waiting for it, start
      // listening, otherwise the server will listen when it starts up
      process.send(JSON.stringify({port: msg.port, received: true}))
    })
  } catch(err) {
    error(err.message)
  }
}

//==============================================================================

var serversI = [ ]
  , serversO = [ ]
  , spawn = null

deploy.init()

process.on('SIGHUP', deploy.begin.bind(deploy))
process.on('message', deploy.processMessageFromParent.bind(deploy))

//==============================================================================

function debug(msg, port, err) {
  if(!deploy.options.debug)
    return

  var obj = {
      message: msg
    , pid: process.pid
    , 'servers-i': serversI.length
    , 'servers-o': serversO.length
  }

  if(port)
    obj.port = port

  if(err)
    deploy.logger.error('graceful-deploy', obj)
  else
    deploy.logger.info('graceful-deploy', obj)
}

function error(msg, port) {
  deploy.lastError = msg
  deploy.emit('error', msg)

  if(port) {
    if(deploy.isChild)
      process.send(JSON.stringify({port: port, error: true}))
    else
    if(spawn)
      spawn.send(JSON.stringify({port: port, error: true}))
  }

  debug(msg, port, true)
}
