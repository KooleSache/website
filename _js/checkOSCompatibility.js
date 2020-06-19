import easyPattern from 'easypattern'

export default function checkOSCompatibility(ua) {
  const pattern = easyPattern('{*}mac os {*} {major}_{minor}_{patch}')
  const { major, minor } = pattern.match(ua.toLowerCase())
  return (Number(major) === 10 && Number(minor) >= 12) || (Number(major) >= 11)
}
