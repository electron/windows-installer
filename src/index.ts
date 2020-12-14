import * as asar from 'asar';
import { createTempDir } from './temp-utils';
import debug from 'debug';
import * as fs from 'fs-extra';
import { Metadata, Options, PersonMetadata } from './options';
import * as path from 'path';
import rcedit from 'rcedit';
import { canRunWindowsExeNatively, spawnDotNet } from 'cross-spawn-windows-exe';
import template from 'lodash.template';

export { Options } from './options';

const log = debug('electron-windows-installer:main');

export function convertVersion(version: string): string {
  const parts = version.split('-');
  const mainVersion = parts.shift();

  if (parts.length > 0) {
    return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
  } else {
    return mainVersion as string;
  }
}

export async function createWindowsInstaller(options: Options): Promise<void> {
  const { appDirectory } = options;
  let { outputDirectory, loadingGif } = options;
  outputDirectory = path.resolve(outputDirectory || 'installer');

  const vendorPath = path.join(__dirname, '..', 'vendor');
  const vendorUpdate = path.join(vendorPath, 'Squirrel.exe');
  const appUpdate = path.join(appDirectory, 'Squirrel.exe');

  await fs.copy(vendorUpdate, appUpdate);
  if (options.setupIcon && (options.skipUpdateIcon !== true)) {
    await rcedit(appUpdate, { icon: options.setupIcon });
  }

  const defaultLoadingGif = path.join(__dirname, '..', 'resources', 'install-spinner.gif');
  loadingGif = loadingGif ? path.resolve(loadingGif) : defaultLoadingGif;

  const { certificateFile, certificatePassword, remoteReleases, signWithParams, remoteToken } = options;

  const metadata: Metadata = {
    description: '',
    iconUrl: 'https://raw.githubusercontent.com/electron/electron/master/shell/browser/resources/win/electron.ico'
  };

  if (options.usePackageJson !== false) {
    const appResources = path.join(appDirectory, 'resources');
    const asarFile = path.join(appResources, 'app.asar');
    let appMetadata;

    if (await fs.pathExists(asarFile)) {
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'));
    } else {
      appMetadata = await fs.readJson(path.join(appResources, 'app', 'package.json'));
    }

    Object.assign(metadata, {
      exe: `${appMetadata.name}.exe`,
      title: appMetadata.productName || appMetadata.name
    }, appMetadata);
  }

  Object.assign(metadata, options);

  if (!metadata.authors) {
    if (typeof (metadata.author) === 'string') {
      metadata.authors = metadata.author;
    } else {
      metadata.authors = (metadata.author || ({} as PersonMetadata)).name || '';
    }
  }

  metadata.owners = metadata.owners || metadata.authors;
  metadata.version = convertVersion(metadata.version as string);
  metadata.copyright = metadata.copyright ||
    `Copyright © ${new Date().getFullYear()} ${metadata.authors || metadata.owners}`;

  let templateData = await fs.readFile(path.join(__dirname, '..', 'template.nuspectemplate'), 'utf8');
  if (path.sep === '/') {
    templateData = templateData.replace(/\\/g, '/');
  }
  const nuspecContent = template(templateData)(metadata);

  log(`Created NuSpec file:\n${nuspecContent}`);

  const nugetOutputDir = await createTempDir('electron-winstaller-nuget-');
  const targetNuspecPath = path.join(nugetOutputDir, metadata.name + '.nuspec');

  await fs.writeFile(targetNuspecPath, nuspecContent);

  // Call NuGet to create our package
  log(await spawnDotNet(path.join(vendorPath, 'nuget.exe'), [
    'pack', targetNuspecPath,
    '-BasePath', appDirectory,
    '-OutputDirectory', nugetOutputDir,
    '-NoDefaultExcludes'
  ]));
  const nupkgPath = path.join(nugetOutputDir, `${metadata.name}.${metadata.version}.nupkg`);

  if (remoteReleases) {
    const syncReleasesArgs = ['-u', remoteReleases, '-r', outputDirectory];

    if (remoteToken) {
      syncReleasesArgs.push('-t', remoteToken);
    }

    log(await spawnDotNet(path.join(vendorPath, 'SyncReleases.exe'), syncReleasesArgs));
  }

  const squirrelCmd = path.join(vendorPath, canRunWindowsExeNatively() ? 'Squirrel.exe' : 'Squirrel-Mono.exe');
  const squirrelArgs = [
    '--releasify', nupkgPath,
    '--releaseDir', outputDirectory,
    '--loadingGif', loadingGif
  ];

  if (signWithParams) {
    squirrelArgs.push('--signWithParams');
    if (!signWithParams.includes('/f') && !signWithParams.includes('/p') && certificateFile && certificatePassword) {
      squirrelArgs.push(`${signWithParams} /a /f "${path.resolve(certificateFile)}" /p "${certificatePassword}"`);
    } else {
      squirrelArgs.push(signWithParams);
    }
  } else if (certificateFile && certificatePassword) {
    squirrelArgs.push('--signWithParams');
    squirrelArgs.push(`/a /f "${path.resolve(certificateFile)}" /p "${certificatePassword}"`);
  }

  if (options.setupIcon) {
    squirrelArgs.push('--setupIcon');
    squirrelArgs.push(path.resolve(options.setupIcon));
  }

  if (options.noMsi) {
    squirrelArgs.push('--no-msi');
  }

  if (options.noDelta) {
    squirrelArgs.push('--no-delta');
  }

  if (options.frameworkVersion) {
    squirrelArgs.push('--framework-version');
    squirrelArgs.push(options.frameworkVersion);
  }

  log(await spawnDotNet(squirrelCmd, squirrelArgs));

  if (options.fixUpPaths !== false) {
    log('Fixing up paths');

    if (metadata.productName || options.setupExe) {
      const setupPath = path.join(outputDirectory, options.setupExe || `${metadata.productName}Setup.exe`);
      const unfixedSetupPath = path.join(outputDirectory, 'Setup.exe');
      log(`Renaming ${unfixedSetupPath} => ${setupPath}`);
      await fs.rename(unfixedSetupPath, setupPath);
    }

    if (metadata.productName || options.setupMsi) {
      const msiPath = path.join(outputDirectory, options.setupMsi || `${metadata.productName}Setup.msi`);
      const unfixedMsiPath = path.join(outputDirectory, 'Setup.msi');
      if (await fs.pathExists(unfixedMsiPath)) {
        log(`Renaming ${unfixedMsiPath} => ${msiPath}`);
        await fs.rename(unfixedMsiPath, msiPath);
      }
    }
  }
}
