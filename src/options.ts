// Originally from @types/electron-winstaller@2.6.2
// Original definitions by: Brendan Forster <https://github.com/shiftkey>, Daniel Perez Alvarez <https://github.com/unindented>
// Original definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

import { SignToolOptions } from '@electron/windows-sign';

export interface SquirrelWindowsOptions {
  /**
   * The folder path of your Electron app
   */
  appDirectory: string;
  /**
   * The folder path to create the .exe installer in.
   *
   * @defaultValue an `installer` folder at the project root.
   */
  outputDirectory?: string;
  /**
   * The path to the .nuspectemplate file used by Squirrel.exe.
   *
   * @defaultValue the bundled {@link https://github.com/electron/windows-installer/blob/main/template.nuspectemplate | template.nuspectemplate}.
   */
  nuspecTemplate?: string;
  /**
   * The local path to a `.gif` file to display during install.
   * 
   * @defaultValue the bundled {@link https://github.com/electron/windows-installer/blob/main/resources/install-spinner.gif | install-spinner.gif}
   */
  loadingGif?: string;
  /**
   * The `authors` value for the NuGet package metadata.
   *
   * @defaultValue the `author` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  authors?: string;
  /**
   * The `owners` value for the NuGet package metadata.
   *
   * @defaultValue the `authors` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  owners?: string;
  /**
   * The `copyright` value for the NuGet package metadata.
   *
   * @defaultValue a generated copyright with {@link SquirrelWindowsOptions.authors | authors}
   * or {@link SquirrelWindowsOptions.owners | owners}.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  copyright?: string;
  /**
   * The name of your app's main `.exe` file.
   *
   * @defaultValue the `name` field in your app's package.json file with an added `.exe` extension
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   */
  exe?: string;
  /**
   * The `description` value for the NuGet package metadata.
   *
   * @defaultValue the `description` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  description?: string;
  /**
   * The `version` value for the Nuget package metadata.
   *
   * @defaultValue the `version` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  version?: string;
  /**
   * The `title` value for the nuget package metadata.
   *
   * @defaultValue the `productName` field and then the `name` field from your app's package.json
   * file unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/nuget/reference/nuspec | the Microsoft .nuspec reference}.
   */
  title?: string;
  /**
   * Windows Application Model ID (appId).
   *
   * @defaultValue the `name` field in your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   * @see {@link https://learn.microsoft.com/en-us/windows/win32/shell/appids | Microsoft's Application User Model IDs documentation}.
   */
  name?: string;
  /**
   * The path to an Authenticode Code Signing Certificate.
   * 
   * This is a legacy parameter provided for backwards compatibility.
   * For more comprehensive support of various codesigning scenarios
   * like EV certificates, see the
   * {@link SquirrelWindowsOptions.windowsSign | windowsSign} parameter.
   */
  certificateFile?: string;
  /**
   * The password to decrypt the certificate given in `certificateFile`
   * 
   * This is a legacy parameter provided for backwards compatibility.
   * For more comprehensive support of various codesigning scenarios
   * like EV certificates, see the
   * {@link SquirrelWindowsOptions.windowsSign | windowsSign} parameter.
   */
  certificatePassword?: string;
  /**
   * Params to pass to signtool.
   *
   * Overrides {@link SquirrelWindowsOptions.certificateFile | certificateFile}
   * and {@link SquirrelWindowsOptions.certificatePassword | certificatePassword}`.
   * 
   * This is a legacy parameter provided for backwards compatibility.
   * For more comprehensive support of various codesigning scenarios
   * like EV certificates, see the
   * {@link SquirrelWindowsOptions.windowsSign | windowsSign} parameter.
   */
  signWithParams?: string;
  /**
   * A publicly accessible, fully qualified HTTP(S) URL to an ICO file, used as the application icon
   * displayed in Control Panel ➡ Programs and Features. The icon is retrieved at install time.
   * Example: http://example.com/favicon.ico
   *
   * Does not accept `file:` URLs.
   *
   * @defaultValue the Electron icon.
   */
  iconUrl?: string;
  /**
   * The ICO file to use as the icon for the generated Setup.exe
   */
  setupIcon?: string;
  /**
   * The name to use for the generated Setup.exe file
   * @defaultValue the `productName` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   */
  setupExe?: string;
  /**
   * The name to use for the generated Setup.msi file
   * @defaultValue the `productName` field from your app's package.json file
   * unless {@link SquirrelWindowsOptions.usePackageJson | usePackageJson} is false.
   */
  setupMsi?: string;
  /**
   * Enable this flag to prevent Squirrel.Windows from creating an MSI installer.
   * @defaultValue false
   */
  noMsi?: boolean;
  /**
   * Enable this flag to prevent Squirrel.Windows from creating delta packages (disable only if necessary, they are a Good Thing).
   * @defaultValue false
   */
  noDelta?: boolean;
  /**
   * A URL to your existing updates. If given, these will be downloaded to create delta updates.
   */
  remoteReleases?: string;
  /**
   * Authentication token for remote updates using {@link SquirrelWindowsOptions.remoteReleases | remoteReleases}
   */
  remoteToken?: string;
  /**
   * Whether or not to infer metadata options from your app's package.json file.
   * @defaultValue true
   */
  usePackageJson?: boolean;
  /**
   * Set the required .NET framework version (e.g. `net461`).
   */
  frameworkVersion?: string;
  /**
   * Attempt to create more descriptive installer names using metadata parameters.
   * @defaultValue false
   */
  fixUpPaths?: boolean;
  /**
   * Enable this flag to skip setting a custom icon for `Update.exe`
   * @defaultValue false
   */
  skipUpdateIcon?: boolean;

  /**
   * Requires Node.js 18 or newer.
   * 
   * Sign your app with `@electron/windows-sign`, allowing for full customization
   * of the code-signing process - and supports more complicated scenarios like
   * cloud-hosted EV certificates, custom sign pipelines, and per-file overrides.
   * It also supports all existing "simple" codesigning scenarios, including
   * just passing a certificate file and password. 
   * 
   * @see {@link https://github.com/electron/windows-sign | @electron/windows-sign documentation}
   * for all possible configuration options.
   */
  windowsSign?: SignToolOptions;
}

export interface PersonMetadata {
  name: string;
  email?: string;
  url?: string;
}

export interface AdditionalFile {
  src: string;
  target: string;
}

export interface Metadata {
  name?: string;
  productName?: string;
  version?: string;
  copyright?: string;
  author?: string | PersonMetadata;
  authors?: string | PersonMetadata[];
  owners?: string | PersonMetadata[];
  description?: string;
  iconUrl?: string;
  additionalFiles?: AdditionalFile[];
}
