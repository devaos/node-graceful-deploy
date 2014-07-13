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
function skinjob() { }

skinjob.prototype.emitter = null
skinjob.prototype.servers = [ ]

/*
 */
skinjob.prototype.processMessageFromHuman = function(msg, handle) {
  msg = JSON.parse(msg)
  common.debug('child received', msg.port)

  if(!msg || !msg.port)
    return

  var server = _.findWhere(this.servers, {port: msg.port})
    , self = this

  if(!server || !server.instance) {
    // This should not happen since we requested the port, so in this case we
    // presumably no longer care about the port so discard it and let the parent
    // know it can suspend operations
    process.send(JSON.stringify({port: msg.port, received: true}))
    return
  }

  if(typeof(handle) != 'object' || !handle.hasOwnProperty('fd') ||
   handle.fd < 0) {
    try {
      server.instance.listen(msg.port, function() {
        common.debug('listening on port', msg.port).bind(self)

        // Although the handle failed, we were able to bind to the port so just
        // return that everything is a-ok to the parent
        process.send(JSON.stringify({port: msg.port, received: true}))
      })
    } catch(err) {
      common.error(err.message, msg.port)
    }

    return
  }

  server.handle = handle

  try {
    server.instance.listen(handle, function() {
      common.debug('listening on handle', msg.port)

      // Yay, we received a port.  If a server is already waiting for it, start
      // listening, otherwise the server will listen when it starts up
      process.send(JSON.stringify({port: msg.port, received: true}))
    })
  } catch(err) {
    common.error(err.message).bind(this)
  }
}

//==============================================================================

module.exports = new skinjob()
