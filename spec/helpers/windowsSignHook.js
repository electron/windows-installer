const fs = require('fs-extra');
const path = require('path');

module.exports = function(args) {
  console.log(...args);

  fs.appendFileSync(path.join(__dirname, 'hook.log'), `${JSON.stringify(args)}\n`);
};
