const { Success } = require('../result')
const Scope = require('../scope')
const Type = require('../types')

const evalProgram = ({ evaluate }) => ({
  Program: (node, result) =>
    (node.procedures.main ? evaluate(node.procedures.main) : Promise.resolve())
})

const evalProcedure = ({ env, evaluate }) => ({
  Procedure: (node, result) => {
    env.scope = Scope(env.scope)
    return node.body.reduce(
      (acc, expr) => acc.then((r) => evaluate(expr, r)),
      Promise.resolve(Success(new Type.IconNull()))
    ).then((res) => {
      env.scope = env.scope.pop()
      return res
    })
  }
})

const evalCall = ({ env, evaluate }) => ({
  Call: (node, result) => {
    // Calls cascade. If the result of the previous call was a failure, don't even run.
    if (result.isFailure) { return Promise.resolve(result) }

    // Evaluate the args in series, waterfalling the results.
    return node.arguments.reduce(
      (acc, expr) =>
        acc.then((valsResult) =>
          evaluate(expr).then((vres) =>
            Success(vs => v => [...vs, v]).ap(valsResult).ap(vres))),
      Promise.resolve(Success([]))
    ).then((valsResult) => {
      // If the result of any of the args is a failure, don't run.
      if (valsResult.isFailure) {
        return valsResult
      }
      const func = env.scope.lookup(node.callee.name)
      if (func.isFunction) {
        return func.value(...valsResult.value)
      }
      throw new Error(`Unimplemented procedure call to ${node.callee.name}`)
    })
  }
})

const evalBinaryOp = ({ env, evaluate }) => ({
  BinaryOp: (node, result) =>
    evaluate(node.left).then((lres) => {
      return evaluate(node.right).then((rres) => {
        if (lres.isFailure) { return lres }
        if (rres.isFailure) { return rres }
        switch (node.operator.type) {
          case 'ColonEq':
            // TODO: Handle special assignment cases
            env.scope.define(node.left.name, rres.value)
            return rres

          case 'Plus':
            return Success(a => b => new Type.IconInteger(a.value + b.value))
              .ap(lres.chain(Type.toInteger))
              .ap(rres.chain(Type.toInteger))

          default: throw new Error(`Unimplemented binary op: ${node.operator.type}`)
        }
      })
    })
})

const evalPrimaryTypes = ({ env }) => ({
  Cset: node => Promise.resolve(Success(new Type.IconCset(node.value))),
  Identifier: node => Promise.resolve(Success(env.scope.lookup(node.name))),
  Integer: node => Promise.resolve(Success(new Type.IconInteger(node.value))),
  Keyword: node => Promise.resolve(Success(env.scope.lookup(node.name))),
  List: node => Promise.resolve(Success(new Type.IconList(node.value))),
  Real: node => Promise.resolve(Success(new Type.IconReal(node.value))),
  String: node => Promise.resolve(Success(new Type.IconString(node.value)))
})

module.exports = function (options) {
  const visitor = {}

  function evaluate (node, result) {
    if (!visitor[node.type]) {
      throw new Error(`Unimplemented error: ${node.type}`)
    }
    return visitor[node.type](node, result)
  }

  const opts = { evaluate, env: options.env }
  Object.assign(
    visitor,
    evalProgram(opts),
    evalProcedure(opts),
    evalCall(opts),
    evalBinaryOp(opts),
    evalPrimaryTypes(opts)
  )

  return evaluate
}
