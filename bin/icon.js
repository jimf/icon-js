#!/usr/bin/env node
/* eslint no-console:0 */

const cli = require('../src/cli')

const readStdin = () => {
  return new Promise((resolve, reject) => {
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
    process.stdin.once('error', reject)
  })
}

const opts = {
  readStdin,
  writeStdout: process.stdout.write.bind(process.stdout),
  writeStderr: process.stderr.write.bind(process.stderr)
}

cli(process.argv, opts)
  .then(() => { process.exit(0) })
  .catch(() => { process.exit(1) })
