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

| Config Name           | Required | Description |
| --------------------- | -------- | ----------- |
| `appDirectory`        | Yes      | The folder path of your Atom Shell-based app |
| `outputDirectory`     | No       | The folder path to create the `.exe` installer in. Defaults to the `installer` folder at the project root. |
| `loadingGif`          | No       | The local path to a `.gif` file to display during install. |
| `authors`             | Yes      | The authors value for the nuget package metadata. Defaults to the `author` field from your app's package.json file when unspecified. |
| `owners`              | No       | The owners value for the nuget package metadata. Defaults to the `authors` field when unspecified. |
| `exe`                 | No       | The name of your app's main `.exe` file. This uses the `name` field in your app's package.json file with an added `.exe` extension when unspecified. |
| `description`         | No       | The description value for the nuget package metadata. Defaults to the `description` field from your app's package.json file when unspecified. |
| `version`             | No       | The version value for the nuget package metadata. Defaults to the `version` field from your app's package.json file when unspecified. |
| `title`               | No       | The title value for the nuget package metadata. Defaults to the `productName` field and then the `name` field from your app's package.json file when unspecified. |
| `certificateFile`     | No       | The path to an Authenticode Code Signing Certificate |
| `certificatePassword` | No       | The password to decrypt the certificate given in `certificateFile` |
| `setupIcon`           | No       | The ICO file to use as the icon for the generated Setup.exe |
| `remoteReleases`      | No       | A URL to your existing updates. If given, these will be downloaded to create delta updates |

## Sign your installer or else bad things will happen

For development / internal use, creating installers without a signature is okay, but for a production app you need to sign your application. Internet Explorer's SmartScreen filter will block your app from being downloaded, and many anti-virus vendors will consider your app as malware unless you obtain a valid cert.

Any certificate valid for "Authenticode Code Signing" will work here, but if you get the right kind of code certificate, you can also opt-in to [Windows Error Reporting](http://en.wikipedia.org/wiki/Windows_Error_Reporting). [This MSDN page](http://msdn.microsoft.com/en-us/library/windows/hardware/hh801887.aspx) has the latest links on where to get a WER-compatible certificate. The "Standard Code Signing" certificate is sufficient for this purpose.
