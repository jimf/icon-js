/* global describe, it, test, expect */
const Icon = require('../src/interpreter')

describe('Interpreter', () => {
  const testProgram = src => {
    let stdout = ''
    let stderr = ''
    let err = null
    const opts = {
      readStdin: () => {},
      writeStdout: s => { stdout += s },
      writeStderr: s => { stderr += s }
    }
    return Icon(src, opts).run()
      .catch((e) => {
        err = e.message
      })
      .then(() => ({ stdout, stderr, err }))
  }

  const testExpr = expr => {
    const src = `
procedure main()
  writes(${expr})
end`
    return testProgram(src)
  }

  const testExprs = cases =>
    cases.reduce(
      (acc, { input, expected, expectedErr }) => acc.then(() => testExpr(input).then(({ stdout, err }) => {
        expect(stdout).toBe(expected)
        if (expectedErr !== undefined) {
          expect(err).toEqual(expectedErr)
        }
      })),
      Promise.resolve()
    )

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
      },
      {
        input: `
procedure main()
    message := "hello world"
    write(message)
end
`,
        expected: 'hello world\n'
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

  describe('functions', () => {
    test('type', () => {
      return testExprs([
        { input: 'type(1)', expected: 'integer' },
        { input: 'type(1.0)', expected: 'real' },
        { input: 'type("hi")', expected: 'string' },
        { input: "type('abc')", expected: 'cset' },
        { input: 'type(x)', expected: 'null' },
        { input: 'type(type)', expected: 'procedure' }
      ])
    })
  })

  describe('operators', () => {
    it('should interpret addition', () => {
      return testExprs([
        { input: '3 + 4', expected: '7' },
        { input: '3 + 4.5', expected: '7.5' },
        { input: '3.2 + 4.7', expected: '7.9' },
        { input: '"3" + "4"', expected: '7' },
        { input: '"3" + "4.5"', expected: '7.5' },
        { input: '"3.2" + "4.7"', expected: '7.9' },
        { input: '1 + 2 + 3', expected: '6' }
      ])
    })

    it('should interpret subtraction', () => {
      return testExprs([
        { input: '5 - 3', expected: '2' },
        { input: '3.5 - 2.1', expected: '1.4' },
        { input: '3 - 2.0', expected: '1.0' },
        { input: '"4" - "3"', expected: '1' },
        { input: '"3" - "1.2"', expected: '1.8' },
        { input: '"3.5" - "2.1"', expected: '1.4' },
        { input: '10 - 2 - 2', expected: '6' }
      ])
    })

    it('should interpret multiplication', () => {
      return testExprs([
        { input: '5 * 3', expected: '15' },
        { input: '0.5 * 8', expected: '4.0' },
        { input: '"4" * "3"', expected: '12' },
        { input: '2 * 3 * 4', expected: '24' }
      ])
    })

    it('should interpret division', () => {
      return testExprs([
        { input: '30 / 4', expected: '7' },
        { input: '30 / 4.0', expected: '7.5' },
        { input: '"30" / "4"', expected: '7' },
        { input: '"30" / "4.0"', expected: '7.5' }
      ])
    })

    it('should interpret modulus', () => {
      return testExprs([
        { input: '10.0 % 2', expected: '0.0' },
        { input: '10 % 2', expected: '0' }
      ])
    })

    it('should interpret negation', () => {
      return testExprs([
        { input: '-5', expected: '-5' },
        { input: '-5.3', expected: '-5.3' },
        { input: '"-5"', expected: '-5' },
        { input: '"-5.25"', expected: '-5.25' }
      ])
    })

    it('should interpret unary +', () => {
      return testExprs([
        { input: '+5', expected: '5' },
        { input: '+-5', expected: '-5' }
      ])
    })

    it('should interpret unary * (size)', () => {
      return testExprs([
        { input: '*"abc"', expected: '3' }
      ])
    })

    it('should interpret exponentiation', () => {
      return testExprs([
        { input: '2 ^ 3', expected: '8' },
        { input: '2 ^ 2 ^ 3', expected: '256' }
      ])
    })

    it('should interpret string concatenation', () => {
      return testExprs([
        { input: '"hello" || "world"', expected: 'helloworld' },
        { input: '3 || 4', expected: '34' },
        { input: '"a" || "b" || "c"', expected: 'abc' }
      ])
    })

    it('should interpret grouped operations', () => {
      return testExprs([
        { input: '*("hello" || "world")', expected: '10' },
        { input: '3 * (5 - 4)', expected: '3' }
      ])
    })

    it('should interpret numeric equality', () => {
      return testExprs([
        { input: '1 = 1', expected: '1' },
        { input: '1 = 0', expected: '' },
        { input: '1.0 = 1.0', expected: '1.0' },
        { input: '1.0 = 0.0', expected: '' },
        { input: '1 = 0.0', expected: '' },
        { input: '1 = 1.0', expected: '1.0' },
        { input: '"1" = "1"', expected: '1' },
        { input: '1 <= 1', expected: '1' },
        { input: '0 <= 1', expected: '1' },
        { input: '2 <= 1', expected: '' },
        { input: '2 < 1', expected: '' },
        { input: '1 < 1', expected: '' },
        { input: '0 < 1', expected: '1' },
        { input: '2 > 1', expected: '1' },
        { input: '1 > 1', expected: '' },
        { input: '0 > 1', expected: '' },
        { input: '2 >= 1', expected: '1' },
        { input: '1 >= 1', expected: '1' },
        { input: '0 >= 1', expected: '' },
        { input: '2 ~= 1', expected: '1' },
        { input: '1 ~= 1', expected: '' },
        { input: '0 ~= 1', expected: '1' },
        { input: '1 + 2 < 3 * 4 > 5', expected: '5' }
      ])
    })

    it('should interpret string equality', () => {
      return testExprs([
        { input: '"c" == "b"', expected: '' },
        { input: '"b" == "b"', expected: 'b' },
        { input: '"b" == "a"', expected: '' },
        { input: '"b" <<= "b"', expected: 'b' },
        { input: '"a" <<= "b"', expected: 'b' },
        { input: '"c" <<= "b"', expected: '' },
        { input: '"c" << "b"', expected: '' },
        { input: '"b" << "b"', expected: '' },
        { input: '"a" << "b"', expected: 'b' },
        { input: '"c" >> "b"', expected: 'b' },
        { input: '"b" >> "b"', expected: '' },
        { input: '"a" >> "b"', expected: '' },
        { input: '"c" >>= "b"', expected: 'b' },
        { input: '"b" >>= "b"', expected: 'b' },
        { input: '"a" >>= "b"', expected: '' },
        { input: '"c" ~== "b"', expected: 'b' },
        { input: '"b" ~== "b"', expected: '' },
        { input: '"a" ~== "b"', expected: 'b' }
      ])
    })
  })

  describe('variables', () => {
    it('should initialize with null value', () => {
      return testExprs([
        { input: 'type(x)', expected: 'null' }
      ])
    })

    it('should allow overwrites', () => {
      return testProgram(`
procedure main()
    t := 1
    t := 2
    writes(t)
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('2')
      })
    })

    it('can be assigned the value of another variable', () => {
      return testProgram(`
procedure main()
    x := 42
    y := x
    writes(y)
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('42')
      })
    })

    it('may be explicitly assigned the &null value', () => {
      return testProgram(`
procedure main()
    x := &null
    writes(type(x))
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('null')
      })
    })

    it('should never cast &null to appropriate type', () => {
      return testExprs([
        { input: 'x + 10', expected: '', expectedErr: expect.stringContaining('offending value: null') }
      ])
    })
  })

  describe('subscripts', () => {
    it('should interpret subscripts', () => {
      return testExprs([
        { input: '"abcdef"[3]', expected: 'c' },
        { input: '"abcdef"[0]', expected: 'f' },
        { input: '"abcdef"[-1]', expected: 'e' }
      ])
    })
  })
})
