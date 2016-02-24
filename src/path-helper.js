import _ from 'lodash';
import path from 'path';

export default function p(strings, ...values) {
  let newPath = String.raw(strings, ...values);
  let parts = _.map(newPath.split(/[\\\/]/), (x) => x || '/');

  try {
    return path.resolve(...parts);
  } catch(e) {
    return path.join(...parts);
  }
}
