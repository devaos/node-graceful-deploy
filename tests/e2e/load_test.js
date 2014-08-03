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

var port = 7000, proc, firstVersion

async.series([findPort, spawnServer], function(err) {
  if(err)
    throw(err)

  sendPing(port)

  setInterval(function(){
    sendPing(port)
  }, 250)

  setTimeout(function(){
    if(proc)
      proc.kill('SIGHUP')
  }, 1000)
})

//==============================================================================

function findPort(callback) {
  portscanner.findAPortNotInUse(7000, 8000, '127.0.0.1', function(err, use) {
      if(use !== false) {
        port = use
        callback(null)
        return
      }

      callback('unable to obtain port')
    }
  )
}

function spawnServer(callback) {
  proc = child.fork(__dirname + '/lib/server-ponger',
    ['--port', port], {silent: true})

  if(!proc)
    throw('unable to fork')

  var on = function(data) {
    //console.log(data.toString())
    if(data.toString().match(/Process \d+ with version \d+ listening on port \d+/)) {
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

      //console.log(data.version.trim())

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
