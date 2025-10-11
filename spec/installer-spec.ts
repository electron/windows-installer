import fs from 'node:fs/promises';
import path from 'node:path';

import test from 'ava';
import debug from 'debug';

import { createTempDir } from '../src/temp-utils';
import { createWindowsInstaller } from '../src';
import spawn from '../src/spawn-promise';
import { createTempAppDirectory } from './helpers/helpers';
import { existsSync } from 'node:fs';

const log = debug('electron-windows-installer:spec');

function spawn7z(args: string[]): Promise<string> {
  const sevenZipPath = path.join(__dirname, '..', 'vendor', '7z.exe');
  const wineExe = ['arm64', 'x64'].includes(process.arch) ? 'wine64' : 'wine';
  return process.platform !== 'win32'
    ? spawn(wineExe, [sevenZipPath, ...args])
    : spawn(sevenZipPath, args);
}


test.serial('creates a nuget package and installer', async (t): Promise<void> => {
  const outputDirectory = await createTempDir('ei-');
  const appDirectory = await createTempAppDirectory();
  const options = { appDirectory, outputDirectory };

  await createWindowsInstaller(options);

  log(`Verifying assertions on ${outputDirectory}`);
  log(JSON.stringify(await fs.readdir(outputDirectory)));

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  t.true(existsSync(nupkgPath));
  t.true(existsSync(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    t.true(existsSync(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  t.true(existsSync(path.join(appDirectory, 'Squirrel.exe')));

  log('Verifying contents of .nupkg');

  const packageContents = await spawn7z(['l', nupkgPath]);

  t.true(packageContents.includes('lib\\net45\\vk_swiftshader_icd.json'));
  t.true(packageContents.includes('lib\\net45\\swiftshader\\libEGL.dll'));
});

test.serial('creates an installer when swiftshader files are missing', async (t): Promise<void> => {
  const appDirectory = await createTempAppDirectory();
  const outputDirectory = await createTempDir('electron-winstaller-test-');
  const options = { appDirectory, outputDirectory };

  // Remove swiftshader folder and swiftshader json file, simulating Electron < 10.0
  await fs.rm(path.join(appDirectory, 'swiftshader', 'libEGL.dll'));
  await fs.rm(path.join(appDirectory, 'swiftshader', 'libGLESv2.dll'));
  await fs.rm(path.join(appDirectory, 'swiftshader'), { recursive: true });
  await fs.rm(path.join(appDirectory, 'vk_swiftshader_icd.json'));

  await createWindowsInstaller(options);

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  log('Verifying contents of .nupkg');

  const packageContents = await spawn7z(['l', nupkgPath]);
  t.false(packageContents.includes('vk_swiftshader_icd.json'));
  t.false(packageContents.includes('swiftshader\\'));
});
