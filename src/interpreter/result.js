function Success (value) {
  if (!(this instanceof Success)) { return new Success(value) }
  this.value = value
  this.isSuccess = true
}

Success.prototype.ap = function ap (other) {
  return other.map(this.value)
}

Success.prototype.chain = function chain (f) {
  return f(this.value)
}

Success.prototype.map = function map (f) {
  return new Success(f(this.value))
}

Success.prototype.cata = function cata (pattern) {
  return pattern.Success(this.value)
}

function Failure (reason) {
  if (!(this instanceof Failure)) { return new Failure(reason) }
  this.isFailure = true
  this.reason = reason
}

Failure.prototype.ap = function ap (_) {
  return this
}

Failure.prototype.chain = function chain (_) {
  return this
}

Failure.prototype.map = function map (_) {
  return this
}

Failure.prototype.cata = function cata (pattern) {
  return pattern.Failure(this)
}

module.exports = { Success, Failure }
