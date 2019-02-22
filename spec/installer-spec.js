import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/fs-utils';
import fs from 'fs-extra';
import { createWindowsInstaller } from '../src/index.js';

const log = require('debug')('electron-windows-installer:spec');

const appDirectory = path.join(__dirname, 'fixtures/app');

test.beforeEach(async () => {
  const updateExePath = path.join(appDirectory, 'Update.exe');

  if (await fs.pathExists(updateExePath)) {
    await fs.unlink(updateExePath);
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
  log(JSON.stringify(await fs.readdir(outputDirectory)));

  t.true(await fs.pathExists(path.join(outputDirectory, 'myapp-1.0.0-full.nupkg')));
  t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  t.true(await fs.pathExists(path.join(appDirectory, 'Update.exe')));
});
