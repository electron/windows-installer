import temp from 'temp';
import jetpack from 'fs-jetpack';
import sfs from 'fs';

import { createWindowsInstaller, p } from '../src/index.js';

temp.track();

const d = require('debug')('electron-windows-installer:spec');

describe('create-windows-installer task', function() {
  beforeEach(async function() {
    let updateExePath = p`${__dirname}/fixtures/app/Update.exe`;
    if (await jetpack.existsAsync(updateExePath)) {
      // NB: Jetpack doesn't have unlink?
      sfs.unlinkSync(updateExePath);
    }
  });

  it('creates a nuget package and installer', async function() {
    this.timeout(30*1000);
    
    let outputDirectory = temp.mkdirSync('ei-');
    
    let options = {
      appDirectory: p`${__dirname}/fixtures/app`,
      outputDirectory: outputDirectory
    };
    
    await createWindowsInstaller(options);
    
    d(`Verifying assertions on ${outputDirectory}`);
    d(JSON.stringify(sfs.readdirSync(outputDirectory)));
    expect(await jetpack.existsAsync(p`${outputDirectory}/myapp-1.0.0-full.nupkg`)).to.be.ok;
    expect(await jetpack.existsAsync(p`${outputDirectory}/MyAppSetup.exe`)).to.be.ok;

    if (process.platform === 'win32') {
      expect(await jetpack.existsAsync(p`${outputDirectory}/MyAppSetup.msi`)).to.be.ok;
    }

    d('Verifying Update.exe');
    expect(await jetpack.existsAsync(p`${__dirname}/fixtures/app/Update.exe`)).to.be.ok;
  });
});
