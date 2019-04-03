(function (g) {
  /* global browser chrome */
  if (!('browser' in window) || browser.isChrome === undefined) {
    const CHROME = 1
    const EDGE = 2
    const FIREFOX = 3
    const ua = (('browser' in window) ? 2 : 0) + (('chrome' in window) ? 1 : 0)
    if (!('browser' in window)) {
      g.browser = chrome
    } else {
      g.browser = window.browser
    }
    g.isChrome = ua === CHROME
    g.isEdge = ua === EDGE
    g.isFirefox = ua === FIREFOX
  }
})(g)
