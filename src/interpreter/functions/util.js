const { Failure } = require('../result')

exports.notImplemented = name => () =>
  Failure(`Unimplemented error: built-in function ${name}`)
