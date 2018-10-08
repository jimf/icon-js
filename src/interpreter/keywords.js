const Type = require('./types')

const ascii = c => c.charCodeAt(0)
const asciiRange = (start, end) => {
  let result = ''
  for (let i = start; i <= end; i += 1) {
    result += String.fromCharCode(i)
  }
  return result
}
const lower = asciiRange(ascii('a'), ascii('z'))
const upper = asciiRange(ascii('A'), ascii('Z'))

module.exports = function (env) {
  return {
    // &allocated : i1,i2,i3,i4    # accumulated bytes allocated
    //                             # (total,static,string,block)
    '&ascii': new Type.IconCset(asciiRange(0, 127)),
    // &clock : s                  # current time of day
    // &collections : i1,i2,i3,i4  # collection count
    //                             # (total,static,string,block)
    // '&cset': new Type.IconCset(
    //   (new Array(255))
    //     .fill(0)
    //     .map((_, idx) => String.fromCharCode(idx))
    //     .join('')
    // ),
    // &current : C                # current co-expression
    // &date : s                   # current date
    // &dateline : s               # current date and time
    '&digits': new Type.IconCset('0123456789'),
    // &dump : i                   # if non-zero, causes dump on termination
    // &e : r                      # base of natural logarithms, 2.71828...
    // &error : i                  # run-time error conversion control
    // &errornumber : i            # run-time error number
    // &errortext : s              # run-time error message text
    // &errorvalue : x             # run-time error offending value
    // &errout : f                 # standard error output file
    // &fail                       # fails
    // &features : s1,s2,...,sn    # implementation features
    // &file : s                   # current source code file name
    // &host : s                   # string identifying host computer
    '&input': new Type.IconFile({
      read: env.readStdin,
      write: () => Promise.resolve()
    }),
    '&lcase': new Type.IconCset(lower),
    '&letters': new Type.IconCset(upper + lower),
    // &level : i                  # level of current procedure call
    // &line : i                   # current source code line number
    // &main : C                   # main co-expression
    // &null : n                   # the null value
    // &output : f                 # standard output file
    // &phi : r                    # The golden ratio, 1.61803...
    '&pi': new Type.IconReal(Math.PI),
    // &pos : i                    # string scanning position
    // &progname : s               # file name of the executing program
    // &random : i                 # random number seed
    // &regions : i1,i2,i3         # current region size
    //                             # (static,string,block)
    // &source : C                 # activator of current co-expression
    // &storage : i1,i2,i3         # current bytes allocated
    //                             # (static,string,block)
    // &subject : s                # string scanning subject
    // &time : i                   # current run time in milliseconds
    // &trace : i                  # procedure tracing control
    '&ucase': new Type.IconCset(upper)
    // &version : s                # version of Icon
  }
}
