const fs = require('fs')
const parseOpts = require('minimist')
const pkg = require('../package.json')
const Icon = require('./interpreter')

function help () {
  return `
usage: icon [sourcefile] [options]

Available options:
  --help, -h          This help
  --version           Print version information and exit
`.trim()
}

module.exports = (argv, options) => {
  const opts = parseOpts(argv, {
    boolean: ['help', 'version'],
    alias: {
      help: 'h'
    }
  })
  const inputFile = opts._[2]
  if (opts.version) {
    options.writeStdout(`icon-js ${pkg.version}\n`)
    return Promise.resolve()
  } else if (opts.help || !inputFile) {
    options.writeStdout(help() + '\n')
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    fs.readFile(inputFile, 'utf8', (err, source) => {
      if (err) {
        reject(err)
      } else {
        resolve(source)
      }
    })
  }).then((source) => {
    const icon = Icon(source, options)
    return icon.run()
  }).catch((err) => {
    console.log(err)
    options.writeStderr((err.message || err) + '\n')
    throw err
  })
}
