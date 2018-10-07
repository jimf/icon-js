const { Success, Failure } = require('../result')
const Scope = require('../scope')
const Type = require('../types')

const evalNodeArray = (evaluate, nodes) =>
  nodes.reduce((acc, expr) =>
    acc.then((valsResult) =>
      evaluate(expr).then((vres) =>
        Success(vs => v => [...vs, v]).ap(valsResult).ap(vres))),
  Promise.resolve(Success([])))

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
    if (result && result.isFailure) { return Promise.resolve(result) }

    // Evaluate the args in series, waterfalling the results.
    return evalNodeArray(evaluate, node.arguments).then((valsResult) => {
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

const evalSubscript = ({ env, evaluate }) => ({
  Subscript: (node, result) => {
    // Evaluate the subscripts in series, waterfalling the results.
    return evaluate(node.callee).then((calleeRes) => {
      return evalNodeArray(evaluate, node.subscripts).then((subsResult) => {
        // If the result of any of the args is a failure, don't run.
        if (calleeRes.isFailure) { return calleeRes }
        if (subsResult.isFailure) { return subsResult }

        const strRes = Type.toString(calleeRes.value)
        if (strRes.isFailure) { return strRes }
        const subsResultInts = Type.tryCoerceAll(subsResult.value, Type.toInteger)
        if (subsResultInts.isFailure) { return subsResultInts }
        const args = subsResultInts.value.map(intT => intT.value)
        return strRes.value.subscript(...args)
      })
    })
  }
})

const evalUnaryOp = ({ env, evaluate }) => ({
  UnaryOp: (node, result) =>
    evaluate(node.right).then((rres) => {
      if (rres.isFailure) { return rres }
      switch (node.operator.type) {
        case 'Minus':
          return rres.chain(Type.toNumber).map(rval => rval.map(v => -v))

        case 'Plus':
          return rres.chain(Type.toNumber)

        case 'Star':
          return rres.chain(t => t.size
            ? Success(new Type.IconInteger(t.size()))
            : Failure(`invalid type to size operation\noffending value: ${t.type}`)
          )

        default: throw new Error(`Unimplemented binary op: ${node.operator.type}`)
      }
    })
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

          case 'Caret':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => Math.pow(lval, right.value)))

          case 'Minus':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval - right.value))

          case 'Mod':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval % right.value))

          case 'PipePipe':
            return Success(xt => yt => xt.map(() => xt.toString() + yt.toString()))
              .ap(lres.chain(Type.toString))
              .ap(rres.chain(Type.toString))

          case 'Plus':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval + right.value))

          case 'Slash':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval / right.value))

          case 'Star':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval * right.value))

          default: throw new Error(`Unimplemented binary op: ${node.operator.type}`)
        }
      })
    })
})

const evalPrimaryTypes = ({ env, evaluate }) => ({
  Cset: node => Promise.resolve(Success(new Type.IconCset(node.value))),
  Grouping: node => evaluate(node.expression),
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
    evalSubscript(opts),
    evalUnaryOp(opts),
    evalBinaryOp(opts),
    evalPrimaryTypes(opts)
  )

  return evaluate
}
