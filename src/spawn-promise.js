const spawnOg = require('child_process').spawn;

const d = require('debug')('electron-windows-installer:spawn');

// Public: Maps a process's output into an {Observable}
//
// exe - The program to execute
// params - Arguments passed to the process
// opts - Options that will be passed to child_process.spawn
//
// Returns an {Observable} with a single value, that is the output of the
// spawned process
export default function spawn(exe, params, opts=null) {
  return new Promise((resolve, reject) => {
    let proc = null;

    d(`Spawning ${exe} ${params.join(' ')}`);
    if (!opts) {
      proc = spawnOg(exe, params);
    } else {
      proc = spawnOg(exe, params, opts);
    }

    let stdout = '';
    let bufHandler = (b) => {
      let chunk = b.toString();
      stdout += chunk;
    };

    proc.stdout.on('data', bufHandler);
    proc.stderr.on('data', bufHandler);
    proc.on('error', (e) => reject(e));

    proc.on('close', (code) => {
      // NB: Close fires before stdout fully flushes (i.e. you'll get 'data' 
      // after 'close'), but there is no notification as to when data is fully
      // flushed.
      setTimeout(() => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Failed with exit code: ${code}\nOutput:\n${stdout}`));
        }      
      }, 2000);
    });
  });
}
