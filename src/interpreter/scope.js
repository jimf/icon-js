const { IconNull } = require('./types')

function createScope (parent) {
  const symbols = {}
  const statics = {}

  function define (symbol, value, isStatic = false) {
    symbols[symbol] = value
    if (isStatic) {
      statics[symbol] = true
    }
    return value
  }

  function lookup (symbol) {
    if (Object.prototype.hasOwnProperty.call(symbols, symbol)) {
      return symbols[symbol]
    }
    const result = parent && parent.lookup(symbol)
    return result || define(symbol, new IconNull())
  }

  function pop () {
    return parent
  }

  return { define, lookup, pop }
}

module.exports = createScope
