import * as temp from 'temp';
import { promisify } from 'util';
temp.track();

const createTempDir = promisify(temp.mkdir);

export {
  createTempDir
};
