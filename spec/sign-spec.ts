import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/temp-utils.js';
import fs from 'node:fs';
import { createWindowsInstaller } from '../src/index.js';
import { createTempAppDirectory } from './helpers/helpers.js';
import type { SignToolOptions } from '@electron/windows-sign' with { 'resolution-mode': 'import' };
import { createDebug } from 'obug';

const log = createDebug('electron-windows-installer:spec');

const windowsOnly = process.platform === 'win32' ? test.serial : test.serial.skip;

windowsOnly('creates a signtool.exe and uses it to sign', async (t): Promise<void> => {
  const outputDirectory = createTempDir('ei-');
  const appDirectory = await createTempAppDirectory();
  const hookLogPath = path.join(import.meta.dirname, './helpers/hook.log');
  const hookModulePath = path.join(import.meta.dirname, './helpers/windowsSignHook.js');
  const windowsSign: SignToolOptions = { hookModulePath };
  const options = { appDirectory, outputDirectory, windowsSign };

  // Reset
  fs.rmSync(hookLogPath, { force: true, recursive: true });

  // Test
  await createWindowsInstaller(options);

  log(`Verifying assertions on ${outputDirectory}`);
  log(JSON.stringify(fs.readdirSync(outputDirectory)));

  const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

  t.true(fs.existsSync(nupkgPath));
  t.true(fs.existsSync(path.join(outputDirectory, 'MyAppSetup.exe')));
  t.true(fs.existsSync(path.join(outputDirectory, 'MyAppSetup.msi')));

  log('Verifying Update.exe');
  t.true(fs.existsSync(path.join(appDirectory, 'Squirrel.exe')));

  log('Verifying that our hook got to "sign" all files');
  const hookLog = fs.readFileSync(hookLogPath, { encoding: 'utf8' });
  const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
  t.is(filesLogged, 8);
});
