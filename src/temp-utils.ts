import { mkdtemp } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const mkdtempAsync = promisify(mkdtemp);

const createTempDir = (prefix: string) => mkdtempAsync(join(tmpdir(), prefix));

export {
  createTempDir
};
