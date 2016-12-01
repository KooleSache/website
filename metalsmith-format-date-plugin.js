/**
 * Metalsmith plugin to hide drafts from the output.
 *
 * @return {Function}
 */

const formatOptions = { year: 'numeric', month: 'long', day: 'numeric' }

module.exports = function plugin() {
  return function (files, metalsmith, done) {
    setImmediate(done)
    Object.keys(files).forEach((file) => {
      const data = files[file]
      const date = data.date
      if (date) {
        data.formattedDate = new Date(date).toLocaleDateString('en', formatOptions)
      }
    })
  }
}
