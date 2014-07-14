/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var winston = require('winston')

//==============================================================================

/*
 */
function core() { }

core.prototype.verbose = false
core.prototype.logger = new (winston.Logger)({
    transports: [ new (winston.transports.Console)({'timestamp': true}) ]
  })
core.prototype.lastError = false
core.prototype.emitter = null

/*
 */
core.prototype.isServerDown = function(server) {
  return (
    !server ||
    !server.instance ||
    typeof(server.instance) != 'object' ||
    !server.instance.hasOwnProperty('_handle') ||
    this.isHandleDown(server.instance._handle)
  )
}

/*
 */
core.prototype.isHandleDown = function(handle) {
  return (
    !handle ||
    typeof(handle) != 'object' ||
    !handle.hasOwnProperty('fd') ||
    handle.fd < 0
  )
}

/*
 */
core.prototype.debug = function(msg, port, err) {
  if((!this.verbose && !err) || !this.logger)
    return

  var obj = {
      message: msg
    , pid: process.pid/*
    , 'servers-i': skinjob.servers.length
    , 'servers-o': human.servers.length*/
  }

  if(port)
    obj.port = port

  if(err)
    this.logger.error('graceful-deploy', obj)
  else
    this.logger.info('graceful-deploy', obj)
}

/*
 */
core.prototype.error = function(msg, port) {
  this.lastError = msg

  if(this.emitter)
    this.emitter.emit('error', msg)

  if(port) {
    if(this.isChild)
      process.send(JSON.stringify({port: port, error: true}))
    else
    if(this.skinjob)
      this.skinjob.send(JSON.stringify({port: port, error: true}))
  }

  this.debug(msg, port, true)
}

//==============================================================================

module.exports = new core()
