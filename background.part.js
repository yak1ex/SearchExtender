(function (g) {
  'use strict'

  /* global URL */
  // TODO: charset conversion

  g.browser.storage.sync.get({ searches: [], init: false }, (res) => {
    if (!res.init) {
      g.browser.storage.sync.set(g.Conf.defConfStorage)
    }

    // TODO: extract contant table for, at least, config index
    // TODO: possible extension: restricted to specific URL
    const ARG_ANY = '%\\*' // '%*'
    const ARG_SELTEXT = '%s'
    const ARG_URL = '%u'
    const ARG_CLIP = '%c'
    const ARG_LINK = '%l'
    const CONF_KEY = 'conf'
    const CONF_NAME = '設定'
    const EXTRACT_KEY = 'extract'
    const EXTRACT_NAME = '抽出'

    let conf
    let optionConf = null

    function base64urlEncode (str) {
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
      if (dat[0] > 0) dat[2].push(dat[1] << (6 - dat[0]))
      return dat[2].map(x => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[x]).join('')
    }

    // based on https://stackoverflow.com/a/23687543 with style change and multiple value support
    function makePostHandler (specUrl) {
      let data = {}
      const specUrl2 = (specUrl.indexOf('??') !== -1) ? specUrl.split('??').map(x => x.replace('?', '_')).join('?') : specUrl
      for (let p of new URL(specUrl2).searchParams) {
        if (p[0] in data) {
          data[p[0]] = [data[p[0]]]
          data[p[0]].push(p[1])
        } else {
          data[p[0]] = p[1]
        }
      }
      const url = specUrl.replace((specUrl.indexOf('??') !== -1) ? /\?\?.*/ : /\?.*/, '')
      return function (tab) {
        let handler = function (tabId, changeInfo) {
          if (tabId === tab.id && changeInfo.status === 'complete') {
            g.browser.tabs.onUpdated.removeListener(handler)
            g.browser.tabs.sendMessage(tabId, { url: url, data: data })
          }
        }

        // in case we're faster than page load (usually):
        g.browser.tabs.onUpdated.addListener(handler)
        // just in case we're too late with the listener:
        g.browser.tabs.sendMessage(tab.id, { url: url, data: data })
      }
    }

    function emptify (val) { return val === undefined ? '' : val }
    function makeURL (spec, info, clip_) {
      const text = emptify(info.selectionText)
      const link = emptify(info.linkUrl)
      const src = emptify(info.srcUrl)
      const page = emptify(info.pageUrl)
      const clip = emptify(clip_)
      let url = spec.replace(new RegExp(ARG_SELTEXT, 'g'), text)
        .replace(new RegExp(ARG_LINK, 'g'), link)
        .replace(new RegExp(ARG_URL, 'g'), src || page)
        .replace(new RegExp(ARG_ANY, 'g'), text || src || link || page)
        .replace(new RegExp(ARG_CLIP, 'g'), clip)
      const match = url.match(/^(SearchExtender:\/\/)(.*)$/i)
      if (match) {
        url = match[1] + base64urlEncode(match[2])
      }
      return url
    }

    function setupTab (url, disposition) {
      return new Promise((resolve, reject) => {
        switch (disposition) {
          case 'currentTab':
            g.browser.tabs.update({ url }, tab => resolve(tab))
            break
          case 'newForegroundTab':
            g.browser.tabs.create({ url }, tab => resolve(tab))
            break
          case 'newBackgroundTab':
            g.browser.tabs.create({ url, active: false }, tab => resolve(tab))
            break
        }
      })
    }

    function jumpTo (specUrl, disposition, info, isPost) {
      return new Promise((resolve, reject) => {
        if (specUrl.indexOf(ARG_CLIP) !== -1) {
          // BUG: permissions.request MUST move to outside of Promise
          g.browser.permissions.request({ permissions: ['clipboardRead'] }, (granted) => {
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
        if (isPost) {
          return setupTab(g.browser.runtime.getURL('poster.html'), disposition).then(makePostHandler(url))
        } else {
          return setupTab(url, disposition)
        }
      })
    }

    const defSuggest = { description: 'Type search key and keyword, like "g googling"' }
    g.browser.omnibox.setDefaultSuggestion(defSuggest)

    function getSuggestion (key, name) {
      return { content: key, description: (g.isFirefox ? `${key} ${name}` : `<match>${key}</match> <dim>${name}</dim>`) }
    }

    g.browser.omnibox.onInputChanged.addListener((text, suggest) => {
      const wsPos = text.search(/\s/)
      const key = text.slice(0, wsPos !== -1 ? wsPos : text.length)
      let suggests = []
      if (CONF_KEY.indexOf(key) !== -1) {
        suggests.push(getSuggestion(CONF_KEY, CONF_NAME))
      }
      suggests = suggests.concat(conf.conf
        .filter(x => (x.target & g.Conf.TARGET_OMNIBOX) && x.key.indexOf(key) !== -1)
        .map(x => getSuggestion(x.key, x.name)))
      if (suggests.length === 1) {
        g.browser.omnibox.setDefaultSuggestion({ description: suggests[0].description })
      } else {
        g.browser.omnibox.setDefaultSuggestion(defSuggest)
        suggest(suggests)
      }
    })

    function showOption () {
      if (g.browser.runtime.openOptionsPage) {
        g.browser.runtime.openOptionsPage()
      } else {
        window.open(g.browser.runtime.getURL('options.html'))
      }
    }

    g.browser.omnibox.onInputEntered.addListener((text, disposition) => {
      g.browser.omnibox.setDefaultSuggestion(defSuggest)
      const wsPos = (x => x === -1 ? text.length : x)(text.search(/\s/))
      const key = text.slice(0, wsPos)
      const selectionText = text.slice(wsPos).trim()
      if (key === CONF_KEY) {
        showOption()
      } else {
        const spec = conf.getFromKey(key)
        jumpTo(spec.url, spec.curTab ? 'currentTab' : disposition, { selectionText }, spec.isPost)
      }
    })

    function setupMenu () {
      g.browser.storage.sync.get('searches', (newconf) => {
        conf = g.Conf.fromStorage(newconf)
        g.browser.contextMenus.create(
          { title: 'SearchExtender', id: 'root', contexts: ['page', 'selection', 'link', 'image', 'editable'] },
          () => { if (g.browser.runtime.lastError) console.log(g.browser.runtime.lastError.message) }
        )
        conf.conf.filter(x => x.target).forEach(x =>
          g.browser.contextMenus.create({
            title: x.name,
            id: x.name,
            contexts: g.Conf.toContexts(x.target),
            parentId: 'root'
          }, () => { if (g.browser.runtime.lastError) console.log(g.browser.runtime.lastError.message) }))
        g.browser.contextMenus.create({
          title: CONF_NAME,
          id: CONF_KEY,
          contexts: ['page', 'selection', 'link', 'image'],
          parentId: 'root'
        }, () => { if (g.browser.runtime.lastError) console.log(g.browser.runtime.lastError.message) })
        g.browser.contextMenus.create({
          title: EXTRACT_NAME,
          id: EXTRACT_KEY,
          contexts: ['editable'],
          parentId: 'root'
        }, () => { if (g.browser.runtime.lastError) console.log(g.browser.runtime.lastError.message) })
      })
    }

    g.browser.contextMenus.onClicked.addListener((info, tab) => {
      console.log(info)
      if (info.menuItemId === CONF_KEY) {
        showOption()
      } else if (info.menuItemId === EXTRACT_KEY) {
        // Invoked in contextMenu, so active tab assumed
        // g.browser.tabs.executeScript(tab.id, { frameId: info.frameId, file:'extract.js' })
        g.browser.tabs.executeScript(
          { frameId: info.frameId, file: 'extract.js' },
          () => { if (g.browser.runtime.lastError) console.log('extract.js:' + g.browser.runtime.lastError.message) }
        )
      } else {
        const spec = conf.getFromName(info.menuItemId)
        jumpTo(spec.url, spec.curTab ? 'currentTab' : 'newForegroundTab', info, spec.isPost)
      }
    })

    g.browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        if ('searches' in changes) g.browser.contextMenus.removeAll(() => setupMenu())
      }
    })

    g.browser.runtime.onMessage.addListener((dat, sender, sendResponse) => {
      switch (dat.command) {
        case 'showOption':
          showOption()
          break
        case 'showOptionWithConf':
          optionConf = dat.content
          showOption()
          break
        case 'queryOptionConf':
          let prevConf = optionConf
          optionConf = null
          sendResponse(prevConf)
          break
      }
    })

    setupMenu()
  })
})(g)
