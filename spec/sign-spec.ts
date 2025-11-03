import fs from 'node:fs/promises';
import path from 'node:path';

import { SignToolOptions } from '@electron/windows-sign';

import { describe, it, expect } from 'vitest';
import debug from 'debug';

import { createTempDir } from '../src/temp-utils';
import { createWindowsInstaller } from '../src';
import { createTempAppDirectory } from './helpers/helpers';
import { existsSync } from 'node:fs';

const log = debug('electron-windows-installer:spec');

describe('sign', () => {
  it('creates a signtool.exe and uses it to sign', async (): Promise<void> => {

    const outputDirectory = await createTempDir('ei-');
    const appDirectory = await createTempAppDirectory();
    const hookLogPath = path.join(__dirname, './helpers/hook.log');
    const hookModulePath = path.join(__dirname, './helpers/windowsSignHook.js');
    const windowsSign: SignToolOptions = { hookModulePath };
    const options = { appDirectory, outputDirectory, windowsSign };

    // Reset
    await fs.rm(hookLogPath, { force: true });

    // Test
    await createWindowsInstaller(options);

    log(`Verifying assertions on ${outputDirectory}`);
    log(JSON.stringify(await fs.readdir(outputDirectory)));

    const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

    expect(existsSync(nupkgPath)).toBe(true);
    expect(existsSync(path.join(outputDirectory, 'MyAppSetup.exe'))).toBe(true);

    if (process.platform === 'win32') {
      expect(existsSync(path.join(outputDirectory, 'MyAppSetup.msi'))).toBe(true);
    }

    log('Verifying Update.exe');
    expect(existsSync(path.join(appDirectory, 'Squirrel.exe'))).toBe(true);

    log('Verifying that our hook got to "sign" all files');
    const hookLog = await fs.readFile(hookLogPath, { encoding: 'utf8' });
    const filesLogged = hookLog.split('\n').filter(v => !!v.trim()).length;
    expect(filesLogged).toBe(8);
  });
});
