fs = require 'fs'
path = require 'path'

grunt = require 'grunt'
temp = require 'temp'

describe 'create-windows-installer task', ->
  beforeEach ->
    updateExePath = path.join(__dirname, 'fixtures', 'app', 'Update.exe')
    fs.unlinkSync(updateExePath) if fs.existsSync(updateExePath)

  it 'creates a nuget package and installer', ->
    outputDirectory = temp.mkdirSync('grunt-electron-installer-')

    grunt.config.init
      pkg: grunt.file.readJSON(path.join(__dirname, 'fixtures', 'app', 'resources', 'app', 'package.json'))

      'create-windows-installer':
        appDirectory: path.join(__dirname, 'fixtures', 'app')
        outputDirectory: outputDirectory

    grunt.loadTasks(path.resolve(__dirname, '..', 'tasks'))

    tasksDone = false
    grunt.registerTask 'done', 'done',  -> tasksDone = true
    grunt.task.run(['create-windows-installer', 'done']).start()

    waitsFor 30000, -> tasksDone

    runs ->
      expect(fs.existsSync(path.join(outputDirectory, 'myapp-1.0.0-full.nupkg'))).toBe true
      expect(fs.existsSync(path.join(outputDirectory, 'MyAppSetup.exe'))).toBe true
      expect(fs.existsSync(path.join(__dirname, 'fixtures', 'app', 'Update.exe'))).toBe true
