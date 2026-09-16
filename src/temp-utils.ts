import fs from 'node:fs';
import os from 'os';
import path from 'path';

const createdTempDirs: string[] = [];
let cleanupRegistered = false;

function registerCleanup(): void {
  if (cleanupRegistered) {
    return;
  }
  cleanupRegistered = true;

  // Mirror `temp.track()`: remove any created temp dirs when the process exits.
  process.on('exit', () => {
    for (const dir of createdTempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup on exit; ignore failures.
      }
    }
  });
}

/**
 * Creates a uniquely-named temporary directory under the OS temp directory and
 * registers it for automatic removal when the process exits.
 *
 * @param prefix - A prefix for the generated directory name.
 * @returns The absolute path to the newly created temporary directory.
 */
export function createTempDir(prefix: string): string {
  registerCleanup();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  createdTempDirs.push(tempDir);
  return tempDir;
}
