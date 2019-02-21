import { Promise } from 'bluebird';
import { copy, readFile, unlink, writeFile, rename, stat, pathExists, readdir } from 'fs-extra';
import temp from 'temp';
temp.track();

const createTempDir = Promise.promisify(temp.mkdir);
const inspect = stat;
const fileExists = pathExists;
const readDir = readdir;

export {
  copy,
  createTempDir,
  readFile,
  readDir,
  unlink,
  writeFile,
  rename,
  inspect,
  fileExists
};