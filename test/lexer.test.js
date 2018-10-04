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

  it('should tokenize operators', () => {
    const cases = [
      { lexeme: ':=', expectedType: 'OpAsgn' },
      { lexeme: ':=:', expectedType: 'OpRasgn' },
      { lexeme: '+', expectedType: 'Plus' },
      { lexeme: '++', expectedType: 'PlusPlus' },
      { lexeme: '&', expectedType: 'And' }
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
      { lexeme: '1.5E+3', expectedType: 'Real', expectedValue: 1.5e3 }
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
          type: 'And',
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
