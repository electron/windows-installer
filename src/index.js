import _ from 'lodash';
import spawn from './spawn-promise';
import asar from 'asar';
import path from 'path';
import temp from 'temp';
import jetpack from 'fs-jetpack';
import fs from 'fs';
import { Promise } from 'bluebird';

const d = require('debug')('electron-windows-installer:main');
const createTempDir = Promise.promisify(temp.mkdir);

temp.track();
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

  let haystack = process.env.PATH.split(path.delimiter);
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
  const monoExe = await locateExecutableInPath('mono');
  const wineExe = await locateExecutableInPath('wine');

  if (process.platform !== 'win32') {
    useMono = true;
    if (!wineExe || !monoExe) {
      throw new Error('You must install both Mono and Wine on non-Windows');
    }

    d(`Using Mono: '${monoExe}'`);
    d(`Using Wine: '${wineExe}'`);
  }
  let { appDirectory, outputDirectory, loadingGif } = options;
  outputDirectory = path.resolve(outputDirectory || 'installer');

  const vendorPath = path.join(__dirname, '..', 'vendor');
  await jetpack.copyAsync(
    path.join(vendorPath, 'Update.exe'),
    path.join(appDirectory, 'Update.exe'),
    { overwrite: true });

  let defaultLoadingGif = path.join(__dirname, '..', 'resources', 'install-spinner.gif');
  loadingGif = loadingGif ? path.resolve(loadingGif) : defaultLoadingGif;

  let {certificateFile, certificatePassword, remoteReleases, signWithParams, remoteToken} = options;

  const metadata = {
    description: '',
    iconUrl: 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico'
  };

  if (options.usePackageJson !== false) {
    const appResources = path.join(appDirectory, 'resources');
    let asarFile = path.join(appResources, 'app.asar');
    let appMetadata;
    if (await jetpack.existsAsync(asarFile)) {
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'));
    }
    else {
      appMetadata = JSON.parse(await jetpack.readAsync(path.join(appResources, 'app', 'package.json'), 'utf8'));
    }

    Object.assign(metadata, {
      exe: `${appMetadata.name}.exe`,
      title: appMetadata.productName || appMetadata.name
    }, appMetadata);
  }

  Object.assign(metadata, options);

  if (!metadata.authors) {
    if (typeof(metadata.author) === 'string') {
      metadata.authors = metadata.author;
    } else {
      metadata.authors = (metadata.author || {}).name || '';
    }
  }

  metadata.owners = metadata.owners || metadata.authors;
  metadata.version = convertVersion(metadata.version);
  metadata.copyright = metadata.copyright ||
    `Copyright © ${new Date().getFullYear()} ${metadata.authors || metadata.owners}`;

  let templateStamper = _.template(await jetpack.readAsync(path.join(__dirname, '..', 'template.nuspec')));
  let nuspecContent = templateStamper(metadata);

  d(`Created NuSpec file:\n${nuspecContent}`);

  let nugetOutput = await createTempDir('si-');
  let targetNuspecPath = path.join(nugetOutput, metadata.name + '.nuspec');
  await jetpack.writeAsync(targetNuspecPath, nuspecContent);

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
  d(await spawn(cmd, args));
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

    d(await spawn(cmd, args));
  }

  cmd = path.join(vendorPath, 'Update.com');
  args = [
    '--releasify', nupkgPath,
    '--releaseDir', outputDirectory,
    '--loadingGif', loadingGif
  ];

  if (useMono) {
    args.unshift(path.join(vendorPath, 'Update-Mono.exe'));
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
    args.push('--setupIcon');
    args.push(path.resolve(options.setupIcon));
  }

  if (options.noMsi) {
    args.push('--no-msi');
  }

  d(await spawn(cmd, args));

  if (options.fixUpPaths !== false && metadata.productName) {
    d('Fixing up paths');
    const setupPath = path.join(outputDirectory, `${metadata.productName}Setup.exe`);
    const setupMsiPath = path.join(outputDirectory, `${metadata.productName}Setup.msi`);

    // NB: When you give jetpack two absolute paths, it acts as if './' is appended
    // to the target and mkdirps the entire path
    const unfixedSetupPath = path.join(outputDirectory, 'Setup.exe');
    d(`Renaming ${unfixedSetupPath} => ${setupPath}`);
    fs.renameSync(unfixedSetupPath, setupPath);

    const msiPath = path.join(outputDirectory, 'Setup.msi');
    if (jetpack.exists(msiPath)) {
      fs.renameSync(msiPath, setupMsiPath);
    }
  }
}
