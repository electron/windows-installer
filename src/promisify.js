import _ from 'lodash';
import pify from 'pify';

const toImport = [ 'fs' ];

module.exports = _.reduce(toImport, (acc,x) => {
  if (x == 'fs') {
    acc[x] = pify(require('fs-extra'));
  } else {
    acc[x] = pify(require(x));
  }

  return acc;
}, {});
