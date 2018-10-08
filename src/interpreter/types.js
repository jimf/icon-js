const { Success, Failure } = require('./result')

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

function Ord (Ctor) {
  Ctor.prototype.equals = function equals (other) {
    return this.value === other.value
  }
  Ctor.prototype.lte = function lte (other) {
    return this.value < other.value || this.equals(other)
  }
  return Ctor
}

function IconBase (type, value = null) {
  this.type = type
  this[`is${capitalize(type)}`] = true
  this.value = value
}

IconBase.prototype.ap = function ap (other) {
  return other.map(this.value)
}

IconBase.prototype.map = function map (f) {
  return new this.constructor(f(this.value))
}

IconBase.prototype.toString = function toString () {
  return String(this.value)
}

function createCtor (type, initialize) {
  const Ctor = function (value) {
    IconBase.call(this, type, value)
    if (initialize) {
      initialize(this, value)
    }
  }
  Ctor.prototype = Object.create(IconBase.prototype)
  Ctor.prototype.constructor = Ctor
  Ctor.displayName = `Icon${capitalize(type)}`
  return Ctor
}

const IconCoexpression = createCtor('coexpression')
const IconFile = createCtor('file')
const IconFunction = createCtor('function')
const IconInteger = Ord(createCtor('integer', (self, value) => {
  self.value = Math.trunc(value)
}))
const IconList = createCtor('list')
const IconProcedure = createCtor('procedure')
const IconReal = Ord(createCtor('real'))
const IconString = Ord(createCtor('string'))
const IconTable = createCtor('table')

const IconCset = createCtor('cset', (self, value) => {
  const set = new Set([])
  value.split('').forEach((c) => {
    set.add(c)
  })
  const ordered = [...set.values()]
  ordered.sort()
  self.value = set
  self.length = ordered.length
  self._string = ordered.join('')
  self._pattern = new RegExp(`[${self._string}]`)
})
IconCset.prototype.toString = function toString () {
  return this._string
}
IconCset.prototype.equals = function equals (other) {
  return other.isCset && this._string === other._string
}

IconFile.prototype.read = function read () {
  return this._readFile().then(() => this._next())
}
IconFile.prototype._readFile = function _readFile () {
  if (this._buffer) { return Promise.resolve() }
  return this.value.read().then((contents) => {
    this._buffer = contents.split('\n')
    if (this._buffer[this._buffer.length - 1] === '') {
      this._buffer.pop()
    }
  })
}
IconFile.prototype._next = function _next () {
  if (!this._buffer || this._buffer.length === 0) { return Failure() }
  const next = this._buffer.shift()
  if (this._buffer.length === 0) { delete this._buffer }
  return Success(new IconString(next))
}

const IconNull = createCtor('null')
IconNull.prototype.toString = function toString () {
  return ''
}

IconReal.prototype.toString = function toString () {
  const res = this.value.toString()
  return res.includes('.') ? res : res + '.0'
}

IconString.prototype.size = function size () {
  return this.value.length
}
IconString.prototype.subscript = function subscript (pos) {
  let idx = pos - 1
  if (pos <= 0) { idx = this.value.length - 1 + pos }
  return (idx < 0 || idx >= this.value.length)
    ? Failure('string subscript out of bounds')
    : Success(new IconString(this.value.charAt(idx)))
}

function toInteger (value) {
  switch (value.type) {
    case 'integer': return Success(value)
    case 'real': return Success(new IconInteger(Math.trunc(value.value)))
    case 'string': {
      const parsed = parseInt(value.value, 10)
      return isNaN(parsed)
        ? Failure(`numeric expected\noffending value: "${value.value}"`)
        : Success(new IconInteger(parsed))
    }
    default: throw new Error(`numeric expected\noffending value: ${value.type}`)
  }
}

function toReal (value) {
  switch (value.type) {
    case 'real': return Success(value)
    case 'integer': return Success(new IconReal(value.value))
    case 'string': {
      const parsed = parseFloat(value.value)
      return isNaN(parsed)
        ? Failure(`numeric expected\noffending value: ${value.value}`)
        : Success(new IconReal(parsed))
    }
    default: throw new Error(`numeric expected\noffending value: ${value.type}`)
  }
}

function toNumber (value) {
  switch (value.type) {
    case 'integer':
    case 'real':
      return Success(value)

    case 'string': {
      const val = parseFloat(value.value)
      if (isNaN(val)) { return Failure(`numeric expected\noffending value: ${value.value}`) }
      return Success(value.value.includes('.') ? new IconReal(val) : new IconInteger(val))
    }

    default:
      throw new Error(`numeric expected\noffending value: ${value.type}`)
  }
}

function toNumbers (values) {
  const { result, allSameType } = values.reduce((acc, val) => {
    return acc.result.cata({
      Failure: () => acc,
      Success: (nums) => {
        const toNumRes = toNumber(val)
        return toNumRes.cata({
          Failure: () => {
            acc.result = toNumRes
            return acc
          },
          Success: (num) => {
            acc.result = Success([...nums, num])
            if (acc.prevType !== null && acc.prevType !== num.type) {
              acc.allSameType = false
            }
            acc.prevType = num.type
            return acc
          }
        })
      }
    })
  }, { result: Success([]), prevType: null, allSameType: true })
  if (result.isFailure) { return result }
  return allSameType
    ? result
    : result.map(nums => nums.map(num => toReal(num).value))
}

function toString (value) {
  switch (value.type) {
    case 'string': return Success(value)

    case 'integer':
    case 'real':
    case 'cset':
      return Success(new IconString(value.toString()))

    default: throw new Error(`string or file expected\noffending value: ${value.value}`)
  }
}

function toCset (value) {
  switch (value.type) {
    case 'string': return Success(new IconCset(value.value))
    default: return Failure()
  }
}

function tryCoerceAll (values, coerceFn) {
  return values.reduce((acc, value) => {
    if (acc.isFailure) { return acc }
    const res = coerceFn(value)
    return res.cata({
      Failure: () => res,
      Success: (newVal) => Success([...acc.value, newVal])
    })
  }, Success([]))
}

module.exports = {
  IconCoexpression,
  IconCset,
  IconFile,
  IconFunction,
  IconInteger,
  IconList,
  IconNull,
  IconProcedure,
  IconReal,
  IconString,
  IconTable,
  toCset,
  toInteger,
  toNumber,
  toNumbers,
  toReal,
  toString,
  tryCoerceAll
}
