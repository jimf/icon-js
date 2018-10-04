/* global describe, it, expect */
const Icon = require('../src/interpreter')

describe('Interpreter', () => {
  it('should interpret programs', () => {
    const cases = [
      {
        input: `
procedure main()
    write(42)
end
`,
        expected: '42\n'
      },
      {
        input: `
procedure main()
    write(4.2)
end
`,
        expected: '4.2\n'
      },
      {
        input: `
procedure main()
    write("hello world")
end
`,
        expected: 'hello world\n'
      },
      {
        input: `
procedure main()
    write(5 + 12)
end
`,
        expected: '17\n'
      }
    ]
    return cases.reduce((acc, { input, expected }) => {
      return acc.then(() => {
        let stdout = ''
        const opts = {
          readStdin: () => {},
          writeStdout: s => { stdout += s },
          writeStderr: () => {}
        }
        return Icon(input, opts).run().then(() => {
          expect(stdout).toBe(expected)
        })
      })
    }, Promise.resolve())
  })
})
