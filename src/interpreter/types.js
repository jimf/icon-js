const { Success, Failure } = require('./result')

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

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
const IconFunction = createCtor('function')
const IconInteger = createCtor('integer')
const IconList = createCtor('list')
const IconProcedure = createCtor('procedure')
const IconReal = createCtor('real')
const IconString = createCtor('string')
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
IconCset.prototype.isEqual = function isEqual (other) {
  return other.isCset && this._string === other._string
}

const IconNull = createCtor('null')
IconNull.prototype.toString = function toString () {
  return ''
}

IconReal.prototype.toString = function toString () {
  const res = this.value.toString()
  return res.includes('.') ? res : res + '.0'
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
    default: return Failure(`numeric expected\noffending value: ${value.value}`)
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
    default: return Failure(`numeric expected\noffending value: ${value.value}`)
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
      return Success(val % 1 === 0 ? new IconInteger(val) : new IconReal(val))
    }

    default:
      return Failure(`numeric expected\noffending value: ${value.value}`)
  }
}

function toNumbers (values) {
  const { result, allSameType } = values.reduce((acc, val) => {
    return acc.result.cata({
      Failure: () => acc,
      Success: (nums) => {
        return toNumber(val).cata({
          Failure: () => acc,
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

    default: return Failure()
  }
}

function toCset (value) {
  switch (value.type) {
    case 'string': return Success(new IconCset(value.value))
    default: return Failure()
  }
}

module.exports = {
  IconCoexpression,
  IconCset,
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
  toString
}
