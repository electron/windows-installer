import fs from 'node:fs/promises';
import path from 'node:path';

import { createTempDir } from '../../src/temp-utils';

export const FIXTURE_APP_DIR = path.join(__dirname, '../fixtures/app');

export async function createTempAppDirectory(): Promise<string> {
  const appDirectory = await createTempDir('electron-winstaller-ad-');
  await fs.cp(FIXTURE_APP_DIR, appDirectory, { recursive: true });
  return appDirectory;
}
