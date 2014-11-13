fs = require 'fs'
path = require 'path'

grunt = require 'grunt'
temp = require 'temp'

describe 'create-windows-installer task', ->
  it 'creates a nuget package', ->
    outputDirectory = temp.mkdirSync('grunt-atom-shell-installer-')

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
      expect(fs.existsSync(path.join(outputDirectory, 'Setup.exe'))).toBe true
