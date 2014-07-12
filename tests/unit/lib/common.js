'use strict';

//==============================================================================

var portscanner = require('portscanner')
  , deploy = require('../../../index')

//==============================================================================

var common = module.exports = {
    ports: [ ]
  , setUp: function(done) {
      deploy.init()
      deploy.options.exit = false

      common.ports = [ ]

      var savePort = function(err, port) {
        common.ports.push(port)
        if(common.ports.length >= 3)
          done()
      }

      for(var i = 0; i < 3; i++)
        portscanner.findAPortNotInUse(6000+1000*i, 9000, '127.0.0.1', savePort)
    }
  , tearDown: function(done) {
      done()
    }
}
