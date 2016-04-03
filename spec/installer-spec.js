import path from 'path';
import { createTempDir, fileExists, unlink, readDir } from '../src/fs-utils';
import { createWindowsInstaller } from '../src/index.js';

const d = require('debug')('electron-windows-installer:spec');

describe('create-windows-installer task', function() {
  beforeEach(async function() {
    const updateExePath = path.join(__dirname, 'fixtures', 'app', 'Update.exe');
    if (await fileExists(updateExePath)) {

      await unlink(updateExePath);
    }
  });

  it('creates a nuget package and installer', async function() {
    this.timeout(30*1000);

    const outputDirectory = await createTempDir('ei-');

    const options = {
      appDirectory: path.join(__dirname, 'fixtures/app'),
      outputDirectory: outputDirectory
    };

    await createWindowsInstaller(options);

    d(`Verifying assertions on ${outputDirectory}`);
    d(JSON.stringify(await readDir(outputDirectory)));

    expect(await fileExists(path.join(outputDirectory, 'myapp-1.0.0-full.nupkg'))).to.be.ok;
    expect(await fileExists(path.join(outputDirectory, 'MyAppSetup.exe'))).to.be.ok;

    if (process.platform === 'win32') {
      expect(await fileExists(path.join(outputDirectory, 'MyAppSetup.msi'))).to.be.ok;
    }

    d('Verifying Update.exe');
    expect(await fileExists(path.join(__dirname, 'fixtures', 'app', 'Update.exe'))).to.be.ok;
  });
});
