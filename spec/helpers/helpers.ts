import path from 'path';
import fs from 'node:fs';

import { createTempDir } from '../../src/temp-utils';

export const FIXTURE_APP_DIR = path.join(import.meta.dirname, '../fixtures/app');

export async function createTempAppDirectory(): Promise<string> {
  const appDirectory = await createTempDir('electron-winstaller-ad-');
  fs.cpSync(FIXTURE_APP_DIR, appDirectory);
  return appDirectory;
}
