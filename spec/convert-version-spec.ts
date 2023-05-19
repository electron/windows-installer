import test from 'ava';
import { convertVersion } from '../src/index';

test('makes semver versions into valid NuGet versions', (t): void => {
  t.is(convertVersion('1'), '1');
  t.is(convertVersion('1.2'), '1.2');
  t.is(convertVersion('1.2.3'), '1.2.3');
  t.is(convertVersion('1.2.3-alpha'), '1.2.3-alpha');
  t.is(convertVersion('1.2.3-alpha.1'), '1.2.3-alpha1');
  t.is(convertVersion('1.2.3-alpha.1.2'), '1.2.3-alpha12');
  t.is(convertVersion('1.2.3-alpha-1-2'), '1.2.3-alpha-1-2');
  t.is(convertVersion('1.2.3-alpha.1.2+build-meta.1.2'), '1.2.3-alpha12');
  t.is(convertVersion('1.2.3-alpha-1-2+build-meta.1.2'), '1.2.3-alpha-1-2');
});
