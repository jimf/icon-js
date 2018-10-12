/* global describe, it, expect */
const parse = require('../src/parser')

describe('Parser', () => {
  it('should parse empty program', () => {
    const input = 'procedure main()\nend'
    expect(parse(input)).toEqual({
      type: 'Program',
      procedures: {
        main: {
          type: 'Procedure',
          name: 'main',
          parameters: [],
          locals: [],
          statics: [],
          initial: null,
          body: []
        }
      },
      globals: []
    })
  })

  it('should parse data types', () => {
    const cases = [
      { lexeme: '42', expectedType: 'Integer' },
      { lexeme: '4.2', expectedType: 'Real' },
      { lexeme: '"hello"', expectedType: 'String' }
    ]
    cases.forEach(({ lexeme, expectedType }) => {
      const input = `
procedure main()
  write(${lexeme})
end
`
      expect(parse(input).procedures.main.body[0].arguments[0].type).toBe(expectedType)
    })
  })
})
