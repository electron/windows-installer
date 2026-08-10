import test from 'ava';
import { assertSupportedArch } from '../src/index';

test('throws for 32-bit architectures', (t): void => {
  t.throws(() => assertSupportedArch('ia32'), { message: '32-bit build machines are not supported' });
  t.throws(() => assertSupportedArch('arm'), { message: '32-bit build machines are not supported' });
});

test('does not throw for 64-bit architectures', (t): void => {
  t.notThrows(() => assertSupportedArch('x64'));
  t.notThrows(() => assertSupportedArch('arm64'));
});
