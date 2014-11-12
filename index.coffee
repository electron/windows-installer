fs = require 'fs'
path = require 'path'
temp = require 'temp'
_ = require 'underscore'

temp.track()

module.exports = (grunt) ->
  grunt.registerTask 'create-windows-installer', 'Create the Windows installer', ->
    @requiresConfig("#{@name}.appDirectory")

    done = @async()

    {appDirectory, outputDirectory} = grunt.config(@name)
    outputDirectory ?= path.resolve('.')

    metadata = grunt.file.readJSON('package.json')

    template = _.template(grunt.file.read(path.resolve(__dirname, '..', 'template.nuspec')))
    nuspecContent = template(metadata)

    targetNuspecPath = path.join(temp.mkdirSync('squirrel-installer-'), "#{metadata.name}.nuspec")
    grunt.file.write(targetNuspecPath, nuspecContent)

    cmd = path.resolve(__dirname, '..', 'vendor', 'nuget.exe')
    args = [
      'pack'
      targetNuspecPath
      '-BasePath'
      appDirectory
      '-OutputDirectory'
      outputDirectory
    ]

    console.log targetNuspecPath

    grunt.util.spawn {cmd, args}, (error, result, code) ->
      grunt.log.writeln(result)
      done(error)
