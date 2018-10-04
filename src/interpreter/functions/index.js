const system = require('./system')

module.exports = function (env) {
  return Object.assign(
    system(env)
  )
}
