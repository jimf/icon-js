const tokenize = require('./lexer')
const { formatErrorContext } = require('./error')

function parse (input) {
  const tokens = tokenize(input)
  let pos = 0

  function expect (success, expected, found) {
    if (success) { return }
    const token = tokens[pos]
    const errorContext = formatErrorContext(input, token.line, token.column)
    throw new Error(`Parse error at line ${token.line}, column ${token.column}
Expected ${expected}, but found ${found || '"' + token.lexeme + '"'}

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

  function check (type, lexeme) {
    const token = peek()
    return !!token && token.type === type && (lexeme === undefined || token.lexeme === lexeme)
  }

  function match (type, lexeme) {
    if (!check(type, lexeme)) { return false }
    advance()
    return true
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
          exprs.push(expression(true))
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
          args.push((check('Comma') || check('RParen')) ? null : expression())
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
    if (match('ReservedWord', 'not')) {
      return {
        type: 'NotExpression',
        expression: unary()
      }
    } else if (
      match('Star') ||
      match('Plus') ||
      match('Minus') ||
      match('Slash') ||
      match('Backslash')
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

  function conjunction () {
    const expr = assignment()
    if (match('Amp')) {
      const operator = previous()
      const right = assignment()
      return {
        type: 'BinaryOp',
        operator,
        left: expr,
        right
      }
    }
    return expr
  }

  function expression (skipSemi) {
    let node
    if (match('ReservedWord', 'break')) {
      node = {
        type: 'BreakExpression',
        // TODO: need to parse an optional expression here, but this is probably
        // better left to after ASI is working correctly.
        expression: null
      }
    } else if (match('ReservedWord', 'if')) {
      const expr1 = expression()
      expect(match('ReservedWord', 'then'), '"then" keyword')
      const expr2 = expression()
      let expr3 = null
      if (match('ReservedWord', 'else')) {
        expr3 = expression()
      }
      node = { type: 'IfThenExpression', expr1, expr2, expr3 }
    } else if (match('ReservedWord', 'fail')) {
      node = { type: 'FailExpression' }
    } else if (match('ReservedWord', 'next')) {
      node = { type: 'NextExpression' }
    } else if (match('ReservedWord', 'repeat')) {
      node = {
        type: 'RepeatExpression',
        expression: expression()
      }
    } else if (match('ReservedWord', 'return')) {
      const expr = check('ReservedWord', 'end') ? null : expression()
      node = {
        type: 'ReturnExpression',
        expression: expr
      }
    } else if (match('ReservedWord', 'until')) {
      const expr1 = expression()
      let expr2 = null
      if (match('ReservedWord', 'do')) {
        expr2 = expression()
      }
      node = { type: 'UntilExpression', expr1, expr2 }
    } else if (match('ReservedWord', 'while')) {
      const expr1 = expression()
      let expr2 = null
      if (match('ReservedWord', 'do')) {
        expr2 = expression()
      }
      node = { type: 'WhileExpression', expr1, expr2 }
    } else {
      node = conjunction()
    }
    if (!skipSemi) {
      // Swallow optional semicolon, except when dealing with expression lists.
      // TODO: revisit with ASI handling
      match('Semicolon')
    }
    return node
  }

  function paramList () {
    expect(match('LParen'), '"("')
    const params = []
    if (!check('RParen')) {
      do {
        params.push(expression())
      } while (match('Comma'))
    }
    expect(match('RParen'), 'closing ")" after procedure parameters')
    return params
  }

  function idents (type, known) {
    do {
      const id = peek()
      expect(
        !known[id.lexeme],
        'unique identifier declarations',
        `"${id.lexeme}" to have been redeclared`
      )
      expect(match('Identifier'), 'an identifier')
      known[id.lexeme] = type
    } while (match('Comma'))
    return known
  }

  function procedure () {
    if (!match('ReservedWord', 'procedure')) { return false }
    const name = peek()
    expect(match('Identifier'), 'an identifier')
    const params = paramList()
    const decls = {}
    while (true) {
      if (match('ReservedWord', 'local')) {
        idents('local', decls)
      } else if (match('ReservedWord', 'static')) {
        idents('static', decls)
      } else {
        break
      }
    }
    const locals = []
    const statics = []
    const body = []
    Object.keys(decls).forEach((id) => {
      if (decls[id] === 'local') {
        locals.push(id)
      } else {
        statics.push(id)
      }
    })
    let initial = null
    if (match('ReservedWord', 'initial')) {
      initial = expression()
    }
    while (!match('ReservedWord', 'end')) {
      body.push(expression())
    }
    return {
      type: 'Procedure',
      name: name.lexeme,
      parameters: params,
      locals,
      statics,
      initial,
      body
    }
  }

  function program () {
    const procedures = []
    const globals = {}
    while (true) {
      if (check('ReservedWord', 'procedure')) {
        procedures.push(procedure())
      } else if (match('ReservedWord', 'global')) {
        idents('global', globals)
      } else {
        break
      }
    }
    return {
      type: 'Program',
      procedures: procedures.reduce((acc, proc) => {
        acc[proc.name] = proc
        return acc
      }, {}),
      globals: Object.keys(globals)
    }
  }

  const ast = program()
  expect(isAtEnd(), 'a procedure or end of input')
  return ast
}

module.exports = parse
