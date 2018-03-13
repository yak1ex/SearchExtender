(function(){
  if (!('browser' in window) || browser.isChrome === undefined) {
    const CHROME = 1
    const EDGE = 2
    const FIREFOX = 3
    const ua = (('browser' in window) ? 2 : 0) + (('chrome' in window) ? 1 : 0)
    if (!('browser' in window)) { window.browser = chrome }
    browser.isChrome = ua === CHROME
    browser.isEdge = ua === EDGE
    browser.isFirefox = ua === FIREFOX
  }
})()
