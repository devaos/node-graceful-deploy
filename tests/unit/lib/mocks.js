'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , realProcess = process

//==============================================================================

function forkerMock() { }
forkerMock.prototype = new em()
forkerMock.prototype.disconnect = function() { }
forkerMock.prototype.unref = function() { }
forkerMock.prototype.send = function() { }

//==============================================================================


function processMock() { }
processMock.prototype = new em()
processMock.prototype.pid = realProcess.pid
processMock.prototype.argv = realProcess.argv
processMock.prototype.stdout = realProcess.stdout
processMock.prototype.stderr = realProcess.stderr
processMock.prototype.send = function() { }
processMock.prototype.cwd = function(func) { return realProcess.cwd() }
processMock.prototype.kill = function(pid, sig) { return realProcess.kill(pid, sig) }
processMock.prototype.nextTick = function(func) { return realProcess.nextTick(func) }
processMock.prototype.reallyExit = function(arg) { return realProcess.reallyExit(arg) }
processMock.prototype.binding = function(arg) { return realProcess.binding(arg) }

//==============================================================================

module.exports.forkerMock = forkerMock
module.exports.processMock = processMock