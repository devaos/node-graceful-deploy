/**
 * Copyright (c) 2014 Ari Aosved
 * http://github.com/devaos/node-graceful-deploy/blob/master/LICENSE
 */

'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , core = require('./core')

//==============================================================================

/*
 */
function server(instance, port) {
  this.instance = instance

  if(port)
    this.port = port
}

server.prototype = new em()
server.prototype.instance = null
server.prototype.deployed = false
server.prototype.port = 0
server.prototype.handle = null

/*
 */
server.prototype.close = function() {
  if(!core.isServerDown(this))
    this.instance.close()

  this.instance = null
}

//==============================================================================

module.exports = server
