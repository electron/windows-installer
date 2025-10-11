import fs from 'fs';
import os from 'os';
import path from 'path';

export async function prepare7z() {
  const baseDir = path.resolve(__dirname, '..');

  /**
   * Even if we're cross-compiling for a different arch like arm64,
   * we still need to use the 7-Zip executable for the host arch
   */
  const arch = os.arch;

  // Copy the 7-Zip executable for the configured architecture.
  fs.copyFileSync(path.resolve(baseDir, 'vendor/7z-' + arch + '.exe'), path.resolve(baseDir, 'vendor/7z.exe'));
  fs.copyFileSync(path.resolve(baseDir, 'vendor/7z-' + arch + '.dll'), path.resolve(baseDir, 'vendor/7z.dll'));
}