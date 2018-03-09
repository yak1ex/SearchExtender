(function () {
  'use strict'

  /* global chrome */

  const defConf = {
    searches: [
      ['Google', 5, 'g', 'http://www.google.co.jp/search?q=%s', false, false],
      ['Wikipedia(JP)', 5, 'wj', 'https://ja.wikipedia.org/wiki/%s', false, false],
      ['Wikipedia(EN)', 5, 'we', 'https://en.wikipedia.org/wiki/%s', false, false]
    ]
  }
  chrome.storage.sync.get({ searches: [], init: false }, (res) => {
    if (!res.init) {
      chrome.storage.sync.set(defConf)
    }

    // TODO: extract contant table for, at least, config index
    // TODO: possible extension: restricted to specific URL
    const IDX_NAME = 0
    const IDX_TARGET = 1
    const IDX_KEY = 2
    const IDX_URL = 3
    const IDX_CURTAB = 4
    const IDX_ISPOST = 5
    const TARGET_OMNIBOX = 1
    const TARGET_PAGE = 2
    const TARGET_SELECTION = 4
    const TARGET_LINK = 8
    const TARGET_IMAGE = 16
    const ARG_ANY = '%*'
    const ARG_SELTEXT = '%s'
    const ARG_URL = '%u'
    const ARG_CLIP = '%c'
    const ARG_LINK = '%l'
    const CONF_KEY = 'conf'
    const CONF_NAME = '設定'
    const EXTRACT_KEY = 'extract'
    const EXTRACT_NAME = '抽出'

    let conf = []
    let confIdxFromName = {}
    let confIdxFromKey = {}

    function base64url_encode (str) {
      let dat = str.split('').map(x => x.charCodeAt(0)).reduce((acc, cur) => {
        acc.push(cur % 256, Math.floor(cur / 256))
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
      return dat[2].map(x => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"[x]).join('')
    }

    // based on https://stackoverflow.com/a/23687543 with style change and multiple value support
    function makePostHandler (specUrl) {
      let data = {}
      const specUrl2 = (specUrl.indexOf('??') !== -1) ? specUrl.split('??').map(x => x.replace('?', '_')).join('?') : specUrl
      for(let p of new URL(specUrl2).searchParams) {
        if(p[0] in data) {
          data[p[0]] = [data[p[0]]]
          data[p[0]].push(p[1])
        } else {
          data[p[0]] = p[1]
        }
      }
      const url = specUrl.replace((specUrl.indexOf('??') !== -1) ? /\?\?.*/ : /\?.*/, '')
      return function (tab) {
        let handler = function (tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === "complete"){
            chrome.tabs.onUpdated.removeListener(handler)
            chrome.tabs.sendMessage(tabId, { url: url, data: data })
          }
        }

        // in case we're faster than page load (usually):
        chrome.tabs.onUpdated.addListener(handler);
        // just in case we're too late with the listener:
        chrome.tabs.sendMessage(tab.id, { url: url, data: data })
      }
    }

    function emptify (val) { return val === undefined ? '' : val }
    function makeURL (spec, info, clip_) {
      const text = emptify(info.selectionText)
      const link = emptify(info.linkUrl)
      const src = emptify(info.srcUrl)
      const page = emptify(info.pageUrl)
      const clip = emptify(clip_)
      let url = spec.replace(ARG_SELTEXT, text).replace(ARG_LINK, link).replace(ARG_URL, src || page).replace(ARG_ANY, text || src || link || page).replace(ARG_CLIP, clip)
      const match = url.match(/^(SearchExtender:\/\/)(.*)$/i)
      if(match) {
        url = match[1] + base64url_encode(match[2])
      }
      return url
    }

    function setupTab (url, disposition) {
      return new Promise((resolve, reject) => {
        switch (disposition) {
          case 'currentTab':
            chrome.permissions.request({ permissions: ['activeTab'] }, (granted) => {
              if (granted) {
                chrome.tabs.update({ url }, tab => resolve(tab))
              } else {
                 chrome.tabs.create({ url }, tab => resolve(tab))
              }
            })
            break
          case 'newForegroundTab':
            chrome.tabs.create({ url }, tab => resolve(tab))
            break
          case 'newBackgroundTab':
            chrome.tabs.create({ url, active: false }, tab => resolve(tab))
            break
        }
      })
    }

    function jumpTo (specUrl, disposition, info, is_post) {
      return new Promise((resolve, reject) => {
        if (specUrl.indexOf(ARG_CLIP) !== -1) {
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
        const url = makeURL(specUrl, info, clip)
        if (is_post) {
          return setupTab(chrome.runtime.getURL("poster.html"), disposition).then(makePostHandler(url))
        } else {
          return setupTab(url, disposition)
        }
      })
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
        if ((c[IDX_TARGET] & TARGET_OMNIBOX) && c[IDX_KEY].indexOf(key) !== -1) {
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

    function showOption () {
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage()
      } else {
        window.open(chrome.runtime.getURL('options.html'))
      }
    }

    chrome.omnibox.onInputEntered.addListener((text, disposition) => {
      chrome.omnibox.setDefaultSuggestion(defSuggest)
      const wsPos = (x => x === -1 ? text.length : x)(text.search(/\s/))
      const key = text.slice(0, wsPos)
      const selectionText = text.slice(wsPos).trim()
      if (key === CONF_KEY) {
        showOption()
      } else {
        const spec = conf[confIdxFromKey[key]]
        jumpTo(spec[IDX_URL], spec[IDX_CURTAB] ? 'currentTab' : disposition, { selectionText }, spec[IDX_ISPOST])
      }
    })

    const contextsSpec = { [TARGET_PAGE]: 'page', [TARGET_SELECTION]: 'selection', [TARGET_LINK]: 'link', [TARGET_IMAGE]: 'image' }
    function setupMenu () {
      chrome.storage.sync.get('searches', (newconf) => {
        conf = newconf.searches
        confIdxFromName = {}
        confIdxFromKey = {}
        chrome.contextMenus.create({title: 'SearchExtender', id: 'root', contexts: ['page', 'selection', 'link', 'image', 'editable']})
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
        chrome.contextMenus.create({
          title: EXTRACT_NAME,
          id: EXTRACT_KEY,
          contexts: ['editable'],
          parentId: 'root'
        })
      })
    }

    chrome.contextMenus.onClicked.addListener((info, tab) => {
      console.log(info)
      if (info.menuItemId === CONF_KEY) {
        showOption()
      } else if (info.menuItemId === EXTRACT_KEY) {
        chrome.permissions.request({ permissions: ['activeTab'] }, (granted) => {
          if (granted) {
            // Invoked in contextMenu, so active tab in active frame assumed
            // chrome.tabs.executeScript(tab.id, { frameId: info.frameId, file: 'extract.js' })
            chrome.tabs.executeScript({ file: 'extract.js' })
          }
        })
      } else {
        const spec = conf[confIdxFromName[info.menuItemId]]
        jumpTo(spec[IDX_URL], spec[IDX_CURTAB] ? 'currentTab' : 'newForegroundTab', info, spec[IDX_ISPOST])
      }
    })

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        if ('searches' in changes) chrome.contextMenus.removeAll(() => setupMenu())
      }
    })

    chrome.runtime.onMessage.addListener((dat) => {
      switch(dat.command) {
        case 'showOption':
          showOption()
          break
      }
    })

    setupMenu()
  })
})()
