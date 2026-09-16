import path from 'path';
import fs from 'node:fs';

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

  VENDOR_PATH = options.vendorDirectory || path.join(__dirname, '..', 'vendor');
  ORIGINAL_SIGN_TOOL_PATH = path.join(VENDOR_PATH, 'signtool.exe');
  BACKUP_SIGN_TOOL_PATH = path.join(VENDOR_PATH, 'signtool-original.exe');
  SIGN_LOG_PATH = path.join(VENDOR_PATH, 'electron-windows-sign.log');

  // @electron/windows-sign is ESM-only, so it can't be require()d from this CommonJS module.
  const { createSeaSignTool } = await import('@electron/windows-sign');

  await resetSignTool();
  fs.rmSync(SIGN_LOG_PATH);

  // Make a backup of signtool.exe
  fs.cpSync(ORIGINAL_SIGN_TOOL_PATH, BACKUP_SIGN_TOOL_PATH);

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
  if (BACKUP_SIGN_TOOL_PATH && ORIGINAL_SIGN_TOOL_PATH && fs.existsSync(BACKUP_SIGN_TOOL_PATH)) {
    // Reset the backup of signtool.exe
    fs.cpSync(BACKUP_SIGN_TOOL_PATH, ORIGINAL_SIGN_TOOL_PATH);
    fs.rmSync(BACKUP_SIGN_TOOL_PATH, { force: true });
  }
}
