(function () {
  'use strict'

  /* global chrome */
  // TODO: SearchExtender scheme for bridging to executables

  const defConf = {
    searches: [
      ['Google', 5, 'g', 'http://www.google.co.jp/search?q=%t', false],
      ['Wikipedia(JP)', 5, 'wj', 'https://ja.wikipedia.org/wiki/%t', false],
      ['Wikipedia(EN)', 5, 'we', 'https://en.wikipedia.org/wiki/%t', false]
    ]
  }
  chrome.storage.sync.get({ searches: [], init: false }, (res) => {
    if (!res.init) {
      chrome.storage.sync.set(defConf)
    }

    // TODO: possible extension: restricted to specific URL
    const IDX_NAME = 0
    const IDX_TARGET = 1
    const IDX_KEY = 2
    const IDX_URL = 3
    const IDX_CURPAGE = 4
    // const IDX_ISPOST = 5
    // const TARGET_OMNIBOX = 1
    const TARGET_PAGE = 2
    const TARGET_SELECTION = 4
    const TARGET_LINK = 8
    const TARGET_IMAGE = 16
    const ARG_ANY = '%*'
    const ARG_SELTEXT = '%t'
    const ARG_URL = '%u'
    const ARG_CLIP = '%c'
    const ARG_LINK = '%l'
    const CONF_KEY = 'conf'
    const CONF_NAME = '設定'

    let conf = []
    let confIdxFromName = {}
    let confIdxFromKey = {}

    function base64url_encode (str) {
      let dat = str.split('').map(x => x.charCodeAt(0)).reduce((acc, cur) => {
        if(cur > 255) acc.push(cur % 256, Math.floor(cur / 256))
        else acc.push(cur)
        return acc
      }, []).reduce((acc, cur) => {
        let bits = 8 + acc[0]
        let val = (acc[1] << 8) + cur
        while (bits >= 6) {
          acc[2].push(val >> (bits - 6))
          val &= ((1 << (bits - 6)) - 1)
          bits -= 6
        }
        return [bits, val, acc[2]]
      }, [0, 0, []])
      if (dat[0] > 0) dat[2].push(dat[1]<<(6-dat[0]))
      return dat[2].map(x => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[x])
    }

    function emptify (val) { return val === undefined ? '' : val }
    function makeURL (spec, info, clip_) {
      const text = emptify(info.selectionText)
      const link = emptify(info.linkUrl)
      const src = emptify(info.srcUrl)
      const page = emptify(info.pageUrl)
      const clip = emptify(clip_)
      return spec.replace(ARG_SELTEXT, text).replace(ARG_LINK, link).replace(ARG_URL, src || page).replace(ARG_ANY, text || src || link || page).replace(ARG_CLIP, clip)
    }

    const defSuggest = { description: 'Type search key and keyword, like "g googling"' }
    chrome.omnibox.setDefaultSuggestion(defSuggest)

    chrome.omnibox.onInputChanged.addListener((text, suggest) => {
      const wsPos = text.search(/\s/)
      const key = text.slice(0, wsPos !== -1 ? wsPos : text.length)
      let suggests = []
      let conf_ = conf.slice()
      conf_.push([CONF_NAME, 0, CONF_KEY, ''])
      for (let c of conf_) {
        if (c[IDX_KEY].indexOf(key) !== -1) {
          suggests.push({ content: c[IDX_KEY], description: `<match>${c[IDX_KEY]}</match> <dim>${c[IDX_NAME]}</dim>` })
        }
      }
      if (suggests.length === 1) {
        chrome.omnibox.setDefaultSuggestion({ description: suggests[0].description })
      } else {
        chrome.omnibox.setDefaultSuggestion(defSuggest)
        suggest(suggests)
      }
    })

    chrome.omnibox.onInputEntered.addListener((text, disposition) => {
      chrome.omnibox.setDefaultSuggestion(defSuggest)
      const wsPos = (x => x === -1 ? text.length : x)(text.search(/\s/))
      const key = text.slice(0, wsPos)
      const query = text.slice(wsPos).trim()
      if (key === CONF_KEY) {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage()
        } else {
          window.open(chrome.runtime.getURL('options.html'))
        }
      } else {
        const url = makeURL(conf[confIdxFromKey[key]][IDX_URL], query)
        switch (disposition) {
          case 'currentTab':
            chrome.tabs.update({ url })
            break
          case 'newForegroundTab':
            chrome.tabs.create({ url })
            break
          case 'newBackgroundTab':
            chrome.tabs.create({ url, active: false })
            break
        }
      }
    })

    const contextsSpec = { [TARGET_PAGE]: 'page', [TARGET_SELECTION]: 'selection', [TARGET_LINK]: 'link', [TARGET_IMAGE]: 'image' }
    function setupMenu () {
      chrome.storage.sync.get('searches', (newconf) => {
        conf = newconf.searches
        confIdxFromName = {}
        confIdxFromKey = {}
        chrome.contextMenus.create({title: 'SearchExtender', id: 'root', contexts: ['page', 'selection', 'link', 'image']})
        for (let i = 0; i < conf.length; ++i) {
          const contexts = Object.keys(contextsSpec).filter(x => conf[i][IDX_TARGET] & x).map(x => contextsSpec[x])
          if (contexts.length !== 0) {
            chrome.contextMenus.create({
              title: conf[i][IDX_NAME],
              id: conf[i][IDX_NAME],
              contexts,
              parentId: 'root'
            })
          }
          confIdxFromName[conf[i][IDX_NAME]] = i
          confIdxFromKey[conf[i][IDX_KEY]] = i
        }
        chrome.contextMenus.create({
          title: CONF_NAME,
          id: CONF_KEY,
          contexts: ['page', 'selection', 'link', 'image'],
          parentId: 'root'
        })
      })
    }

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      console.log(info)
      if (info.menuItemId === CONF_KEY) {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage()
        } else {
          window.open(chrome.runtime.getURL('options.html'))
        }
      } else {
        const spec = conf[confIdxFromName[info.menuItemId]]
        new Promise((resolve, reject) => {
          if (spec[IDX_URL].indexOf(ARG_CLIP) !== -1) {
            chrome.permissions.request({ permissions: ['clipboardRead'] }, (granted) => {
              if (granted) {
                const ta = document.createElement('textarea')
                document.body.appendChild(ta)
                ta.focus()
                document.execCommand('paste')
                document.body.removeChild(ta)
                resolve(ta.value)
              }
              resolve(undefined)
            })
          } else resolve(undefined)
        }).then(clip => {
          const url = makeURL(spec[IDX_URL], info, clip)
          if (spec[IDX_CURPAGE]) {
            chrome.permissions.request({ permissions: ['activeTab'] }, (granted) => {
              if (granted) {
                chrome.tabs.update({ url })
              } else {
                chrome.tabs.create({ url })
              }
            })
          } else chrome.tabs.create({ url })
        })
      }
    })

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        if ('searches' in changes) chrome.contextMenus.removeAll(() => setupMenu())
      }
    })

    setupMenu()
  })
})()
