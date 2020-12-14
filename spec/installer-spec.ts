import { createTempDir } from '../src/temp-utils';
import { createWindowsInstaller } from '../src';
import debug from 'debug';
import * as fs from 'fs-extra';
import * as path from 'path';
import test from 'ava';

const log = debug('electron-windows-installer:spec');

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

  t.true(await fs.pathExists(path.join(outputDirectory, 'myapp-1.0.0-full.nupkg')));
  t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    t.true(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  t.true(await fs.pathExists(path.join(appDirectory, 'Squirrel.exe')));
});
