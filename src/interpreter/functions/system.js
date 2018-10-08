const { notImplemented } = require('./util')
const { Success } = require('../result')
const Type = require('../types')

const toWriteString = t =>
  t.isNull ? Success(new Type.IconString('')) : Type.toString(t)

module.exports = function (env) {
  return {
    /**
     * Change directory to s.
     *
     * @param {IconString} path Path
     */
    chdir: notImplemented('chdir'),

    /**
     * Close file.
     *
     * @param {IconFile} file File handle
     */
    close: notImplemented('close'),

    /**
     * Delay i milliseconds,
     *
     * @param {IconInteger} ms Delay
     */
    delay: notImplemented('delay'),

    /**
     * Stack traceback with locals, i levels.
     *
     * @param {IconInteger} i Levels
     * @param {IconFile} f File
     */
    display: notImplemented('display'),

    /**
     * Terminate with status i.
     *
     * @param {IconInteger} exitCode Exit code
     */
    exit: notImplemented('exit'),

    /**
     * Flush output to file f.
     *
     * @param {IconFile} f File
     */
    flush: notImplemented('flush'),

    /**
     * Generates names of all builtin functions
     */
    function: notImplemented('function'),

    /**
     * Get next character
     */
    getch: notImplemented('getch'),

    /**
     * Get next character, no echo
     */
    getche: notImplemented('getche'),

    /**
     * Value of environmental variable s
     *
     * @param {IconString} envVar Environment variable name
     */
    getenv: notImplemented('getenv'),

    /**
     * Is there a character available for getch()?
     */
    kbhit: notImplemented('kbhit'),

    /**
     * Open a file: options taken from r (read), w (write),
     * a (append), b (read/write), c (create), t (enable line
     * terminator translation), and u (inhibit line terminator
     * translation).
     *
     * @param {IconString} name File path
     * @param {IconCset} options Options
     */
    open: notImplemented('open'),

    /**
     * Name of variable v
     *
     * @param {*} variable Variable
     */
    name: notImplemented('name'),

    /**
     * Return next line from f
     *
     * @param {IconFile} f File
     */
    read: (file) => {
      if (!file || file.isNull) { file = env.scope.lookup('&input') }
      return file.read()
    },

    /**
     * Read next n characters from f, may be short, fails
     * only if no characters remain
     *
     * @param {IconFile} f File
     * @param {IconInteger} n Num characters to read
     */
    reads: notImplemented('reads'),

    /**
     * Delete file whose name is s
     *
     * @param {IconString} path Path
     */
    remove: notImplemented('remove'),

    /**
     * Rename file so as sn
     *
     * @param {IconFile} file File path to rename
     * @param {IconString} name New name
     */
    rename: notImplemented('rename'),

    /**
     * Set file position, origin 1; negative = before end
     *
     * @param {IconFile} file File
     * @param {IconInteger} offset File position offset
     */
    seek: notImplemented('seek'),

    /**
     * Write the expressions and stop with exit status 1
     */
    stop: notImplemented('stop'),

    /**
     * Execute a command line
     *
     * @param {IconString} cmd System command
     */
    system: notImplemented('system'),

    /**
     * Returns the variable named s
     *
     * @param {IconString} name Variable name
     */
    variable: notImplemented('variable'),

    /**
     * Returns a file position
     *
     * @param {IconFile} file File
     */
    where: notImplemented('where'),

    /**
     * Write expressions, then newline.
     */
    write (...args) {
      return Type.tryCoerceAll(args, toWriteString).cata({
        Failure: errRes => errRes,
        Success: (strArgs) => {
          env.writeStdout(strArgs.map(arg => arg.toString()).join('') + '\n')
          return Success(strArgs[strArgs.length - 1])
        }
      })
    },

    /**
     * Write expressions, no newline.
     */
    writes (...args) {
      return Type.tryCoerceAll(args, toWriteString).cata({
        Failure: errRes => errRes,
        Success: (strArgs) => {
          env.writeStdout(strArgs.map(arg => arg.toString()).join(''))
          return Success(strArgs[strArgs.length - 1])
        }
      })
    }
  }
}
