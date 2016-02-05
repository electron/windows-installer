import './babel-maybefill';

import _ from 'lodash';
import spawn from './spawn-promise';
import asar from 'asar';
import path from 'path';
import temp from 'temp';
import jetpack from 'fs-jetpack';

const d = require('debug')('electron-windows-installer:main');
const isWindows = process.platform === 'win32';

temp.track();

export function p(strings, ...values) {
  let newPath = String.raw(strings, ...values);
  let parts = _.map(newPath.split(/[\\\/]/), (x) => x || '/');

  try {
    return path.resolve(...parts);
  } catch(e) {
    return path.join(...parts);
  }
}

async function statNoException(file) {
  try {
    d(file);
    return await jetpack.inspectAsync(file);
  } catch (e) {
    d(e.message);
    return null;
  }
}

async function locateExecutableInPath(exe) {
  // NB: Windows won't search PATH looking for executables in spawn like
  // Posix does

  // Files with any directory path don't get this applied
  if (exe.match(/[\\\/]/)) {
    d('Path has slash in directory, bailing');
    return exe;
  }

  let target = path.join('.', exe);
  if (await statNoException(target)) {
    d(`Found executable in currect directory: ${target}`);
    return target;
  }

  let haystack = process.env.PATH.split(isWindows ? ';' : ':');
  for (let p of haystack) {
    let needle = path.join(p, exe);
    if (await statNoException(needle)) return needle;
  }

  d('Failed to find executable anywhere in path');
  return null;
}

export function convertVersion(version) {
  let parts = version.split('-');
  let mainVersion = parts.shift();
  if (parts.length > 0) {
    return [mainVersion, parts.join('-').replace(/\./g, '')].join('-');
  } else {
    return mainVersion;
  }
}

export async function createWindowsInstaller(options) {
  let useMono = false;
  let monoExe = await locateExecutableInPath('mono');
  let wineExe = await locateExecutableInPath('wine');

  if (process.platform !== 'win32') {
    useMono = true;
    if (!wineExe || !monoExe) {
      throw new Error("You must install both Mono and Wine on non-Windows");
    }

    d(`Using Mono: '${monoExe}'`);
    d(`Using Wine: '${wineExe}'`);
  }
  let { appDirectory, outputDirectory, loadingGif } = options;
  outputDirectory = p`${outputDirectory || 'installer'}`;

  await jetpack.copyAsync(
    p`${__dirname}/../vendor/Update.exe`,
    p`${appDirectory}/Update.exe`);

  let defaultLoadingGif = p`${__dirname}/../resources/install-spinner.gif`;
  loadingGif = loadingGif ? p`${loadingGif}` : defaultLoadingGif;

  let {certificateFile, certificatePassword, remoteReleases, signWithParams} = options;

  let appMetadata = null;
  let asarFile = p`${appDirectory}/resources/app.asar`;
  if (await jetpack.existsAsync(asarFile)) {
    appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'));
  } else {
    appMetadata = JSON.parse(await jetpack.readAsync(p`${appDirectory}/resources/app/package.json`, 'utf8'));
  }

  let defaults = {
    description: appMetadata.description || '',
    exe: `${appMetadata.name}.exe`,
    iconUrl: 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico',
    title: appMetadata.productName || appMetadata.name
  };

  let metadata = _.assign({}, appMetadata, options, defaults);

  if (!metadata.authors) {
    if (typeof(metadata.author) === 'string') {
      metadata.authors = metadata.author;
    } else {
      metadata.authors = (metadata.authors || {}).name || '';
    }
  }

  metadata.owners = metadata.owners || metadata.authors;
  metadata.version = convertVersion(metadata.version);
  metadata.copyright = metadata.copyright ||
    `Copyright © ${new Date().getFullYear()} ${metadata.authors || metadata.owners}`;

  let templateStamper = _.template(await jetpack.readAsync(p`${__dirname}/../template.nuspec`));
  let nuspecContent = templateStamper(metadata);

  d(`Created NuSpec file:\n${nuspecContent}`);

  let nugetOutput = temp.mkdirSync('si');
  let targetNuspecPath = p`${nugetOutput}/${metadata.name}.nuspec`;
  await jetpack.writeAsync(targetNuspecPath, nuspecContent);

  let cmd = p`${__dirname}/../vendor/nuget.exe`;
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
  d(await spawn(cmd, args));
  let nupkgPath = p`${nugetOutput}/${metadata.name}.${metadata.version}.nupkg`;

  if (remoteReleases) {
    cmd = p`${__dirname}/../vendor/SyncReleases.exe`;
    args = ['-u', remoteReleases, '-r', outputDirectory];

    if (useMono) {
      args.unshift(cmd);
      cmd = monoExe;
    }

    d(await spawn(cmd, args));
  }

  cmd = p`${__dirname}/../vendor/Update.com`;
  args = [
    '--releasify', nupkgPath,
    '--releaseDir', outputDirectory,
    '--loadingGif', loadingGif
  ];

  if (useMono) {
    args.unshift(p`${__dirname}/../vendor/Update-Mono.exe`);
    cmd = monoExe;
  }

  if (signWithParams) {
    args.push('--signWithParams');
    args.push(signWithParams);
  } else if (certificateFile && certificatePassword) {
    args.push('--signWithParams');
    args.push(`/a /f "${path.resolve(certificateFile)}" /p "${certificatePassword}"`);
  }

  if (options.setupIcon) {
    let setupIconPath = p`${options.setupIcon}`;
    args.push('--setupIcon');
    args.push(setupIconPath);
  }

  if (options.noMsi) {
    args.push('--no-msi');
  }

  d(await spawn(cmd, args));

  if (metadata.productName) {
    d('Fixing up paths');
    let setupPath = p`${outputDirectory}/${metadata.productName}Setup.exe`;
    let setupMsiPath = p`${outputDirectory}/${metadata.productName}Setup.msi`;

    await jetpack.renameAsync(p`${outputDirectory}/Setup.exe`, setupPath);

    if (await jetpack.existsAsync(p`${outputDirectory}/Setup.msi`)) {
      await jetpack.renameAsync(p`${outputDirectory}/Setup.msi`, setupMsiPath);
    }
  }
}
