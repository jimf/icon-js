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
const isOctal = c => c >= '0' && c <= '7'
const isHex = c => isDigit(c) || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f')
const isUpper = c => c >= 'A' && c <= 'Z'
const isLower = c => c >= 'a' && c <= 'z'
const isAlpha = c => isUpper(c) || isLower(c)
const isAlphaNumeric = c => isDigit(c) || isAlpha(c)

const NUM_INTEGER = 1
const NUM_WITH_DEC = 2
const NUM_BEGIN_WITH_EXP = 4
const NUM_BEGIN_WITH_SIGNED_EXP = 8
const NUM_WITH_EXP = 16
const NUM_BEGIN_RADIX = 32
const NUM_WITH_RADIX = 64
const NUM_DONE = 128

const parseNumber = (state, c) => {
  switch (state) {
    case NUM_INTEGER:
      switch (true) {
        case isDigit(c): return NUM_INTEGER
        case c === '.': return NUM_WITH_DEC
        case c === 'e' || c === 'E': return NUM_BEGIN_WITH_EXP
        case c === 'r': return NUM_BEGIN_RADIX
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

    case NUM_BEGIN_RADIX:
    case NUM_WITH_RADIX:
      return isHex(c) ? NUM_WITH_RADIX : NUM_DONE

    default: return NUM_DONE
  }
}

const STR_BEGIN = 1
const STR_BEGIN_ESC = 2
const STR_BEGIN_OCT_0 = 4
const STR_BEGIN_OCT_1 = 8
const STR_BEGIN_HEX_0 = 16
const STR_BEGIN_HEX_1 = 32
const STR_BEGIN_CTRL = 64
const STR_STRING = 128

const parseString = (delim, state, c, str, tmp) => {
  switch (state) {
    case STR_BEGIN:
      if (c === delim) return [STR_STRING, str]
      if (c === '\\') return [STR_BEGIN_ESC, str]
      return [STR_BEGIN, str + c]

    case STR_BEGIN_ESC:
      if (c === 'b') return [STR_BEGIN, str + '\b']
      if (c === 'd') return [STR_BEGIN, str + String.fromCharCode(127)]
      if (c === 'e') return [STR_BEGIN, str + String.fromCharCode(27)]
      if (c === 'f') return [STR_BEGIN, str + '\f']
      if (c === 'l') return [STR_BEGIN, str + '\n']
      if (c === 'n') return [STR_BEGIN, str + '\n']
      if (c === 'r') return [STR_BEGIN, str + '\r']
      if (c === 't') return [STR_BEGIN, str + '\t']
      if (c === 'v') return [STR_BEGIN, str + '\v']
      if (c === "'") return [STR_BEGIN, str + "'"]
      if (c === '"') return [STR_BEGIN, str + '"']
      if (c === '\\') return [STR_BEGIN, str + '\\']
      if (c === 'x') return [STR_BEGIN_HEX_0, str]
      if (c === '^') return [STR_BEGIN_CTRL, str]
      if (isOctal(c)) return [STR_BEGIN_OCT_0, str, c]
      return [STR_BEGIN, str + c]

    case STR_BEGIN_OCT_0:
      if (isOctal(c)) return [STR_BEGIN_OCT_1, str, tmp + c]
      return [STR_BEGIN, str + c]

    case STR_BEGIN_OCT_1:
      if (isOctal(c)) return [STR_BEGIN, str + String.fromCharCode(parseInt(tmp + c, 8))]
      return [STR_BEGIN, str + String.fromCharCode(parseInt(tmp, 8)) + c]

    case STR_BEGIN_HEX_0:
      if (isHex(c)) return [STR_BEGIN_HEX_1, str, c]
      return [STR_BEGIN, str + c]

    case STR_BEGIN_HEX_1:
      if (isHex(c)) return [STR_BEGIN, str + String.fromCharCode(parseInt(tmp + c, 16))]
      return [STR_BEGIN, str + String.fromCharCode(parseInt(tmp, 16)) + c]

    case STR_BEGIN_CTRL:
      if (isUpper(c)) return [STR_BEGIN, str + String.fromCharCode(c.charCodeAt(0) - 64)]
      if (isLower(c)) return [STR_BEGIN, str + String.fromCharCode(c.charCodeAt(0) - 96)]
      if (c === '@') return [STR_BEGIN, str + '\0']
      if (c === '[') return [STR_BEGIN, str + String.fromCharCode(27)]
      if (c === '\\') return [STR_BEGIN, str + String.fromCharCode(28)]
      if (c === ']') return [STR_BEGIN, str + String.fromCharCode(29)]
      if (c === '^') return [STR_BEGIN, str + String.fromCharCode(30)]
      if (c === '_') return [STR_BEGIN, str + String.fromCharCode(31)]
      return [STR_BEGIN, str + c]
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

  function createToken (type, createValue) {
    const lexeme = input.substring(start, current)
    const value = createValue ? createValue(lexeme) : null
    return new Token(type, lexeme, value, line, col - lexeme.length)
  }

  function createInfixOpToken (type) {
    if (peek === ':' && input.charAt(current + 1) === '=') {
      read()
      read()
      return createToken(`${type}ColonEq`)
    }
    return createToken(type)
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
      return createToken('Integer', t => parseInt(t, 10))
    } else if (prevState === NUM_WITH_DEC || prevState === NUM_WITH_EXP) {
      return createToken('Real', parseFloat)
    } else if (prevState === NUM_WITH_RADIX) {
      return createToken('Integer', t => {
        const [radix, x] = t.split('r')
        const value = parseInt(x, parseInt(radix))
        if (isNaN(value)) { iconScanError() }
        return value
      })
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
    return createToken('Amp')
  }

  function scanString (delim) {
    let state = STR_BEGIN
    let value = ''
    let tmp = null
    while (!isAtEnd() && state !== STR_STRING) {
      const next = parseString(delim, state, read(), value, tmp)
      state = next[0]
      value = next[1]
      tmp = next[2]
    }
    if (state === STR_STRING) {
      return createToken(delim === '"' ? 'String' : 'Cset', () => value)
    }
    iconScanError()
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
      case '?': return createToken('Question')
      case '!': return createInfixOpToken('Bang')
      case '/': return createInfixOpToken('Slash')
      case '\\': return createInfixOpToken('Backslash')
      case '@': return createInfixOpToken('At')
      case '^': return createInfixOpToken('Caret')
      case '%': return createInfixOpToken('Mod')
      case '+': return createInfixOpToken(match('+') ? 'PlusPlus' : 'Plus')
      case '-': return createInfixOpToken(match('-') ? 'MinusMinus' : 'Minus')
      case '*': return createInfixOpToken(match('*') ? 'StarStar' : 'Star')
      case '.': return isDigit(peek) ? scanNumber(ch) : createToken('Dot')
      case '_': return scanIdentifier()
      case '&': return scanKeyword()
      case '"': return scanString('"')
      case "'": return scanString("'")

      case '|':
        if (!match('|')) { return createInfixOpToken('Pipe') }
        return createInfixOpToken(match('|') ? 'PipePipePipe' : 'PipePipe')

      case '=':
        if (!match('=')) { return createInfixOpToken('Eq') }
        return createInfixOpToken(match('=') ? 'EqEqEq' : 'EqEq')

      case '~':
        if (!match('=')) { return createInfixOpToken('Tilde') }
        if (!match('=')) { return createInfixOpToken('TildeEq') }
        return createInfixOpToken(match('=') ? 'TildeEqEqEq' : 'TildeEqEq')

      case '<':
        if (match('<')) { return createInfixOpToken(match('=') ? 'LessLessEq' : 'LessLess') }
        if (match('-')) { return createInfixOpToken(match('>') ? 'LessMinusGreater' : 'LessMinus') }
        return createInfixOpToken(match('=') ? 'LessEq' : 'Less')

      case '>':
        if (match('>')) { return createInfixOpToken(match('=') ? 'GreaterGreaterEq' : 'GreaterGreater') }
        return createInfixOpToken(match('=') ? 'GreaterEq' : 'Greater')

      case '#':
        skipToEol()
        return nextToken()

      case ':':
        if (!match('=')) { return createToken('Colon') }
        return createToken(match(':') ? 'ColonEqColon' : 'ColonEq')

      default:
        if (isAlpha(ch)) {
          return scanIdentifier()
        } else if (isDigit(ch)) {
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
