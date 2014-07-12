'use strict'

module.exports = function(grunt) {

  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  //============================================================================

  grunt.initConfig({

    // Lint.
    jshint: {
      options: {
        node: true,
        laxcomma: true,
        asi: true,
      },
      files: {
        src: ['lib/**/*.js', 'tests/**/*.js']
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

  //============================================================================

  grunt.registerTask('test', [
    'clean:coverage',
    'nodeunit',
    'clean:coverage'
  ])

  grunt.registerTask('default', ['jshint', 'test'])
}
