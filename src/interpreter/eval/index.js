const { Success, Failure } = require('../result')
const Type = require('../types')
const evalControlFlow = require('./control_flow')
const { evalNodeArray } = require('./util')

const evalProgram = ({ evaluate }) => ({
  Program: (node, result) =>
    (node.procedures.main ? evaluate(node.procedures.main, []) : Promise.resolve())
})

const evalCompound = ({ evaluate }) => ({
  CompoundExpression: (node) => {
    return node.expressions.reduce(
      (acc, expr) => acc.then((r) => evaluate(expr)),
      Promise.resolve(Success(new Type.IconNull()))
    )
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
        case 'Backslash':
          return rres.chain(v => (!v.isNull ? Success(v) : Failure()))

        case 'Minus':
          return rres.chain(Type.toNumber).map(rval => rval.map(v => -v))

        case 'Plus':
          return rres.chain(Type.toNumber)

        case 'Slash':
          return rres.chain(v => (v.isNull ? Success(v) : Failure()))

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
          case 'Amp':
            return rres

          case 'ColonEq':
            if (node.left.type === 'Identifier') {
              // x := _
              env.define(node.left.name, rres.value)
              return rres
            } else if (node.left.type === 'Subscript' && node.left.subscripts.length === 1) {
              // x[y] = _
              const str = env.lookup(node.left.callee.name)
              const pos = node.left.subscripts[0].value
              str.update(pos, rres.value.value)
              return Success(str)
            } else if (node.left.type === 'UnaryOp' && node.left.operator.type === 'Slash') {
              // /x := _
              const current = env.lookup(node.left.right.name)
              if (current.isNull) {
                env.define(node.left.right.name, rres.value)
                return Success(rres.value)
              }
              return Failure()
            } else {
              throw new Error('Unimplemented assignment')
            }

          case 'Caret':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => Math.pow(lval, right.value)))

          case 'Eq':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => left.equals(right) ? Success(right) : Failure())

          case 'EqEq':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => left.equals(right) ? Success(right) : Failure())

          case 'EqEqEq':
            return lres.value.type === rres.value.type && lres.value.equals(rres.value)
              ? rres
              : Failure()

          case 'Greater':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => !left.lte(right) ? Success(right) : Failure())

          case 'GreaterGreater':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => !left.lte(right) ? Success(right) : Failure())

          case 'GreaterEq':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => left.equals(right) || !left.lte(right)
                ? Success(right)
                : Failure())

          case 'GreaterGreaterEq':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => left.equals(right) || !left.lte(right)
                ? Success(right)
                : Failure())

          case 'Less':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => left.lte(right) && !left.equals(right)
                ? Success(right)
                : Failure())

          case 'LessLess':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => left.lte(right) && !left.equals(right)
                ? Success(right)
                : Failure())

          case 'LessEq':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => left.lte(right) ? Success(right) : Failure())

          case 'LessLessEq':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => left.lte(right) ? Success(right) : Failure())

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

          case 'PlusColonEq':
            if (node.left.type === 'Identifier') {
              // x +:= _
              const result = Type.toNumbers([env.lookup(node.left.name), rres.value])
                .map(([left, right]) => left.map(lval => lval + right.value))
              if (result.isSuccess) {
                env.define(node.left.name, result.value)
              }
              return result
            } else {
              throw new Error('Unimplemented +:=')
            }

          case 'Slash':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval / right.value))

          case 'Star':
            return Type.toNumbers([lres.value, rres.value])
              .map(([left, right]) => left.map(lval => lval * right.value))

          case 'TildeEq':
            return Type.toNumbers([lres.value, rres.value])
              .chain(([left, right]) => !left.equals(right) ? Success(right) : Failure())

          case 'TildeEqEq':
            return Type.tryCoerceAll([lres.value, rres.value], Type.toString)
              .chain(([left, right]) => !left.equals(right) ? Success(right) : Failure())

          case 'TildeEqEqEq':
            return !(lres.value.type === rres.value.type && lres.value.equals(rres.value))
              ? rres
              : Failure()

          default: throw new Error(`Unimplemented binary op: ${node.operator.type}`)
        }
      })
    })
})

const evalPrimaryTypes = ({ env, evaluate }) => ({
  Cset: node => Promise.resolve(Success(new Type.IconCset(node.value))),
  Grouping: node => evaluate(node.expression),
  Identifier: node => Promise.resolve(Success(env.lookup(node.name))),
  Integer: node => Promise.resolve(Success(new Type.IconInteger(node.value))),
  Keyword: node => Promise.resolve(Success(env.lookup(node.name))),
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
    evalCompound(opts),
    evalSubscript(opts),
    evalUnaryOp(opts),
    evalBinaryOp(opts),
    evalControlFlow(opts),
    evalPrimaryTypes(opts)
  )

  return evaluate
}
