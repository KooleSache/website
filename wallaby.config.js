/* eslint global-require: 0 */
/* eslint import/no-extraneous-dependencies: 0 */

process.env.BABEL_ENV = 'test'

module.exports = wallaby => ({
  files: [
    'package.json',
    '_js/**/*.js',
    '_js/**/*.js.snap',
    '!_js/**/*.spec.js'
  ],

  tests: ['_js/**/*.spec.js'],

  compilers: {
    '_js/**/*.js': wallaby.compilers.babel()
  },

  env: {
    type: 'node',
    runner: 'node',
    params: {
      runner: '--harmony_proxies'
    }
  },

  testFramework: 'jest'

})
