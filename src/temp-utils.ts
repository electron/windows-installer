import fs from 'fs-extra';
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
        fs.removeSync(dir);
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
export async function createTempDir(prefix: string): Promise<string> {
  registerCleanup();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  createdTempDirs.push(tempDir);
  return tempDir;
}
