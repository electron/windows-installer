import fs from 'node:fs/promises';
import path from 'node:path';

import { describe, it, expect } from 'vitest';
import debug from 'debug';

import { createTempDir } from '../src/temp-utils';
import { createWindowsInstaller } from '../src';
import spawn from '../src/spawn-promise';
import { createTempAppDirectory } from './helpers/helpers';
import { existsSync } from 'node:fs';

const log = debug('electron-windows-installer:spec');

function spawn7z(args: string[]): Promise<string> {
  const sevenZipPath = path.join(__dirname, '..', 'vendor', '7z.exe');
  const wineExe = ['arm64', 'x64'].includes(process.arch) ? 'wine64' : 'wine';
  return process.platform !== 'win32'
    ? spawn(wineExe, [sevenZipPath, ...args])
    : spawn(sevenZipPath, args);
}


describe('installer', () => {
  it('creates a nuget package and installer', async (): Promise<void> => {
    const outputDirectory = await createTempDir('ei-');
    const appDirectory = await createTempAppDirectory();
    const options = { appDirectory, outputDirectory };

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

    log('Verifying contents of .nupkg');

    const packageContents = await spawn7z(['l', nupkgPath]);

    expect(packageContents.includes('lib\\net45\\vk_swiftshader_icd.json')).toBe(true);
    expect(packageContents.includes('lib\\net45\\swiftshader\\libEGL.dll')).toBe(true);
  });

  it('creates an installer when swiftshader files are missing', async (): Promise<void> => {
    const appDirectory = await createTempAppDirectory();
    const outputDirectory = await createTempDir('electron-winstaller-test-');
    const options = { appDirectory, outputDirectory };

    // Remove swiftshader folder and swiftshader json file, simulating Electron < 10.0
    await fs.rm(path.join(appDirectory, 'swiftshader', 'libEGL.dll'));
    await fs.rm(path.join(appDirectory, 'swiftshader', 'libGLESv2.dll'));
    await fs.rm(path.join(appDirectory, 'swiftshader'), { recursive: true });
    await fs.rm(path.join(appDirectory, 'vk_swiftshader_icd.json'));

    await createWindowsInstaller(options);

    const nupkgPath = path.join(outputDirectory, 'myapp-1.0.0-full.nupkg');

    log('Verifying contents of .nupkg');

    const packageContents = await spawn7z(['l', nupkgPath]);
    expect(packageContents.includes('vk_swiftshader_icd.json')).toBe(false);
    expect(packageContents.includes('swiftshader\\')).toBe(false);
  });
});
