(function (g) {
  'use strict'
  function defineConst(obj, key, value) {
    return Object.defineProperty(obj, key, { value: value })
  }
  function defineVar(obj, key, value) {
    return Object.defineProperty(obj, key, { enumerable: true, writable: true, configurable: true, value: value })
  }

  g.Conf = {}

  const idx = ['name', 'target', 'key', 'url', 'curTab', 'isPost']
  idx.forEach((v,i) => defineConst(g.Conf, 'IDX_'+v.toUpperCase(), i))

  const targets = ['omnibox', 'page', 'selection', 'link', 'image']
  targets.forEach((v,i) => defineConst(g.Conf, 'TARGET_'+v.toUpperCase(), 1<<i))
  defineConst(g.Conf, 'TARGET_KEYS', targets)
  defineConst(g.Conf, 'TARGET_VALUES', targets.map((v,i) => 1<<i))
  defineConst(g.Conf, 'TARGET_KEYVALS', targets.map((v,i) => [v,1<<i]))

  defineConst(g.Conf, 'ARG_ANY', '%\\*')
  defineConst(g.Conf, 'ARG_SELTEXT', '%s')
  defineConst(g.Conf, 'ARG_URL', '%u')
  defineConst(g.Conf, 'ARG_CLIP', '%c')
  defineConst(g.Conf, 'ARG_LINK', '%l')

  defineConst(g.Conf, 'defConfStorage', {
    searches: [
      ['Google', 5, 'g', 'http://www.google.co.jp/search?q=%s', false, false],
      ['Wikipedia(JP)', 5, 'wj', 'https://ja.wikipedia.org/wiki/%s', false, false],
      ['Wikipedia(EN)', 5, 'we', 'https://en.wikipedia.org/wiki/%s', false, false]
    ]
  })

  // bitflags to an object
  let reduceTargetToObj = (flags) => targets.reduce((acc, v, i) => ((flags&(1<<i)) ? defineVar(acc, v, true) : acc), {})
  // an object to bitflags
  let reduceTargetToFlags = (obj) => targets.reduce((acc, v, i) => (obj[v] ? (acc | (1<<i)) : acc), 0)
  let id = v => v
  let Conf = (function () {
    const symFromName = Symbol()
    const symFromKey = Symbol()
    const symUpdateIndex = Symbol()
    function Conf(conf) {
      this.conf = conf
      this[symUpdateIndex]()
    }
    Conf.prototype[symUpdateIndex] = function() {
      this[symFromName] = this.conf.reduce((acc, v, i) => defineVar(acc, v.name, i), {})
      this[symFromKey] = this.conf.reduce((acc, v, i) => defineVar(acc, v.key, i), {})
    }
    Conf.prototype.toStorage = function() {
      return { searches: this.conf.map(x => idx.map(v => x[v])) }
    }
    Conf.prototype.toExternal = function() {
      return this.conf.map(x =>
        idx.reduce((acc, v, i) => defineVar(acc, v, ((i == g.Conf.IDX_TARGET ? reduceTargetToObj : id)(x[v]))), {})
      )
    }
    Conf.prototype.getFromName = function(name) {
      return ((name in this[symFromName]) ? this.conf[this[symFromName][name]] : undefined)
    }
    Conf.prototype.getFromKey = function(key) {
      return ((key in this[symFromKey]) ? this.conf[this[symFromKey][key]] : undefined)
    }
    Conf.prototype.addEntry = function(entry) {
      // TODO: check validity
      this.conf.push(entry)
      this[symUpdateIndex]()
    }
    Conf.prototype.replaceEntry = function(entry) {
      // TODO: check validity
      this.conf.splice(this.conf.findIndex(v => v.name === entry.name), 1, entry)
      this[symUpdateIndex]()
    }
    Conf.prototype.deleteEntry = function(name) {
      // TODO: check validity
      this.conf.splice(this.conf.findIndex(v => v.name === name), 1)
      this[symUpdateIndex]()
    }
    Conf.prototype.getSuggest = function(key) {
      return []
    }
    return Conf
  })()
  defineConst(g.Conf, 'fromStorage', function(conf) {
    if(conf.searches instanceof Object && 'searches' in conf.searches) { conf.searches = conf.searches.searches }
    return new Conf(conf.searches.map(x =>
      idx.reduce((acc, v, i) => defineVar(acc, v, x[i]), {})
    ))
  })
  defineConst(g.Conf, 'fromExternal', function(conf) {
    if (conf === null) return new Error('Invalid JSON')
    if (!(conf instanceof Array)) return new Error('root is not an array')
    try {
// TODO: check mandatory keys
      conf.forEach((v, idx) => {
        if (!(v instanceof Object)) throw new Error(`The ${idx + 1}-th entry is not an object`)
        if (typeof v.target !== 'object') throw new Error(`The 'target' of ${idx + 1}-th entry is not an object`)
        const unknown = Object.keys(v.target).filter(x => g.Conf.TARGET_KEYS.indexOf(x) === -1)
        if (unknown.length !== 0) throw new Error(`unknown key ${unknown.join(', ')} is used in ${idx + 1}-th entry`)
      })
    } catch (e) {
      return e
    }
    return new Conf(conf.map(x =>
      idx.reduce((acc, v, i) => defineVar(acc, v, ((i == g.Conf.IDX_TARGET ? reduceTargetToFlags : id)(x[v]))), {})
    ))
  })
  defineConst(g.Conf, 'toContexts', function(flags) {
    return Object.keys(reduceTargetToObj(flags&~1))
  })

})(g)
