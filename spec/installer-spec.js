import temp from 'temp';
import sfs from 'fs';

import { createWindowsInstaller, p } from '../src/index.js';

temp.track();

const d = require('debug')('electron-windows-installer:spec');

describe('create-windows-installer task', function() {
  beforeEach(function() {
    let updateExePath = p`${__dirname}/fixtures/app/Update.exe`;
    if (sfs.existsSync(updateExePath)) {
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
    
    d('Verifying assertions');
    expect(sfs.existsSync(p`${outputDirectory}/myapp-1.0.0-full.nupkg`)).to.be.ok;
    expect(sfs.existsSync(p`${outputDirectory}/MyAppSetup.exe`)).to.be.ok;

    if (process.platform === 'win32') {
      expect(sfs.existsSync(p`${outputDirectory}/MyAppSetup.msi`)).to.be.ok;
    }

    expect(sfs.existsSync(p`${__dirname}/fixtures/app/Update.exe`)).to.be.ok;
  });
});
