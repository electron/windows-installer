import { mkdtemp } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const mkdtempAsync = promisify(mkdtemp);

export function createTempDir(prefix: string): Promise<string> {
  return mkdtempAsync(join(tmpdir(), prefix));
}
