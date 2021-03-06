const { notImplemented } = require('./util')
const { Success } = require('../result')
const Type = require('../types')
const { repeat } = require('../../util')

const trimRight = (s, c) => {
  while (s.charAt(s.length - 1) === c) {
    s = s.slice(0, -1)
  }
  return s
}

module.exports = function (env) {
  return {
    /**
     * Locate initial character.
     *
     * (c, s, i, j)
     */
    any: notImplemented('any'),

    /**
     * Balances cl, cr up to c
     *
     * (c, cl, cr, s, i, j)
     */
    bal: notImplemented('bal'),

    /**
     * Centers s in field of n, padded with p
     *
     * (s, n, p)
     */
    center: notImplemented('center'),

    /**
     * Untabify; default (,9)
     *
     * (s,i1,i2,: : :,in)
     */
    detab: notImplemented('detab'),

    /**
     * Tabify
     *
     * (s,i1,i2,: : :,in)
     */
    entab: notImplemented('entab'),

    /**
     * Find target t in source s
     *
     * (t, s, i, j)
     */
    find: notImplemented('find'),

    /**
     * Flush-left s in field of n, padded with p
     *
     * (s, n, p)
     */
    left: notImplemented('left'),

    /**
     * Scan s while 2 c
     *
     * (c, s, i, j)
     */
    many: notImplemented('many'),

    /**
     * Map characters from f to t in s. E.g., to upshift:
     *
     * (s, f, t)
     */
    map: notImplemented('map'),

    /**
     * Is target t a prefix of s?
     *
     * (t, s, i, j)
     */
    match: notImplemented('match'),

    /**
     * Advance &pos by n, return part skipped
     *
     * (n)
     */
    move: notImplemented('move'),

    /**
     * Is &pos at n?
     *
     * (n)
     */
    pos: notImplemented('pos'),

    /**
     * Replicate n copies of s
     *
     * (s, n)
     */
    repl (s, n) {
      return Success(st => nt =>
        new Type.IconString(repeat(st.value, nt.value))
      ).ap(Type.toString(s)).ap(Type.toInteger(n))
    },

    /**
     * Reverse string
     *
     * (s)
     */
    reverse (s) {
      return Success(st => st.map(sv => sv.split('').reverse().join('')))
        .ap(Type.toString(s))
    },

    /**
     * Flush right s in field of width n, pad p
     *
     * (s, n, p)
     */
    right (s, n = Type.IconInteger(1), p = Type.IconString(' ')) {
      return Success(st => nt => pt =>
        Type.IconString(`${repeat(pt.value, nt.value)}${st.value}`.slice(-nt.value))
      )
        .ap(Type.toString(s))
        .ap(Type.toInteger(n))
        .ap(Type.toString(p))
    },

    /**
     * Set &pos to n, return string from old &pos to there
     *
     * (n)
     */
    tab: notImplemented('tab'),

    /**
     * Trim trailing characters 2 c
     *
     * (s, c)
     */
    trim (s, c = Type.IconString(' ')) {
      return Success(st => ct => st.map(sv => trimRight(sv, ct.value)))
        .ap(Type.toString(s))
        .ap(Type.toString(c))
    },

    /**
     * Scan s until a character 2 c
     *
     * (c, s, i, j)
     */
    upto: notImplemented('upto')
  }
}
