const defineFunctions = require('./functions')
const defineKeywords = require('./keywords')
const Eval = require('./eval')
const parse = require('../parser')
const Scope = require('./scope')
const { IconFunction, IconNull, IconProcedure } = require('./types')

function Env (globalScope, options) {
  Object.assign(this, options)
  this._globalScope = globalScope
  this._statics = {}
  this._initials = {}
  this.stack = []
}
Env.prototype.pushCall = function pushCall (node) {
  const scope = Scope(this._globalScope)
  this.stack.push({ node, scope })
  node.locals.forEach((local) => {
    scope.define(local, IconNull())
  })
  node.statics.forEach((statik) => {
    if (this._statics[node.name] && this._statics[node.name][statik]) {
      scope.define(statik, this._statics[node.name][statik])
    }
  })
  const shouldInitialize = node.initial && !this._initials[node.name]
  if (shouldInitialize) { this._initials[node.name] = true }
  return shouldInitialize
}
Env.prototype.popCall = function popCall () {
  this.stack.pop()
}
Env.prototype.lookup = function lookup (name) {
  return this.stack[this.stack.length - 1].scope.lookup(name)
}
Env.prototype.define = function define (name, value) {
  const current = this.stack[this.stack.length - 1]
  if (!current.node.locals.includes(name) && this._globalScope.has(name)) {
    return this._globalScope.define(name, value)
  }
  if (current.node.statics.includes(name)) {
    if (!this._statics[current.node.name]) {
      this._statics[current.node.name] = {}
    }
    this._statics[current.node.name][name] = value
  }
  return current.scope.define(name, value)
}
Env.prototype.level = function level () {
  return this.stack.length
}

function Icon (input, options) {
  const globalScope = Scope()
  const env = new Env(globalScope, options)
  const ast = parse(input)
  const functions = defineFunctions(env)
  const keywords = defineKeywords(env)
  const evaluate = Eval({ env })

  Object.keys(functions).forEach((funcName) => {
    globalScope.define(funcName, IconFunction(functions[funcName]))
  })
  Object.keys(keywords).forEach((kw) => {
    globalScope.define(kw, keywords[kw])
  })
  Object.keys(ast.procedures).forEach((procName) => {
    globalScope.define(procName, IconProcedure(ast.procedures[procName]))
  })
  ast.globals.forEach((global) => {
    globalScope.define(global, IconNull())
  })

  function run () {
    return evaluate(ast)
  }

  return { run }
}

module.exports = Icon
