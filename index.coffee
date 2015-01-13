ChildProcess = require 'child_process'
fs = require 'fs'
asar = require 'asar'
path = require 'path'
temp = require 'temp'
_ = require 'underscore'

temp.track()

module.exports = (grunt) ->
  exec = (options, callback) ->
    ChildProcess.execFile options.cmd, options.args, (error, stdout, stderr) ->
      grunt.log.error(stderr) if stderr
      callback(error)

  grunt.registerTask 'create-windows-installer', 'Create the Windows installer', ->
    @requiresConfig("#{@name}.appDirectory")

    done = @async()

    config = grunt.config(@name)

    appDirectory = path.resolve(config.appDirectory)

    # Bundle Update.exe with the app
    grunt.file.copy(path.resolve(__dirname, '..', 'vendor', 'Update.exe'), path.join(appDirectory, 'Update.exe'))

    outputDirectory = config.outputDirectory ? 'installer'
    outputDirectory = path.resolve(outputDirectory)

    loadingGif = config.loadingGif ? path.resolve(__dirname, '..', 'resources', 'install-spinner.gif')
    loadingGif = path.resolve(loadingGif)

    {certificateFile, certificatePassword} = config

    appResourcesDirectory = path.join(appDirectory, 'resources', 'app')
    if grunt.file.isDir(appResourcesDirectory)
      appMetadata = grunt.file.readJSON(path.join(appResourcesDirectory, 'package.json'))
    else
      appMetadata = JSON.parse(asar.extractFile(path.join(appDirectory, 'resources', 'app.asar'), 'package.json'))
    metadata = _.extend({}, appMetadata, config)

    metadata.authors ?= metadata.author?.name ? metadata.author ? ''
    metadata.description ?= ''
    metadata.exe ?= "#{metadata.name}.exe"
    metadata.iconUrl ?= 'https://raw.githubusercontent.com/atom/atom-shell/master/atom/browser/resources/win/atom.ico'
    metadata.owners ?= metadata.authors
    metadata.title ?= metadata.productName ? metadata.name
    metadata.version = metadata.version.replace(/-.*$/, '')

    template = _.template(grunt.file.read(path.resolve(__dirname, '..', 'template.nuspec')))
    nuspecContent = template(metadata)

    nugetOutput = temp.mkdirSync('squirrel-installer-')

    targetNuspecPath = path.join(nugetOutput, "#{metadata.name}.nuspec")
    grunt.file.write(targetNuspecPath, nuspecContent)

    cmd = path.resolve(__dirname, '..', 'vendor', 'nuget.exe')
    args = [
      'pack'
      targetNuspecPath
      '-BasePath'
      appDirectory
      '-OutputDirectory'
      nugetOutput
      '-NoDefaultExcludes'
    ]

    exec {cmd, args}, (error) ->
      return done(error) if error?

      nupkgPath = path.join(nugetOutput, "#{metadata.name}.#{metadata.version}.nupkg")

      cmd = path.resolve(__dirname, '..', 'vendor', 'Update.com')
      args = [
        '--releasify'
        nupkgPath
        '--releaseDir'
        outputDirectory
        '--loadingGif'
        loadingGif
      ]

      if certificateFile? and certificatePassword?
        args.push '--signWithParams'
        args.push "/a /f \"#{path.resolve(certificateFile)}\" /p \"#{certificatePassword}\""

      if config.setupIcon?
        args.push '--setupIcon'
        args.push config.setupIcon

      exec {cmd, args}, (error) ->
        return done(error) if error?

        if metadata.productName
          setupPath = path.join(outputDirectory, "#{metadata.productName}Setup.exe")
          fs.renameSync(path.join(outputDirectory, 'Setup.exe'), setupPath)

        done()
