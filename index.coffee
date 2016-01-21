ChildProcess = require 'child_process'
asar = require 'asar'
temp = require 'temp'
_ = require 'underscore'
jetpack = require 'fs-jetpack'

temp.track()

consoleLogger =
  error: (args...) ->
    console.error.apply(null, args)
  warn: (args...) ->
    console.warn.apply(null, args)
  info: (args...) ->
    console.info.apply(null, args)
  debug: ->

nullLogger =
  error: ->
  warn: ->
  info: ->
  debug: ->

module.exports.build = (config, done) ->
  log = config.log || config.log == false ? nullLogger : consoleLogger

  error = (msg) ->
    log.error(msg)
    done(new Error(msg))

  exec = (options, callback) ->
    ChildProcess.execFile options.cmd, options.args, (error, stdout, stderr) ->
      log.error(stderr) if stderr
      callback(error)

  locateExecutableInPath = (name) ->
    haystack = _.map process.env.PATH.split(/[:;]/), (x) -> jetpack.path(x, name)
    _.find haystack, (needle) -> jetpack.exists(needle)

  if !config.appDirectory
    return error('appDirectory is required configuration')

  useMono = false
  [monoExe, wineExe] = _.map(['mono', 'wine'], locateExecutableInPath)

  unless process.platform is 'win32'
    useMono = true
    return error("You must install both Mono and Wine on non-Windows") unless wineExe and monoExe

    log.debug "Using Mono: '#{monoExe}'"
    log.debug "Using Wine: '#{wineExe}'"

  appDirectory = jetpack.cwd(config.appDirectory)
  vendorDirectory = jetpack.cwd(__dirname, 'vendor')
  resourcesDirectory = jetpack.cwd(__dirname, 'resources')

  # Bundle Update.exe with the app
  vendorDirectory.copy('Update.exe', appDirectory.path('Update.exe'))

  outputDirectory = config.outputDirectory ? 'installer'
  outputDirectory = jetpack.cwd(outputDirectory)

  loadingGif = config.loadingGif ? resourcesDirectory.path('install-spinner.gif')
  loadingGif = jetpack.path(loadingGif)

  {certificateFile, certificatePassword, remoteReleases, signWithParams} = config

  asarFile = appDirectory.path('resources', 'app.asar')
  if jetpack.exists(asarFile)
    appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'))
  else
    appResourcesDirectory = appDirectory.cwd('resources', 'app')
    appMetadata = appResourcesDirectory.read(appResourcesDirectory.path('package.json'), 'json')

  metadata = _.extend({}, appMetadata, config)

  metadata.authors ?= metadata.author?.name ? metadata.author ? ''
  metadata.description ?= ''
  metadata.exe ?= "#{metadata.name}.exe"
  metadata.iconUrl ?= 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico'
  metadata.owners ?= metadata.authors
  metadata.title ?= metadata.productName ? metadata.name

  metadata.version = convertVersion(metadata.version)

  metadata.copyright ?= "Copyright © #{new Date().getFullYear()} #{metadata.authors ? metadata.owners}"

  template = _.template(jetpack.read(jetpack.path(__dirname, 'template.nuspec')))
  nuspecContent = template(metadata)

  nugetOutput = temp.mkdirSync('si')

  targetNuspecPath = jetpack.path(nugetOutput, "#{metadata.name}.nuspec")
  jetpack.write(targetNuspecPath, nuspecContent)

  cmd = vendorDirectory.path('nuget.exe')
  args = [
    'pack'
    targetNuspecPath
    '-BasePath'
    appDirectory.path()
    '-OutputDirectory'
    nugetOutput
    '-NoDefaultExcludes'
  ]

  if useMono
    args.unshift(cmd)
    cmd = monoExe

  syncReleases = (cb) ->
    if remoteReleases?
      cmd = vendorDirectory.path('SyncReleases.exe')
      args = ['-u', remoteReleases, '-r', outputDirectory.path()]

      if useMono
        args.unshift(cmd)
        cmd = monoExe

      exec {cmd, args}, cb
    else
      process.nextTick -> cb()

  exec {cmd, args}, (error) ->
    return done(error) if error?

    nupkgPath = jetpack.path(nugetOutput, "#{metadata.name}.#{metadata.version}.nupkg")

    syncReleases (error) ->
      return done(error) if error?

      cmd = vendorDirectory.path('Update.com')
      args = [
        '--releasify'
        nupkgPath
        '--releaseDir'
        outputDirectory.path()
        '--loadingGif'
        loadingGif
      ]

      if useMono
        args.unshift(vendorDirectory.path('Update-Mono.exe'))
        cmd = monoExe

      if signWithParams?
        args.push '--signWithParams'
        args.push signWithParams
      else if certificateFile? and certificatePassword?
        args.push '--signWithParams'
        args.push "/a /f \"#{jetpack.path(certificateFile)}\" /p \"#{certificatePassword}\""

      if config.setupIcon
        setupIconPath = jetpack.path(config.setupIcon)
        args.push '--setupIcon'
        args.push setupIconPath

      if config.noMsi
        args.push '--no-msi'

      exec {cmd, args}, (error) ->
        return done(error) if error?

        if metadata.productName
          outputDirectory.rename('Setup.exe', "#{metadata.productName}Setup.exe")

          if outputDirectory.exists('Setup.msi')
            outputDirectory.rename('Setup.msi', "#{metadata.productName}Setup.msi")

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
