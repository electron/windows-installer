import { Promise } from 'bluebird';
import * as fs from 'fs-extra';

const log = require('debug')('electron-windows-installer:fs-utils');

export const copy = Promise.promisify(fs.copy);
export const readFile = Promise.promisify(fs.readFile);
export const readDir = Promise.promisify(fs.readdir);
export const unlink = Promise.promisify(fs.unlink);
export const rename = Promise.promisify(fs.rename);
export const mkdirs = Promise.promisify(fs.mkdirs);
export const remove = Promise.promisify(fs.remove);

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
