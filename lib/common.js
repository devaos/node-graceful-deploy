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
function common() { }

common.prototype.verbose = false
common.prototype.logger = new (winston.Logger)({
    transports: [ new (winston.transports.Console)({'timestamp': true}) ]
  })
common.prototype.lastError = false
common.prototype.emitter = null

/*
 */
common.prototype.debug = function(msg, port, err) {
  if(!this.verbose && !err)
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
common.prototype.error = function(msg, port) {
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

module.exports = new common()
