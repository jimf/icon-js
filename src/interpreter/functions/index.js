const number = require('./number')
const string = require('./string')
const structural = require('./structural')
const system = require('./system')

module.exports = function (env) {
  return Object.assign(
    number(env),
    string(env),
    structural(env),
    system(env)
  )
}
