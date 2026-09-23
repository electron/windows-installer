import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAuthors } from '../src/index';

test('removes "@" characters that NuGet rejects in the authors field', (): void => {
  assert.equal(sanitizeAuthors('Jane Doe <jane@example.com>'), 'Jane Doe <janeexample.com>');
  assert.equal(sanitizeAuthors('@handle'), 'handle');
  assert.equal(sanitizeAuthors('a@b@c'), 'abc');
});

test('leaves authors without "@" unchanged', (): void => {
  assert.equal(sanitizeAuthors('Jane Doe'), 'Jane Doe');
  assert.equal(sanitizeAuthors(''), '');
});
