// TODO: configuration

const defConf = {
  searches: [
    ["Google", 5, "g", "http://www.google.co.jp/search?q=%t"],
    ["Wikipedia(JP)", 5, "wj", "https://ja.wikipedia.org/wiki/%t"],
    ["Wikipedia(EN)", 5, "we", "https://en.wikipedia.org/wiki/%t"]
  ]
}

chrome.storage.sync.set(defConf)

// TODO: possible extension: restricted to specific URL
const IDX_NAME = 0, IDX_TARGET = 1, IDX_KEY = 2, IDX_URL = 3, IDX_ISPOST = 4
const TARGET_OMNIBOX = 1, TARGET_PAGE = 2, TARGET_SELECTION = 4, TARGET_LINK = 8, TARGET_IMAGE = 16
const ARG_ANY = '%*', ARG_SELTEXT = '%t', ARG_URL = '%u', ARG_CLIP = '%c', ARG_LINK = '%l'

let conf = [], confIdxFromName = {}, confIdxFromKey = {}

function makeURL (spec, text, url)
{
  if (text === undefined) text = ''
  if (url === undefined) url = ''
  return spec.replace(ARG_SELTEXT, text).replace(ARG_URL, url).replace(ARG_ANY, text || url)
}

const defSuggest = { description: "Type search key and keyword, like 'g googling'"}
chrome.omnibox.setDefaultSuggestion(defSuggest)

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
  switch ( disposition ) {
    case "currentTab":
      chrome.tabs.update({ url })
      break
    case "newForegroundTab":
      chrome.tabs.create({ url })
      break
    case "newBackgroundTab":
      chrome.tabs.create({ url, active: false })
      break
  }
})

function setupMenu ()
{
  chrome.storage.sync.get('searches', (newconf) => {
    conf = newconf.searches
    confIdxFromName = {}
    confIdxFromKey = {}
// TODO: appropriate contexts handling
    chrome.contextMenus.create({title: "SearchExtender", id: "root", contexts: ["page", "selection", "link", "image"]})
    for (let i = 0; i < conf.length; ++i) {
      chrome.contextMenus.create({
        title: conf[i][IDX_NAME],
        id: conf[i][IDX_NAME],
        contexts: ["page", "selection", "link", "image"],
        parentId: "root"
      })
      confIdxFromName[conf[i][IDX_NAME]] = i
      confIdxFromKey[conf[i][IDX_KEY]] = i
    }
    chrome.contextMenus.create({
      title: '設定',
      id: '設定',
      contexts: ["page", "selection", "link", "image"],
      parentId: "root"
    })
  })
}

// TODO: open in current tab, next tab
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log(info)
  if (info.menuItemId === '設定') {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options.html'));
    }
  } else {
    const url = makeURL(conf[confIdxFromName[info.menuItemId]][IDX_URL], info.selectionText, info.linkUrl || info.srcUrl || info.pageUrl)
    chrome.tabs.create({ url })
  }
})

chrome.storage.onChanged.addListener((changes, area) => {
  if(area === 'sync') {
    if('searches' in changes) chrome.contextMenus.removeAll(() => setupMenu())
  }
})

setupMenu()
