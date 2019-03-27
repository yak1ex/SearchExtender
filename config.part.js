let g = {}
;(function (g) {
  'use strict'
  function defineConst(obj, key, value) {
    Object.defineProperty(obj, key, { value: value })
  }

  g.Conf = {}

  defineConst(g.Conf, 'IDX_NAME', 0)
  defineConst(g.Conf, 'IDX_TARGET', 1)
  defineConst(g.Conf, 'IDX_KEY', 2)
  defineConst(g.Conf, 'IDX_URL', 3)
  defineConst(g.Conf, 'IDX_CURTAB', 4)
  defineConst(g.Conf, 'IDX_ISPOST', 5)

  defineConst(g.Conf, 'TARGET_OMNIBOX', 1)
  defineConst(g.Conf, 'TARGET_PAGE', 2)
  defineConst(g.Conf, 'TARGET_SELECTION', 4)
  defineConst(g.Conf, 'TARGET_LINK', 8)
  defineConst(g.Conf, 'TARGET_IMAGE', 16)

  defineConst(g.Conf, 'ARG_ANY', '%\\*')
  defineConst(g.Conf, 'ARG_SELTEXT', '%s')
  defineConst(g.Conf, 'ARG_URL', '%u')
  defineConst(g.Conf, 'ARG_CLIP', '%c')
  defineConst(g.Conf, 'ARG_LINK', '%l')

  defineConst(g.Conf, 'defConfExternal', {
    searches: [
      ['Google', 5, 'g', 'http://www.google.co.jp/search?q=%s', false, false],
      ['Wikipedia(JP)', 5, 'wj', 'https://ja.wikipedia.org/wiki/%s', false, false],
      ['Wikipedia(EN)', 5, 'we', 'https://en.wikipedia.org/wiki/%s', false, false]
    ]
  })

  function Conf(conf) {
    this.conf = conf
  }
  Conf.prototype.toStorage = function() {
    return this.conf
  }
  Conf.prototype.fromStorage = function() {
    return this.conf
  }
  Conf.prototype.getSuggest = function(key) {
    return []
  }

  defineConst(g.Conf, 'fromStorage', function(conf) {
    return new Conf(conf)
  })
  defineConst(g.Conf, 'fromExternal', function(conf) {
    return new Conf(conf)
  })

})(g)
console.log(g.Conf.fromStorage([]).toStorage())
