fs = require 'fs'
path = require 'path'
temp = require 'temp'
_ = require 'underscore'

temp.track()

module.exports = (grunt) ->
  spawn = (options, callback) ->
    spawnedProcess = grunt.util.spawn(options, callback)
    spawnedProcess.on('error', callback)

  grunt.registerTask 'create-windows-installer', 'Create the Windows installer', ->
    @requiresConfig("#{@name}.appDirectory")

    done = @async()

    {appDirectory, loadingGif, outputDirectory} = grunt.config(@name)
    outputDirectory ?= path.resolve('.')
    loadingGif ?= path.resolve(__dirname, 'resources', 'install-spinner.gif')

    metadata = grunt.file.readJSON(path.join(appDirectory, 'resources', 'app', 'package.json'))

    metadata.authors ?= ''
    metadata.description ?= ''
    metadata.exe ?= "#{metadata.name}.exe"
    metadata.iconUrl ?= 'https://raw.githubusercontent.com/atom/atom-shell/master/atom/browser/resources/win/atom.ico'
    metadata.owners ?= metadata.authors

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

    spawn {cmd, args}, (error, result, code) ->
      return done(error) if error?

      nupkgPath = path.join(outputDirectory, "#{metadata.name}.#{metadata.version}.nupkg")

      cmd = path.resolve(__dirname, '..', 'vendor', 'Update.com')
      args = [
        '--releasify'
        nupkgPath
        '--releaseDir'
        outputDirectory
        '--loadingGif'
        loadingGif
      ]

      spawn {cmd, args}, (error, result, code) ->
        grunt.log.writeln result
        grunt.log.writeln code
        done(error)
