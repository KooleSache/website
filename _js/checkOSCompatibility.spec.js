/* eslint no-unused-expressions: 0 */

import checkOSCompatibility from './checkOSCompatibility'

describe('checkOSCompatibility', () => {

  it('should be defined', () => {
    expect(checkOSCompatibility).not.toBe(undefined)
  })

  it('should return true for OS X 10.9+ and macOS', () => {
    expect(checkOSCompatibility('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36')).toEqual(true)
    expect(checkOSCompatibility('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36')).toEqual(true)
    expect(checkOSCompatibility('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36')).toEqual(true)
    expect(checkOSCompatibility('Mozilla/5.0 (Macintosh; Intel Mac OS X 11_0_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36')).toEqual(true)
  })

  it('should return false for OS X 10.8- and macOS', () => {
    expect(checkOSCompatibility('mozilla/5.0 (macintosh; intel mac os x 10_8_5)' +
            ' applewebkit/537.36 (khtml, like gecko) chrome/51.0.2704.84 safari/537.36')).toEqual(false)
    expect(checkOSCompatibility('mozilla/5.0 (macintosh; intel mac os x 9_7_5)' +
            ' applewebkit/537.36 (khtml, like gecko) chrome/51.0.2704.84 safari/537.36')).toEqual(false)
  })

  it('should return false for not OS X or not macOS', () => {
    expect(checkOSCompatibility('mozilla/5.0 (macintosh; windows 10)' +
            ' applewebkit/537.36 (khtml, like gecko) chrome/51.0.2704.84 safari/537.36')).toEqual(false)
    expect(checkOSCompatibility('mozilla/5.0 (linux)' +
            ' applewebkit/537.36 (khtml, like gecko) chrome/51.0.2704.84 safari/537.36')).toEqual(false)
  })

})
