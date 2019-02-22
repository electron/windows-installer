import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/fs-utils';
import { pathExists, unlink, readdir } from 'fs-extra';
import { createWindowsInstaller } from '../src/index.js';

const log = require('debug')('electron-windows-installer:spec');

const appDirectory = path.join(__dirname, 'fixtures/app');

test.beforeEach(async () => {
  const updateExePath = path.join(appDirectory, 'Update.exe');

  if (await pathExists(updateExePath)) {
    await unlink(updateExePath);
  }
});

test('creates a nuget package and installer', async t => {
  const outputDirectory = await createTempDir('ei-');

  const options = {
    appDirectory: appDirectory,
    outputDirectory: outputDirectory
  };

  await createWindowsInstaller(options);

  log(`Verifying assertions on ${outputDirectory}`);
  log(JSON.stringify(await readdir(outputDirectory)));

  t.true(await pathExists(path.join(outputDirectory, 'myapp-1.0.0-full.nupkg')));
  t.true(await pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    t.true(await pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  t.true(await pathExists(path.join(appDirectory, 'Update.exe')));
});
