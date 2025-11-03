import fs from 'node:fs';
import path from 'node:path';

module.exports = function(args) {
  console.log(...args);

  fs.appendFileSync(path.join(__dirname, 'hook.log'), `${JSON.stringify(args)}\n`);
};
