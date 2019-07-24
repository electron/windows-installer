import * as temp from 'temp';
import { promisify } from 'util';
temp.track();

const createTempDir = promisify(temp.mkdir as Function);

export {
  createTempDir
};
