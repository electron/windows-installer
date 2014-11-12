fs = require 'fs'
path = require 'path'
temp = require 'temp'
_ = require 'underscore'

temp.track()

module.exports = (grunt) ->
  grunt.registerTask 'create-windows-installer', 'Create the Windows installer', ->
    @requiresConfig("#{@name}.appDirectory")

    done = @async()

    {appDirectory, outputDirectory} = @options()
    outputDirectory ?= path.resolve('.')

    metadata = grunt.file.readJSON('package.json')

    inputTemplate = grunt.file.read(path.join(__dirname, 'template.nuspec'))
    nuspecContent = _.template(inputTemplate, metadata)

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

    console.log cmd
    console.log args

    grunt.util.spawn({cmd, args}, done)
