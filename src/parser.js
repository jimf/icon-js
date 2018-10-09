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
    if (match('Cset') || match('Integer') || match('Real') || match('String')) {
      return previous()
    } else if (match('Identifier')) {
      const token = previous()
      return { type: 'Identifier', name: token.lexeme }
    } else if (match('Keyword')) {
      const token = previous()
      return { type: 'Keyword', name: token.lexeme }
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
        type: 'CompoundExpression',
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
    } else if (match('LBracket')) {
      const subscripts = []
      if (!check('RBracket')) {
        do {
          subscripts.push(expression())
        } while (match('Comma'))
      }
      expect(match('RBracket'), 'closing "]" after subscript(s)')
      return {
        type: 'Subscript',
        callee: expr,
        subscripts
      }
    }
    return expr
  }

  function unary () {
    if (
      match('Minus') ||
      match('Plus') ||
      match('Star')
    ) {
      const op = previous()
      const right = unary()
      return {
        type: 'UnaryOp',
        operator: op,
        right
      }
    }
    return call()
  }

  function exponentiation () {
    const expr = unary()
    if (match('Caret')) {
      const op = previous()
      const right = exponentiation()
      return {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      }
    }
    return expr
  }

  function multiplication () {
    let expr = exponentiation()
    while (
      match('Star') ||
      match('Slash') ||
      match('Mod') ||
      match('StarStar')
    ) {
      const op = previous()
      const right = exponentiation()
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      }
    }
    return expr
  }

  function addition () {
    let expr = multiplication()
    while (
      match('Plus') ||
      match('Minus') ||
      match('PlusPlus') ||
      match('MinusMinus')
    ) {
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

  function concatenation () {
    let expr = addition()
    while (match('PipePipe') || match('PipePipePipe')) {
      const op = previous()
      const right = addition()
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
    let expr = concatenation()
    while (
      match('Less') ||
      match('LessEq') ||
      match('Eq') ||
      match('GreaterEq') ||
      match('Greater') ||
      match('TildeEq') ||
      match('LessLess') ||
      match('LessLessEq') ||
      match('EqEq') ||
      match('GreaterGreaterEq') ||
      match('GreaterGreater') ||
      match('TildeEqEq') ||
      match('EqEqEq') ||
      match('TildeEqEqEq')
    ) {
      const op = previous()
      const right = concatenation()
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      }
    }
    return expr
  }

  function assignment () {
    let expr = comparison()
    if (
      match('ColonEq') ||
      match('LessMinus') ||
      match('ColonEqColon') ||
      match('LessMinusGreater') ||
      match('ColonEq') ||
      match('BackslashColonEq') ||
      match('AtColonEq') ||
      match('BangColonEq') ||
      match('CaretColonEq') ||
      match('StarColonEq') ||
      match('SlashColonEq') ||
      match('ModColonEq') ||
      match('StarStarColonEq') ||
      match('PlusColonEq') ||
      match('MinusColonEq') ||
      match('PlusPlusColonEq') ||
      match('MinusMinusColonEq') ||
      match('PipePipeColonEq') ||
      match('PipePipePipeColonEq') ||
      match('LessColonEq') ||
      match('LessEqColonEq') ||
      match('EqColonEq') ||
      match('GreaterEqColonEq') ||
      match('GreaterColonEq') ||
      match('TildeEqColonEq') ||
      match('LessLessColonEq') ||
      match('LessLessEqColonEq') ||
      match('EqEqColonEq') ||
      match('GreaterGreaterEqColonEq') ||
      match('GreaterGreaterColonEq') ||
      match('TildeEqEqColonEq') ||
      match('EqEqEqColonEq') ||
      match('TildeEqEqEqColonEq')
    ) {
      const op = previous()
      const right = comparison()
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right
      }
    }
    return expr
  }

  function expression () {
    if (match('ReservedWord', 'break')) {
      return {
        type: 'BreakExpression',
        expression: expression() || null
      }
    } else if (match('ReservedWord', 'if')) {
      const expr1 = expression()
      expect(match('ReservedWord', 'then'), '"then" keyword')
      const expr2 = expression()
      let expr3 = null
      if (match('ReservedWord', 'else')) {
        expr3 = expression()
      }
      return { type: 'IfThenExpression', expr1, expr2, expr3 }
    } else if (match('ReservedWord', 'while')) {
      const expr1 = expression()
      let expr2 = null
      if (match('ReservedWord', 'do')) {
        expr2 = expression()
      }
      return { type: 'WhileExpression', expr1, expr2 }
    }
    const expr = assignment()
    // TODO: Figure out what needs to be done with semicolons
    // match('Semicolon')
    return expr
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
