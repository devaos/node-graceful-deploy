/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var _ = require('underscore')
  , em = require('events').EventEmitter
  , winston = require('winston')
  , fs = require('fs')
  , deploy = module.exports = new em()

//==============================================================================

deploy.started =
  deploy.finished =
  deploy.lastError = false

deploy.options = {
    debug: false
  , exit: true
}

deploy.logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({'timestamp': true})
  ]
})

deploy.forker = require('child_process').fork

deploy.isChild = ( process.argv.length >= 2 &&
  process.argv[process.argv.length - 1] === '--gracefulDeploy' &&
  process.send )

/*
 */
deploy.bind = function(newServer) {
  var server = new em()

  server.instance = newServer
  server.deployed = false
  server.port = 0
  server.handle = null

  server.listen = function(port) {
    server.port = port

    // This call to listen on the socket came from a deploy child, so don't
    // actually listen, make the request to the server to hande off the port
    if(deploy.isChild) {
      process.send(JSON.stringify({port: port, deploy: true}))
      return server.instance
    }

    server.instance.listen(port, function() {
      debug('listening', port)
    })

    return server.instance
  }

  // Track when clients disconnect from the server so we can shutdown after the
  // last client leaves
  server.instance.on('request', function(req, res) {
    res.on('finish', function() {
      if(deploy.started && server.instance)
        server.instance.getConnections(function(err, count) {
          if(deploy.started && count === 0 && server.instance)
            spawn.send(JSON.stringify({port: server.port}),
              server.instance._handle)
        })
    })
  })

  servers.push(server)
  return server
}

/*
 */
deploy.begin = function() {
  if(deploy.started) {
    return spawn
  }

  deploy.started = true

  var server, argv = process.argv.slice(2)
  argv.push('--gracefulDeploy')

  spawn = deploy.forker(process.argv[1], argv, {
      cwd: process.cwd()
    , env: process.env
    , encoding: 'utf8' // TODO: how to get current proc's encoding?
    , execPath: process.execPath
    , execArgv: process.execArgv
    , silent: false
  })

  if(!spawn)
    return error('unable to fork deploy child process')

  spawn.on('message', function(msg, handle) {
    msg = JSON.parse(msg)

    if(!msg || !msg.port)
      return

    // Here we have been told by the child that they received the socket, so
    // wrap up the server on this end
    if(msg.received) {
      debug('deployed', msg.port)
      server = _.findWhere(servers, {port: msg.port})

      if(server && server.instance) {
        server.instance.close()
        server.instance = null
        servers.splice(_.indexOf(servers, server), 1)
      }

      if(servers.length === 0) {
        deploy.emit('deployed')

        spawn.disconnect()
        spawn.unref()
        deploy.finished = true

        if(deploy.options.exit)
          process.nextTick(function() {
            process.exit(0)
          })
      }
    }

    // Here we're told that the child wants this socket, so give it to them if
    // we're in a good place to do that
    if(msg.deploy) {
      debug('deploy request', msg.port)
      server = _.findWhere(servers, {port: msg.port})

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
  })

  return spawn
}

//==============================================================================

var servers = [ ]
var spawn = null

//==============================================================================

process.on('SIGHUP', function() {
  debug('deploying')
  deploy.begin()
})

process.on('message', function(msg, handle) {
  msg = JSON.parse(msg)
  debug('child received', msg.port)

  if(!msg || !msg.port)
    return

  // Yay, we received a port.  If a server is already waiting for it, start
  // listening, otherwise the server will listen when it starts up
  process.send(JSON.stringify({port: msg.port, received: true}))

  var server = _.findWhere(servers, {port: msg.port})

  if(server) {
    server.handle = handle
    server.instance.listen(handle, function() {
      debug('listening', msg.port)
    })
  }
})

//==============================================================================

function debug(msg, port, err) {
  if(!deploy.options.debug)
    return

  var obj = {
      message: msg
    , pid: process.pid
    , servers: servers.length
  }

  if(port)
    obj.port = port

  if(err)
    deploy.logger.info('graceful-deploy', obj)
  else
    deploy.logger.error('graceful-deploy', obj)
}

function error(msg, port) {
  deploy.lastError = msg
  deploy.emit('error', msg)
  debug(msg, port, true)
}
