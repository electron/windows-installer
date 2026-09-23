import path from 'node:path';

import fs from 'fs-extra';

export default function (args) {
  console.log(...args);

  fs.appendFileSync(path.join(import.meta.dirname, 'hook.log'), `${JSON.stringify(args)}\n`);
}
