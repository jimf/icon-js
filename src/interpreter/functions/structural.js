const { notImplemented } = require('./util')
const { Success } = require('../result')
const Type = require('../types')

module.exports = function (env) {
  return {
    /**
     * Character whose ordinal is o
     *
     * @param {IconInteger} o Ordinal value
     */
    char: notImplemented('char'),

    /**
     * Structure copy
     *
     * @param {*} x Variable
     */
    copy: notImplemented('copy'),

    /**
     * Cast to cset
     *
     * @param {*} x Variable
     */
    cset: notImplemented('cset'),

    /**
     * Delete element x from set s
     *
     * @param {*} x Element
     * @param {IconTable|IconCset} container Set
     */
    delete: notImplemented('delete'),

    /**
     * Pop first element of list L
     *
     * @param {IconList} list List
     */
    get: notImplemented('get'),

    /**
     * String image of x
     *
     * @param {*} x Variable
     */
    image: notImplemented('image'),

    /**
     * Insert x into set s
     *
     * @param {IconTable|IconCset} set Set
     * @param {*} x Element
     */
    insert: notImplemented('insert'),

    /**
     * Cast to integer
     *
     * @param {*} x Variable
     */
    integer: notImplemented('integer'),

    /**
     * List of n elements equal to x
     *
     * @param {IconInteger} n Count
     * @param {*} x Variable
     */
    list: notImplemented('list'),

    /**
     * Set membership: is x 2 s?
     *
     * @param {IconTable|IconSet} s Set
     * @param {*} x Variable
     */
    member: notImplemented('member'),

    /**
     * Cast to integer or real
     *
     * @param {*} x Variable
     */
    numeric: notImplemented('numeric'),

    /**
     * Ordinal of 1-character strings
     *
     * @param {IconString} s String
     */
    ord: notImplemented('ord'),

    /**
     * Pop first element of list L
     *
     * @param {IconList} list List
     */
    pop: notImplemented('pop'),

    /**
     * Pop last element of list L
     *
     * @param {IconList} list List
     */
    pull: notImplemented('pull'),

    /**
     * Push x as first element of L
     *
     * @param {IconList} list List
     * @param {*} x Variable
     */
    push: notImplemented('push'),

    /**
     * Push x as last element of L
     *
     * @param {IconList} list List
     * @param {*} x Variable
     */
    put: notImplemented('put'),

    /**
     * Cast to real
     *
     * @param {*} x Variable
     */
    real: notImplemented('real'),

    /**
     * Infinite sequence: i; i + j; i + 2j; : : :
     *
     * @param {IconInteger} start Start value
     * @param {IconInteger} inc Increment by
     */
    seq: notImplemented('seq'),

    /**
     * Set of distinct elements in list L
     *
     * @param {IconList} list List
     */
    set: notImplemented('set'),

    /**
     * Sort a list
     *
     *   OR
     *
     * Sort table t. Produces a list of 2-elt lists (i, v) of indices
     * and values; sort by i if k = 1, by v if k = 2.
     *
     * @param {IconList|IconTable} list List
     * @param {IconInteger} [k] K value
     */
    sort: notImplemented('sort'),

    /**
     * Sort lists and records, using the kth field as key
     *
     * @param {*} x Variable
     * @param {IconInteger} k Kth field
     */
    sortf: notImplemented('sortf'),

    /**
     * Cast to string
     *
     * @param {*} x Variable
     */
    string: notImplemented('string'),

    /**
     * New table with initial value x
     *
     * @param {*} x Variable
     */
    table: notImplemented('table'),

    /**
     * String describing the type of x
     *
     * @param {*} x Variable
     */
    type: x => Success(new Type.IconString(x.type === 'function' ? 'procedure' : x.type))
  }
}
