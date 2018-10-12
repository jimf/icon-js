const { Success, Failure } = require('../result')
const Type = require('../types')
const { evalNodeArray } = require('./util')

class Break extends Error {
  constructor () {
    super('$$INTERNAL_BREAK$$')
  }
}

class Fail extends Error {
  constructor () {
    super('$$INTERNAL_FAIL$$')
  }
}

class Next extends Error {
  constructor () {
    super('$$INTERNAL_NEXT$$')
  }
}

class Return extends Error {
  constructor (value) {
    super('$$INTERNAL_RETURN$$')
    this.value = value
  }
}

module.exports = ({ env, evaluate }) => ({
  Procedure: (node, args) => {
    const shouldInitialize = env.pushCall(node)
    node.parameters.forEach((param, idx) => {
      env.define(param.name, args[idx] ? args[idx] : new Type.IconNull())
    })
    const initial = shouldInitialize
      ? evaluate(node.initial)
      : Promise.resolve(Success())
    return initial.then(() => node.body.reduce(
      (acc, expr) => acc.then((r) => evaluate(expr)),
      Promise.resolve(Success(new Type.IconNull()))
    ).then(() => {
      env.popCall()
      return Failure()
    }).catch((err) => {
      env.popCall()
      if (err instanceof Return) {
        return err.value
      } else if (err instanceof Fail) {
        return Failure()
      } else {
        throw err
      }
    }))
  },
  Call: (node, result) => {
    // Calls cascade. If the result of the previous call was a failure, don't even run.
    if (result && result.isFailure) { return Promise.resolve(result) }

    // Replace null args with &null node.
    const args = node.arguments.map(arg =>
      (arg === null ? { type: 'Keyword', name: '&null' } : arg))

    // Evaluate the args in series, waterfalling the results.
    return evalNodeArray(evaluate, args).then((valsResult) => {
      // If the result of any of the args is a failure, don't run.
      if (valsResult.isFailure) {
        return valsResult
      }
      const func = env.lookup(node.callee.name)
      if (func.isFunction) {
        return func.value(...valsResult.value)
      } else if (func.isProcedure) {
        return evaluate(func.value, valsResult.value)
      }
      throw new Error(`Unimplemented procedure call to ${node.callee.name}`)
    })
  },
  FailExpression: () => {
    return Promise.resolve().then(() => {
      throw new Fail()
    })
  },
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
          if (err instanceof Break) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err instanceof Next) {
            return evalRepeat()
          } else {
            throw err
          }
        })
    }
    return evalRepeat()
  },
  ReturnExpression: (node) => {
    const result = node.expression
      ? evaluate(node.expression)
      : Promise.resolve(Success(new Type.IconNull()))
    return result.then((res) => {
      throw new Return(res)
    })
  },
  UntilExpression: (node) => {
    function evalUntilBody () {
      return evaluate(node.expr2)
        .then(() => evalUntil())
        .catch((err) => {
          if (err instanceof Break) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err instanceof Next) {
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
          if (err instanceof Break) {
            // TODO: Is this the correct result?
            return Success(new Type.IconNull())
          } else if (err instanceof Next) {
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
    throw new Break()
  },
  NextExpression: () => {
    throw new Next()
  }
})
