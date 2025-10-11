import fs from 'node:fs/promises';
import path from 'node:path';

import { SignToolOptions } from '@electron/windows-sign';

import test from 'ava';
import debug from 'debug';

import { createTempDir } from '../src/temp-utils';
import { createWindowsInstaller } from '../src';
import { createTempAppDirectory } from './helpers/helpers';
import { existsSync } from 'node:fs';

const log = debug('electron-windows-installer:spec');

test.serial('creates a signtool.exe and uses it to sign', async (t): Promise<void> => {

  const outputDirectory = await createTempDir('ei-');
  const appDirectory = await createTempAppDirectory();
  const hookLogPath = path.join(__dirname, './helpers/hook.log');
  const hookModulePath = path.join(__dirname, './helpers/windowsSignHook.js');
  const windowsSign: SignToolOptions = { hookModulePath };
  const options = { appDirectory, outputDirectory, windowsSign };

  // Reset
  await fs.rm(hookLogPath);

  // Test
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

  log('Verifying that our hook got to "sign" all files');
  const hookLog = await fs.readFile(hookLogPath, { encoding: 'utf8' });
  const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
  t.is(filesLogged, 8);
});
