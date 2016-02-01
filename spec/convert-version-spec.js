import './support';

import {convertVersion} from '../src/index';

describe ("convertVersion", function() {
  it("makes semver versions into valid NuGet versions", function() {
    expect(convertVersion('1')).to.equal('1');
    expect(convertVersion('1.2')).to.equal('1.2');
    expect(convertVersion('1.2.3')).to.equal('1.2.3');
    expect(convertVersion('1.2.3-alpha')).to.equal('1.2.3-alpha');
    expect(convertVersion('1.2.3-alpha.1')).to.equal('1.2.3-alpha1');
    expect(convertVersion('1.2.3-alpha.1.2')).to.equal('1.2.3-alpha12');
    expect(convertVersion('1.2.3-alpha-1-2')).to.equal('1.2.3-alpha-1-2');
  });
});
