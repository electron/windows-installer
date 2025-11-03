import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

import * as asar from '@electron/asar';

import debug from 'debug';
import { template } from 'lodash';

import { prepare7z } from './7z.js';
import { Metadata, SquirrelWindowsOptions, PersonMetadata } from './options.js';
import { createTempDir } from './temp-utils.js';
import { createSignTool, resetSignTool } from './sign.js';
import spawn from './spawn-promise.js';

export { SquirrelWindowsOptions } from './options.js';
export { SquirrelWindowsOptions as Options} from './options.js';

const log = debug('electron-windows-installer:main');

/**
 * A utility function to convert SemVer version strings into NuGet-compatible
 * version strings.
 * @param version A SemVer version string
 * @returns A NuGet-compatible version string
 * @see {@link https://semver.org/ | Semantic Versioning specification}
 * @see {@link https://learn.microsoft.com/en-us/nuget/concepts/package-versioning?tabs=semver20sort | NuGet versioning specification}
 */
export function convertVersion(version: string): string {
  const parts = version.split('+')[0].split('-');
  const mainVersion = parts.shift();

  if (parts.length > 0) {
    return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
  } else {
    return mainVersion as string;
  }
}

function checkIfCommandExists(command: string): Promise<boolean> {
  const checkCommand = os.platform() === 'win32' ? 'where' : 'which';
  return new Promise((resolve) => {
    exec(`${checkCommand} ${command}`, (error) => {
      resolve(error ? false : true);
    });
  });
}

/**
 * This package's main function, which creates a Squirrel.Windows executable
 * installer and optionally code-signs the output.
 *
 * @param options Options for installer generation and signing
 * @see {@link https://github.com/Squirrel/Squirrel.Windows | Squirrel.Windows}
 */
export async function createWindowsInstaller(options: SquirrelWindowsOptions): Promise<void> {
  await prepare7z();

  let useMono = false;

  const monoExe = 'mono';
  const wineExe = ['arm64', 'x64'].includes(process.arch) ? 'wine64' : 'wine';

  if (process.platform !== 'win32') {
    useMono = true;
    const [hasWine, hasMono] = await Promise.all([
      checkIfCommandExists(wineExe),
      checkIfCommandExists(monoExe)
    ]);

    if (!hasWine || !hasMono) {
      throw new Error('You must install both Mono and Wine on non-Windows');
    }

    log(`Using Mono: '${monoExe}'`);
    log(`Using Wine: '${wineExe}'`);
  }

  // eslint-disable-next-line prefer-const
  let { appDirectory, outputDirectory, loadingGif } = options;
  outputDirectory = path.resolve(outputDirectory || 'installer');

  const vendorPath = options.vendorDirectory || path.join(__dirname, '..', 'vendor');
  const vendorUpdate = path.join(vendorPath, 'Squirrel.exe');
  const appUpdate = path.join(appDirectory, 'Squirrel.exe');

  await fs.copyFile(vendorUpdate, appUpdate);
  if (options.setupIcon && (options.skipUpdateIcon !== true)) {
    let cmd = path.join(vendorPath, 'rcedit.exe');
    const args = [
      appUpdate,
      '--set-icon', options.setupIcon
    ];

    if (useMono) {
      args.unshift(cmd);
      cmd = wineExe;
    }

    await spawn(cmd, args);
  }

  const defaultLoadingGif = path.join(__dirname, '..', 'resources', 'install-spinner.gif');
  loadingGif = loadingGif ? path.resolve(loadingGif) : defaultLoadingGif;

  const { certificateFile, certificatePassword, remoteReleases, signWithParams, remoteToken, windowsSign } = options;

  const metadata: Metadata = {
    description: '',
    iconUrl: 'https://raw.githubusercontent.com/electron/electron/main/shell/browser/resources/win/electron.ico'
  };

  if (options.usePackageJson !== false) {
    const appResources = path.join(appDirectory, 'resources');
    const asarFile = path.join(appResources, 'app.asar');
    let appMetadata;

    if (existsSync(asarFile)) {
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json').toString());
    } else {
      appMetadata = JSON.parse(await fs.readFile(path.join(appResources, 'app', 'package.json'), 'utf-8'));
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
  metadata.additionalFiles = metadata.additionalFiles || [];

  if (existsSync(path.join(appDirectory, 'swiftshader'))) {
    metadata.additionalFiles.push({ src: 'swiftshader\\**', target: 'lib\\net45\\swiftshader' });
  }

  if (existsSync(path.join(appDirectory, 'vk_swiftshader_icd.json'))) {
    metadata.additionalFiles.push({ src: 'vk_swiftshader_icd.json', target: 'lib\\net45' });
  }

  const templatePath = options.nuspecTemplate || path.join(__dirname, '..', 'template.nuspectemplate');
  let templateData = await fs.readFile(templatePath, 'utf8');
  if (path.sep === '/') {
    templateData = templateData.replace(/\\/g, '/');
    for (const f of metadata.additionalFiles) {
      f.src = f.src.replace(/\\/g, '/');
      f.target = f.target.replace(/\\/g, '/');
    }
  }
  const nuspecContent = template(templateData)(metadata);

  log(`Created NuSpec file:\n${nuspecContent}`);

  const nugetOutput = await createTempDir('si-');
  const targetNuspecPath = path.join(nugetOutput, metadata.name + '.nuspec');

  await fs.writeFile(targetNuspecPath, nuspecContent);

  let cmd = path.join(vendorPath, 'nuget.exe');
  let args = [
    'pack', targetNuspecPath,
    '-BasePath', appDirectory,
    '-OutputDirectory', nugetOutput,
    '-NoDefaultExcludes'
  ];

  if (useMono) {
    args.unshift(cmd);
    cmd = monoExe;
  }

  // Call NuGet to create our package
  log(await spawn(cmd, args));
  const nupkgPath = path.join(nugetOutput, `${metadata.name}.${metadata.version}.nupkg`);

  if (remoteReleases) {
    cmd = path.join(vendorPath, 'SyncReleases.exe');
    args = ['-u', remoteReleases, '-r', outputDirectory];

    if (useMono) {
      args.unshift(cmd);
      cmd = monoExe;
    }

    if (remoteToken) {
      args.push('-t', remoteToken);
    }

    log(await spawn(cmd, args));
  }

  cmd = path.join(vendorPath, 'Squirrel.exe');
  args = [
    '--releasify', nupkgPath,
    '--releaseDir', outputDirectory,
    '--loadingGif', loadingGif
  ];

  if (useMono) {
    args.unshift(path.join(vendorPath, 'Squirrel-Mono.exe'));
    cmd = monoExe;
  }

  // Legacy codesign options
  await resetSignTool();
  if (signWithParams) {
    args.push('--signWithParams');
    if (!signWithParams.includes('/f') && !signWithParams.includes('/p') && certificateFile && certificatePassword) {
      args.push(`${signWithParams} /a /f "${path.resolve(certificateFile)}" /p "${certificatePassword}"`);
    } else {
      args.push(signWithParams);
    }
  } else if (certificateFile && certificatePassword) {
    args.push('--signWithParams');
    args.push(`/a /f "${path.resolve(certificateFile)}" /p "${certificatePassword}"`);
  // @electron/windows-sign options
  } else if (windowsSign) {
    args.push('--signWithParams');
    args.push('windows-sign');
    await createSignTool(options);
  }

  if (options.setupIcon) {
    args.push('--setupIcon');
    args.push(path.resolve(options.setupIcon));
  }

  if (options.noMsi) {
    args.push('--no-msi');
  }

  if (options.noDelta) {
    args.push('--no-delta');
  }

  if (options.frameworkVersion) {
    args.push('--framework-version');
    args.push(options.frameworkVersion);
  }

  log(await spawn(cmd, args));

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
      if (existsSync(unfixedMsiPath)) {
        log(`Renaming ${unfixedMsiPath} => ${msiPath}`);
        await fs.rename(unfixedMsiPath, msiPath);
      }
    }
  }

  await resetSignTool();
}
