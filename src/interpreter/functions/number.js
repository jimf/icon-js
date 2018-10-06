const { notImplemented } = require('./util')
const Type = require('../types')

module.exports = function (env) {
  return {
    /**
     * Absolute value of integer or real
     *
     * (x)
     */
    abs: (x) => Type.toNumber(x).map(v => v.map(Math.abs)),

    /**
     * Arccos, returns radians
     *
     * (x)
     */
    acos: notImplemented('acos'),

    /**
     * Arcsin, returns radians
     *
     * (x)
     */
    asin: notImplemented('asin'),

    /**
     * Arctan, default 2nd arg is 1
     *
     * (y, x)
     */
    atan: notImplemented('atan'),

    /**
     * Degrees to radians
     *
     * (x)
     */
    dtor: notImplemented('dtor'),

    /**
     * Exponential
     *
     * (x)
     */
    exp: notImplemented('exp'),

    /**
     * Argument in radians
     *
     * (x)
     */
    cos: notImplemented('cos'),

    /**
     * Bitwise and
     *
     * (a, b)
     */
    iand: notImplemented('iand'),

    /**
     * Bitwise not (one’s complement)
     *
     * (a)
     */
    icom: notImplemented('icom'),

    /**
     * Bitwise or
     *
     * (x, y)
     */
    ior: notImplemented('ior'),

    /**
     * Shift x left n; negative n for right shift
     *
     * (x, n)
     */
    ishift: notImplemented('ishift'),

    /**
     * Bitwise exclusive or
     *
     * (x, y)
     */
    ixor: notImplemented('ixor'),

    /**
     * logb x; default b is e
     *
     * (x, b)
     */
    log: notImplemented('log'),

    /**
     * Radians to degrees
     *
     * (x)
     */
    rtod: notImplemented('rtod'),

    /**
     * Argument in radians
     *
     * (x)
     */
    sin: notImplemented('sin'),

    /**
     * Square root
     *
     * (x)
     */
    sqrt: notImplemented('sqrt'),

    /**
     * Argument in radians
     *
     * (x)
     */
    tan: notImplemented('tan')
  }
}
