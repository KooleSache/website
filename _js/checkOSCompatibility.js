import easyPattern from 'easypattern'

export default function checkOSCompatibility(ua) {
  const pattern = easyPattern('{*}mac os {*} {major}_{minor}_{patch}')
  const { major, minor } = pattern.match(ua.toLowerCase())
  return (major === 10 && minor >= 9) || (major >= 11)
}
