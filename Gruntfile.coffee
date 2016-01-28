path = require 'path'

module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')

    coffee:
      glob_to_multiple:
        expand: true
        cwd: '.'
        src: ['index.coffee']
        dest: 'tasks'
        ext: '.js'

    coffeelint:
      options:
        no_empty_param_list:
          level: 'error'
        max_line_length:
          level: 'ignore'
      src: [
        '*.coffee'
        'spec/*.coffee'
      ]

    shell:
      test:
        command: "node #{path.join('node_modules', 'jasmine-focused', 'bin', 'jasmine-focused')} --captureExceptions --coffee spec"
        options:
          stdout: true
          stderr: true
          failOnError: true

  grunt.loadNpmTasks('grunt-coffeelint')
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-shell')

  grunt.registerTask 'clean', ->
    grunt.file.delete('tasks') if grunt.file.exists('tasks')
  grunt.registerTask('lint', ['coffeelint'])
  grunt.registerTask('default', ['lint', 'coffee'])
  grunt.registerTask('test', ['default', 'shell:test'])
