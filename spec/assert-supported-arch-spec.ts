import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSupportedArch } from '../src/index.js';

test('throws for 32-bit architectures', (): void => {
  assert.throws(() => assertSupportedArch('ia32'), { message: '32-bit build machines are not supported' });
  assert.throws(() => assertSupportedArch('arm'), { message: '32-bit build machines are not supported' });
});

test('does not throw for 64-bit architectures', (): void => {
  assert.doesNotThrow(() => assertSupportedArch('x64'));
  assert.doesNotThrow(() => assertSupportedArch('arm64'));
});
