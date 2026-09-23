import path from 'node:path';

import type { SignToolOptions } from '@electron/windows-sign';
import test from 'ava';
import debug from 'debug';
import fs from 'fs-extra';

import { createWindowsInstaller } from '../src/index.js';
import { createTempDir } from '../src/temp-utils.js';
import { createTempAppDirectory } from './helpers/helpers.js';

const log = debug('electron-windows-installer:spec');

if (process.platform === 'win32') {
  test.serial('creates a signtool.exe and uses it to sign', async (t): Promise<void> => {

    const outputDirectory = await createTempDir('ei-');
    const appDirectory = await createTempAppDirectory();
    const hookLogPath = path.join(import.meta.dirname, './helpers/hook.log');
    const hookModulePath = path.join(import.meta.dirname, './helpers/windowsSignHook.js');
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
}
