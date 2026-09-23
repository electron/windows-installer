import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';

import debug from 'debug';
import fs from 'fs-extra';

import { createWindowsInstaller } from '../src/index.js';
import spawn from '../src/spawn-promise.js';
import { createTempDir } from '../src/temp-utils.js';
import { createTempAppDirectory } from './helpers/helpers.js';

const log = debug('electron-windows-installer:spec');

function spawn7z(args: string[]): Promise<string> {
  const sevenZipPath = path.join(import.meta.dirname, '..', 'vendor', '7z.exe');
  const wineExe = ['arm64', 'x64'].includes(process.arch) ? 'wine64' : 'wine';
  return process.platform !== 'win32'
    ? spawn(wineExe, [sevenZipPath, ...args])
    : spawn(sevenZipPath, args);
}


test('creates a nuget package and installer', async (): Promise<void> => {
  const outputDirectory = await createTempDir('ei-');
  const appDirectory = await createTempAppDirectory();
  const options = { appDirectory, outputDirectory };

  await createWindowsInstaller(options);

  log(`Verifying assertions on ${outputDirectory}`);
  log(JSON.stringify(await fs.readdir(outputDirectory)));

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  assert.ok(await fs.pathExists(nupkgPath));
  assert.ok(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    assert.ok(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  assert.ok(await fs.pathExists(path.join(appDirectory, 'Squirrel.exe')));

  log('Verifying contents of .nupkg');

  const packageContents = await spawn7z(['l', nupkgPath]);

  assert.ok(packageContents.includes('lib\\net45\\vk_swiftshader_icd.json'));
  assert.ok(packageContents.includes('lib\\net45\\swiftshader\\libEGL.dll'));
});

test('creates an installer when swiftshader files are missing', async (): Promise<void> => {
  const appDirectory = await createTempAppDirectory();
  const outputDirectory = await createTempDir('electron-winstaller-test-');
  const options = { appDirectory, outputDirectory };

  // Remove swiftshader folder and swiftshader json file, simulating Electron < 10.0
  await fs.remove(path.join(appDirectory, 'swiftshader', 'libEGL.dll'));
  await fs.remove(path.join(appDirectory, 'swiftshader', 'libGLESv2.dll'));
  await fs.rmdir(path.join(appDirectory, 'swiftshader'));
  await fs.remove(path.join(appDirectory, 'vk_swiftshader_icd.json'));

  await createWindowsInstaller(options);

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  log('Verifying contents of .nupkg');

  const packageContents = await spawn7z(['l', nupkgPath]);
  assert.ok(!packageContents.includes('vk_swiftshader_icd.json'));
  assert.ok(!packageContents.includes('swiftshader\\'));
});
