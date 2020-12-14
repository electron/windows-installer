import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

export async function createTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
