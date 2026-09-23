import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { createTempDir } from '../src/temp-utils';
import fs from 'fs-extra';
import { createWindowsInstaller } from '../src';
import { createTempAppDirectory } from './helpers/helpers';
import type { SignToolOptions } from '@electron/windows-sign' with { 'resolution-mode': 'import' };

const log = require('debug')('electron-windows-installer:spec');

test('creates a signtool.exe and uses it to sign', { skip: process.platform !== 'win32' }, async (): Promise<void> => {

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

  assert.ok(await fs.pathExists(nupkgPath));
  assert.ok(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.exe')));

  if (process.platform === 'win32') {
    assert.ok(await fs.pathExists(path.join(outputDirectory, 'MyAppSetup.msi')));
  }

  log('Verifying Update.exe');
  assert.ok(await fs.pathExists(path.join(appDirectory, 'Squirrel.exe')));

  log('Verifying that our hook got to "sign" all files');
  const hookLog = await fs.readFile(hookLogPath, { encoding: 'utf8' });
  const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
  assert.equal(filesLogged, 8);
});
