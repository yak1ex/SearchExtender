(function (g) {
  'use strict'

  g.browser.runtime.onMessage.addListener((dat, sender, sendResponse) => {
    if (dat && dat.command === 'readClipboard') {
      try {
        const ta = document.createElement('textarea')
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        ta.style.top = '0'
        document.body.appendChild(ta)
        ta.focus()
        const ok = document.execCommand('paste')
        const text = ok ? ta.value : ''
        document.body.removeChild(ta)
        sendResponse({ ok: ok, text: text })
      } catch (e) {
        sendResponse({ ok: false, text: '', message: (e && e.message) ? e.message : String(e) })
      }
      return true
    }
    return false
  })
})(g)