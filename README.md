# Electron Installer

[![Build status](https://ci.appveyor.com/api/projects/status/nxhep80va4d7afjb?svg=true)](https://ci.appveyor.com/project/kevinsawicki/windows-installer)


NPM module that builds Windows installers for
[Electron](https://github.com/atom/electron) apps using
[Squirrel](https://github.com/Squirrel/Squirrel.Windows).

## Installing

```sh
npm install --save-dev electron-winstaller
```

## Usage

Require the package:

```js
var electronInstaller = require('electron-winstaller');
```

Then do a build like so..

```js
electronInstaller.build({
    appDirectory: '/tmp/build/my-app-64',
    outputDirectory: '/tmp/build/installer64',
    authors: 'My App Inc.',
    exe: 'myapp.exe'
  }, done);
```

After running you will have an `.nupkg`, a
`RELEASES` file, and a `.exe` installer file in the `outputDirectory` folder
for each multi task target given under the config entry.

There are several configuration settings supported:

| Config Name           | Required | Description |
| --------------------- | -------- | ----------- |
| `appDirectory`        | Yes      | The folder path of your Electron app |
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
| `signWithParams`      | No       | Params to pass to signtool.  Overrides `certificateFile` and `certificatePassword`. |
| `iconUrl`             | No       | A URL to an ICO file to use as the application icon (displayed in Control Panel > Programs and Features). Defaults to the Atom icon. |
| `setupIcon`           | No       | The ICO file to use as the icon for the generated Setup.exe |
| `noMsi`               | No       | Should Squirrel.Windows create an MSI installer? |
| `remoteReleases`      | No       | A URL to your existing updates. If given, these will be downloaded to create delta updates |
| `remoteToken`      | No       | Authentication token for remote updates |
| `log`                 | No       | By default, logging at info and above goes to console. The value `false` will stop all logging. An object with the functions `error`, `warn`, `info`, `debug` will use those for logging. |

## Sign your installer or else bad things will happen

For development / internal use, creating installers without a signature is okay, but for a production app you need to sign your application. Internet Explorer's SmartScreen filter will block your app from being downloaded, and many anti-virus vendors will consider your app as malware unless you obtain a valid cert.

Any certificate valid for "Authenticode Code Signing" will work here, but if you get the right kind of code certificate, you can also opt-in to [Windows Error Reporting](http://en.wikipedia.org/wiki/Windows_Error_Reporting). [This MSDN page](http://msdn.microsoft.com/en-us/library/windows/hardware/hh801887.aspx) has the latest links on where to get a WER-compatible certificate. The "Standard Code Signing" certificate is sufficient for this purpose.

## Handling Squirrel Events

Squirrel will spawn your app with command line flags on first run, updates,
and uninstalls. it is **very** important that your app handle these events as _early_
as possible, and quit **immediately** after handling them. Squirrel will give your
app a short amount of time (~15sec) to apply these operations and quit.

You should handle these events in your app's `main` entry point with something
such as:

```js
var app = require('app');

var handleStartupEvent = function() {
  if (process.platform !== 'win32') {
    return false;
  }

  var squirrelCommand = process.argv[1];
  switch (squirrelCommand) {
    case '--squirrel-install':
    case '--squirrel-updated':

      // Optionally do things such as:
      //
      // - Install desktop and start menu shortcuts
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Always quit when done
      app.quit();

      return true;
    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Always quit when done
      app.quit();

      return true;
    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated
      app.quit();
      return true;
  }
};

if (handleStartupEvent()) {
  return;
}
```
