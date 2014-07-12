'use strict';

//==============================================================================

var em = require('events').EventEmitter

//==============================================================================

function forker() { }
forker.prototype = new em()

forker.prototype.disconnect =
  forker.prototype.unref =
  forker.prototype.send =
    function() { }

//==============================================================================

module.exports.forker = forker