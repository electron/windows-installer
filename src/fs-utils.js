import { copy as extraCopy } from 'fs-extra';
import { Promise } from 'bluebird';
import temp from 'temp';
import fs from 'fs';

const log = require('debug')('electron-winstaller:fs-utils');

temp.track();

export const copy = Promise.promisify(extraCopy);
export const createTempDir = Promise.promisify(temp.mkdir);
export const readFile = Promise.promisify(fs.readFile);
export const readDir = Promise.promisify(fs.readdir);
export const unlink = Promise.promisify(fs.unlink);
export const writeFile = Promise.promisify(fs.writeFile);
export const rename = Promise.promisify(fs.rename);

const inspect = Promise.promisify(fs.stat);
export async function fileExists(file) {
  let stats;

  try {
    stats = await inspect(file);
    return stats.isFile();
  } catch(err) {
    log(err);
  }

  return false;
}
