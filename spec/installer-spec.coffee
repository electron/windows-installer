fs = require 'fs'
path = require 'path'
jetpack = require 'fs-jetpack'
temp = require 'temp'
{build} = require '../index'

describe 'create-windows-installer task', ->

  appDirectory = jetpack.cwd(__dirname, 'fixtures', 'app')

  beforeEach ->
    updateExePath = appDirectory.path('Update.exe')
    jetpack.remove(updateExePath) if jetpack.exists(updateExePath)

  it 'creates a nuget package and installer', ->
    outputDirectory = jetpack.cwd(temp.mkdirSync('electron-winstaller'))

    config =
      appDirectory: appDirectory.path()
      outputDirectory: outputDirectory.path()

    build config, ->
      expect(outputDirectory.exists('myapp-1.0.0-full.nupkg')).toBe true
      expect(outputDirectory.exists('MyAppSetup.exe')).toBe true

      if process.platform is 'win32'
        expect(outputDirectory.exists('MyAppSetup.msi')).toBe true

      expect(appDirectory.exists('Update.exe')).toBe true
