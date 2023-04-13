// Originally from @types/electron-winstaller@2.6.2
// Original definitions by: Brendan Forster <https://github.com/shiftkey>, Daniel Perez Alvarez <https://github.com/unindented>
// Original definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

export interface SquirrelWindowsOptions {
  /**
   * The folder path of your Electron app
   */
  appDirectory: string;
  /**
   * The folder path to create the .exe installer in.
   *
   * Defaults to the installer folder at the project root.
   */
  outputDirectory?: string;
  /**
   * The local path to a `.gif` file to display during install.
   */
  loadingGif?: string;
  /**
   * The authors value for the nuget package metadata.
   *
   * Defaults to the `author` field from your app's package.json file when unspecified.
   */
  authors?: string;
  /**
   * The owners value for the nuget package metadata.
   *
   * Defaults to the `authors` field when unspecified.
   */
  owners?: string;
  /**
   * The copyright value for the nuget package metadata.
   *
   * Defaults to a generated copyright with `authors` or `owners`.
   */
  copyright?: string;
  /**
   * The name of your app's main `.exe` file.
   *
   * This uses the `name` field in your app's package.json file with an added `.exe` extension when unspecified.
   */
  exe?: string;
  /**
   * The description value for the nuget package metadata.
   *
   * Defaults to the `description` field from your app's package.json file when unspecified.
   */
  description?: string;
  /**
   * The version value for the nuget package metadata.
   *
   * Defaults to the `version` field from your app's package.json file when unspecified.
   */
  version?: string;
  /**
   * The title value for the nuget package metadata.
   *
   * Defaults to the `productName` field and then the `name` field from your app's package.json file when unspecified.
   */
  title?: string;
  /**
   * Windows Application Model ID (appId).
   *
   * Defaults to the name field in your app's package.json file.
   */
  name?: string;
  /**
   * The path to an Authenticode Code Signing Certificate
   */
  certificateFile?: string;
  /**
   * The password to decrypt the certificate given in `certificateFile`
   */
  certificatePassword?: string;
  /**
   * Params to pass to signtool.
   *
   * Overrides `certificateFile` and `certificatePassword`.
   */
  signWithParams?: string;
  /**
   * A publicly accessible, fully qualified HTTP(S) URL to an ICO file, used as the application icon
   * displayed in Control Panel ➡ Programs and Features. The icon is retrieved at install time.
   * Example: http://example.com/favicon.ico
   *
   * Does not accept `file:` URLs.
   *
   * Defaults to the Electron icon.
   */
  iconUrl?: string;
  /**
   * The ICO file to use as the icon for the generated Setup.exe
   */
  setupIcon?: string;
  /**
   * The name to use for the generated Setup.exe file
   */
  setupExe?: string;
  /**
   * The name to use for the generated Setup.msi file
   */
  setupMsi?: string;
  /**
   * Should Squirrel.Windows create an MSI installer?
   */
  noMsi?: boolean;
  /**
   * Should Squirrel.Windows delta packages? (disable only if necessary, they are a Good Thing)
   */
  noDelta?: boolean;
  /**
   * A URL to your existing updates. If given, these will be downloaded to create delta updates
   */
  remoteReleases?: string;
  /**
   * Authentication token for remote updates
   */
  remoteToken?: string;

  usePackageJson?: boolean;

  frameworkVersion?: string;

  fixUpPaths?: boolean;

  skipUpdateIcon?: boolean;
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
