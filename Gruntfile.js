'use strict'

module.exports = function(grunt) {

  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks)

  //============================================================================

  grunt.initConfig({

    // Lint
    jshint: {
      options: {
        node: true,
        laxcomma: true,
        asi: true,
        validthis: true,
        newcap: false
      },
      files: {
        src: ['lib/**/*.js', 'tests/**/*.js']
      }
    },

    // Before generating any new files, remove previously-created files
    clean: {
      coverage: ['coverage'],
      dist: ['coverage', 'node_modules']
    },

    // Unit tests
    nodeunit: {
      tests: ['tests/unit/*_test.js']
    },

    // Test while you work
    watch: {
      dev: {
        files: ['lib/**/*.js', 'tests/**/*.js'],
        tasks: ['test'],
      },
      'dev-quick': {
        files: ['lib/**/*.js', 'tests/**/*.js'],
        tasks: ['jshint'],
      }
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
    'jshint',
    'nodeunit',
    'clean:coverage'
  ])

  grunt.registerTask('develop', ['test', 'watch:dev'])

  grunt.registerTask('default', ['test'])
}
