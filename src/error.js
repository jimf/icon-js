exports.formatErrorContext = function formatErrorContext (input, line, col) {
  // TODO: add line numbers
  const lineIdx = line - 1
  const lines = input.split('\n')
  const errorMsg = []
  if (lines[lineIdx - 1] !== undefined) { errorMsg.push(lines[lineIdx - 1]) }
  errorMsg.push(lines[lineIdx])
  errorMsg.push((new Array(col)).fill(' ').join('') + '^')
  if (lines[lineIdx + 1] !== undefined) { errorMsg.push(lines[lineIdx + 1]) }
  return errorMsg.join('\n')
}
