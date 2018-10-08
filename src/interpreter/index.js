const defineFunctions = require('./functions')
const defineKeywords = require('./keywords')
const Eval = require('./eval')
const parse = require('../parser')
const Scope = require('./scope')
const { IconFunction } = require('./types')

function Icon (input, options) {
  const rootScope = Scope()
  const env = Object.assign({}, options, { scope: rootScope })
  const ast = parse(input)
  const functions = defineFunctions(env)
  const keywords = defineKeywords(env)
  const evaluate = Eval({ env })

  Object.keys(functions).forEach((funcName) => {
    rootScope.define(funcName, new IconFunction(functions[funcName]))
  })
  Object.keys(keywords).forEach((kw) => {
    rootScope.define(kw, keywords[kw])
  })

  function run () {
    return evaluate(ast)
  }

  return { run }
}

module.exports = Icon
