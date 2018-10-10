const defineFunctions = require('./functions')
const defineKeywords = require('./keywords')
const Eval = require('./eval')
const parse = require('../parser')
const Scope = require('./scope')
const { IconFunction, IconProcedure } = require('./types')

function Env (options) {
  Object.assign(this, options)
  this.stack = []
}
Env.prototype.pushCall = function pushCall (node) {
  this.stack.push({ node, scope: Scope(this.scope) })
}
Env.prototype.popCall = function popCall () {
  this.stack.pop()
}
Env.prototype.lookup = function lookup (name) {
  return this.stack[this.stack.length - 1].scope.lookup(name)
}
Env.prototype.define = function define (name, value) {
  return this.stack[this.stack.length - 1].scope.define(name, value)
}

function Icon (input, options) {
  const rootScope = Scope()
  const env = new Env(Object.assign({}, options, { scope: rootScope }))
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
  Object.keys(ast.procedures).forEach((procName) => {
    rootScope.define(procName, new IconProcedure(ast.procedures[procName]))
  })

  function run () {
    return evaluate(ast)
  }

  return { run }
}

module.exports = Icon
