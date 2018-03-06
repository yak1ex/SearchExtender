(function () {
  'use strict'

  /* global chrome */
  // TODO: configuration

  const defConf = {
    searches: [
      ['Google', 5, 'g', 'http://www.google.co.jp/search?q=%t'],
      ['Wikipedia(JP)', 5, 'wj', 'https://ja.wikipedia.org/wiki/%t'],
      ['Wikipedia(EN)', 5, 'we', 'https://en.wikipedia.org/wiki/%t']
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
    // const IDX_ISPOST = 4
    // const TARGET_OMNIBOX = 1
    const TARGET_PAGE = 2
    const TARGET_SELECTION = 4
    const TARGET_LINK = 8
    const TARGET_IMAGE = 16
    const ARG_ANY = '%*'
    const ARG_SELTEXT = '%t'
    const ARG_URL = '%u'
    // const ARG_CLIP = '%c'
    // const ARG_LINK = '%l'

    let conf = []
    let confIdxFromName = {}
    let confIdxFromKey = {}

    function makeURL (spec, text, url) {
      if (text === undefined) text = ''
      if (url === undefined) url = ''
      return spec.replace(ARG_SELTEXT, text).replace(ARG_URL, url).replace(ARG_ANY, text || url)
    }

    const defSuggest = { description: 'Type search key and keyword, like "g googling"' }
    chrome.omnibox.setDefaultSuggestion(defSuggest)

    // TODO: conf by omnibox
    chrome.omnibox.onInputChanged.addListener((text, suggest) => {
      const wsPos = text.search(/\s/)
      const key = text.slice(0, wsPos !== -1 ? wsPos : text.length)
      let suggests = []
      for (let c of conf) {
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
      const wsPos = text.search(/\s/)
      const key = text.slice(0, wsPos)
      const query = text.slice(wsPos).trim()
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
          title: '設定',
          id: '設定',
          contexts: ['page', 'selection', 'link', 'image'],
          parentId: 'root'
        })
      })
    }

    // TODO: open in current tab, next tab
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      console.log(info)
      if (info.menuItemId === '設定') {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage()
        } else {
          window.open(chrome.runtime.getURL('options.html'))
        }
      } else {
        const url = makeURL(conf[confIdxFromName[info.menuItemId]][IDX_URL], info.selectionText, info.linkUrl || info.srcUrl || info.pageUrl)
        chrome.tabs.create({ url })
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
