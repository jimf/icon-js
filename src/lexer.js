const { formatErrorContext } = require('./error')

const RESERVED_WORDS = [
  'break', 'do', 'global', 'local', 'record', 'then',
  'by', 'else', 'if', 'next', 'repeat', 'to',
  'case', 'end', 'initial', 'not', 'return', 'until',
  'create', 'every', 'invocable', 'of', 'static', 'while',
  'default', 'fail', 'link', 'procedure', 'suspend'
].reduce((acc, word) => {
  acc[word] = true
  return acc
}, {})

const KEYWORDS = [
  '&allocated', '&ascii', '&clock', '&collections', '&cset', '&current', '&date',
  '&dateline', '&digits', '&dump', '&e', '&error', '&errornumber',
  '&errortext', '&errorvalue', '&errout', '&fail', '&features', '&file',
  '&host', '&input', '&lcase', '&letters', '&level', '&line', '&main', '&null',
  '&output', '&phi', '&pi', '&pos', '&progname', '&random', '&regions',
  '&source', '&storage', '&subject', '&time', '&trace', '&ucase', '&version'
].reduce((acc, word) => {
  acc[word] = true
  return acc
}, {})

function Token (type, lexeme, value, line, column) {
  this.type = type
  this.lexeme = lexeme
  this.value = value
  this.line = line
  this.column = column
}

const isDigit = c => c >= '0' && c <= '9'
const isUpper = c => c >= 'A' && c <= 'Z'
const isLower = c => c >= 'a' && c <= 'z'
const isAlpha = c => isUpper(c) || isLower(c)
const isAlphaNumeric = c => isDigit(c) || isAlpha(c)

const NUM_INTEGER = 1
const NUM_WITH_DEC = 2
const NUM_BEGIN_WITH_EXP = 4
const NUM_BEGIN_WITH_SIGNED_EXP = 8
const NUM_WITH_EXP = 16
const NUM_DONE = 32

const parseNumber = (state, c) => {
  switch (state) {
    case NUM_INTEGER:
      switch (true) {
        case isDigit(c): return NUM_INTEGER
        case c === '.': return NUM_WITH_DEC
        case c === 'e' || c === 'E': return NUM_BEGIN_WITH_EXP
        default: return NUM_DONE
      }

    case NUM_WITH_DEC:
      switch (true) {
        case isDigit(c): return NUM_WITH_DEC
        case c === 'e' || c === 'E': return NUM_BEGIN_WITH_EXP
        default: return NUM_DONE
      }

    case NUM_BEGIN_WITH_EXP:
      switch (true) {
        case isDigit(c): return NUM_WITH_EXP
        case c === '-' || c === '+': return NUM_BEGIN_WITH_SIGNED_EXP
        default: return NUM_DONE
      }

    case NUM_BEGIN_WITH_SIGNED_EXP:
    case NUM_WITH_EXP:
      return isDigit(c) ? NUM_WITH_EXP : NUM_DONE

    default: return NUM_DONE
  }
}

function Lexer (input) {
  let start = 0
  let current = 0
  let line = 1
  let col = 0
  let peek = input.charAt(0)

  function isAtEnd () {
    return current >= input.length
  }

  function read () {
    current += 1
    col += 1
    peek = input.charAt(current)
    return input.charAt(current - 1)
  }

  function iconScanError () {
    const token = createToken('Invalid')
    const errorContext = formatErrorContext(input, token.line, token.column)
    throw new Error(`Syntax error: Invalid or unexpected token "${token.lexeme}" at line ${token.line}, column ${token.column}

${errorContext}
`)
  }

  function match (expected) {
    if (isAtEnd() || peek !== expected) {
      return false
    }
    read()
    return true
  }

  function skipWhitespace () {
    while (match(' ') || match('\t')) {
      /* do nothing */
    }
  }

  function skipToEol () {
    while (!isAtEnd() && peek !== '\n') {
      read()
    }
  }

  function createToken (type, value = null) {
    const lexeme = input.substring(start, current)
    return new Token(type, lexeme, value, line, col - lexeme.length)
  }

  function scanIdentifier () {
    while (isAlphaNumeric(peek) || peek === '_') {
      read()
    }
    const token = createToken('Identifier')
    if (Object.prototype.hasOwnProperty.call(RESERVED_WORDS, token.lexeme)) {
      token.type = 'ReservedWord'
    }
    return token
  }

  function scanNumber (first) {
    let prevState = null
    let state = first === '.' ? NUM_WITH_DEC : NUM_INTEGER
    while (true) {
      prevState = state
      state = parseNumber(state, peek)
      if (state === NUM_DONE) {
        break
      }
      read()
    }
    // TODO: handle other number bases
    if (prevState === NUM_INTEGER) {
      const token = createToken('Integer')
      token.value = parseInt(token.lexeme, 10)
      return token
    } else if (prevState === NUM_WITH_DEC || prevState === NUM_WITH_EXP) {
      const token = createToken('Real')
      token.value = parseFloat(token.lexeme)
      return token
    }
    iconScanError()
  }

  function scanKeyword () {
    const s = start
    const c = col
    const curr = current
    while (isLower(peek)) {
      read()
    }
    const token = createToken('Keyword')
    if (Object.prototype.hasOwnProperty.call(KEYWORDS, token.lexeme)) {
      return token
    }
    start = s
    col = c
    current = curr
    return createToken('And')
  }

  function nextToken () {
    skipWhitespace()
    if (isAtEnd()) { return null }
    start = current
    const ch = read()
    switch (ch) {
      case '\n':
        line += 1
        col = 0
        return nextToken()

      case '(': return createToken('LParen')
      case ')': return createToken('RParen')
      case '{': return createToken('LBrace')
      case '}': return createToken('RBrace')
      case '[': return createToken('LBracket')
      case ']': return createToken('RBracket')
      case ',': return createToken('Comma')
      case ';': return createToken('Semicolon')
      case '_': return scanIdentifier()
      case '&': return scanKeyword()
      case '+': return createToken(match('+') ? 'PlusPlus' : 'Plus')

      case '#':
        skipToEol()
        return nextToken()

      case ':':
        if (!match('=')) { return createToken('Colon') }
        return createToken(match(':') ? 'OpRasgn' : 'OpAsgn')

      default:
        if (isAlpha(ch)) {
          return scanIdentifier()
        } else if (isDigit(ch) || ch === '.') {
          return scanNumber(ch)
        }
        iconScanError()
    }
  }

  return { nextToken }
}

module.exports = function tokenize (input) {
  const lexer = Lexer(input)
  const tokens = []
  let token = lexer.nextToken()
  while (token !== null) {
    tokens.push(token)
    token = lexer.nextToken()
  }
  return tokens
}
