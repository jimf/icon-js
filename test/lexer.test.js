/* global describe, it, expect */
const tokenize = require('../src/lexer')

describe('Lexer', () => {
  it('should skip whitespace', () => {
    expect(tokenize(' \t')).toEqual([])
  })

  it('should skip comments', () => {
    expect(tokenize('# this is a comment')).toEqual([])
  })

  it('should tokenize special characters', () => {
    const cases = [
      { lexeme: '(', expectedType: 'LParen' },
      { lexeme: ')', expectedType: 'RParen' },
      { lexeme: '{', expectedType: 'LBrace' },
      { lexeme: '}', expectedType: 'RBrace' },
      { lexeme: '[', expectedType: 'LBracket' },
      { lexeme: ']', expectedType: 'RBracket' },
      { lexeme: ',', expectedType: 'Comma' },
      { lexeme: ';', expectedType: 'Semicolon' },
      { lexeme: ':', expectedType: 'Colon' }
    ]
    cases.forEach(({ lexeme, expectedType }) => {
      expect(tokenize(lexeme)).toEqual([{
        type: expectedType,
        lexeme,
        value: null,
        line: 1,
        column: 0
      }])
    })
  })

  ;[
    { lexeme: ':=', expectedType: 'ColonEq' },
    { lexeme: ':=:', expectedType: 'ColonEqColon' },
    { lexeme: '+', expectedType: 'Plus' },
    { lexeme: '++', expectedType: 'PlusPlus' },
    { lexeme: '-', expectedType: 'Minus' },
    { lexeme: '--', expectedType: 'MinusMinus' },
    { lexeme: '&', expectedType: 'Amp' },
    { lexeme: '|', expectedType: 'Pipe' },
    { lexeme: '||', expectedType: 'PipePipe' },
    { lexeme: '|||', expectedType: 'PipePipePipe' },
    { lexeme: '!', expectedType: 'Bang' },
    { lexeme: '*', expectedType: 'Star' },
    { lexeme: '**', expectedType: 'StarStar' },
    { lexeme: '.', expectedType: 'Dot' },
    { lexeme: '/', expectedType: 'Slash' },
    { lexeme: '\\', expectedType: 'Backslash' },
    { lexeme: '=', expectedType: 'Eq' },
    { lexeme: '==', expectedType: 'EqEq' },
    { lexeme: '===', expectedType: 'EqEqEq' },
    { lexeme: '?', expectedType: 'Question' },
    { lexeme: '~', expectedType: 'Tilde' },
    { lexeme: '~=', expectedType: 'TildeEq' },
    { lexeme: '~==', expectedType: 'TildeEqEq' },
    { lexeme: '~===', expectedType: 'TildeEqEqEq' },
    { lexeme: '@', expectedType: 'At' },
    { lexeme: '^', expectedType: 'Caret' },
    { lexeme: '%', expectedType: 'Mod' },
    { lexeme: '<', expectedType: 'Less' },
    { lexeme: '<=', expectedType: 'LessEq' },
    { lexeme: '<<', expectedType: 'LessLess' },
    { lexeme: '<<=', expectedType: 'LessLessEq' },
    { lexeme: '<-', expectedType: 'LessMinus' },
    { lexeme: '<->', expectedType: 'LessMinusGreater' },
    { lexeme: '>', expectedType: 'Greater' },
    { lexeme: '>=', expectedType: 'GreaterEq' },
    { lexeme: '>>=', expectedType: 'GreaterGreaterEq' },
    { lexeme: '>>', expectedType: 'GreaterGreater' },
    { lexeme: '\\:=', expectedType: 'BackslashColonEq' },
    { lexeme: '@:=', expectedType: 'AtColonEq' },
    { lexeme: '!:=', expectedType: 'BangColonEq' },
    { lexeme: '^:=', expectedType: 'CaretColonEq' },
    { lexeme: '*:=', expectedType: 'StarColonEq' },
    { lexeme: '/:=', expectedType: 'SlashColonEq' },
    { lexeme: '%:=', expectedType: 'ModColonEq' },
    { lexeme: '**:=', expectedType: 'StarStarColonEq' },
    { lexeme: '+:=', expectedType: 'PlusColonEq' },
    { lexeme: '-:=', expectedType: 'MinusColonEq' },
    { lexeme: '++:=', expectedType: 'PlusPlusColonEq' },
    { lexeme: '--:=', expectedType: 'MinusMinusColonEq' },
    { lexeme: '||:=', expectedType: 'PipePipeColonEq' },
    { lexeme: '|||:=', expectedType: 'PipePipePipeColonEq' },
    { lexeme: '<:=', expectedType: 'LessColonEq' },
    { lexeme: '<=:=', expectedType: 'LessEqColonEq' },
    { lexeme: '=:=', expectedType: 'EqColonEq' },
    { lexeme: '>=:=', expectedType: 'GreaterEqColonEq' },
    { lexeme: '>:=', expectedType: 'GreaterColonEq' },
    { lexeme: '~=:=', expectedType: 'TildeEqColonEq' },
    { lexeme: '<<:=', expectedType: 'LessLessColonEq' },
    { lexeme: '<<=:=', expectedType: 'LessLessEqColonEq' },
    { lexeme: '==:=', expectedType: 'EqEqColonEq' },
    { lexeme: '>>=:=', expectedType: 'GreaterGreaterEqColonEq' },
    { lexeme: '>>:=', expectedType: 'GreaterGreaterColonEq' },
    { lexeme: '~==:=', expectedType: 'TildeEqEqColonEq' },
    { lexeme: '===:=', expectedType: 'EqEqEqColonEq' },
    { lexeme: '~===:=', expectedType: 'TildeEqEqEqColonEq' }
  ].forEach(({ lexeme, expectedType }) => {
    it(`should tokenize '${lexeme}' operator`, () => {
      expect(tokenize(lexeme)).toEqual([{
        type: expectedType,
        lexeme,
        value: null,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize numbers', () => {
    const cases = [
      { lexeme: '3', expectedType: 'Integer', expectedValue: 3 },
      { lexeme: '42', expectedType: 'Integer', expectedValue: 42 },
      { lexeme: '000000042', expectedType: 'Integer', expectedValue: 42 },
      { lexeme: '1234567890', expectedType: 'Integer', expectedValue: 1234567890 },
      { lexeme: '42.42', expectedType: 'Real', expectedValue: 42.42 },
      { lexeme: '5.', expectedType: 'Real', expectedValue: 5.0 },
      { lexeme: '.5', expectedType: 'Real', expectedValue: 0.5 },
      { lexeme: '1e3', expectedType: 'Real', expectedValue: 1e3 },
      { lexeme: '1E3', expectedType: 'Real', expectedValue: 1e3 },
      { lexeme: '1e-3', expectedType: 'Real', expectedValue: 1e-3 },
      { lexeme: '1E-3', expectedType: 'Real', expectedValue: 1e-3 },
      { lexeme: '1e+3', expectedType: 'Real', expectedValue: 1e3 },
      { lexeme: '1E+3', expectedType: 'Real', expectedValue: 1e3 },
      { lexeme: '1.5e3', expectedType: 'Real', expectedValue: 1.5e3 },
      { lexeme: '1.5E3', expectedType: 'Real', expectedValue: 1.5e3 },
      { lexeme: '1.5e-3', expectedType: 'Real', expectedValue: 1.5e-3 },
      { lexeme: '1.5E-3', expectedType: 'Real', expectedValue: 1.5e-3 },
      { lexeme: '1.5e+3', expectedType: 'Real', expectedValue: 1.5e3 },
      { lexeme: '1.5E+3', expectedType: 'Real', expectedValue: 1.5e3 },
      { lexeme: '16r0D0A', expectedType: 'Integer', expectedValue: 0x0D0A }
    ]
    cases.forEach(({ lexeme, expectedType, expectedValue }) => {
      expect(tokenize(lexeme)).toEqual([{
        type: expectedType,
        lexeme,
        value: expectedValue,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize strings', () => {
    const cases = [
      { lexeme: '"hello world"', expectedValue: 'hello world' },
      { lexeme: '"hello _\n   world"', expectedValue: 'hello world' },
      { lexeme: '"hello  _  world"', expectedValue: 'hello  _  world' },
      { lexeme: '"\\n\\012\\x0a\\^j"', expectedValue: '\n\n\n\n' },
      { lexeme: '"A\\x41\\101 Exterminators"', expectedValue: 'AAA Exterminators' }
    ]
    cases.forEach(({ lexeme, expectedType, expectedValue }) => {
      expect(tokenize(lexeme)).toEqual([{
        type: 'String',
        lexeme,
        value: expectedValue,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize reserved words', () => {
    const reserved = [
      'break', 'do', 'global', 'local', 'record', 'then',
      'by', 'else', 'if', 'next', 'repeat', 'to',
      'case', 'end', 'initial', 'not', 'return', 'until',
      'create', 'every', 'invocable', 'of', 'static', 'while',
      'default', 'fail', 'link', 'procedure', 'suspend'
    ]
    reserved.forEach((word) => {
      expect(tokenize(word)).toEqual([{
        type: 'ReservedWord',
        lexeme: word,
        value: null,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize keywords', () => {
    const keywords = [
      '&allocated', '&ascii', '&clock', '&collections', '&cset', '&current', '&date',
      '&dateline', '&digits', '&dump', '&e', '&error', '&errornumber',
      '&errortext', '&errorvalue', '&errout', '&fail', '&features', '&file',
      '&host', '&input', '&lcase', '&letters', '&level', '&line', '&main', '&null',
      '&output', '&phi', '&pi', '&pos', '&progname', '&random', '&regions',
      '&source', '&storage', '&subject', '&time', '&trace', '&ucase', '&version'
    ]
    keywords.forEach((word) => {
      expect(tokenize(word)).toEqual([{
        type: 'Keyword',
        lexeme: word,
        value: null,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize tokens that look like keywords but are not', () => {
    const keywords = [
      '&allocated', '&ascii', '&clock', '&collections', '&cset', '&current', '&date',
      '&dateline', '&digits', '&dump', '&e', '&error', '&errornumber',
      '&errortext', '&errorvalue', '&errout', '&fail', '&features', '&file',
      '&host', '&input', '&lcase', '&letters', '&level', '&line', '&main', '&null',
      '&output', '&phi', '&pi', '&pos', '&progname', '&random', '&regions',
      '&source', '&storage', '&subject', '&time', '&trace', '&ucase', '&version'
    ]
    keywords.forEach((word) => {
      expect(tokenize(`${word}x`)).toEqual([
        {
          type: 'Amp',
          lexeme: '&',
          value: null,
          line: 1,
          column: 0
        },
        {
          type: 'Identifier',
          lexeme: word.slice(1) + 'x',
          value: null,
          line: 1,
          column: 1
        }
      ])
    })
  })

  it('should tokenize identifiers', () => {
    const cases = [
      { lexeme: '_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ123456789' },
      { lexeme: 'foo_bar' }
    ]
    cases.forEach(({ lexeme, expectedType }) => {
      expect(tokenize(lexeme)).toEqual([{
        type: 'Identifier',
        lexeme,
        value: null,
        line: 1,
        column: 0
      }])
    })
  })

  it('should tokenize multiple words', () => {
    const cases = [
      {
        input: `
# A comment
procedure main()
    lines`.trim(),
        expected: [
          { type: 'ReservedWord', lexeme: 'procedure', value: null, line: 2, column: 0 },
          { type: 'Identifier', lexeme: 'main', value: null, line: 2, column: 10 },
          { type: 'LParen', lexeme: '(', value: null, line: 2, column: 14 },
          { type: 'RParen', lexeme: ')', value: null, line: 2, column: 15 },
          { type: 'Identifier', lexeme: 'lines', value: null, line: 3, column: 4 }
        ]
      }
    ]
    cases.forEach(({ input, expected }) => {
      expect(tokenize(input)).toEqual(expected)
    })
  })
})
