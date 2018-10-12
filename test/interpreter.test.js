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

  describe('compound expression', () => {
    it('should evaluate expressions in turn', () => {
      const prg = `
procedure main()
  { write(1); write(2); write(3) }
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('1\n2\n3\n')
      })
    })

    it('should return result of final expression', () => {
      const prg = `
procedure main()
  write({ write(1); write(2); write(3) })
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('1\n2\n3\n3\n')
      })
    })

    it('should not stop evaluation on failing sub-expression', () => {
      const prg = `
procedure main()
  { write(1); write(2 < 1); write(3) }
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('1\n3\n')
      })
    })
  })

  describe('control structures', () => {
    describe('if-then-else', () => {
      it('should result in expr2 when expr1 succeeds', () => {
        const prg = `
procedure main()
  writes(if 1 < 2 then 3 else 4)
end`
        return testProgram(prg).then(({ stdout }) => {
          expect(stdout).toBe('3')
        })
      })

      it('should result in expr3 when expr1 fails', () => {
        const prg = `
procedure main()
  writes(if 1 > 2 then 3 else 4)
end`
        return testProgram(prg).then(({ stdout }) => {
          expect(stdout).toBe('4')
        })
      })

      it('should result in failure when expr1 fails and expr3 is omitted', () => {
        const prg = `
procedure main()
  writes(if 1 > 2 then 3)
end`
        return testProgram(prg).then(({ stdout }) => {
          expect(stdout).toBe('')
        })
      })
    })

    describe('not', () => {
      it('should result in Success(&null) when expression fails', () => {
        return testExprs([
          { input: 'if not (1 > 2) then "ok"', expected: 'ok' }
        ])
      })

      it('should result in Failure when expression succeeds', () => {
        return testExprs([
          { input: 'if not (1 < 2) then "ok"', expected: '' }
        ])
      })
    })

    test('repeat', () => {
      const prg = `
procedure main()
  x := 0
  repeat {
    write(x);
    x := x + 1;
    if x = 5 then
      break
  }
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('0\n1\n2\n3\n4\n')
      })
    })

    test('until/do', () => {
      const prg = `
procedure main()
  x := 0
  until x >= 5 do
    x := x + 1
  writes(x)
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('5')
      })
    })

    test('while/do', () => {
      const prg = `
procedure main()
  x := 0
  while x < 5 do
    x := x + 1
  writes(x)
end`
      return testProgram(prg).then(({ stdout }) => {
        expect(stdout).toBe('5')
      })
    })
  })

  describe('functions', () => {
    test('integer', () => {
      return testExprs([
        { input: 'integer("12")', expected: '12' },
        { input: 'integer(.01)', expected: '0' },
        { input: 'integer(&null)', expected: '' }
      ])
    })

    test('numeric', () => {
      return testExprs([
        { input: 'numeric("12")', expected: '12' },
        { input: 'numeric("12.0")', expected: '12.0' },
        { input: 'numeric(&null)', expected: '' }
      ])
    })

    test('real', () => {
      return testExprs([
        { input: 'real("12")', expected: '12.0' },
        { input: 'real("xx")', expected: '' },
        { input: 'real(&null)', expected: '' }
      ])
    })

    test('repl', () => {
      return testExprs([
        { input: 'repl("x", 5)', expected: 'xxxxx' }
      ])
    })

    test('reverse', () => {
      return testExprs([
        { input: 'reverse("hello")', expected: 'olleh' }
      ])
    })

    test('right', () => {
      return testExprs([
        { input: 'right(35, 10, ".")', expected: '........35' },
        { input: 'right(35, 10)', expected: '        35' }
      ])
    })

    test('string', () => {
      return testExprs([
        { input: 'string(2^32)', expected: '4294967296' },
        { input: 'string(234.567e-5)', expected: '0.00234567' },
        { input: 'string(&null)', expected: '' }
      ])
    })

    test('trim', () => {
      return testExprs([
        { input: 'trim("just a test   ")', expected: 'just a test' }
      ])
    })

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

    it('should interpret unary / (is-null)', () => {
      return testExprs([
        { input: '/&null & "ok"', expected: 'ok' },
        { input: '/1 & "ok"', expected: '' }
      ])
    })

    it('should interpret unary \\ (is-not-null)', () => {
      return testExprs([
        { input: '\\&null & "ok"', expected: '' },
        { input: '\\1 & "ok"', expected: 'ok' }
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
        { input: '1 + 2 < 3 * 4 > 5', expected: '5' },
        { input: '"01" = "1"', expected: '1' },
        { input: '"01" < "1"', expected: '' }
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
        { input: '"a" ~== "b"', expected: 'b' },
        { input: '"01" == "1"', expected: '' },
        { input: '"01" << "1"', expected: '1' }
      ])
    })

    it('should interpret strict equality', () => {
      return testExprs([
        { input: '2 === "2"', expected: '' },
        { input: '2 ~=== "2"', expected: '2' },
        { input: '"xyz" === "x" || "y" || "z"', expected: 'xyz' }
      ])
    })

    it('should interpret expression conjunction', () => {
      return testExprs([
        { input: '1 & 2', expected: '2' },
        { input: '0 & 2 < 4', expected: '4' }
      ])
    })
  })

  describe('procedures', () => {
    it('should fail when control flow reaches end of procedure without returning', () => {
      return testProgram(`
procedure f()
end

procedure main()
    writes(f() & "ok")
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('')
      })
    })

    it('should return &null if no value is specified in return expression', () => {
      return testProgram(`
procedure f()
  write("f called")
  return
end

procedure main()
    write(/f() & "ok")
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('f called\nok\n')
      })
    })

    it('should return result of return expression', () => {
      return testProgram(`
procedure f()
  return "f result"
end

procedure main()
    write(f())
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('f result\n')
      })
    })

    it('should process arguments', () => {
      return testProgram(`
procedure add(x, y)
  return x + y
end

procedure main()
    write(add(3, 8))
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('11\n')
      })
    })

    it('should fill in omitted arguments with &null', () => {
      return testProgram(`
procedure wrap(s, w)
  /s := "";   # if s is null, set s to ""
  /w := "()"; # if w is null, set w to "()"
  return w[1] || s || w[2]
end

procedure main()
    write(wrap("x", "[]"))
    write(wrap("x"))
    write(wrap(, "{}"))
    write(wrap(,))
    write(wrap())
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('[x]\n(x)\n{}\n()\n()\n')
      })
    })
  })

  describe('scope', () => {
    test('global', () => {
      return testProgram(`
global x, y
global z

procedure main()
    x := 1
    z := "zzz..."
    f()
    write("x is ", x)
end

procedure f()
    x := 2
    write(z)
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('zzz...\nx is 2\n')
      })
    })

    test('global and local', () => {
      return testProgram(`
global x

procedure main()
    x := 42
    write(f())
    write(x)
end

procedure f()
    local x
    x := 3
    return x
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('3\n42\n')
      })
    })

    test('static', () => {
      return testProgram(`
procedure last(n)
    static last_value
    result := last_value
    last_value := n
    return result
end

procedure main()
    write(type(last(3)))
    write(last("abc"))
    write(last(7.4))
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('null\n3\nabc\n')
      })
    })

    test('static with initialize', () => {
      return testProgram(`
procedure log(s)
    static entry_num
    initial {
        write("Log initialized");
        entry_num := 0
    }
    write(entry_num +:= 1, ": ", s)
end

procedure main()
    log("The first entry");
    log("Another entry");
    log("The third entry")
end
      `).then(({ stdout }) => {
        expect(stdout).toBe('Log initialized\n1: The first entry\n2: Another entry\n3: The third entry\n')
      })
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
