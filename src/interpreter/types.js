const { Success, Failure } = require('./result')

const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1)

function IconBase (type, value = null) {
  this.type = type
  this[`is${capitalize(type)}`] = true
  this.value = value
}

IconBase.prototype.toString = function toString () {
  return String(this.value)
}

function createCtor (type) {
  const Ctor = function (value) {
    IconBase.call(this, type, value)
  }
  Ctor.prototype = Object.create(IconBase.prototype)
  Ctor.prototype.constructor = Ctor
  Ctor.displayName = `Icon${capitalize(type)}`
  return Ctor
}

const IconCoexpression = createCtor('coexpression')
const IconCset = createCtor('cset')
const IconInteger = createCtor('integer')
const IconList = createCtor('list')
const IconProcedure = createCtor('procedure')
const IconReal = createCtor('real')
const IconString = createCtor('string')
const IconTable = createCtor('table')

const IconNull = createCtor('null')
IconNull.prototype.toString = function toString () {
  return ''
}

function toInteger (value) {
  switch (value.type) {
    case 'integer': return Success(value)
    case 'real': return Success(new IconInteger(value.value))
    case 'string': {
      const parsed = parseInt(value.value, 10)
      return isNaN(parsed)
        ? Failure(`numeric expected\noffending value: "${value.value}"`)
        : Success(new IconInteger(parsed))
    }
    default: return Failure(`numeric expected\noffending value: ${value.value}`)
  }
}

module.exports = {
  IconCoexpression,
  IconCset,
  IconInteger,
  IconList,
  IconNull,
  IconProcedure,
  IconReal,
  IconString,
  IconTable,
  toInteger
}
