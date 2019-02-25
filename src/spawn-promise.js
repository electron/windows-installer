import { spawn as spawnOg } from 'child_process';

const d = require('debug')('electron-windows-installer:spawn');

// Public: Maps a process's output into an {Observable}
//
// exe - The program to execute
// params - Arguments passed to the process
// opts - Options that will be passed to child_process.spawn
//
// Returns an {Observable} with a single value, that is the output of the
// spawned process
export default function spawn(exe, params, opts = null) {
  return new Promise((resolve, reject) => {
    let proc = null;

    d(`Spawning ${exe} ${params.join(' ')}`);
    if (!opts) {
      proc = spawnOg(exe, params);
    } else {
      proc = spawnOg(exe, params, opts);
    }

    // We need to wait until all three events have happened:
    // * stdout's pipe is closed
    // * stderr's pipe is closed
    // * We've got an exit code
    let rejected = false;
    let refCount = 3;
    let release = () => {
      if (--refCount <= 0 && !rejected) resolve(stdout);
    };

    let stdout = '';
    let bufHandler = (b) => {
      let chunk = b.toString();
      stdout += chunk;
    };

    proc.stdout.on('data', bufHandler);
    proc.stdout.once('close', release);
    proc.stderr.on('data', bufHandler);
    proc.stderr.once('close', release);
    proc.on('error', (e) => reject(e));

    proc.on('close', code => {
      if (code === 0) {
        release();
      } else {
        rejected = true;
        reject(new Error(`Failed with exit code: ${code}\nOutput:\n${stdout}`));
      }
    });
  });
}
