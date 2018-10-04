module.exports = function (env) {
  return {
    write (...args) {
      env.writeStdout(args.map(arg => arg.toString()).join('') + '\n')
      return args[args.length - 1]
    }
  }
}
