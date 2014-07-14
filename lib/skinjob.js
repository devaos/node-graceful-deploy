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
function skinjob() { }

skinjob.prototype.emitter = null
skinjob.prototype.servers = [ ]

/*
 */
skinjob.prototype.addServer = function(server) {
  this.servers.push(server)
  server.instance.on('error', handleError.bind(server))
}

/*
 */
skinjob.prototype.remServer = function(server) {
  server.instance.removeListener('error', handleError.bind(server))
}

/*
 */
skinjob.prototype.processMessageFromHuman = function(msg, handle) {
  if(!msg)
    return core.error('no message from deploy parent')

  var json

  try {
    json = JSON.parse(msg)
  } catch(err) {
    return core.error('corrupt message from deploy parent')
  }

  if(!json || !json.port)
    return core.error('no port from deploy parent')

  core.debug('child received', json.port)

  var server = _.findWhere(this.servers, {port: json.port})
    , self = this

  if(!server || !server.instance) {
    // This should not happen since we requested the port, so in this case we
    // presumably no longer care about the port so discard it and let the parent
    // know it can suspend operations
    process.send(JSON.stringify({port: json.port, received: true}))
    return
  }

  if(json.unused || !handle || typeof(handle) != 'object' ||
   !handle.hasOwnProperty('fd') || handle.fd < 0) {
    try {
      server.instance.listen(json.port, function() {
        core.debug('listening on port', json.port)
      })
    } catch(err) {
      core.error(err.message, json.port)
    }

    // Although the handle wasn't usable, and we don't know yet if we were able
    // to bind to the port, just return that everything is a-ok to the parent
    // so it can keep moving since it will have already closed the server on its
    // end regardless (a function of child_process.send)
    process.send(JSON.stringify({port: json.port, received: true}))

    return
  }

  server.handle = handle

  try {
    server.instance.listen(handle, function() {
      core.debug('listening on handle', json.port)
    })
  } catch(err) {
    core.error(err.message)
  }

  // Yay, we received a TCP handle.  Let the parent know that we're going to
  // take over from here
  process.send(JSON.stringify({port: json.port, received: true}))
}

//==============================================================================

module.exports = new skinjob()
