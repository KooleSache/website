module.exports = function (wallaby) {
  return {
    debug: true,
    files: [
      '_js/**/*.js',
      '!_js/**/*.spec.js'
    ],

    tests: [
      '_js/**/*.spec.js'
    ],

    compilers: {
      '**/*.js': wallaby.compilers.babel()
    },

    env: {
      type: 'node'
    }
  }
}
