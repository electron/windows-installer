import spawn from './spawn-promise';
import asar from 'asar';
import path from 'path';
import * as fsUtils from './fs-utils';
import archiver from 'archiver';
import * as fs from 'fs-extra';
import { Promise } from 'bluebird';

const log = require('debug')('electron-windows-installer');

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
  const useMono = process.platform !== 'win32';
  const { appDirectory } = options;

  const vendorPath = path.join(__dirname, '..', 'vendor');
  const appUpdate = path.join(appDirectory, 'Update.exe');

  await fsUtils.copy(path.join(vendorPath, 'Update.exe'), appUpdate);
  if (options.setupIcon && (options.skipUpdateIcon !== true)) {
    let cmd = path.join(vendorPath, 'rcedit.exe');
    let args = [
      appUpdate,
      '--set-icon', options.setupIcon
    ];

    if (useMono) {
      args.unshift(cmd);
      cmd = 'wine';
    }

    await spawn(cmd, args);
  }

  const metadata = {
    description: '',
    iconUrl: 'https://raw.githubusercontent.com/atom/electron/master/atom/browser/resources/win/atom.ico'
  };

  if (options.usePackageJson !== false) {
    const appResources = path.join(appDirectory, 'resources');
    const asarFile = path.join(appResources, 'app.asar');
    let appMetadata;

    if (await fsUtils.fileExists(asarFile)) {
      appMetadata = JSON.parse(asar.extractFile(asarFile, 'package.json'));
    } else {
      appMetadata = JSON.parse(await fsUtils.readFile(path.join(appResources, 'app', 'package.json'), 'utf8'));
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

  const outputDirectory = path.resolve(options.outputDirectory || 'installer');
  if (options.remoteReleases) {
    let cmd = path.join(vendorPath, 'SyncReleases.exe');
    let args = ['-u', options.remoteReleases, '-r', outputDirectory];

    if (useMono) {
      args.unshift(cmd);
      cmd = 'mono';
    }

    if (options.remoteToken) {
      args.push('-t', options.remoteToken);
    }

    await spawn(cmd, args);
  }

  // todo fix Squirrel.windows "Sharing violation on path" (avoid copy, use file directly)
  const squirrelWorkaroundDir = path.join(outputDirectory, '.tmp');
  await fsUtils.mkdirs(squirrelWorkaroundDir);
  try {
    const nupkgPath = path.join(squirrelWorkaroundDir, 'in.nupkg');
    await pack(metadata, appDirectory, nupkgPath);
    await releasify(nupkgPath, outputDirectory, options, vendorPath);
  }
  finally {
    await fsUtils.remove(squirrelWorkaroundDir);
  }

  if (options.fixUpPaths !== false) {
    log('Fixing up paths');

    if (metadata.productName || options.setupExe) {
      const setupPath = path.join(outputDirectory, options.setupExe || `${metadata.productName}Setup.exe`);
      const unfixedSetupPath = path.join(outputDirectory, 'Setup.exe');
      log(`Renaming ${unfixedSetupPath} => ${setupPath}`);
      await fsUtils.rename(unfixedSetupPath, setupPath);
    }

    if (metadata.productName) {
      const msiPath = path.join(outputDirectory, `${metadata.productName}Setup.msi`);
      const unfixedMsiPath = path.join(outputDirectory, 'Setup.msi');
      if (await fsUtils.fileExists(unfixedMsiPath)) {
        log(`Renaming ${unfixedMsiPath} => ${msiPath}`);
        await fsUtils.rename(unfixedMsiPath, msiPath);
      }
    }
  }
}

function pack(metadata, appDirectory, outFile) {
  return new Promise(function (resolve, reject) {
    const archive = archiver('zip', {store: true});
    const out = fs.createWriteStream(outFile);
    out.on('close', function () {
      resolve(outFile);
    });
    archive.on('error', reject);
    archive.pipe(out);

    archive.directory(appDirectory, 'lib/net45');

    archive.append(`<?xml version="1.0"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="Re0" Target="/${metadata.name}.nuspec" Type="http://schemas.microsoft.com/packaging/2010/07/manifest"/>
  <Relationship Id="Re1" Target="/package/services/metadata/core-properties/1.psmdcp" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"/>
</Relationships>`, {name: '.rels', prefix: '_rels'});

    const author = metadata.authors || metadata.owners;
    const copyright = metadata.copyright ||
                      `Copyright © ${new Date().getFullYear()} ${author}`;
    const version = convertVersion(metadata.version);
    const nuspecContent = `<?xml version="1.0"?>
<package xmlns="http://schemas.microsoft.com/packaging/2011/08/nuspec.xsd">
  <metadata>
    <id>${metadata.name}</id>
    <title>${metadata.title}</title>
    <version>${version}</version>
    <authors>${author}</authors>
    <owners>${metadata.owners || metadata.authors}</owners>
    <iconUrl>${metadata.iconUrl}</iconUrl>
    <requireLicenseAcceptance>false</requireLicenseAcceptance>
    <description>${metadata.description}</description>
    <copyright>${copyright}</copyright>${metadata.extraMetadataSpecs || ''}
  </metadata>
</package>`;
    log(`Created NuSpec file:\n${nuspecContent}`);

    archive.append(nuspecContent, {name: metadata.name + '.nuspec'});

    archive.append(`<?xml version="1.0"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default ContentType="application/vnd.openxmlformats-package.relationships+xml" Extension="rels"/>
  <Default ContentType="application/octet" Extension="nuspec"/>
  <Default ContentType="application/octet" Extension="pak"/>
  <Default ContentType="application/octet" Extension="asar"/>
  <Default ContentType="application/octet" Extension="bin"/>
  <Default ContentType="application/octet" Extension="dll"/>
  <Default ContentType="application/octet" Extension="exe"/>
  <Default ContentType="application/octet" Extension="dat"/>
  <Default ContentType="application/vnd.openxmlformats-package.core-properties+xml" Extension="psmdcp"/>
</Types>`, {name: '[Content_Types].xml'});

    archive.append(`<?xml version="1.0"?>
<coreProperties xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns="http://schemas.openxmlformats.org/package/2006/metadata/core-properties">
  <dc:creator>${author}</dc:creator>
  <dc:description>${metadata.description}</dc:description>
  <dc:identifier>${metadata.name}</dc:identifier>
  <keywords/>
  <lastModifiedBy>NuGet, Version=3.4.0.653, Culture=neutral, PublicKeyToken=31bf3856ad364e35;Unix 15.4.0.0;.NET Framework 4.5</lastModifiedBy>
  <dc:title>${metadata.title}</dc:title>
  <version>${version}</version>
</coreProperties>`, {name: '1.psmdcp', prefix: 'package/services/metadata/core-properties'});

    archive.finalize();
  });
}

async function releasify(nupkgPath, outputDirectory, options, vendorPath) {
  let cmd = path.join(vendorPath, 'Update.com');
  const args = [
    '--releasify', nupkgPath,
    '--releaseDir', outputDirectory,
    '--loadingGif', options.loadingGif ? path.resolve(options.loadingGif) : path.join(__dirname, '..', 'resources', 'install-spinner.gif')
  ];

  if (process.platform !== 'win32') {
    args.unshift(path.join(vendorPath, 'Update-Mono.exe'));
    cmd = 'mono';
  }

  const {certificateFile, certificatePassword, signWithParams} = options;
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

  await spawn(cmd, args);
}