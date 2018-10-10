const { Success } = require('../result')

exports.evalNodeArray = (evaluate, nodes) =>
  nodes.reduce((acc, expr) =>
    acc.then((valsResult) =>
      evaluate(expr).then((vres) =>
        Success(vs => v => [...vs, v]).ap(valsResult).ap(vres))),
  Promise.resolve(Success([])))
