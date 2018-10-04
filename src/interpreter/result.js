function Success (value) {
  if (!(this instanceof Success)) { return new Success(value) }
  this.value = value
  this.isSuccess = true
}

Success.prototype.map = function map (f) {
  return new Success(f(this.value))
}

Success.prototype.cata = function cata (pattern) {
  return pattern.Success(this.value)
}

function Failure () {
  if (!(this instanceof Failure)) { return new Failure() }
  this.isFailure = true
}

Failure.prototype.map = function map (_) {
  return this
}

Failure.prototype.cata = function cata (pattern) {
  return pattern.Failure()
}

module.exports = { Success, Failure }
