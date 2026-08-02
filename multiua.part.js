(function (g) {
  /* global browser chrome */
  if (typeof browser === 'undefined' || browser.isChrome === undefined) {
    const CHROME = 1
    const EDGE = 2
    const FIREFOX = 3
    const hasBrowser = typeof browser !== 'undefined'
    const hasChrome = typeof chrome !== 'undefined'
    const ua = (hasBrowser ? 2 : 0) + (hasChrome ? 1 : 0)
    if (!hasBrowser) {
      g.browser = chrome
    } else {
      g.browser = browser
    }
    g.isChrome = ua === CHROME
    g.isEdge = ua === EDGE
    g.isFirefox = ua === FIREFOX
  }
})(g)