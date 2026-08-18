import test from 'ava';
import path from 'path';
import { createTempDir } from '../src/temp-utils';
import fs from 'fs/promises';
import { createWindowsInstaller } from '../src';
import { createTempAppDirectory } from './helpers/helpers';
import { SignToolOptions } from '@electron/windows-sign';
import semver from 'semver';

const log = require('debug')('electron-windows-installer:spec');

const exists = (p: string) => fs.access(p).then(() => true).catch(() => false);

if (process.platform === 'win32' && semver.gte(process.version, '20.0.0')) {
  test.serial('creates a signtool.exe and uses it to sign', async (t): Promise<void> => {

    const outputDirectory = await createTempDir('ei-');
    const appDirectory = await createTempAppDirectory();
    const hookLogPath = path.join(__dirname, './helpers/hook.log');
    const hookModulePath = path.join(__dirname, './helpers/windowsSignHook.js');
    const windowsSign: SignToolOptions = { hookModulePath };
    const options = { appDirectory, outputDirectory, windowsSign };

    // Reset
    await fs.rm(hookLogPath, { force: true, recursive: true });

    // Test
    await createWindowsInstaller(options);

    log(`Verifying assertions on ${outputDirectory}`);
    log(JSON.stringify(await fs.readdir(outputDirectory)));

    const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

    t.true(await exists(nupkgPath));
    t.true(await exists(path.join(outputDirectory, 'MyAppSetup.exe')));

    if (process.platform === 'win32') {
      t.true(await exists(path.join(outputDirectory, 'MyAppSetup.msi')));
    }

    log('Verifying Update.exe');
    t.true(await exists(path.join(appDirectory, 'Squirrel.exe')));

    log('Verifying that our hook got to "sign" all files');
    const hookLog = await fs.readFile(hookLogPath, { encoding: 'utf8' });
    const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
    t.is(filesLogged, 8);
  });
}
