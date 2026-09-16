import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createTempDir } from '../src/temp-utils.js';
import fs from 'node:fs';
import { createWindowsInstaller } from '../src/index.js';
import spawn from '../src/spawn-promise.js';
import { createTempAppDirectory } from './helpers/helpers.js';
import { createDebug } from 'obug';

const log = createDebug('electron-windows-installer:spec');

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
  log(JSON.stringify(fs.readdirSync(outputDirectory)));

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  assert.ok(fs.existsSync(nupkgPath));
  assert.ok(fs.existsSync(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    assert.ok(fs.existsSync(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  assert.ok(fs.existsSync(path.join(appDirectory, 'Squirrel.exe')));

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
  fs.rmSync(path.join(appDirectory, 'swiftshader', 'libEGL.dll'), { force: true });
  fs.rmSync(path.join(appDirectory, 'swiftshader', 'libGLESv2.dll'), { force: true });
  fs.rmSync(path.join(appDirectory, 'swiftshader'), { force: true, recursive: true });
  fs.rmSync(path.join(appDirectory, 'vk_swiftshader_icd.json'), { force: true });

  await createWindowsInstaller(options);

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  log('Verifying contents of .nupkg');

  const packageContents = await spawn7z(['l', nupkgPath]);
  assert.ok(!packageContents.includes('vk_swiftshader_icd.json'));
  assert.ok(!packageContents.includes('swiftshader\\'));
});
