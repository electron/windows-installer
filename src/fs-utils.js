import { copy } from 'fs-extra';
import { Promise } from 'bluebird';
import temp from 'temp';
import fs from 'fs';

const log = require('debug')('electron-windows-installer:fs-utils');

temp.track();

const promisedCopy = Promise.promisify(copy);
const promisedCreateTempDir = Promise.promisify(temp.mkdir);
const readFileAsync = Promise.promisify(fs.readFile);
const readDirAsync = Promise.promisify(fs.readdir);
const unlinkAsync = Promise.promisify(fs.unlink);
const writeFileAsync = Promise.promisify(fs.writeFile);
const renameAsync = Promise.promisify(fs.rename);
const inspectAsync = Promise.promisify(fs.stat);

export {
  promisedCopy as copy, 
  promisedCreateTempDir as createTempDir,
  readDirAsync,
  unlinkAsync,
  readFileAsync,
  writeFileAsync,
  inspectAsync,
  renameAsync
};

export async function existsFileAsync(file) {
  let stats;

  try {
    stats = await inspectAsync(file);
    return stats.isFile();
  } catch(err) {
    log(err);
  }

  return false;
}
