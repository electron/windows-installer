import { Promise } from 'bluebird';
import temp from 'temp';
temp.track();

const createTempDir = Promise.promisify(temp.mkdir);

export {
  createTempDir
};