/* global describe, it, expect */
const parse = require('../src/parser')

describe('Parser', () => {
  it('should parse programs', () => {
    const cases = [
      {
        input: `
procedure main()
end
`,
        expected: {
          type: 'Program',
          procedures: {
            main: { type: 'Procedure', name: 'main', arguments: [], body: [] }
          }
        }
      },
      {
        input: `
procedure main()
    write(42)
end
`,
        expected: {
          type: 'Program',
          procedures: {
            main: {
              type: 'Procedure',
              name: 'main',
              arguments: [],
              body: [
                {
                  type: 'Call',
                  callee: { type: 'Identifier', name: 'write' },
                  arguments: [{ type: 'Integer', value: 42 }]
                }
              ]
            }
          }
        }
      }
    ]
    cases.forEach(({ input, expected }) => {
      expect(parse(input)).toEqual(expected)
    })
  })
})
