'use strict';

//==============================================================================

var async = require('async')
  , child = require('child_process')
  , http = require('http')
  , portscanner = require('portscanner')

//==============================================================================

setTimeout(function(){
  throw('timed out')
}, 20000)

var port1 = 7000, port2 = 7001, proc, firstVersion

async.series([findPort, findPort, spawnServer], function(err) {
  if(err)
    throw(err)

  sendPing(port1)
  sendPing(port2)

  setInterval(function(){
    sendPing(port1)
    sendPing(port2)
  }, 250)

  setTimeout(function(){
    if(proc)
      proc.kill('SIGHUP')
  }, 1000)
})

//==============================================================================

function findPort(callback) {
  portscanner.findAPortNotInUse((port1 ? (port1 + 1) : 7000), 8000, '127.0.0.1',
    function(err, port) {
      if(port !== false) {
        if(port1)
          port2 = port
        else
          port1 = port

        callback(null)
        return
      }

      callback('unable to obtain port')
    }
  )
}

function spawnServer(callback) {
  proc = child.fork(__dirname + '/lib/server',
    ['--port1', port1, '--port2', port2], {silent: true})

  if(!proc)
    throw('unable to fork')

  var on = function(data) {
    if(data.toString().match(/Process \d+ with version \d+ listening on port \d+ and port \d+/)) {
      callback()
    }
  }

  proc.stdout.on('data', on)
  proc.stderr.on('data', on)

  proc.stdout.on('error', function(err) {
    throw('stdout error')
  })

  proc.stdout.on('close', function(code, signal) {
    if(code !== 0)
      throw('stdout closed non-zero')
  })

  proc.on('exit', function(code, signal) {
    if(code !== 0)
      throw('process closed non-zero')

    proc = null
  })
}

function sendPing(port, callback) {
  var options = {
    hostname: '127.0.0.1',
    port: port,
    path: '/ping',
    method: 'POST'
  }

  var req = http.request(options, function(res) {
    var isNull = false
    if(proc === null) {
      isNull = true
    }

    if(res.statusCode !== 200) {
      throw('bad status code')
    }

    res.setEncoding('utf8')
    res.on('data', function (chunk) {
      var data = JSON.parse(chunk)

      if(!data || !data.version)
        throw('bad response')

      if(!firstVersion)
        firstVersion = data.version

      if(isNull && firstVersion == data.version)
        throw('bad deploy')
      else {
        if(data.pid)
          process.kill(data.pid, 'SIGKILL')

        process.exit(0)
      }
    })
  })

  req.on('error', function(e) {
    throw('request failure')
  })

  // write data to request body
  req.write('ping\n')
  req.end()
}
