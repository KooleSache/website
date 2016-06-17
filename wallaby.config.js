module.exports = function (wallaby) {
    return {
        debug: true,
        files: [
            '_js/**/*.js',
            { pattern: '_js/**/*.spec.js', ignore: true }
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
