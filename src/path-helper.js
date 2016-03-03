import path from 'path';

export default function p(strings, ...values) {
  const newPath = String.raw(strings, ...values).split(/[\\\/]/).join('/');

  try {
    return path.resolve(newPath);
  } catch(e) {
    return path.join(newPath);
  }
}
