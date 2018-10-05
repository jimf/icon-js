const defineFunctions = require('./functions')
const Eval = require('./eval')
const parse = require('../parser')
const Scope = require('./scope')
const { IconFunction } = require('./types')

function Icon (input, options) {
  const rootScope = Scope()
  const env = Object.assign({}, options, { scope: rootScope })
  const ast = parse(input)
  const functions = defineFunctions(env)
  const evaluate = Eval({ env })

  Object.keys(functions).forEach((funcName) => {
    rootScope.define(funcName, new IconFunction(functions[funcName]))
  })

  function run () {
    return evaluate(ast).then((result) => {
      if (result.isFailure) {
        throw new Error(`Runtime Error:\n${result.reason}`)
      }
    })
  }

  return { run }
}

module.exports = Icon
