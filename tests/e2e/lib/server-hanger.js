'use strict';

//==============================================================================

var async = require('async')
  , deploy = require('../../../index')
  , fs = require('fs')
  , http = require('http')
  , nopt = require('nopt')
  , temp = require('temp').track()

//==============================================================================

var options = nopt({port1: Number, port2: Number})
  , versionInfo
  , version

//==============================================================================

if(!options.port1 || !options.port2)
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

  var server1 = deploy.bind(http.createServer(function(req, res) {
    req.on('data', function(data) {
      //if(deploy.finished)
      //  return

      res.write(JSON.stringify({pong: 1, pid: process.pid,
        version: version.current}) + '\n')
      res.end()
      req1++
      if(req1 >= 2 && req2 >= 2)
        callback()
    })
  })).listen(options.port1)

  var server2 = deploy.bind(http.createServer(function(req, res) {
    req.on('data', function(data) {
      //if(deploy.finished)
      //  return

      res.write(JSON.stringify({pong: 2, pid: process.pid,
        version: version.current}) + '\n')
      res.end()
      req2++
      if(req1 >= 2 && req2 >= 2)
        callback()
    })
  })).listen(options.port2)

  console.log('Process ' + process.pid + ' with version ' + version.current +
    ' listening on port ' + options.port1 + ' and port ' + options.port2)
}
