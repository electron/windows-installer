import test from 'ava';
import { sanitizeAuthors } from '../src/index';

test('removes "@" characters that NuGet rejects in the authors field', (t): void => {
  t.is(sanitizeAuthors('Jane Doe <jane@example.com>'), 'Jane Doe <janeexample.com>');
  t.is(sanitizeAuthors('@handle'), 'handle');
  t.is(sanitizeAuthors('a@b@c'), 'abc');
});

test('leaves authors without "@" unchanged', (t): void => {
  t.is(sanitizeAuthors('Jane Doe'), 'Jane Doe');
  t.is(sanitizeAuthors(''), '');
});
