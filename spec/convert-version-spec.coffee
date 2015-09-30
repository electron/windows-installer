{convertVersion} = require '../index'

describe "convertVersion", ->
  it "makes semver versions into valid NuGet versions", ->
    expect(convertVersion('1')).toBe '1'
    expect(convertVersion('1.2')).toBe '1.2'
    expect(convertVersion('1.2.3')).toBe '1.2.3'
    expect(convertVersion('1.2.3-alpha')).toBe '1.2.3-alpha'
    expect(convertVersion('1.2.3-alpha.1')).toBe '1.2.3-alpha1'
    expect(convertVersion('1.2.3-alpha.1.2')).toBe '1.2.3-alpha12'
    expect(convertVersion('1.2.3-alpha-1-2')).toBe '1.2.3-alpha-1-2'
