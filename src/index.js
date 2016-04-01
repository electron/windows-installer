import template from 'lodash.template';
import spawn from './spawn-promise';
import asar from 'asar';
import path from 'path';
import * as fsUtils from './fs-utils';

const log = require('debug')('electron-windows-installer:main');

async function statNoException(file) {
  try {
    log(file);
    return await fsUtils.inspectAsync(file);
  } catch (e) {
    log(e.message);
    return null;
  }
}

async function locateExecutableInPath(exe) {
  // NB: Windows won't search PATH looking for executables in spawn like
  // Posix does

  // Files with any directory path don't get this applied
  if (exe.match(/[\\\/]/)) {
    log('Path has slash in directory, bailing');
    return exe;
  }

  const target = path.join('.', exe);
  if (await statNoException(target)) {
    log(`Found executable in currect directory: ${target}`);
    return target;
  }

  const haystack = process.env.PATH.split(path.delimiter);
  for (let p of haystack) {
    const needle = path.join(p, exe);
    if (await statNoException(needle)) {
      return needle;
    }
  }

  log('Failed to find executable anywhere in path');
  return null;
}

export function convertVersion(version) {
  const parts = version.split('-');
  const mainVersion = parts.shift();

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

    log(`Using Mono: '${monoExe}'`);
    log(`Using Wine: '${wineExe}'`);
  }

  let { appDirectory, outputDirectory, loadingGif } = options;
  outputDirectory = path.resolve(outputDirectory || 'installer');

  const vendorPath = path.join(__dirname, '..', 'vendor');
  const vendorUpdate = path.join(vendorPath, 'Update.exe');
  const appUpdate = path.join(appDirectory, 'Update.exe');

  await fsUtils.copy(vendorUpdate, appUpdate);

  const defaultLoadingGif = path.join(__dirname, '..', 'resources', 'install-spinner.gif');
  loadingGif = loadingGif ? path.resolve(loadingGif) : defaultLoadingGif;

  let {certificateFile, certificatePassword, remoteReleases, signWithParams, remoteToken} = options;

  const metadata = {
    description: '',
    iconUrl: 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico'
  };

  if (options.usePackageJson !== false) {
    const appResources = path.join(appDirectory, 'resources');
    const asarFile = path.join(appResources, 'app.asar');
    let appMetadata;

    if (await fsUtils.existsFileAsync(asarFile)) {
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'));
    } else {
      appMetadata = JSON.parse(await fsUtils.readFileAsync(path.join(appResources, 'app', 'package.json'), 'utf8'));
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

  let templateData = await fsUtils.readFileAsync(path.join(__dirname, '..', 'template.nuspec'), 'utf8');
  if (path.sep === '/') {
    templateData = templateData.replace(/\\/g, '/');
  }
  const nuspecContent = template(templateData)(metadata);

  log(`Created NuSpec file:\n${nuspecContent}`);

  const nugetOutput = await fsUtils.createTempDir('si-');
  const targetNuspecPath = path.join(nugetOutput, metadata.name + '.nuspec');

  await fsUtils.writeFileAsync(targetNuspecPath, nuspecContent);

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

  log(await spawn(cmd, args));

  if (options.fixUpPaths !== false && metadata.productName) {
    log('Fixing up paths');

    const setupPath = path.join(outputDirectory, `${metadata.productName}Setup.exe`);
    const setupMsiPath = path.join(outputDirectory, `${metadata.productName}Setup.msi`);
    const unfixedSetupPath = path.join(outputDirectory, 'Setup.exe');

    log(`Renaming ${unfixedSetupPath} => ${setupPath}`);

    await fsUtils.renameAsync(unfixedSetupPath, setupPath);

    const msiPath = path.join(outputDirectory, 'Setup.msi');
    if (await fsUtils.existsFileAsync(msiPath)) {
      await fsUtils.renameAsync(msiPath, setupMsiPath);
    }
  }
}
