import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/temp-utils';
import fs from 'fs-extra';
import { createWindowsInstaller } from '../src';
import { createTempAppDirectory } from './helpers/helpers';
import { SignToolOptions } from '@electron/windows-sign';
import semver from 'semver';

const log = require('debug')('electron-windows-installer:spec');

test.serial('creates a signtool.exe and uses it to sign', async (t): Promise<void> => {
  if (semver.lt(process.version, '18.0.0')) {
    log('Skipping test because Node.js < 18.0.0');
    return;
  }

  const outputDirectory = await createTempDir('ei-');
  const appDirectory = await createTempAppDirectory();
  const hookLogPath = path.join(__dirname, './helpers/hook.log');
  const hookModulePath = path.join(__dirname, './helpers/windowsSignHook.js');
  const windowsSign: SignToolOptions = { hookModulePath };
  const options = { appDirectory, outputDirectory, windowsSign };

  // Reset
  await fs.remove(hookLogPath);

  // Test
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

  log('Verifying that our hook got to "sign" all files');
  const hookLog = await fs.readFile(hookLogPath, { encoding: 'utf8' });
  const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
  t.is(filesLogged, 8);
});
