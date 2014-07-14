'use strict';

//==============================================================================

var em = require('events').EventEmitter
  , realProcess = process

//==============================================================================

function forkerMock() {
  return new childProcessMock()
}

//==============================================================================

function processMock() { }
processMock.prototype = new em()
processMock.prototype.pid = realProcess.pid
processMock.prototype.argv = realProcess.argv
processMock.prototype.env = realProcess.env
processMock.prototype.stdout = realProcess.stdout
processMock.prototype.stderr = realProcess.stderr
processMock.prototype.send = function() { }
processMock.prototype.cwd = function(func) { return realProcess.cwd() }
processMock.prototype.kill = function(pid, sig) { return realProcess.kill(pid, sig) }
processMock.prototype.nextTick = function(func) { return realProcess.nextTick(func) }
processMock.prototype.exit = function(arg) { return realProcess.exit(arg) }
processMock.prototype.reallyExit = function(arg) { return realProcess.reallyExit(arg) }
processMock.prototype.binding = function(arg) { return realProcess.binding(arg) }

//==============================================================================

function childProcessMock() { }
childProcessMock.prototype = new em()
childProcessMock.prototype.disconnect = function() { }
childProcessMock.prototype.unref = function() { }
childProcessMock.prototype.send = function() { }

//==============================================================================

module.exports.forkerMock = forkerMock
module.exports.processMock = processMock
module.exports.childProcessMock = childProcessMock