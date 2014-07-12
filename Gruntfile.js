'use strict'

module.exports = function(grunt) {

  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  //============================================================================

  grunt.initConfig({

    // Lint.
    jshint: {
      options: {
        asi: true,
        node: true,
        validthis: true,
        loopfunc: true,
        laxcomma: true
      },
      files: {
        src: ['tasks/**/*.js','<%= nodeunit.tests %>']
      }
    },

    // Before generating any new files, remove previously-created files.
    clean: {
      coverage: ['coverage'],
      dist: ['coverage', 'node_modules']
    },

    // Unit tests.
    nodeunit: {
      tests: ['tests/*_test.js']
    },

    // Automate version bumps
    //   grunt release:patch
    //   grunt release:minor
    //   grunt release:major
    release: {
      options: {
        add: false,
        npm: true,
        tagName: 'v<%= version %>',
        commitMessage: 'v<%= version %>',
        tagMessage: 'v<%= version %>'
      }
    }

  })

  grunt.loadTasks('tasks')

  //============================================================================

  grunt.registerTask('test', [
    'clean:coverage',
    'nodeunit',
    'clean:coverage'
  ])

  grunt.registerTask('default', ['jshint', 'test'])
}
