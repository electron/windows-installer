# Atom Shell Installer Grunt Plugin

[![Build status](https://ci.appveyor.com/api/projects/status/yd1ybqg3eq397i26/branch/master?svg=true)](https://ci.appveyor.com/project/kevinsawicki/grunt-atom-shell-installer/branch/master)

Grunt plugin that builds Windows installers for
[Atom Shell](https://github.com/atom/atom-shell) apps using
[Squirrel](https://github.com/Squirrel/Squirrel.Windows).

## Installing

```sh
npm install --save-dev grunt-atom-shell-installer
```

## Configuring

In your `Gruntfile.coffee` or `Gruntfile.js` add the following:

```js
grunt.loadNpmTasks('grunt-atom-shell-installer')
```

Then assuming you have an Atom Shell app built at the given `appDirectory`,
you can configure the installer task like so:

```js
'create-windows-installer': {
  appDirectory: '/tmp/build/my-app',
  outputDirectory: '/tmp/build/installer',
  authors: 'My App Inc.',
  exe: 'myapp.exe'
}
```

Then run `grunt create-windows-installer` and you will have an `.nupkg`, a
`RELEASES` file, and a `.exe` installer file in the `outputDirectory` folder.

There are several configuration settings supported:

| Config Name       | Required | Description |
| ----------------- | -------- | ----------- |
| `appDirectory`    | Yes      | The folder path of your Atom Shell-based app |
| `outputDirectory` | No       | The folder path to create the `.exe` installer in. Defaults to the `installer` folder at the project root. |
| `loadingGif`      | No       | The local path to a `.gif` file to display during install. |
| `authors`         | Yes      | The authors value for the nuget package metadata. Defaults to the `author` field from your app's package.json file when unspecified. |
| `owners`          | No       | The owners value for the nuget package metadata. Defaults to the `authors` field when unspecified. |
| `exe`             | No       | The name of your app's main `.exe` file. This uses the `name` field in your app's package.json file with an added `.exe` extension when unspecified. |
| `description`     | No       | The description value for the nuget package metadata. Defaults to the `description` field from your app's package.json file when unspecified. |
| `version`         | No       | The version value for the nuget package metadata. Defaults to the `version` field from your app's package.json file when unspecified. |
| `title`           | No       | The title value for the nuget package metadata. Defaults to the `productName` field from your app's package.json file when unspecified. |
