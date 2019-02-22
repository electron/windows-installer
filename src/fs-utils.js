import pify from 'pify';
import temp from 'temp';
temp.track();

const createTempDir = pify(temp.mkdir);

export {
  createTempDir
};