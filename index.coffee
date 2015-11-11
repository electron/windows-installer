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
      
  locateExecutableInPath = (name) ->
    haystack = _.map process.env.PATH.split(/[:;]/), (x) -> path.join(x, name)
    _.find haystack, (needle) -> fs.existsSync(needle)

  grunt.registerMultiTask 'create-windows-installer', 'Create the Windows installer', ->
    @requiresConfig("#{@name}.#{@target}.appDirectory")
    
    useMono = false
    [monoExe, wineExe] = _.map(['mono', 'wine'], locateExecutableInPath)
    
    unless process.platform is 'win32'
      useMono = true
      throw new Error("You must install both Mono and Wine on non-Windows") unless wineExe and monoExe

    done = @async()

    config = grunt.config("#{@name}.#{@target}")

    appDirectory = path.resolve(config.appDirectory)

    # Bundle Update.exe with the app
    grunt.file.copy(path.resolve(__dirname, '..', 'vendor', 'Update.exe'), path.join(appDirectory, 'Update.exe'))

    outputDirectory = config.outputDirectory ? 'installer'
    outputDirectory = path.resolve(outputDirectory)

    loadingGif = config.loadingGif ? path.resolve(__dirname, '..', 'resources', 'install-spinner.gif')
    loadingGif = path.resolve(loadingGif)

    {certificateFile, certificatePassword, remoteReleases, signWithParams} = config

    asarFile = path.join(appDirectory, 'resources', 'app.asar')
    if fs.existsSync(asarFile)
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'))
    else
      appResourcesDirectory = path.join(appDirectory, 'resources', 'app')
      appMetadata = grunt.file.readJSON(path.join(appResourcesDirectory, 'package.json'))

    metadata = _.extend({}, appMetadata, config)

    metadata.authors ?= metadata.author?.name ? metadata.author ? ''
    metadata.description ?= ''
    metadata.exe ?= "#{metadata.name}.exe"
    metadata.iconUrl ?= 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico'
    metadata.owners ?= metadata.authors
    metadata.title ?= metadata.productName ? metadata.name

    metadata.version = convertVersion(metadata.version)

    metadata.copyright ?= "Copyright © #{new Date().getFullYear()} #{metadata.authors ? metadata.owners}"

    template = _.template(grunt.file.read(path.resolve(__dirname, '..', 'template.nuspec')))
    nuspecContent = template(metadata)

    nugetOutput = temp.mkdirSync('si')

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
    
    if useMono
      args.unshift(cmd)
      cmd = monoExe

    syncReleases = (cb) ->
      if remoteReleases?
        cmd = path.resolve(__dirname, '..', 'vendor', 'SyncReleases.exe')
        args = ['-u', remoteReleases, '-r', outputDirectory]
        
        if useMono
          args.unshift(cmd)
          cmd = monoExe

        exec {cmd, args}, cb
      else
        process.nextTick -> cb()

    exec {cmd, args}, (error) ->
      return done(error) if error?

      nupkgPath = path.join(nugetOutput, "#{metadata.name}.#{metadata.version}.nupkg")

      syncReleases (error) ->
        return done(error) if error?

        cmd = path.resolve(__dirname, '..', 'vendor', 'Update.com')
        args = [
          '--releasify'
          nupkgPath
          '--releaseDir'
          outputDirectory
          '--loadingGif'
          loadingGif
        ]
                
        if useMono
          args.unshift(path.resolve(__dirname, '..', 'vendor', 'Update-Mono.exe'))
          cmd = monoExe

        if signWithParams?
          args.push '--signWithParams'
          args.push signWithParams
        else if certificateFile? and certificatePassword?
          args.push '--signWithParams'
          args.push "/a /f \"#{path.resolve(certificateFile)}\" /p \"#{certificatePassword}\""

        if config.setupIcon
          setupIconPath = path.resolve(config.setupIcon)
          args.push '--setupIcon'
          args.push setupIconPath

        exec {cmd, args}, (error) ->
          return done(error) if error?

          if metadata.productName
            setupPath = path.join(outputDirectory, "#{metadata.productName}Setup.exe")
            setupMsiPath = path.join(outputDirectory, "#{metadata.productName}Setup.msi")
            fs.renameSync(path.join(outputDirectory, 'Setup.exe'), setupPath)
            fs.renameSync(path.join(outputDirectory, 'Setup.msi'), setupMsiPath)

          done()

# NuGet allows pre-release version-numbers, but the pre-release name cannot
# have a dot in it. See the docs:
# https://docs.nuget.org/create/versioning#user-content-prerelease-versions
convertVersion = (version) ->
  parts = version.split('-')
  mainVersion = parts.shift()
  if parts.length > 0
    [mainVersion, parts.join('-').replace(/\./g, '')].join('-')
  else
    mainVersion

module.exports.convertVersion = convertVersion
