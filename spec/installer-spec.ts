import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/temp-utils';
import fs from 'fs-extra';
import { createWindowsInstaller } from '../src';
import spawn from '../src/spawn-promise';

const log = require('debug')('electron-windows-installer:spec');

const appDirectory = path.join(__dirname, 'fixtures/app');

test.beforeEach(async (): Promise<void> => {
  const updateExePath = path.join(appDirectory, 'Squirrel.exe');

  if (await fs.pathExists(updateExePath)) {
    await fs.unlink(updateExePath);
  }
});

test('creates a nuget package and installer', async (t): Promise<void> => {
  const outputDirectory = await createTempDir('ei-');

  const options = {
    appDirectory: appDirectory,
    outputDirectory: outputDirectory
  };

  await createWindowsInstaller(options);

  log(`Verifying assertions on ${outputDirectory}`);
  log(JSON.stringify(await fs.readdir(outputDirectory)));

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  t.true(await fs.pathExists(nupkgPath));
  t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  t.true(await fs.pathExists(path.join(appDirectory, 'Squirrel.exe')));

  log('Verifying contents of .nupkg');
  const sevenZipPath = path.join(__dirname, '..', 'vendor', '7z.exe');
  let cmd = sevenZipPath;
  const args = ['l', nupkgPath];

  if (process.platform !== 'win32') {
    args.unshift(cmd);
    const wineExe = process.arch === 'x64' ? 'wine64' : 'wine';
    cmd = wineExe;
  }

  const packageContents = await spawn(cmd, args);
  t.true(packageContents.includes('lib\\net45\\vk_swiftshader_icd.json'));
  t.true(packageContents.includes('lib\\net45\\swiftshader\\libEGL.dll'));
});
