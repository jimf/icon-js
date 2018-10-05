const defineFunctions = require('./functions')
const parse = require('../parser')
const { Success } = require('./result')
const Type = require('./types')

function Icon (input, options) {
  const env = options
  const ast = parse(input)

  env.functions = defineFunctions(env)

  const evaluate = (node, result) => {
    switch (node.type) {
      case 'Program':
        return node.procedures.main ? evaluate(node.procedures.main) : Promise.resolve()

      case 'Procedure':
        return node.body.reduce(
          (acc, expr) =>
            acc.then((r) => evaluate(expr, r)),
          Promise.resolve(Success(new Type.IconNull()))
        )

      case 'Call':
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
          if (env.functions[node.callee.name]) {
            return env.functions[node.callee.name](...valsResult.value.map(v => v.value))
          }
          throw new Error(`Unimplemented procedure call to ${node.callee.name}`)
        })

      case 'BinaryOp':
        return evaluate(node.left).then((lres) => {
          return evaluate(node.right).then((rres) => {
            if (lres.isFailure) { return lres }
            if (rres.isFailure) { return rres }
            switch (node.operator.type) {
              case 'Plus': // return Success(new Type.IconInteger(lres.value.value + rres.value.value))
                return Success(a => b => new Type.IconInteger(a.value + b.value))
                  .ap(lres.chain(Type.toInteger))
                  .ap(rres.chain(Type.toInteger))
              default: throw new Error(`Unimplemented binary op: ${node.operator.type}`)
            }
          })
        })

      case 'Integer':
        return Promise.resolve(Success(new Type.IconInteger(node.value)))

      case 'Real':
        return Promise.resolve(Success(new Type.IconReal(node.value)))

      case 'String':
        return Promise.resolve(Success(new Type.IconString(node.value)))

      default: throw new Error(`Unimplemented error: ${node.type}`)
    }
  }

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
