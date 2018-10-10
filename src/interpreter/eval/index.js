const { Success, Failure } = require('../result')
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
  Procedure: (node, args) => {
    env.pushCall(node)
    node.parameters.forEach((param, idx) => {
      env.scope.define(param.name, args[idx] ? args[idx] : new Type.IconNull())
    })
    return node.body.reduce(
      (acc, expr) => acc.then((r) => evaluate(expr)),
      Promise.resolve(Success(new Type.IconNull()))
    ).then((res) => {
      env.popCall()
      return Failure()
    })
  }
})

const evalCompound = ({ evaluate }) => ({
  CompoundExpression: (node) => {
    return node.expressions.reduce(
      (acc, expr) => acc.then((r) => evaluate(expr)),
      Promise.resolve(Success(new Type.IconNull()))
    )
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
      } else if (func.isProcedure) {
        return evaluate(func.value, valsResult.value)
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
              env.scope.define(node.left.name, rres.value)
              return rres
            } else if (node.left.type === 'Subscript' && node.left.subscripts.length === 1) {
              const str = env.scope.lookup(node.left.callee.name)
              const pos = node.left.subscripts[0].value
              str.update(pos, rres.value.value)
              return Success(str)
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

const BREAK_ERROR = '$$INTERNAL_BREAK$$'
const NEXT_ERROR = '$$INTERNAL_NEXT$$'
const evalControlStructs = ({ evaluate }) => ({
  IfThenExpression: (node) => {
    return evaluate(node.expr1).then((res) => {
      return res.cata({
        Failure: () => (node.expr3 ? evaluate(node.expr3) : res),
        Success: () => evaluate(node.expr2)
      })
    })
  },
  NotExpression: (node) => {
    return evaluate(node.expression).then((res) => {
      return res.cata({
        Failure: () => Success(new Type.IconNull()),
        Success: () => Failure()
      })
    })
  },
  RepeatExpression: (node) => {
    function evalRepeat () {
      return evaluate(node.expression)
        .then(() => evalRepeat())
        .catch((err) => {
          if (err.message === BREAK_ERROR) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err.message === NEXT_ERROR) {
            return evalRepeat()
          } else {
            throw err
          }
        })
    }
    return evalRepeat()
  },
  UntilExpression: (node) => {
    function evalUntilBody () {
      return evaluate(node.expr2)
        .then(() => evalUntil())
        .catch((err) => {
          if (err.message === BREAK_ERROR) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err.message === NEXT_ERROR) {
            return evalUntil()
          } else {
            throw err
          }
        })
    }
    function evalUntil () {
      return evaluate(node.expr1).then((expr1Res) => {
        return expr1Res.cata({
          Success: () => Success() /* FIXME ??? */,
          Failure: () => node.expr2 ? evalUntilBody() : evalUntil()
        })
      })
    }
    return evalUntil()
  },
  WhileExpression: (node) => {
    function evalWhileBody () {
      return evaluate(node.expr2)
        .then(() => evalWhile())
        .catch((err) => {
          if (err.message === BREAK_ERROR) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err.message === NEXT_ERROR) {
            return evalWhile()
          } else {
            throw err
          }
        })
    }
    function evalWhile () {
      return evaluate(node.expr1).then((expr1Res) => {
        return expr1Res.cata({
          Failure: () => Success() /* FIXME ??? */,
          Success: () => node.expr2 ? evalWhileBody() : evalWhile()
        })
      })
    }
    return evalWhile()
  },
  BreakExpression: () => {
    throw new Error(BREAK_ERROR)
  },
  NextExpression: () => {
    throw new Error(NEXT_ERROR)
  }
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
    evalCompound(opts),
    evalCall(opts),
    evalSubscript(opts),
    evalUnaryOp(opts),
    evalBinaryOp(opts),
    evalControlStructs(opts),
    evalPrimaryTypes(opts)
  )

  return evaluate
}
