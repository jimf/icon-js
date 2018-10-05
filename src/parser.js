const tokenize = require('./lexer')
const { formatErrorContext } = require('./error')

function parse (input) {
  const tokens = tokenize(input)
  let pos = 0

  function expect (success, expected) {
    if (success) { return }
    const token = tokens[pos]
    const errorContext = formatErrorContext(input, token.line, token.column)
    throw new Error(`Parse error at line ${token.line}, column ${token.column}
Expected ${expected}, but found "${token.lexeme}"

${errorContext}
`)
  }

  function previous () {
    return tokens[pos - 1]
  }

  function peek () {
    return tokens[pos]
  }

  function isAtEnd () {
    return pos === tokens.length
  }

  function advance () {
    if (!isAtEnd()) {
      pos += 1
    }
    return previous()
  }

  function match (type, lexeme) {
    const token = peek()
    if (!token || token.type !== type || (lexeme !== undefined && token.lexeme !== lexeme)) {
      return false
    }
    advance()
    return true
  }

  function check (type) {
    return !isAtEnd() && peek().type === type
  }

  function primary () {
    if (match('Integer') || match('Real') || match('String')) {
      return previous()
    } else if (match('Identifier')) {
      const token = previous()
      return { type: 'Identifier', name: token.lexeme }
    } else if (match('LParen')) {
      const expr = expression()
      expect(match('RParen'), '")"')
      return {
        type: 'Grouping',
        expression: expr
      }
    } else if (match('LBrace')) {
      const exprs = []
      if (!check('RBrace')) {
        do {
          exprs.push(expression())
        } while (match('Semicolon'))
      }
      expect(match('RBrace'), 'closing "}" after expression list')
      return {
        type: 'Block',
        expressions: exprs
      }
    } else if (match('LBracket')) {
      const items = []
      while (!match('RBracket')) {
        items.push(expression())
        const next = peek()
        expect(match('Comma') || (next && next.type === 'RBracket'), '","')
      }
      return {
        type: 'List',
        items
      }
    }

    throw new Error(`Unhandled primary ${peek().type}`)
  }

  function call () {
    const expr = primary()
    if (match('LParen')) {
      const args = []
      if (!check('RParen')) {
        do {
          args.push(expression())
        } while (match('Comma'))
      }
      expect(match('RParen'), 'closing ")" after function arguments')
      return {
        type: 'Call',
        callee: expr,
        arguments: args
      }
    }
    return expr
  }

  function unary () {
    return call()
  }

  function multiplication () {
    return unary()
  }

  function addition () {
    let expr = multiplication()
    if (match('Plus')) {
      const op = previous()
      const right = multiplication()
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      }
    }
    return expr
  }

  function comparison () {
    return addition()
  }

  function assignment () {
    let expr = comparison()
    if (match('ColonEq')) {
      const op = previous()
      const right = comparison()
      expr = {
        type: 'BinaryExpression',
        operator: op.lexeme,
        left: expr,
        right
      }
    }
    return expr
  }

  function expression () {
    if (match('ReservedWord', 'while')) {
      const expr1 = assignment()
      let expr2 = null
      if (match('ReservedWord', 'do')) {
        expr2 = assignment()
      }
      return { type: 'WhileExpression', expr1, expr2 }
    }
    return assignment()
  }

  function argList () {
    expect(match('LParen'), '"("')
    expect(match('RParen'), '")"')
    return []
  }

  function procedure () {
    if (!match('ReservedWord', 'procedure')) { return false }
    const name = peek()
    expect(match('Identifier'), 'an identifier')
    const args = argList()
    const body = []
    while (!match('ReservedWord', 'end')) {
      body.push(expression())
    }
    return {
      type: 'Procedure',
      name: name.lexeme,
      arguments: args,
      body
    }
  }

  function procedures () {
    const result = []
    let next = procedure()
    while (next) {
      result.push(next)
      next = procedure()
    }
    return result
  }

  function program () {
    return {
      type: 'Program',
      procedures: procedures().reduce((acc, proc) => {
        acc[proc.name] = proc
        return acc
      }, {})
    }
  }

  const ast = program()
  expect(isAtEnd(), 'a procedure or end of input')
  return ast
}

module.exports = parse
