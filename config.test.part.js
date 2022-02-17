const expect = require('chai').expect

const defConfExternal = [
  {
    "name": "Google",
    "target": {
      "omnibox": true,
      "selection": true
    },
    "key": "g",
    "url": "http://www.google.co.jp/search?q=%s",
    "curTab": false,
    "isPost": false,
    "charset": ""
  },
  {
    "name": "Wikipedia(JP)",
    "target": {
      "omnibox": true,
      "selection": true
    },
    "key": "wj",
    "url": "https://ja.wikipedia.org/wiki/%s",
    "curTab": false,
    "isPost": false,
    "charset": ""
  },
  {
    "name": "Wikipedia(EN)",
    "target": {
      "omnibox": true,
      "selection": true
    },
    "key": "we",
    "url": "https://en.wikipedia.org/wiki/%s",
    "curTab": false,
    "isPost": false,
    "charset": ""
  }
]

const defConfInternal = [ { name: 'Google',
       target: 5,
       key: 'g',
       url: 'http://www.google.co.jp/search?q=%s',
       curTab: false,
       isPost: false,
       charset: "" },
     { name: 'Wikipedia(JP)',
       target: 5,
       key: 'wj',
       url: 'https://ja.wikipedia.org/wiki/%s',
       curTab: false,
       isPost: false,
       charset: "" },
     { name: 'Wikipedia(EN)',
       target: 5,
       key: 'we',
       url: 'https://en.wikipedia.org/wiki/%s',
       curTab: false,
       isPost: false,
       charset: "" } ]

describe('Conf', function() {
  const obj = g.Conf.fromStorage(g.Conf.defConfStorage)

  describe('fromStorage', function() {
    it('should return internal representation', function() {
      expect(obj.conf).to.deep.equal(defConfInternal)
    })
  })
  describe('fromExternal', function() {
    it('should have round-trip equality with toExternal()', function() {
      expect(g.Conf.fromExternal(obj.toExternal())).to.deep.equal(obj)
    })
  })
  describe('toContexts', function() {
    it('should return corresponding entries', function() {
      expect(g.Conf.toContexts(2)).to.be.deep.equal(['page'])
      expect(g.Conf.toContexts(4)).to.be.deep.equal(['selection'])
      expect(g.Conf.toContexts(8)).to.be.deep.equal(['link'])
      expect(g.Conf.toContexts(16)).to.be.deep.equal(['image'])
      expect(g.Conf.toContexts(31)).to.be.deep.equal(['page','selection','link','image'])
    })
    it('should return [] for unknown flags', function() {
      expect(g.Conf.toContexts(1)).to.be.deep.equal([])
      expect(g.Conf.toContexts(32)).to.be.deep.equal([])
    })
  })
  describe('Conf', function() {
    describe('toStorage', function() {
      it('should have round-trip equality with fromStorage()', function() {
        expect(obj.toStorage()).to.deep.equal(g.Conf.defConfStorage)
      })
    })
    describe('toExternal', function() {
      it('should return external representation', function() {
        expect(obj.toExternal()).to.deep.equal(defConfExternal)
      })
    })
    describe('getFromName', function() {
      it('should return corresponding entry', function() {
        for(entry of defConfInternal) {
          expect(obj.getFromName(entry.name)).to.deep.equal(entry)
        }
      })
      it('should return undefined for unknown name', function() {
        expect(obj.getFromName('')).to.be.undefined
      })
    })
    describe('getFromKey', function() {
      it('should return corresponding entry', function() {
        for(entry of defConfInternal) {
          expect(obj.getFromKey(entry.key)).to.deep.equal(entry)
        }
      })
      it('should return undefined for unknown key', function() {
        expect(obj.getFromKey('')).to.be.undefined
      })
    })
  })
})
