'use strict';

//==============================================================================

var async = require('async')
  , deploy = require('../../../index')
  , fs = require('fs')
  , http = require('http')
  , nopt = require('nopt')
  , temp = require('temp').track()

//==============================================================================

var options = nopt({port: Number})
  , versionInfo
  , version

//==============================================================================

if(!options.port)
  process.exit(1)

setTimeout(function(){
  process.exit(1)
}, 20000)

deploy.on('deployed', function() {
  //process.exit(0)
})

async.series([writeVersion, requireVersion, runServers],
  function(err) {
    if(err)
      ;//process.exit(1)
  }
)

//==============================================================================

function writeVersion(callback) {
  temp.open('grace-', function(err, info) {
    if(err)
      process.exit(1)

    versionInfo = info

    fs.write(info.fd, 'module.exports = {current: \'' + new Date().getTime() +
      '\'}')

    fs.close(info.fd, function(err) {
      if(err)
        process.exit(1)

      callback()
    })
  })
}

function requireVersion(callback) {
  version = require(versionInfo.path)
  callback()
}

function runServers(callback) {
  var req1 = 0
  var req2 = 0

  var server = deploy.bind(http.createServer(function(req, res) {
    res.write(JSON.stringify({pong: 1, pid: process.pid,
      version: version.current}) + '\n')
    res.end()
  })).listen(options.port)

  console.log('Process ' + process.pid + ' with version ' + version.current +
    ' listening on port ' + options.port)
}
