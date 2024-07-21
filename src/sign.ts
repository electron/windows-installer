import type { createSeaSignTool as createSeaSignToolType } from '@electron/windows-sign';
import path from 'path';
import semver from 'semver';
import fs from 'fs-extra';

import { SquirrelWindowsOptions } from './options';

let VENDOR_PATH: string;
let ORIGINAL_SIGN_TOOL_PATH: string;
let BACKUP_SIGN_TOOL_PATH: string;
let SIGN_LOG_PATH: string;

/**
 * This method uses @electron/windows-sign to create a fake signtool.exe
 * that can be called by Squirrel - but then just calls @electron/windows-sign
 * to actually perform the signing.
 *
 * That's useful for users who need a high degree of customization of the signing
 * process but still want to use @electron/windows-installer.
 */
export async function createSignTool(options: SquirrelWindowsOptions): Promise<void> {
  if (!options.windowsSign) {
    throw new Error('Signtool should only be created if windowsSign options are set');
  }

  VENDOR_PATH = options.vendorDirectory;
  ORIGINAL_SIGN_TOOL_PATH = path.join(VENDOR_PATH, 'signtool.exe');
  BACKUP_SIGN_TOOL_PATH = path.join(VENDOR_PATH, 'signtool-original.exe');
  SIGN_LOG_PATH = path.join(VENDOR_PATH, 'electron-windows-sign.log');

  const createSeaSignTool = await getCreateSeaSignTool();

  await resetSignTool();
  await fs.remove(SIGN_LOG_PATH);

  // Make a backup of signtool.exe
  await fs.copy(ORIGINAL_SIGN_TOOL_PATH, BACKUP_SIGN_TOOL_PATH, { overwrite: true });

  // Create a new signtool.exe using @electron/windows-sign
  await createSeaSignTool({
    path: ORIGINAL_SIGN_TOOL_PATH,
    windowsSign: options.windowsSign
  });
}

/**
 * Ensure that signtool.exe is actually the "real" signtool.exe, not our
 * fake substitute.
 */
export async function resetSignTool() {
  if (fs.existsSync(BACKUP_SIGN_TOOL_PATH)) {
    // Reset the backup of signtool.exe
    await fs.copy(BACKUP_SIGN_TOOL_PATH, ORIGINAL_SIGN_TOOL_PATH, { overwrite: true });
    await fs.remove(BACKUP_SIGN_TOOL_PATH);
  }
}

/**
 * @electron/windows-installer only requires Node.js >= 8.0.0.
 * @electron/windows-sign requires Node.js >= 16.0.0.
 * @electron/windows-sign's "fake signtool.exe" feature requires
 * Node.js >= 20.0.0, the first version to contain the "single
 * executable" feature with proper support.
 *
 * Since this is overall a very niche feature and only benefits
 * consumers with rather advanced codesigning needs, we did not
 * want to make Node.js v18 a hard requirement for @electron/windows-installer.
 *
 * Instead, @electron/windows-sign is an optional dependency - and
 * if it didn't install, we'll throw a useful error here.
 *
 * @returns
 */
async function getCreateSeaSignTool(): Promise<typeof createSeaSignToolType> {
  try {
    const { createSeaSignTool } = await import('@electron/windows-sign');
    return createSeaSignTool;
  } catch(error) {
    let message  = 'In order to use windowsSign options, @electron/windows-sign must be installed as a dependency.';

    if (semver.lte(process.version, '20.0.0')) {
      message += ` You are currently using Node.js ${process.version}. Please upgrade to Node.js 19 or later and reinstall all dependencies to ensure that @electron/windows-sign is available.`;
    } else {
      message += ` ${error}`;
    }

    throw new Error(message);
  }
}
