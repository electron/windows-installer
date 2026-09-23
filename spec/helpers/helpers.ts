import path from 'node:path';

import fs from 'fs-extra';

import { createTempDir } from '../../src/temp-utils.js';

export const FIXTURE_APP_DIR = path.join(import.meta.dirname, '../fixtures/app');

export async function createTempAppDirectory(): Promise<string> {
  const appDirectory = await createTempDir('electron-winstaller-ad-');
  await fs.copy(FIXTURE_APP_DIR, appDirectory);
  return appDirectory;
}
